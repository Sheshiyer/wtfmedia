import json
import os
from pathlib import Path
import socket
import tempfile
import unittest
from unittest.mock import patch, MagicMock

from research.providers import Calls, EXTRACT, MODEL, TOOL, ProviderError, redact, Network as ProviderNetwork
from research.store import BudgetExceeded, Store, Stopped
from research.tests.test_runner import body, source

CATALOG = json.loads((Path(__file__).parents[1] / 'catalog-receipt.json').read_text())


class Network:
    def __init__(self):
        self.requests = []
        self.fail = False
        self.cost = '5000'
        self.model_cost = 0.000025
    def request(self, method, url, headers, body=None):
        self.requests.append((method,url,headers,body))
        if '/catalog/endpoints/' in url:
            return {'endpoint':next(e for e in CATALOG['endpoints'] if url.endswith(e['id']))}, {}
        if self.fail:
            raise ProviderError('failed')
        if url.endswith(EXTRACT):
            return {'results':[{'url':body['urls'][0],'title':'Raw source','text':'Retained raw page text.'}]}, {'x-treg-cost-micro':'1000','x-treg-call-id':'call_extract'}
        if url.endswith(TOOL):
            return {'results':[{'url':'https://example.com/public','title':'Title','snippet':'Retained excerpt.'}]}, {'x-treg-cost-micro':self.cost,'x-treg-call-id':'call_search'}
        if url == 'https://openrouter.ai/api/v1/chat/completions':
            return {'id':'gen_test','choices':[{'message':{'content':'Public answer'}}],
                    'usage':{'cost':self.model_cost}}, {}
        raise AssertionError('endpoint not allowlisted')


class ProviderTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.tmp.name)/'db.sqlite')
        self.body = body()
        self.store.submit(self.body)
        self.claim = self.store.claim()
        self.net = Network()
        self.calls = Calls(self.store,*self.claim[:2],network=self.net)
    def tearDown(self):
        self.tmp.cleanup()
    def test_omniroute_routes_only_model_calls_and_keeps_unknown_cost(self):
        original = self.net.request
        def gateway(method, url, headers, body=None):
            if url == 'https://gateway.example/v1/chat/completions':
                self.assertEqual(headers['Authorization'], 'Bearer omni-test-secret')
                self.assertEqual(body['model'], 'noesis-research')
                self.assertTrue(body['stream'])
                self.assertNotIn('provider', body)
                self.assertNotIn('usage', body)
                return {'choices': [{'finish_reason': 'stop', 'message': {'content': 'Answer'}}],
                        'usage': {'total_tokens': 20}}, {}
            return original(method, url, headers, body)
        self.net.request = gateway
        with patch.dict(os.environ, {'OMNIROUTE_BASE_URL': 'https://gateway.example/v1/',
                                     'OMNIROUTE_API_KEY': 'omni-test-secret'}):
            self.assertEqual(self.calls.model([{'role': 'user', 'content': 'Public'}]), 'Answer')
            self.assertIsNone(self.store.get(self.claim[0])['cost']['modelUsd'])
            self.assertEqual(redact({'text': 'omni-test-secret'}), {'text': '[redacted]'})
            self.calls.search('Public query')
            self.assertTrue(self.net.requests[-1][1].startswith('https://treg.to/'))

    def test_incomplete_or_unsafe_gateway_fails_before_network(self):
        for url, key in [('https://gateway.example/v1', ''), ('', 'secret'),
                         ('http://gateway.example/v1', 'secret'),
                         ('https://user:pass@gateway.example/v1', 'secret'),
                         ('https://gateway.example/v1?key=secret', 'secret')]:
            with self.subTest(url=url), patch.dict(os.environ, {
                    'OMNIROUTE_BASE_URL': url, 'OMNIROUTE_API_KEY': key}):
                with self.assertRaises(ProviderError):
                    self.calls.model([{'role': 'user', 'content': 'Public'}])
        self.assertEqual(self.net.requests, [])

    def test_launcher_loads_gateway_settings_without_unrelated_secrets(self):
        from research.serve import load_provider_vars
        from research.providers import configured, model_name
        path = Path(self.tmp.name) / 'vars'
        path.write_text('OMNIROUTE_BASE_URL=https://gateway.example/v1\n'
                        'OMNIROUTE_API_KEY=omni-test-secret\nTREG_TOKEN=treg-test\n'
                        'RESEARCH_RUNNER_TOKEN=runner-test\nUNRELATED_SECRET=hidden\n')
        with patch.dict(os.environ, {}, clear=True):
            load_provider_vars(path)
            self.assertEqual(os.environ['OMNIROUTE_API_KEY'], 'omni-test-secret')
            self.assertEqual(model_name(), 'noesis-research')
            self.assertTrue(configured())
            self.assertNotIn('UNRELATED_SECRET', os.environ)

    def test_gateway_stream_requires_finished_text_and_preserves_usage(self):
        from research.providers import stream_response
        events = [
            {'id': 'gen-test', 'choices': [{'delta': {'content': 'Hello '}, 'finish_reason': None}]},
            {'choices': [{'delta': {'content': 'world'}, 'finish_reason': 'stop'}]},
            {'choices': [], 'usage': {'total_tokens': 7}},
        ]
        raw = ''.join('data: ' + json.dumps(e) + '\n\n' for e in events).encode()
        result = stream_response(raw + b'data: [DONE]\n\n')
        self.assertEqual(result['choices'][0]['message']['content'], 'Hello world')
        self.assertEqual(result['usage'], {'total_tokens': 7})
        self.assertEqual(result['id'], 'gen-test')
        for invalid in [b'data: {broken}\n', b'data: [DONE]\n',
                        b'data: {"error":{"message":"private"}}\n',
                        b'data: {"choices":[{"delta":{"content":"partial"}}]}\n']:
            with self.assertRaises(ProviderError):
                stream_response(invalid)

    def test_gateway_report_has_full_read_window(self):
        response = MagicMock(status_code=200)
        response.iter_bytes.return_value = iter([b'{}'])
        client = MagicMock()
        client.__enter__.return_value.stream.return_value.__enter__.return_value = response
        with patch.dict(os.environ, {'OMNIROUTE_BASE_URL': 'https://gateway.example/v1'}), \
                patch('research.providers.httpx.Client', return_value=client) as factory:
            ProviderNetwork().request('POST', 'https://gateway.example/v1/chat/completions', {})
            self.assertEqual(factory.call_args.kwargs['timeout'].read, 600)
            self.assertEqual(factory.call_args.kwargs['timeout'].connect, 45)

    def test_keepalive_chunks_do_not_extend_provider_deadline(self):
        response = MagicMock(status_code=200)
        response.iter_bytes.return_value = iter([b' ', b' '])
        client = MagicMock()
        client.__enter__.return_value.stream.return_value.__enter__.return_value = response
        with patch('research.providers.httpx.Client', return_value=client), patch('research.providers.time.monotonic', side_effect=[0, 60, 601]):
            with self.assertRaisesRegex(ProviderError, 'provider deadline exceeded'):
                ProviderNetwork().request('GET', 'https://treg.to/catalog', {})

    def test_search_contract_cache_and_receipt(self):
        found = self.calls.search('Public query')
        self.assertEqual(found,self.calls.search('Public query'))
        paid = [r for r in self.net.requests if '/call/' in r[1]]
        self.assertEqual(len(paid),1)
        self.assertEqual(paid[0][3],{'query':'Public query','search_type':'web','max_results':10})
        self.assertEqual(paid[0][2]['X-Treg-Route-Max-Cost'],'0.005')
        self.assertEqual(self.store.get(self.claim[0])['cost']['toolMicro'],5000)
        with self.store.db() as db:
            row = db.execute('SELECT receipt,tries FROM calls').fetchone()
            self.assertEqual(row['receipt'],'call_search')
            self.assertEqual(row['tries'],1)
    def test_retry_keeps_idempotency_and_reservation(self):
        self.net.fail = True
        with self.assertRaises(ProviderError): self.calls.search('Query')
        self.net.fail = False
        self.calls.search('Query')
        paid = [r for r in self.net.requests if '/call/' in r[1]]
        self.assertEqual(paid[0][2]['Idempotency-Key'],paid[1][2]['Idempotency-Key'])
        self.assertEqual(self.store.get(self.claim[0])['cost']['toolMicro'],5000)
    def test_retry_bound_survives_new_adapter(self):
        self.net.fail = True
        for _ in range(2):
            with self.assertRaises(ProviderError): self.calls.search('Query')
        other = Calls(self.store,*self.claim[:2],network=self.net)
        with self.assertRaises(BudgetExceeded): other.search('Query')
        self.assertEqual(len([r for r in self.net.requests if '/call/' in r[1]]),2)
    def test_budget_rejects_before_paid_network(self):
        with self.store.db() as db:
            db.execute('UPDATE jobs SET body=?',(json.dumps({**self.body,'budgetMicro':0}),))
        with self.assertRaises(BudgetExceeded): self.calls.search('Public')
        self.assertFalse(any('/call/' in r[1] for r in self.net.requests))
    def test_cancellation_prevents_any_request(self):
        self.store.cancel(self.claim[0])
        with self.assertRaises(Stopped): self.calls.search('Public')
        self.assertEqual(self.net.requests,[])
    def test_extract_no_summaries_no_new_timestamps(self):
        with patch('socket.getaddrinfo',return_value=[(socket.AF_INET,socket.SOCK_STREAM,6,'',('93.184.216.34',443))]):
            result = self.calls.extract(source())
        self.assertEqual(result[0]['kind'],'page_extract')
        self.assertNotIn('timestampSeconds',result[0])
        paid = self.net.requests[-1]
        self.assertEqual(paid[3],{'urls':[source()['url']],'text':{'maxCharacters':12000}})
        self.assertEqual(paid[2]['X-Treg-Route-Max-Cost'],'0.001')
    def test_private_dns_extraction_blocked(self):
        with patch('socket.getaddrinfo',return_value=[(socket.AF_INET,socket.SOCK_STREAM,6,'',('127.0.0.1',443))]):
            with self.assertRaises(ProviderError): self.calls.extract(source())
        self.assertEqual(self.net.requests,[])
    def test_model_receipt_bounds_and_unknown_cost(self):
        self.calls.model([{'role':'user','content':'Public question'}],16000)
        paid = self.net.requests[-1][3]
        self.assertEqual(paid['model'],MODEL)
        self.assertEqual(MODEL,'deepseek/deepseek-v4-flash-0731')
        self.assertEqual(paid['max_tokens'],12000)
        self.assertEqual(paid['reasoning'],{'effort':'low'})
        self.assertFalse(paid['provider']['allow_fallbacks'])
        self.assertEqual(paid['provider']['max_price'],{'prompt':1,'completion':10,'request':0})
        self.assertEqual(self.store.get(self.claim[0])['cost']['modelUsd'],0.000025)
        self.net.model_cost = None
        self.calls.model([{'role':'user','content':'Another public question'}])
        self.assertIsNone(self.store.get(self.claim[0])['cost']['modelUsd'])
    def test_truncated_model_output_is_not_accepted_as_complete(self):
        original = self.net.request
        def truncated(*args, **kwargs):
            payload, headers = original(*args, **kwargs)
            payload['choices'][0]['finish_reason'] = 'length'
            return payload, headers
        self.net.request = truncated
        with self.assertRaisesRegex(ProviderError, 'model output truncated'):
            self.calls.model([{'role':'user','content':'Public question'}])
        self.assertEqual(self.store.get(self.claim[0])['cost']['modelUsd'],0.000025)

    def test_unknown_tool_cost_warning(self):
        self.net.cost = None
        self.calls.search('Public')
        self.assertIn('Tool cost includes reserved estimates where receipts unavailable',self.store.get(self.claim[0])['warnings'])
    def test_environment_secrets_redacted_from_provider_data(self):
        with patch.dict(os.environ,{'TREG_TOKEN':'secret-test-token'}):
            self.assertEqual(redact({'text':'secret-test-token'}),{'text':'[redacted]'})
