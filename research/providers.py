"""The only outbound HTTP adapters; endpoints and tool IDs are code-owned."""
import json
import importlib.metadata
import math
import os
import re
import ipaddress
import socket
import threading
import time
from uuid import uuid4

import httpx

from .evidence import normalize_results
from .contracts import safe_url
from urllib.parse import urlsplit, urlencode
from .store import BudgetExceeded, Stopped, digest, encode

MODEL = 'claude-sonnet-5-5'
TOOL = 'perplexity.web.search'
EXTRACT = 'exa.web.contents.get'
TOOL_RESERVE = 5000
MODEL_RESERVE = 250000
MAX_RESPONSE = 2_000_000


class ProviderError(Exception):
    def __init__(self, message='provider unavailable', *, code='provider_unavailable', retry_after=0, reason=None, retryable=True):
        self.retryable = retryable
        super().__init__(message)
        self.details = {'reason': reason} if reason else {}
        self.code = code
        self.retry_after = min(30, max(0, retry_after))


def model_endpoint():
    return 'https://api.anthropic.com/v1', os.environ.get('ANTHROPIC_API_KEY', '').strip()


def model_name():
    return MODEL


def model_info():
    return {'service': 'anthropic', 'requestedModel': model_name()}


def reported_model(value):
    return value if (isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._/:-]{0,119}', value)
                     and '://' not in value and not re.search(
                         r'(?:^|[/:._-])(?:sk|key|token|secret|password|authorization|bearer|credential)(?:$|[/:._-])',
                         value, re.I)) else None


def configured():
    try:
        installed = importlib.metadata.version('gpt-researcher') == '0.16.1'
    except importlib.metadata.PackageNotFoundError:
        installed = False
    try:
        _, key = model_endpoint()
    except ProviderError:
        return False
    return bool(installed and key and all(os.environ.get(k, '').strip() for k in
                                         ('RESEARCH_RUNNER_TOKEN', 'TREG_TOKEN')))


def redact(value):
    text = encode(value)
    for name in ('RESEARCH_RUNNER_TOKEN', 'TREG_TOKEN', 'ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY', 'OMNIROUTE_API_KEY'):
        secret = os.environ.get(name, '')
        if secret:
            text = text.replace(secret, '[redacted]')
    return json.loads(text)


class MessageStream:
    """Retain text and safe receipts only; thinking is never application evidence."""
    def __init__(self):
        self.message = None
        self.blocks = {}
        self.open_blocks = set()
        self.done = self.text_started = False

    def line(self, line):
        if not line.startswith(b'data:'):
            return
        try:
            event = json.loads(line[5:].strip())
            kind = event['type']
            if kind == 'error':
                status = {'authentication_error': 401, 'permission_error': 403, 'rate_limit_error': 429,
                          'invalid_request_error': 400, 'overloaded_error': 529}.get(event['error'].get('type'), 500)
                code = ('authentication' if status in (401, 403) else 'rate_limit' if status == 429
                        else 'invalid_output' if status == 400 else 'provider_unavailable')
                error = ProviderError('model stream failed', code=code, reason='stream_error')
                error.details['httpStatus'] = status
                raise error
            if kind == 'message_start':
                if self.message is not None:
                    raise ValueError()
                value = event['message']
                self.message = {'id': value.get('id'), 'model': reported_model(value.get('model')),
                                'usage': dict(value.get('usage', {})), 'stop_reason': None}
            elif kind == 'content_block_start':
                index, block = event['index'], event['content_block']
                if self.message is None or type(index) is not int or index in self.blocks:
                    raise ValueError()
                self.blocks[index] = {'type': block['type']}
                if block['type'] == 'text':
                    if not isinstance(block.get('text'), str):
                        raise ValueError()
                    self.blocks[index]['text'] = block['text']
                    self.text_started |= bool(block['text'])
                elif block['type'] not in ('thinking', 'redacted_thinking'):
                    raise ValueError()
                self.open_blocks.add(index)
            elif kind == 'content_block_delta':
                index, delta = event['index'], event['delta']
                if index not in self.open_blocks:
                    raise ValueError()
                if delta['type'] == 'text_delta':
                    if self.blocks[index]['type'] != 'text' or not isinstance(delta.get('text'), str):
                        raise ValueError()
                    self.blocks[index]['text'] += delta['text']
                    self.text_started |= bool(delta['text'])
            elif kind == 'content_block_stop':
                self.open_blocks.remove(event['index'])
            elif kind == 'message_delta':
                self.message['stop_reason'] = event['delta'].get('stop_reason') or self.message['stop_reason']
                self.message['usage'].update(event.get('usage', {}))
            elif kind == 'message_stop':
                if self.message is None or self.open_blocks or not self.message['stop_reason']:
                    raise ValueError()
                self.done = True
        except (ValueError, TypeError, KeyError, AttributeError, UnicodeError):
            raise ProviderError('invalid model stream', reason='stream_invalid') from None

    def result(self):
        if not self.done:
            raise ProviderError('incomplete model stream', reason='stream_incomplete')
        return {**self.message, 'content': [block for block in self.blocks.values() if block['type'] == 'text']}


