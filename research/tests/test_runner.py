import asyncio
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4

from research.tests.loop_support import enable_if_needed
enable_if_needed()

from fastapi.testclient import TestClient

from research.api import create_app
from research.contracts import ChatInput, JobInput, Source, safe_url
from research.evidence import (merge_sources, normalize_results, number_comparison,
                               select_context, validate_report)
from research.providers import Calls, ProviderError, validate_catalog
from research.store import BudgetExceeded, Conflict, Gone, QueueFull, Stopped, Store
from research.worker import run_job


def body(**changes):
    return JobInput(id='rrun_' + str(uuid4()), title='Example public founder', **changes).model_dump()


def source(n=1, **changes):
    return dict(id=f'src_{n}', title=f'Founder podcast interview {n}',
                url=f'https://publisher{n}.com/story', excerpt='Revenue was 20 USD million in India in 2024.',
                retrievedAt='2026-10-13T00:00:00Z', kind='page_extract', **changes)


class FakeCalls:
    def __init__(self, *args):
        self.stage_error = None
    def stage(self):
        self.stage_error = None
    def search(self, query):
        return [source(i) for i in range(1, 7)]
    def model(self, messages, max_tokens=1800):
        return '{"claims":[]}'


class FakeEngine:
    attempts = {}
    failing = None
    clarification = None
    def __init__(self, calls):
        self.calls = calls
    async def resolve(self, body, sources):
        return self.clarification
    async def tier(self, body, key, description, sources):
        self.attempts[key] = self.attempts.get(key, 0) + 1
        if key == self.failing:
            raise ProviderError('private error body MUST NOT appear')
        return 'A useful public observation [src_1].', sources


class StoreFixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Store(Path(self.tmp.name) / 'state.sqlite')
        self.body = body()
    def tearDown(self):
        self.tmp.cleanup()
    def claim(self):
        self.db.submit(self.body)
        return self.db.claim()


class StoreTests(StoreFixture):
    def test_idempotent_and_conflict(self):
        first = self.db.submit(self.body)
        self.assertEqual(first, self.db.submit(dict(reversed(list(self.body.items())))))
        with self.assertRaises(Conflict):
            self.db.submit({**self.body, 'title': 'Different public person'})
    def test_cancel_before_submission(self):
        self.assertEqual(self.db.cancel(self.body['id'])['status'], 'cancelled')
        with self.assertRaises(Gone):
            self.db.submit(self.body)
    def test_delete_before_submission(self):
        self.db.delete(self.body['id'])
        with self.assertRaises(Gone):
            self.db.submit(self.body)
    def test_cancel_and_delete_fence_late_writes(self):
        claim = self.claim()
        self.db.reserve(*claim[:2], 'tool_1', 'tool', 5000)
        self.db.cancel(claim[0])
        with self.assertRaises(Stopped):
            self.db.save(*claim[:2], claim[3], {})
        self.db.delete(claim[0])
        with self.assertRaises(Stopped):
            self.db.settle(*claim[:2], 'tool_1', 5000, 'receipt', {'private':'payload'})
        self.assertIsNone(self.db.get(claim[0]))
        with self.db.db() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM calls').fetchone()[0], 0)
        with self.assertRaises(Gone):
            self.db.submit(self.body)
    def test_expired_lease_recovery_and_old_writer_fenced(self):
        old = self.claim()
        result, state = old[3], {'snacks': 1}
        result['sections'] = [{'key':'snacks','title':'Snacks','content':'done','status':'completed'}]
        self.db.save(*old[:2], result, state)
        with self.db.db() as db:
            db.execute('UPDATE jobs SET expires=0')
        new = self.db.claim()
        self.assertNotEqual(old[1], new[1])
        self.assertEqual(new[3]['sections'], result['sections'])
        self.assertEqual(new[4], state)
        with self.assertRaises(Stopped):
            self.db.heartbeat(*old[:2])
    def test_budget_reserved_before_calls_and_unknown_cost(self):
        self.body['budgetMicro'] = 5000
        claim = self.claim()
        self.db.reserve(*claim[:2], 'call1', 'tool', 5000)
        with self.assertRaises(BudgetExceeded):
            self.db.reserve(*claim[:2], 'call2', 'tool', 1)
        result = self.db.get(claim[0])
        self.assertEqual(result['cost']['toolMicro'], 5000)
        self.assertIn('Tool cost includes reserved estimates where receipts unavailable', result['warnings'])
    def test_queue_limit_replays_before_admission(self):
        self.db.submit(self.body)
        for _ in range(99):
            self.db.submit(body())
        self.assertEqual(self.db.submit(self.body)['status'], 'queued')
        with self.assertRaises(QueueFull):
            self.db.submit(body())
    def test_only_one_claim_and_private_permissions(self):
        self.claim()
        self.assertIsNone(self.db.claim())
        self.assertEqual(os.stat(self.db.path).st_mode & 0o777, 0o600)
    def test_disposable_chat_not_claimed_by_research_worker(self):
        self.db.submit(self.body, kind='chat')
        self.assertIsNone(self.db.claim())
        self.assertIsNotNone(self.db.claim_id(self.body['id']))


