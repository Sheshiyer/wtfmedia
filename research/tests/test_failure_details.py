import io
import json
import unittest
from contextlib import redirect_stderr
from unittest.mock import MagicMock, patch
from research.providers import Network, ProviderError, stream_response
from research.diagnostics import failure, emit
from research.api import relay_diagnostics

class FailureDetailsTests(unittest.TestCase):
    def test_successful_request_logs_duration_without_content(self):
        capture = io.StringIO()
        with patch.object(Network, '_request', return_value=({'content': 'PRIVATE_ANSWER'}, {})), \
                patch('research.providers.time.monotonic', side_effect=[10, 12.5]), \
                redirect_stderr(capture):
            Network().request('POST', 'https://api.anthropic.com/v1/messages',
                              {'Authorization': 'PRIVATE_KEY'}, {'messages': ['PRIVATE_INPUT']})
        events = [json.loads(line) for line in capture.getvalue().splitlines()]
        self.assertEqual([e['status'] for e in events], ['started', 'completed'])
        self.assertEqual(events[-1]['elapsedMs'], 2500)
        self.assertEqual(events[-1]['operation'], 'model')
        self.assertNotIn('PRIVATE', capture.getvalue())

    def test_http_status_and_operation_survive_without_response_body(self):
        response=MagicMock(status_code=503, headers={})
        response.iter_bytes.return_value=iter([b'PRIVATE_SERVER_TEXT'])
        client=MagicMock()
        client.__enter__.return_value.stream.return_value.__enter__.return_value=response
        with patch('research.providers.httpx.Client',return_value=client):
            with self.assertRaises(ProviderError) as caught:
                Network().request('POST','https://treg.to/call/perplexity.web.search',{}, {'query':'PRIVATE_QUERY'})
        info=failure(caught.exception,'appetizers')
        self.assertEqual(info['reason'],'http_error')
        self.assertEqual(info['httpStatus'],503)
        self.assertEqual(info['provider'],'treg')
        self.assertEqual(info['operation'],'search')
        self.assertNotIn('PRIVATE',json.dumps(info))

    def test_interrupted_stream_has_distinct_reason(self):
        with self.assertRaises(ProviderError) as caught:
            stream_response(b'data: {"type":"message_start","message":{}}\n')
        self.assertEqual(failure(caught.exception,'main')['reason'],'stream_incomplete')

    def test_relay_keeps_only_allowlisted_diagnostics(self):
        safe=dict(event='research_stage',stage='main',status='failed',code='provider_unavailable',reason='http_error',provider='omniroute',operation='model',httpStatus=502,requestBytes=100,responseBytes=0)
        capture=io.StringIO()
        with redirect_stderr(capture):
            relay_diagnostics(io.BytesIO((json.dumps({**safe,'message':'PRIVATE','url':'PRIVATE','authorization':'PRIVATE'})+'\n').encode()))
        self.assertEqual(json.loads(capture.getvalue()),safe)
        capture=io.StringIO()
        with redirect_stderr(capture): emit({**safe,'reason':'PRIVATE','provider':'PRIVATE','operation':'PRIVATE','httpStatus':'PRIVATE'})
        self.assertNotIn('PRIVATE',capture.getvalue())

    def test_local_context_limit_is_not_reported_as_a_retryable_outage(self):
        from research.tests.test_providers import ProviderTests
        fixture=ProviderTests('test_model_receipt_bounds_and_unknown_cost')
        fixture.setUp()
        try:
            with self.assertRaises(ProviderError) as caught:
                fixture.calls.model([{'role':'user','content':'x'*90001}])
            info=failure(caught.exception,'main')
            self.assertEqual(info['reason'],'context_limit')
            self.assertEqual(info['provider'],'runner')
            self.assertFalse(info['retryable'])
            self.assertEqual(fixture.net.requests,[])
        finally:
            fixture.tearDown()

    def test_stream_error_retains_numeric_upstream_status_without_private_message(self):
        with self.assertRaises(ProviderError) as caught:
            stream_response(b'data: {"type":"error","error":{"type":"rate_limit_error","message":"PRIVATE"}}\n')
        info=failure(caught.exception,'appetizers')
        self.assertEqual(info['reason'],'stream_error')
        self.assertEqual(info['httpStatus'],429)
        self.assertEqual(info['code'],'rate_limit')
        self.assertNotIn('PRIVATE',json.dumps(info))

    def test_model_diagnostics_never_accept_arbitrary_text_as_model_id(self):
        for model in ['PRIVATE_SUBJECT', 'fixture-claude-key', {'private': True}]:
            capture = io.StringIO()
            with redirect_stderr(capture):
                emit(dict(stage='runner', status='completed', provider='anthropic', model=model))
            self.assertNotIn('model', json.loads(capture.getvalue()))
        capture = io.StringIO()
        with redirect_stderr(capture):
            emit(dict(stage='runner', status='completed', provider='anthropic', model='claude-sonnet-5-5'))
        self.assertEqual(json.loads(capture.getvalue())['model'], 'claude-sonnet-5-5')
