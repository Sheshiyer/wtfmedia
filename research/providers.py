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


def configured():
    try:
        installed = importlib.metadata.version('gpt-researcher') == '0.16.1'
    except importlib.metadata.PackageNotFoundError:
        installed = False
    return installed and all(os.environ.get(k, '').strip() for k in
                             ('RESEARCH_RUNNER_TOKEN', 'TREG_TOKEN', 'OPENROUTER_API_KEY'))


def redact(value):
    text = encode(value)
    for name in ('RESEARCH_RUNNER_TOKEN', 'TREG_TOKEN', 'OPENROUTER_API_KEY'):
        secret = os.environ.get(name, '')
        if secret:
            text = text.replace(secret, '[redacted]')
    return json.loads(text)


class Network:
    def request(self, method, url, headers, body=None):
        try:
            deadline = time.monotonic() + 600
            with httpx.Client(timeout=45, follow_redirects=False, trust_env=False) as client:
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
                    return redact(json.loads(data)), dict(response.headers)
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
            # Each model attempt reserves separately: OpenRouter retries are not assumed free.
            key = 'model_' + uuid4().hex
            self.store.reserve(self.job_id, self.lease, key, 'model', MODEL_RESERVE)
            self.store.started(self.job_id, self.lease, key)
            self.stage_calls += 1
            payload, _ = self.network.request('POST', 'https://openrouter.ai/api/v1/chat/completions', {
                'Authorization': 'Bearer ' + os.environ.get('OPENROUTER_API_KEY', ''),
            }, {'model': MODEL, 'messages': messages, 'max_tokens': min(max_tokens or 1800, 12000),
                'temperature': 0.2, 'stream': False,
                # Low effort leaves room in the completion budget for the answer.
                'reasoning': {'effort': 'low'},
                'provider': {'allow_fallbacks': False, 'require_parameters': True,
                             'data_collection': 'deny',
                             'max_price': {'prompt': 1, 'completion': 10, 'request': 0}},
                'usage': {'include': True}})
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