class WorkflowTests(StoreFixture):
    def setUp(self):
        super().setUp()
        FakeEngine.attempts = {}
        FakeEngine.failing = FakeEngine.clarification = None
    def test_four_tiers(self):
        claim = self.claim()
        asyncio.run(run_job(self.db, claim, FakeEngine, FakeCalls))
        result = self.db.get(claim[0])
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(len(result['sections']), 4)
        self.assertEqual(len(result['sources']), 6)
        self.assertNotIn('Prior appearance discovery', result['sections'][0]['content'])
    def test_discovery_preserves_full_request_without_episode_bias(self):
        queries = []
        class CaptureCalls(FakeCalls):
            def search(self, query):
                queries.append(query)
                return super().search(query)
        self.body['title'] = 'Research Elon Musk, Tesla and competitor BYD'
        asyncio.run(run_job(self.db, self.claim(), FakeEngine, CaptureCalls))
        self.assertEqual(len(queries), 6)
        self.assertTrue(any('site:youtube.com' in query for query in queries))
        for query in queries:
            self.assertIn(self.body['title'], query)
            self.assertNotIn('episode', query)

    def test_failed_tier_does_not_erase_others(self):
        FakeEngine.failing = 'appetizers'
        claim = self.claim()
        asyncio.run(run_job(self.db, claim, FakeEngine, FakeCalls))
        result = self.db.get(claim[0])
        self.assertEqual(result['status'], 'partial')
        self.assertEqual(FakeEngine.attempts['appetizers'], 2)
        self.assertNotIn('private error body', json.dumps(result))
    def test_clarification_stops_research(self):
        FakeEngine.clarification = 'Which founder and company?'
        claim = self.claim()
        asyncio.run(run_job(self.db, claim, FakeEngine, FakeCalls))
        self.assertEqual(self.db.get(claim[0])['status'], 'clarification')
        self.assertEqual(FakeEngine.attempts, {})
    def test_single_tier_preserves_other_sections(self):
        self.body.update(section='main', sections=[dict(key='snacks',title='Snacks',content='Prior',status='completed')])
        claim = self.claim()
        asyncio.run(run_job(self.db, claim, FakeEngine, FakeCalls))
        result = self.db.get(claim[0])
        self.assertEqual(result['sections'][0]['content'], 'Prior')
        self.assertEqual(FakeEngine.attempts, {'main':1})
    def test_recovery_skips_completed_tier(self):
        claim = self.claim()
        claim[3]['sections'] = [dict(key='snacks',title='Snacks',content='Prior',status='completed')]
        claim[4]['resolved'] = True
        asyncio.run(run_job(self.db, claim, FakeEngine, FakeCalls))
        self.assertNotIn('snacks', FakeEngine.attempts)
    def test_cancel_mid_tier(self):
        db = self.db
        class CancelEngine(FakeEngine):
            async def tier(self, body, key, description, sources):
                db.cancel(body['id'])
                return 'late answer [src_1]', sources
        claim = self.claim()
        asyncio.run(run_job(self.db, claim, CancelEngine, FakeCalls))
        result = self.db.get(claim[0])
        self.assertEqual(result['status'], 'cancelled')
        self.assertNotIn('late answer', json.dumps(result))


class EvidenceTests(unittest.TestCase):
    def test_alpha_reference_is_discovery_only(self):
        s = {**source(), 'id':'alpha_video_1', 'kind':'alpha_reference', 'excerpt':'', 'timestampSeconds':42}
        text, warnings = validate_report('Claim [alpha_video_1].', [s])
        self.assertNotIn('[alpha_video_1]', text)
        self.assertIn('Unsupported citation removed.', warnings)
        upgraded = merge_sources([s], [{**source(), 'url':s['url']}])[0]
        self.assertEqual(upgraded['id'], s['id'])
        self.assertEqual(upgraded['timestampSeconds'], 42)
    def test_snippets_not_timestamps(self):
        s = normalize_results({'results':[{'url':'https://example.com/podcast','title':'Interview','snippet':'At 15:00 they discuss growth.'}]})[0]
        self.assertEqual(s['kind'], 'search_snippet')
        self.assertNotIn('timestampSeconds', s)
    def test_unsafe_urls(self):
        for url in ('file:///tmp/test', 'http://127.0.0.1/x','http://169.254.169.254/x',
                    'http://foo.local/x','https://name:pass@example.com','javascript:alert(1)',
                    'http://2130706433/', 'http://[::1]/'):
            with self.subTest(url=url), self.assertRaises(ValueError):
                safe_url(url)
    def test_validation_does_not_label_every_paragraph_unverified(self):
        text, warnings = validate_report('# Background\n\nA sourced observation [src_1].', [source()])
        self.assertTrue(text.startswith('# Background'))
        self.assertNotIn('Unverified synthesis:', text)
        self.assertIn('Generated claims require editorial verification against retained extracts.', warnings)

    def test_fabricated_citations_removed(self):
        text, warnings = validate_report('Growth 20% [invented]. [link](https://bad.com)', [source()])
        self.assertNotIn('invented', text)
        self.assertNotIn('https://bad.com', text)
        self.assertIn('(supporting source not retained)', text)
        self.assertNotIn('unverified', text.lower())
        self.assertTrue(any('figures' in w for w in warnings))
    def test_per_claim_numeric_disagreement_and_forged_quote(self):
        a, b = source(), source(2)
        b['excerpt'] = 'Revenue was 20 INR million in India in 2023.'
        claim = 'Revenue was 20 million.'
        evidence = []
        for s, unit, year in ((a, 'USD', '2024'), (b, 'INR','2023')):
            evidence.append(dict(sourceId=s['id'], quote=s['excerpt'], value='20',unit=unit,
                                 period=year,geography='India',definition='Revenue'))
        content, _ = number_comparison(claim,[a,b],[{'claim':claim,'evidence':evidence}])
        self.assertIn('disagree', content)
        self.assertIn('USD', content)
        self.assertIn('2023', content)
        evidence[0]['quote'] = 'fabricated supporting quotation'
        content, _ = number_comparison(claim,[a,b],[{'claim':claim,'evidence':evidence}])
        self.assertNotIn('fabricated', content)
    def test_80_sources_context_is_bounded_and_verbatim(self):
        sources = [{**source(i), 'excerpt': ('full retained text ' * 1000)[:12000]} for i in range(80)]
        selected = select_context(sources, 'founder')
        self.assertLess(len(json.dumps(selected)), 35000)
        self.assertEqual(len(sources), 80)
        for s in selected:
            self.assertTrue(sources[int(s['id'][4:])]['excerpt'].startswith(s['excerpt']))