def stream_response(data):
    stream = MessageStream()
    for line in data.splitlines():
        stream.line(line)
        if stream.done:
            break
    return stream.result()


class Network:
    def request(self, method, url, headers, body=None):
        from .diagnostics import emit
        started = time.monotonic()
        host = urlsplit(url).hostname
        provider = 'treg' if host == 'treg.to' else 'anthropic' if host == 'api.anthropic.com' else 'runner'
        operation = ('catalog' if '/catalog/endpoints/' in url else 'model' if urlsplit(url).path.endswith('/messages')
                     else 'extract' if EXTRACT in url else 'search' if TOOL in url else 'social_search')
        emit(dict(stage='runner', status='started', provider=provider, operation=operation,
                  requestBytes=len(encode(body).encode()) if body is not None else 0))
        try:
            result = self._request(method, url, headers, body)
            emit(dict(stage='runner', status='completed', provider=provider, operation=operation,
                      elapsedMs=int((time.monotonic() - started) * 1000)))
            return result
        except ProviderError as error:
            error.details.update(provider=provider, operation=operation)
            emit(dict(stage='runner', status='failed', code=error.code, **error.details,
                      elapsedMs=int((time.monotonic() - started) * 1000),
                      requestBytes=len(encode(body).encode()) if body is not None else 0))
            raise

    def _request(self, method, url, headers, body=None):
        data = bytearray()
        try:
            deadline = time.monotonic() + 180
            # Model reasoning can delay the first content chunk.
            read_timeout = 180 if url == 'https://api.anthropic.com/v1/messages' else 45
            with httpx.Client(timeout=httpx.Timeout(45, read=read_timeout),
                              follow_redirects=False, trust_env=False) as client:
                with client.stream(method, url, headers=headers, json=body) as response:
                    if response.status_code != 200:
                        code = ('authentication' if response.status_code in (401, 403) else
                                'rate_limit' if response.status_code == 429 else
                                'invalid_output' if 400 <= response.status_code < 500 else 'provider_unavailable')
                        retry = response.headers.get('retry-after', '0')
                        error = ProviderError('provider request failed', code=code, reason='http_error',
                                              retry_after=int(retry) if str(retry).isdigit() else 0)
                        error.details['httpStatus'] = response.status_code
                        raise error
                    data = bytearray()
                    pending = b''
                    content_started = False
                    stream = MessageStream() if body and body.get('stream') else None
                    for chunk in response.iter_bytes():
                        now = time.monotonic()
                        if now > deadline:
                            raise ProviderError('provider deadline exceeded', code='timeout', reason='deadline')
                        data.extend(chunk)
                        if len(data) > MAX_RESPONSE:
                            raise ProviderError('provider response too large', reason='response_too_large')
                        if stream is not None:
                            pending += chunk
                            while b'\n' in pending:
                                line, pending = pending.split(b'\n', 1)
                                stream.line(line)
                                if not content_started and stream.text_started:
                                    # Only the first text block buys one bounded completion window.
                                    content_started = True
                                    deadline = max(deadline, now + 120)
                                if stream.done:
                                    break
                            if stream.done:
                                break
                    if stream is not None:
                        if pending and not stream.done:
                            stream.line(pending)
                        payload = stream.result()
                    else:
                        payload = json.loads(data)
                    return redact(payload), dict(response.headers)
        except ProviderError as error:
            error.details['responseBytes'] = len(data)
            raise
        except httpx.TimeoutException as error:
            raise ProviderError('provider request timed out', code='timeout', reason='connect_timeout' if isinstance(error, httpx.ConnectTimeout) else 'read_timeout') from None
        except ValueError:
            raise ProviderError('provider returned invalid data', code='invalid_output', reason='invalid_json') from None
        except httpx.HTTPError:
            raise ProviderError('provider unavailable', reason='transport_error') from None


