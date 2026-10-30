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
from research.tests.test_claude_migration import events, wire, message

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
        if url == 'https://api.anthropic.com/v1/messages':
            return message('Public answer'), {}
        raise AssertionError('endpoint not allowlisted')


class ProviderTests(unittest.TestCase):
    def setUp(self):
        credentials = patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'fixture-key'})
        credentials.start()
        self.addCleanup(credentials.stop)
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.tmp.name)/'db.sqlite')
        self.body = body()
        self.store.submit(self.body)
        self.claim = self.store.claim()
        self.net = Network()
        self.calls = Calls(self.store,*self.claim[:2],network=self.net)
    def tearDown(self):
        self.tmp.cleanup()
    def test_research_uses_anthropic_even_with_legacy_gateway_settings(self):
        from research.providers import model_info
        with patch.dict(os.environ, {'OMNIROUTE_BASE_URL': 'https://gateway.example/v1/',
                                     'OMNIROUTE_API_KEY': 'omni-test-secret',
                                     'ANTHROPIC_API_KEY': 'anthropic-test-secret'}):
            self.calls.model([{'role': 'user', 'content': 'Public'}])
            _, url, headers, request = self.net.requests[-1]
            self.assertEqual(url, 'https://api.anthropic.com/v1/messages')
            self.assertEqual(headers['x-api-key'], 'anthropic-test-secret')
            self.assertEqual(request['model'], 'claude-sonnet-5-5')
            self.assertTrue(request['stream'])
            self.assertEqual(model_info(), {'service': 'anthropic', 'requestedModel': 'claude-sonnet-5-5'})
            self.calls.search('Public query')
            self.assertTrue(self.net.requests[-1][1].startswith('https://treg.to/'))
            self.assertEqual(redact({'text': 'omni-test-secret'}), {'text': '[redacted]'})

    def test_missing_anthropic_key_never_falls_back_or_reserves_budget(self):
        from research.providers import configured
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': '',
                                     'OMNIROUTE_BASE_URL': 'https://gateway.example/v1',
                                     'OMNIROUTE_API_KEY': 'secret'}):
            self.assertFalse(configured())
            with self.assertRaises(ProviderError) as caught:
                self.calls.model([{'role': 'user', 'content': 'Public'}])
            self.assertEqual(caught.exception.details['provider'], 'anthropic')
            from research.contracts import Failure
            from research.diagnostics import failure
            Failure.model_validate(failure(caught.exception, 'runner'))
            self.assertEqual(self.store.get(self.claim[0])['cost']['modelUsd'], 0)
        self.assertEqual(self.net.requests, [])

    def test_launcher_loads_anthropic_without_unrelated_secrets(self):
        from research.serve import load_provider_vars
        from research.providers import configured, model_name
        path = Path(self.tmp.name) / 'vars'
        path.write_text('ANTHROPIC_API_KEY=anthropic-test-secret\nTREG_TOKEN=treg-test\n'
                        'RESEARCH_RUNNER_TOKEN=runner-test\nUNRELATED_SECRET=hidden\n'
                        'OMNIROUTE_API_KEY=legacy-secret\n')
        with patch.dict(os.environ, {}, clear=True):
            load_provider_vars(path)
            self.assertEqual(os.environ['ANTHROPIC_API_KEY'], 'anthropic-test-secret')
            self.assertEqual(model_name(), 'claude-sonnet-5-5')
            self.assertTrue(configured())
            self.assertNotIn('UNRELATED_SECRET', os.environ)
            self.assertNotIn('OMNIROUTE_API_KEY', os.environ)

    def test_anthropic_stream_requires_finished_text_and_preserves_usage(self):
        from research.providers import stream_response
        result = stream_response(wire(events('Hello world')))
        self.assertEqual(result['content'], [{'type': 'text', 'text': 'Hello world'}])
        self.assertEqual(result['usage'], {'input_tokens': 11, 'output_tokens': 17})
        self.assertEqual(result['id'], 'msg_fixture')
        for invalid in [b'data: {broken}\n', wire(events()[:-1]),
                        wire([{'type': 'error', 'error': {'type': 'api_error', 'message': 'private'}}]),
                        wire(events()[:6])]:
            with self.assertRaises(ProviderError):
                stream_response(invalid)

    def test_anthropic_stalls_do_not_wait_ten_minutes(self):
        response = MagicMock(status_code=200)
        response.iter_bytes.return_value = iter([b'{}'])
        client = MagicMock()
        client.__enter__.return_value.stream.return_value.__enter__.return_value = response
        with patch.dict(os.environ, {'OMNIROUTE_BASE_URL': 'https://gateway.example/v1'}), \
                patch('research.providers.httpx.Client', return_value=client) as factory:
            ProviderNetwork().request('POST', 'https://api.anthropic.com/v1/messages', {})
            self.assertEqual(factory.call_args.kwargs['timeout'].read, 180)
            self.assertEqual(factory.call_args.kwargs['timeout'].connect, 45)

    def test_keepalive_chunks_do_not_extend_provider_deadline(self):
        response = MagicMock(status_code=200)
        response.iter_bytes.return_value = iter([b' ', b' '])
        client = MagicMock()
        client.__enter__.return_value.stream.return_value.__enter__.return_value = response
        with patch('research.providers.httpx.Client', return_value=client), patch('research.providers.time.monotonic', side_effect=[0, 0, 60, 181, 182]):
            with self.assertRaisesRegex(ProviderError, 'provider deadline exceeded'):
                ProviderNetwork().request('GET', 'https://treg.to/catalog', {})

    def test_stream_that_starts_in_time_can_finish_without_waiting_for_socket_close(self):
        def chunks():
            raw = wire(events('Answer'))
            cut = raw.index(b'"text": "Answer"')
            yield raw[:cut + 5]
            yield raw[cut + 5:]
            raise AssertionError('Must not wait for EOF after message_stop')
        response = MagicMock(status_code=200, headers={})
        response.iter_bytes.side_effect = chunks
        client = MagicMock()
        client.__enter__.return_value.stream.return_value.__enter__.return_value = response
        with patch('research.providers.httpx.Client', return_value=client), \
                patch('research.providers.time.monotonic', side_effect=[0, 169, 170]):
            result, _ = ProviderNetwork()._request('POST', 'https://api.anthropic.com/v1/messages',
                                                   {}, {'stream': True})
        self.assertEqual(result['content'], [{'type': 'text', 'text': 'Answer'}])
        self.assertEqual(result['usage']['output_tokens'], 17)

    def test_reasoning_and_keepalives_do_not_buy_completion_time(self):
        response = MagicMock(status_code=200)
        response.iter_bytes.return_value = iter([wire(events()[:4]), b': heartbeat\n\n'])
        client = MagicMock()
        client.__enter__.return_value.stream.return_value.__enter__.return_value = response
        with patch('research.providers.httpx.Client', return_value=client), \
                patch('research.providers.time.monotonic', side_effect=[0, 170, 181]):
            with self.assertRaisesRegex(ProviderError, 'deadline'):
                ProviderNetwork()._request('POST', 'https://api.anthropic.com/v1/messages', {}, {'stream': True})

    def test_continuous_output_cannot_extend_completion_forever(self):
        delta = {'type': 'content_block_delta', 'index': 1, 'delta': {'type': 'text_delta', 'text': 'Partial'}}
        response = MagicMock(status_code=200)
        response.iter_bytes.return_value = iter([wire(events()[:6]), wire([delta]), wire([delta])])
        client = MagicMock()
        client.__enter__.return_value.stream.return_value.__enter__.return_value = response
        with patch('research.providers.httpx.Client', return_value=client), \
                patch('research.providers.time.monotonic', side_effect=[0, 170, 250, 291]):
            with self.assertRaisesRegex(ProviderError, 'deadline'):
                ProviderNetwork()._request('POST', 'https://api.anthropic.com/v1/messages', {}, {'stream': True})

    def test_search_contract_cache_and_receipt(self):
        found = self.calls.search('Public query')
        self.assertEqual(found,self.calls.search('Public query'))
        paid = [r for r in self.net.requests if '/call/' in r[1]]
        self.assertEqual(len(paid),1)
        self.assertEqual(paid[0][3],{'query':'Public query','search_type':'web','max_results':20})
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
    def test_financial_extraction_requests_verbatim_highlights_with_same_cost_ceiling(self):
        original = self.net.request
        def response(method, url, headers, body=None):
            result = original(method, url, headers, body)
            if url.endswith(EXTRACT) and '/call/' in url:
                return {'results': [{'url': body['urls'][0], 'title': 'Annual report', 'highlights': ['FY2025 revenue was 123 million.', 'Net profit was 12 million.']}]}, result[1]
            return result
        self.net.request = response
        with patch('socket.getaddrinfo', return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('93.184.216.34', 443))]):
            result = self.calls.extract(source(), query='annual financial revenue profit fiscal year')
        self.assertIn('FY2025 revenue was 123 million.', result[0]['excerpt'])
        self.assertEqual(result[0]['id'], source()['id'])
        request = self.net.requests[-1]
        self.assertIn('highlights', request[3])
        self.assertNotIn('text', request[3])
        self.assertNotIn('summary', request[3])
        self.assertEqual(request[2]['X-Treg-Route-Max-Cost'], '0.001')

    def test_private_dns_extraction_blocked(self):
        with patch('socket.getaddrinfo',return_value=[(socket.AF_INET,socket.SOCK_STREAM,6,'',('127.0.0.1',443))]):
            with self.assertRaises(ProviderError): self.calls.extract(source())
        self.assertEqual(self.net.requests,[])
    def test_model_receipt_bounds_and_unknown_cost(self):
        self.calls.model([{'role':'user','content':'Public question'}],16000)
        paid = self.net.requests[-1][3]
        self.assertEqual(paid['model'],MODEL)
        self.assertEqual(MODEL,'claude-sonnet-5-5')
        self.assertEqual(paid['max_tokens'],12000)
        self.assertEqual(paid['output_config'], {'effort': 'medium'})
        self.assertNotIn('provider', paid)
        self.assertIsNone(self.store.get(self.claim[0])['cost']['modelUsd'])
        self.net.model_cost = None
        self.calls.model([{'role':'user','content':'Another public question'}])
        self.assertIsNone(self.store.get(self.claim[0])['cost']['modelUsd'])
    def test_truncated_model_output_is_not_accepted_as_complete(self):
        original = self.net.request
        def truncated(*args, **kwargs):
            payload, headers = original(*args, **kwargs)
            payload['stop_reason'] = 'max_tokens'
            return payload, headers
        self.net.request = truncated
        with self.assertRaisesRegex(ProviderError, 'model output truncated'):
            self.calls.model([{'role':'user','content':'Public question'}])
        self.assertIsNone(self.store.get(self.claim[0])['cost']['modelUsd'])

    def test_unknown_tool_cost_warning(self):
        self.net.cost = None
        self.calls.search('Public')
        self.assertIn('Tool cost includes reserved estimates where receipts unavailable',self.store.get(self.claim[0])['warnings'])
    def test_environment_secrets_redacted_from_provider_data(self):
        with patch.dict(os.environ,{'TREG_TOKEN':'secret-test-token'}):
            self.assertEqual(redact({'text':'secret-test-token'}),{'text':'[redacted]'})

    def test_derived_queries_cannot_reintroduce_withheld_identity(self):
        self.calls.scope = {'excludedSubjects': ['Mukesh Bansal']}
        with self.assertRaises(ProviderError):
            self.calls.search('mukesh bansal biography')
        self.assertEqual(self.net.requests, [])
        self.calls.search('Zomato company background')
        self.assertTrue(self.net.requests)