class ApiTests(StoreFixture):
    def setUp(self):
        super().setUp()
        self.env = patch.dict(os.environ, {'RESEARCH_RUNNER_TOKEN':'local-test-token'})
        self.env.start()
        self.client = TestClient(create_app(self.db, ready=lambda:True))
        self.client.__enter__()
        self.headers = {'Authorization':'Bearer local-test-token'}
    def tearDown(self):
        self.client.__exit__(None,None,None)
        self.env.stop()
        super().tearDown()
    def test_all_routes_require_auth(self):
        for method,path in [('get','/health'),('post','/jobs'),('get','/jobs/'+self.body['id']),
                            ('delete','/jobs/'+self.body['id']),('post','/jobs/'+self.body['id']+'/cancel'),('post','/chat')]:
            self.assertEqual(getattr(self.client,method)(path).status_code, 401)
    def test_api_late_post_after_unknown_cancel_delete(self):
        for operation in ('cancel','delete'):
            payload = body()
            route = '/jobs/' + payload['id']
            if operation == 'cancel':
                response = self.client.post(route+'/cancel',headers=self.headers)
                self.assertEqual(response.json()['status'], 'cancelled')
            else:
                self.assertEqual(self.client.delete(route,headers=self.headers).status_code, 204)
            self.assertEqual(self.client.post('/jobs',json=payload,headers=self.headers).status_code,410)
    def test_create_status_and_conflict(self):
        response = self.client.post('/jobs',json=self.body,headers=self.headers)
        self.assertEqual(response.status_code,202)
        self.assertEqual(self.client.get('/jobs/'+self.body['id'],headers=self.headers).json()['cost'],{'toolMicro':0,'modelUsd':0})
        self.assertEqual(self.client.post('/jobs',json={**self.body,'title':'Changed'},headers=self.headers).status_code,409)
    def test_invalid_body_does_not_echo_private_input(self):
        response = self.client.post('/jobs',json={**self.body,'notes':'private'*3000},headers=self.headers)
        self.assertEqual(response.status_code,422)
        self.assertNotIn('private',response.text)
    def test_alpha_optional_fields_omitted_from_response(self):
        payload = {**self.body, 'sources':[dict(id='alpha_video_1',title='Alpha link',
                   url='https://youtube.com/watch?v=abcdef',excerpt='',kind='alpha_reference',
                   retrievedAt='2026-10-13',timestampSeconds=42)]}
        self.assertEqual(self.client.post('/jobs',json=payload,headers=self.headers).status_code,202)
        item = self.client.get('/jobs/'+payload['id'],headers=self.headers).json()['sources'][0]
        self.assertNotIn('publisher',item)
        self.assertNotIn('publishedAt',item)
        self.assertEqual(item['timestampSeconds'],42)
        self.assertNotIn(None,item.values())
    def test_unconfigured_rejects_new_work_but_allows_cleanup(self):
        with TestClient(create_app(self.db,ready=lambda:False)) as client:
            self.assertFalse(client.get('/health',headers=self.headers).json()['configured'])
            self.assertEqual(client.post('/jobs',json=self.body,headers=self.headers).status_code,503)
            self.assertEqual(client.delete('/jobs/'+self.body['id'],headers=self.headers).status_code,204)
            self.assertEqual(client.post('/jobs/'+self.body['id']+'/cancel',headers=self.headers).status_code,200)


if __name__ == '__main__':
    unittest.main()
