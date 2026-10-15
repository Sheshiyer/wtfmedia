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
from decimal import Decimal, ROUND_CEILING
from uuid import uuid4

import httpx

from .evidence import normalize_results
from .contracts import safe_url
from urllib.parse import urlsplit
from .store import BudgetExceeded, Stopped, digest, encode

MODEL = 'deepseek/deepseek-v4-flash-0731'
TOOL = 'perplexity.web.search'
EXTRACT = 'exa.web.contents.get'
TOOL_RESERVE = 5000
MODEL_RESERVE = 250000
MAX_RESPONSE = 2_000_000


class ProviderError(Exception):
    pass


def model_endpoint():
    base = os.environ.get('OMNIROUTE_BASE_URL', '').strip().rstrip('/')
    key = os.environ.get('OMNIROUTE_API_KEY', '').strip()
    if base or key:
        try:
            url = urlsplit(base)
            valid = (url.scheme == 'https' and url.hostname and not url.username
                     and not url.password and not url.query and not url.fragment)
        except ValueError:
            valid = False
        if not valid or not key:
            raise ProviderError('incomplete or invalid OmniRoute configuration')
        return base, key
    return 'https://openrouter.ai/api/v1', os.environ.get('OPENROUTER_API_KEY', '').strip()


def model_name():
    return 'noesis-research' if os.environ.get('OMNIROUTE_BASE_URL', '').strip() else MODEL


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
    for name in ('RESEARCH_RUNNER_TOKEN', 'TREG_TOKEN', 'OPENROUTER_API_KEY', 'OMNIROUTE_API_KEY'):
        secret = os.environ.get(name, '')
        if secret:
            text = text.replace(secret, '[redacted]')
    return json.loads(text)


def stream_response(data):
    text, finish, receipt, usage = [], None, None, {}
    try:
        for line in data.decode('utf-8').splitlines():
            if not line.startswith('data:'):
                continue
            value = line[5:].strip()
            if value == '[DONE]':
                break
            event = json.loads(value)
            if event.get('error'):
                raise ProviderError('gateway stream failed')
            receipt = event.get('id') or receipt
            usage = event.get('usage') or usage
            for choice in event.get('choices', []):
                if choice.get('index', 0) != 0:
                    continue
                content = choice.get('delta', {}).get('content')
                if content is not None:
                    if not isinstance(content, str):
                        raise ProviderError('invalid gateway text')
                    text.append(content)
                finish = choice.get('finish_reason') or finish
        if not finish:
            raise ProviderError('incomplete gateway stream')
        return {'id': receipt, 'usage': usage,
                'choices': [{'finish_reason': finish, 'message': {'content': ''.join(text)}}]}
    except (ValueError, TypeError, AttributeError):
        raise ProviderError('invalid gateway stream') from None


class Network:
    def request(self, method, url, headers, body=None):
        try:
            deadline = time.monotonic() + 600
            omni_base = os.environ.get('OMNIROUTE_BASE_URL', '').strip().rstrip('/')
            # Gateway reasoning can delay the first content chunk.
            read_timeout = 600 if omni_base and url == omni_base + '/chat/completions' else 45
            with httpx.Client(timeout=httpx.Timeout(45, read=read_timeout),
                              follow_redirects=False, trust_env=False) as client:
                with client.stream(method, url, headers=headers, json=body) as response:
                    data = bytearray()
                    for chunk in response.iter_bytes():
                        if time.monotonic() > deadline:
                            raise ProviderError('provider deadline exceeded')
                        data.extend(chunk)
                        if len(data) > MAX_RESPONSE:
                            raise ProviderError('provider response too large')
                    if response.status_code != 200:
                        raise ProviderError('provider unavailable')
                    payload = stream_response(data) if body and body.get('stream') else json.loads(data)
                    return redact(payload), dict(response.headers)
        except (httpx.HTTPError, ValueError):
            raise ProviderError('provider unavailable') from None


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
            or fields.get('max_results', {}).get('max', 0) < 10):
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
            if not self.catalog_checked:
                catalog, _ = self.network.request('GET', 'https://treg.to/catalog/endpoints/' + TOOL, {})
                validate_catalog(catalog)
                self.catalog_checked = True
            body = {'query': query, 'search_type': 'web', 'max_results': 10}
            key = 'tool_' + digest(encode(body))
            cached = self.store.reserve(self.job_id, self.lease, key, 'tool', TOOL_RESERVE)
            if cached is not None:
                return cached
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
            sources = normalize_results(payload)
            self.store.settle(self.job_id, self.lease, key, cost, receipt, sources)
            if cost is not None and cost > TOOL_RESERVE:
                raise BudgetExceeded('provider exceeded reservation')
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
                return cached
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
                    item['id'] = source['id']
                    if 'timestampSeconds' in source:
                        item['timestampSeconds'] = source['timestampSeconds']
            receipt = headers.get('x-treg-call-id', '')
            receipt = receipt if re.fullmatch(r'[A-Za-z0-9_-]{1,150}', receipt) else None
            self.store.settle(self.job_id, self.lease, key, cost, receipt, normalized)
            if cost is not None and cost > 1000:
                raise BudgetExceeded('provider exceeded reservation')
            return normalized

    def model(self, messages, max_tokens=1800):
        with self.lock:
            self.check()
            if len(encode(messages).encode('utf-8')) > 90000:
                raise ProviderError('model context exceeds bound')
            base, api_key = model_endpoint()
            # Each model attempt reserves separately; retries are not assumed free.
            key = 'model_' + uuid4().hex
            self.store.reserve(self.job_id, self.lease, key, 'model', MODEL_RESERVE)
            self.store.started(self.job_id, self.lease, key)
            self.stage_calls += 1
            body = {'model': model_name(), 'messages': messages,
                    'max_tokens': min(max_tokens or 1800, 12000),
                    'temperature': 0.2, 'stream': False}
            if model_name() == MODEL:
                body.update({'reasoning': {'effort': 'low'},
                             'provider': {'allow_fallbacks': False, 'require_parameters': True,
                                          'data_collection': 'deny',
                                          'max_price': {'prompt': 1, 'completion': 10, 'request': 0}},
                             'usage': {'include': True}})
            else:
                body['stream'] = True
                body['stream_options'] = {'include_usage': True}
            # OmniRoute owns upstream routing; OpenRouter-specific controls do not apply.
            payload, _ = self.network.request('POST', base + '/chat/completions', {
                'Authorization': 'Bearer ' + api_key,
            }, body)
            cost = payload.get('usage', {}).get('cost')
            if isinstance(cost, (int, float)) and not isinstance(cost, bool) and math.isfinite(cost) and cost >= 0:
                billed = int((Decimal(str(cost)) * 1000000).to_integral_value(rounding=ROUND_CEILING))
            else:
                billed = None
            receipt = payload.get('id')
            receipt = receipt if isinstance(receipt, str) and re.fullmatch(r'[A-Za-z0-9_-]{1,150}', receipt) else None
            self.store.settle(self.job_id, self.lease, key, billed, receipt, {})
            if billed is not None and billed > MODEL_RESERVE:
                raise BudgetExceeded('provider exceeded reservation')
            try:
                choice = payload['choices'][0]
                if choice.get('finish_reason') == 'length':
                    raise ProviderError('model output truncated')
                answer = choice['message']['content']
            except (KeyError, IndexError, TypeError):
                raise ProviderError('invalid model response') from None
            if not isinstance(answer, str) or not answer.strip():
                raise ProviderError('empty model response')
            return answer