def validate_catalog(catalog, tool=TOOL):
    endpoint = catalog.get('endpoint', {})
    fields = endpoint.get('input', {}).get('body', {})
    if (endpoint.get('id') != tool or endpoint.get('method') != 'POST'
            or endpoint.get('async') is not None or endpoint.get('kind') != 'data'
            or endpoint.get('cost', {}).get('usd') != (0.005 if tool == TOOL else 0.001)):
        raise ProviderError('catalog contract changed')
    if tool == EXTRACT:
        if fields.get('urls', {}).get('type') != 'array[string]' or fields.get('text', {}).get('type') != 'boolean|object':
            raise ProviderError('catalog contract changed')
    elif (fields.get('query', {}).get('type') != 'string'
            or fields.get('search_type', {}).get('enum') != ['web']
            or fields.get('max_results', {}).get('type') != 'integer'
            or fields.get('max_results', {}).get('max', 0) < 20):
        raise ProviderError('catalog contract changed')


class Calls:
    def __init__(self, store, job_id, lease, network=None):
        self.store, self.job_id, self.lease = store, job_id, lease
        self.network = network or Network()
        self.catalog_checked = False
        self.extract_checked = False
        self.lock = threading.Lock()
        self.stage_calls = 0
        self.stage_error = None
        self.model_info = model_info()
        self.model_receipt_received = False
        self.usage = {}
        self.channel_catalogs = set()
        self.scope = {}

    def stage(self):
        self.stage_calls = 0
        self.stage_error = None

    def check(self):
        self.store.heartbeat(self.job_id, self.lease)
        if self.stage_error:
            raise self.stage_error
        if self.stage_calls >= 12:
            raise BudgetExceeded('stage call limit')

    def search(self, query):
        with self.lock:
            self.check()
            if not isinstance(query, str) or not 1 <= len(query) <= 1200:
                raise ProviderError('invalid public query')
            from .scope import contains_excluded_subject
            if contains_excluded_subject(query, self.scope):
                raise ProviderError('query includes unresolved identity', code='invalid_output', retryable=False)
            if not self.catalog_checked:
                catalog, _ = self.network.request('GET', 'https://treg.to/catalog/endpoints/' + TOOL, {})
                validate_catalog(catalog)
                self.catalog_checked = True
            body = {'query': query, 'search_type': 'web', 'max_results': 20}
            key = 'tool_' + digest(encode(body))
            cached = self.store.reserve(self.job_id, self.lease, key, 'tool', TOOL_RESERVE)
            if cached is not None:
                from .scope import filter_sources
                return filter_sources(cached, self.scope)
            self.stage_calls += 1
            self.store.started(self.job_id, self.lease, key)
            payload, headers = self.network.request('POST', 'https://treg.to/call/' + TOOL, {
                'X-Treg-Token': os.environ.get('TREG_TOKEN', ''),
                'Idempotency-Key': digest(self.job_id + key),
                'X-Treg-Route-Max-Cost': '0.005',
                'X-Treg-Meta': 'feature=research',
            }, body)
            raw_cost = headers.get('x-treg-original-cost-micro', headers.get('x-treg-cost-micro'))
            cost = int(raw_cost) if raw_cost and re.fullmatch(r'\d{1,12}', raw_cost) else None
            receipt = headers.get('x-treg-call-id', '')
            receipt = receipt if re.fullmatch(r'[A-Za-z0-9_-]{1,150}', receipt) else None
            self.store.settle(self.job_id, self.lease, key, cost, receipt, None)
            from .scope import filter_sources
            sources = filter_sources(normalize_results(payload), self.scope)
            self.store.settle(self.job_id, self.lease, key, cost, receipt, sources)
            if cost is not None and cost > TOOL_RESERVE:
                raise BudgetExceeded('provider exceeded reservation')
            return sources

    def social_search(self, channel, request):
        from .source_channels import TOOLS, dedicated_input, normalize_social
        tool, method, reserve = TOOLS[channel]
        body = dedicated_input(channel, request)
        from .scope import contains_excluded_subject
        if contains_excluded_subject(encode(body), self.scope):
            raise ProviderError('query includes unresolved identity', code='invalid_output', retryable=False)
        with self.lock:
            self.check()
            if tool not in self.channel_catalogs:
                catalog, _ = self.network.request('GET', 'https://treg.to/catalog/endpoints/' + tool, {})
                endpoint = catalog.get('endpoint', {})
                fields = endpoint.get('input', {}).get('body' if method == 'POST' else 'queryParams', {})
                price = endpoint.get('cost', {}).get('usd')
                if (endpoint.get('id') != tool or endpoint.get('method') != method or
                        endpoint.get('kind') != 'data' or endpoint.get('async') is not None or
                        endpoint.get('platform_eligible') is not True or
                        not isinstance(price, (int, float)) or isinstance(price, bool) or
                        not math.isfinite(price) or not 0 <= price <= reserve / 1_000_000 or
                        not all(key in fields for key in body) or
                        any(value.get('required') and key not in body for key, value in fields.items())):
                    raise ProviderError('social catalog contract changed', code='invalid_output')
                self.channel_catalogs.add(tool)
            key = 'social_' + digest(encode({'tool': tool, 'input': body}))
            cached = self.store.reserve(self.job_id, self.lease, key, 'tool', reserve)
            if cached is not None:
                from .scope import filter_sources
                return filter_sources(cached, self.scope)
            self.stage_calls += 1
            self.store.started(self.job_id, self.lease, key)
            url = 'https://treg.to/call/' + tool
            if method == 'GET':
                url += '?' + urlencode(body)
            payload, headers = self.network.request(method, url, {
                'X-Treg-Token': os.environ.get('TREG_TOKEN', ''),
                'Idempotency-Key': digest(self.job_id + key),
                'X-Treg-Route-Max-Cost': str(reserve / 1_000_000),
                'X-Treg-Meta': 'feature=research',
            }, body if method == 'POST' else None)
            raw_cost = headers.get('x-treg-original-cost-micro', headers.get('x-treg-cost-micro'))
            cost = int(raw_cost) if raw_cost and re.fullmatch(r'\d{1,12}', raw_cost) else None
            receipt = headers.get('x-treg-call-id', '')
            receipt = receipt if re.fullmatch(r'[A-Za-z0-9_-]{1,150}', receipt) else None
            self.store.settle(self.job_id, self.lease, key, cost, receipt, None)
            if cost is not None and cost > reserve:
                raise BudgetExceeded('provider exceeded reservation')
            from .scope import filter_sources
            sources = filter_sources(normalize_social(channel, payload), self.scope)
            self.store.settle(self.job_id, self.lease, key, cost, receipt, sources)
            return sources

    def extract(self, source):
        with self.lock:
            self.check()
            url = safe_url(source['url'])
            try:
                addresses = socket.getaddrinfo(urlsplit(url).hostname, 443, type=socket.SOCK_STREAM)
                if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
                    raise ProviderError('private extraction target')
            except OSError:
                raise ProviderError('extraction target unavailable') from None
            if not self.extract_checked:
                catalog, _ = self.network.request('GET', 'https://treg.to/catalog/endpoints/' + EXTRACT, {})
                validate_catalog(catalog, EXTRACT)
                self.extract_checked = True
            body = {'urls': [url], 'text': {'maxCharacters': 12000}}
            key = 'extract_' + digest(encode(body))
            cached = self.store.reserve(self.job_id, self.lease, key, 'tool', 1000)
            if cached is not None:
                from .scope import filter_sources
                return filter_sources(cached, self.scope)
            self.stage_calls += 1
            self.store.started(self.job_id, self.lease, key)
            payload, headers = self.network.request('POST', 'https://treg.to/call/' + EXTRACT, {
                'X-Treg-Token': os.environ.get('TREG_TOKEN', ''),
                'Idempotency-Key': digest(self.job_id + key),
                'X-Treg-Route-Max-Cost': '0.001', 'X-Treg-Meta': 'feature=research',
            }, body)
            raw_cost = headers.get('x-treg-original-cost-micro', headers.get('x-treg-cost-micro'))
            cost = int(raw_cost) if raw_cost and re.fullmatch(r'\d{1,12}', raw_cost) else None
            if not isinstance(payload.get('results'), list):
                raise ProviderError('invalid extraction response')
            normalized = []
            for row in payload['results'][:1]:
                if safe_url(row.get('url', '')) != url or not isinstance(row.get('text'), str):
                    continue
                normalized = normalize_results({'results': [{**row, 'snippet': row['text'],
                                                              'date': row.get('publishedDate')}]})
                for item in normalized:
                    item['kind'] = 'page_extract'
                    item['evidenceType'] = 'page_extract'
                    item['retrievedVia'] = EXTRACT
                    item['id'] = source['id']
                    if not item.get('publishedAt') and source.get('publishedAt'):
                        item['publishedAt'] = source['publishedAt']
                    if 'timestampSeconds' in source:
                        item['timestampSeconds'] = source['timestampSeconds']
            receipt = headers.get('x-treg-call-id', '')
            receipt = receipt if re.fullmatch(r'[A-Za-z0-9_-]{1,150}', receipt) else None
            self.store.settle(self.job_id, self.lease, key, cost, receipt, normalized)
            if cost is not None and cost > 1000:
                raise BudgetExceeded('provider exceeded reservation')
            return normalized

    def model(self, messages, max_tokens=1800, *, effort='medium', output_schema=None):
        try:
            return self._model(messages, max_tokens, effort=effort, output_schema=output_schema)
        except ProviderError as error:
            error.details.setdefault('provider', 'runner' if error.details.get('reason') == 'context_limit' else 'anthropic')
            error.details.setdefault('operation', 'model')
            from .diagnostics import emit
            emit(dict(stage='runner', status='failed', code=error.code, **error.details,
                      requestBytes=len(encode(messages).encode())))
            raise

    def _model(self, messages, max_tokens=1800, *, effort='medium', output_schema=None):
        with self.lock:
            self.check()
            if len(encode(messages).encode('utf-8')) > 90000:
                raise ProviderError('model context exceeds bound', reason='context_limit')
            base, api_key = model_endpoint()
            if not api_key:
                raise ProviderError('Anthropic is not configured', code='authentication')
            if effort not in ('low', 'medium'):
                raise ProviderError('invalid effort', code='invalid_output', retryable=False)
            system, conversation = [], []
            for message in messages:
                if message.get('role') not in ('system', 'user', 'assistant') or not isinstance(message.get('content'), str):
                    raise ProviderError('invalid model input', code='invalid_output', retryable=False)
                if message['role'] == 'system':
                    system.append({'type': 'text', 'text': message['content']})
                else:
                    conversation.append({'role': message['role'], 'content': message['content']})
            if not conversation or conversation[-1]['role'] != 'user':
                raise ProviderError('invalid model input', code='invalid_output', retryable=False)
            # Each model attempt reserves separately; retries are not assumed free.
            key = 'model_' + uuid4().hex
            self.store.reserve(self.job_id, self.lease, key, 'model', MODEL_RESERVE)
            self.store.started(self.job_id, self.lease, key)
            self.stage_calls += 1
            body = {'model': model_name(), 'messages': conversation,
                    'max_tokens': min(max_tokens or 1800, 12000), 'stream': True,
                    'thinking': {'type': 'between_tools'}, 'output_config': {'effort': effort}}
            if system:
                body['system'] = system
            if output_schema is not None:
                body['output_config']['format'] = {'type': 'json_schema', 'schema': output_schema}
            payload, _ = self.network.request('POST', base + '/messages', {
                'x-api-key': api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json',
            }, body)
            if not isinstance(payload, dict):
                raise ProviderError('invalid model response', code='invalid_output')
            usage = payload.get('usage')
            if usage is None:
                usage = {}
            if not isinstance(usage, dict):
                raise ProviderError('invalid model usage metadata', code='invalid_output')
            model = reported_model(payload.get('model'))
            self.usage = {name: value for name, value in {
                'inputTokens': usage.get('input_tokens'), 'outputTokens': usage.get('output_tokens')
            }.items() if type(value) is int and 0 <= value <= 1_000_000_000}
            # Messages API returns token usage, not a charge. Keep the reservation and unknown cost.
            receipt = payload.get('id')
            receipt = receipt if isinstance(receipt, str) and re.fullmatch(r'[A-Za-z0-9_-]{1,150}', receipt) else None
            self.store.settle(self.job_id, self.lease, key, None, receipt, {})
            if model:
                self.model_info['reportedModel'] = model
            self.model_receipt_received = True
            from .diagnostics import emit
            emit(dict(stage='runner', status='completed', provider='anthropic', operation='model',
                      model=model or model_name(), **self.usage))
            stop = payload.get('stop_reason')
            if stop == 'max_tokens':
                raise ProviderError('model output truncated', code='output_truncated', reason='output_truncated')
            if stop == 'refusal':
                raise ProviderError('model refused request', code='invalid_output', reason='invalid_schema', retryable=False)
            if stop != 'end_turn':
                raise ProviderError('incomplete model response', code='invalid_output', reason='invalid_schema')
            try:
                blocks = payload['content']
                if not isinstance(blocks, list) or any(b.get('type') not in ('text', 'thinking', 'redacted_thinking') for b in blocks):
                    raise ValueError()
                answer = ''.join(b['text'] for b in blocks if b['type'] == 'text')
            except (KeyError, TypeError, ValueError, AttributeError):
                raise ProviderError('invalid model response', code='invalid_output') from None
            if not answer.strip():
                raise ProviderError('empty model response', code='empty_output', reason='empty_output')
            return answer
