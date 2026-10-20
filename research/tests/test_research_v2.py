import asyncio
import io
import json
import unittest
from contextlib import redirect_stderr
from unittest.mock import patch, MagicMock
from research.tests.test_runner import StoreFixture, FakeCalls, FakeEngine, source
from research.contracts import JobInput, Source, ResearchInput, TIERS
from research.evidence import normalize_results
from research.source_channels import platform_for_url
from research.providers import ProviderError, Network, stream_response
from research.worker import run_job
from research.api import relay_diagnostics

INPUT = dict(guestName='Elon Musk', companyName='Tesla', industry='Electric vehicles', audienceCountry='IN')

class ResearchV2Tests(StoreFixture):
    def test_restart_preserves_model_receipt_without_new_inference(self):
        claim = self.claim()
        original = dict(service='openrouter', requestedModel='old/route', reportedModel='old/model')
        claim[3]['modelInfo'] = original.copy()
        claim[3]['sections'] = [dict(key=key, title=title, content='Saved report.', status='completed')
                                for key, (title, _) in TIERS.items()]
        claim[4].update(resolved=True, channel_index=6)
        class Calls(FakeCalls):
            model_info = dict(service='omniroute', requestedModel='new/route')
        asyncio.run(run_job(self.db, claim, FakeEngine, Calls))
        self.assertEqual(self.db.get(self.body['id'])['modelInfo'], original)

    def test_unicode_wire_limits_and_source_normalization(self):
        with self.assertRaises(ValueError):
            ResearchInput(**{**INPUT, 'guestName': '😀' * 61})
        with self.assertRaises(ValueError):
            Source(**{**source(), 'excerpt': 'a' * 11999 + '😀'})
        found = normalize_results({'results': [
            dict(url='https://reddit.com/r/ev', title='😀' * 500, snippet='a' * 11999 + '😀')]})
        self.assertEqual(len(found), 1)
        self.assertEqual(len(found[0]['title'].encode('utf-16-le')) // 2, 500)
        self.assertEqual(found[0]['excerpt'], 'a' * 11999)
        for url, platform in [('https://redd.it/abc123', 'reddit'),
                              ('https://www.youtube-nocookie.com/embed/example', 'youtube'),
                              ('https://reddit.com.example.org/post', 'web')]:
            self.assertEqual(platform_for_url(url), platform)

    def test_structured_input_and_audience_survive_validation(self):
        parsed = JobInput.model_validate({**self.body, 'schemaVersion': 2, 'researchInput': INPUT})
        self.assertEqual(parsed.model_dump()['researchInput'], INPUT)
        with self.assertRaises(ValueError):
            JobInput.model_validate({**self.body, 'researchInput': {**INPUT, 'audienceCountry': 'US'}})

    def test_empty_section_is_failed_with_safe_diagnostic_and_other_results_kept(self):
        class Empty(FakeEngine):
            async def resolve(self, body, sources): return None
            async def tier(self, body, key, description, sources):
                return (' ' if key == 'desserts' else 'A supported observation [src_1].'), sources
        capture = io.StringIO()
        with redirect_stderr(capture):
            asyncio.run(run_job(self.db, self.claim(), Empty, FakeCalls))
        result = self.db.get(self.body['id'])
        self.assertEqual(result['status'], 'partial')
        self.assertEqual(result['sections'][-1]['failure']['code'], 'empty_output')
        self.assertEqual(result['failure']['stage'], 'desserts')
        self.assertIn('research_stage', capture.getvalue())
        self.assertNotIn(self.body['title'], capture.getvalue())
        self.assertNotIn(self.body['id'], capture.getvalue())

    def test_authentication_error_not_retried_and_does_not_leak_body(self):
        class Auth(FakeEngine):
            attempts = 0
            async def resolve(self, body, sources):
                self.__class__.attempts += 1
                raise ProviderError('SUPER_SECRET_BODY', code='authentication')
        capture = io.StringIO()
        with redirect_stderr(capture):
            asyncio.run(run_job(self.db, self.claim(), Auth, FakeCalls))
        result = self.db.get(self.body['id'])
        self.assertEqual(result['failure'], dict(stage='resolve', code='authentication', retryable=False))
        self.assertEqual(Auth.attempts, 1)
        self.assertNotIn('SUPER_SECRET_BODY', capture.getvalue()+json.dumps(result))

    def test_six_channels_and_model_route_metadata_are_persisted(self):
        class Engine(FakeEngine):
            async def resolve(self, body, sources): return None
        asyncio.run(run_job(self.db, self.claim(), Engine, FakeCalls))
        result = self.db.get(self.body['id'])
        self.assertEqual({c['channel'] for c in result['coverage']}, {'web','linkedin','youtube','instagram','reddit','x'})
        self.assertTrue(all(c['status'] != 'found' for c in result['coverage'] if c['channel'] != 'web'))
        self.assertIn('requestedModel', result['modelInfo'])

class NetworkDiagnosticsTests(unittest.TestCase):
    def test_subprocess_relay_strips_private_fields_and_ignores_raw_logs(self):
        private='PRIVATE_BODY'
        payload=(private+'\n'+json.dumps({'event':'research_stage','stage':'main','status':'failed',
            'code':'timeout','message':private,'owner':private,'outputCharacters':12})+'\n')
        capture=io.StringIO()
        with redirect_stderr(capture):
            relay_diagnostics(io.BytesIO(payload.encode()))
        self.assertNotIn(private,capture.getvalue())
        self.assertEqual(json.loads(capture.getvalue())['code'], 'timeout')

    def test_rate_limit_is_classified_without_provider_body(self):
        response = MagicMock(status_code=429)
        response.headers = {'retry-after':'2'}
        response.iter_bytes.return_value = iter([b'PRIVATE PROVIDER BODY'])
        client = MagicMock()
        client.__enter__.return_value.stream.return_value.__enter__.return_value = response
        with patch('research.providers.httpx.Client', return_value=client):
            with self.assertRaises(ProviderError) as caught:
                Network().request('POST','https://example.com',{}, {})
        self.assertEqual(caught.exception.code, 'rate_limit')
        self.assertEqual(caught.exception.retry_after, 2)
        self.assertNotIn('PRIVATE', str(caught.exception))

    def test_stream_keeps_reported_model(self):
        payload=stream_response(b'data: {"model":"actual/model","choices":[{"delta":{"content":"hello"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n')
        self.assertEqual(payload['model'], 'actual/model')
