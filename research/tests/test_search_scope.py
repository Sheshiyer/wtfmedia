import asyncio
from datetime import date
import json
import unittest

from research.tests.test_evidence_retention import source
from research.tests.loop_support import enable_if_needed
enable_if_needed()


class SearchScopeTests(unittest.TestCase):
    def test_approved_notes_become_public_focus_and_calendar_date_window(self):
        from research.scope import plan_scope
        class Calls:
            def model(self, messages, max_tokens, **kwargs):
                self.messages = messages
                return json.dumps(dict(focus='India hiring and EV supply chains', relativePeriod={'count': 5, 'unit': 'months'}, dateFrom=None, dateTo=None, clarification=None))
        calls = Calls()
        scope = asyncio.run(plan_scope(calls, dict(title='Example Company', notes='PRIVATE_CONTEXT: focus on hiring in the last five months', notesApproved=True), today=date(2026, 10, 20)))
        self.assertEqual(scope, dict(focus='India hiring and EV supply chains', dateFrom='2026-05-20', dateTo='2026-10-20', clarification=None))
        self.assertNotIn('PRIVATE_CONTEXT', json.dumps(scope))

    def test_unapproved_notes_cannot_affect_scope_or_trigger_model(self):
        from research.scope import plan_scope
        class Calls:
            def model(self, *args): raise AssertionError('Unapproved notes sent')
        scope = asyncio.run(plan_scope(Calls(), dict(title='Example', notes='Last 5 months PRIVATE', notesApproved=False)))
        self.assertEqual(scope, {})

    def test_relative_months_clamp_and_invalid_ranges_fail(self):
        from research.scope import resolve_scope
        self.assertEqual(resolve_scope(dict(focus='', relativePeriod={'count': 1, 'unit': 'months'}), date(2024, 3, 31))['dateFrom'], '2024-02-29')
        for plan in [dict(dateFrom='2026-10-30', dateTo='2026-10-01'), dict(dateFrom='2026-02-30'), dict(relativePeriod={'count': -1, 'unit': 'months'}), dict(focus='x', unexpected='raw')]:
            with self.assertRaises(ValueError): resolve_scope(plan, date(2026,10,20))

    def test_all_channels_enforce_publication_dates_and_do_not_use_retrieval_time(self):
        from research.scope import filter_sources
        scope = dict(dateFrom='2026-05-20', dateTo='2026-10-20')
        rows = [source(1, publishedAt='2026-05-20'), source(2, publishedAt='2026-10-20T23:59:59Z'), source(3, publishedAt='2026-05-19'), source(4), source(5, publishedAt='not-a-date'), source(6, publishedAt='2026-10-21')]
        self.assertEqual([s['id'] for s in filter_sources(rows, scope)], ['src_1','src_2'])
        self.assertEqual(filter_sources(rows, {}), rows)

    def test_native_social_date_filters_and_public_focus(self):
        from research.source_channels import dedicated_input, channel_query
        body = dict(title='Example', researchInput={'guestName':'Guest','companyName':'Company','industry':'EV'}, searchScope={'focus':'jobs', 'dateFrom':'2026-05-20','dateTo':'2026-10-20'})
        self.assertEqual(dedicated_input('youtube',body)['publishedAfter'], '2026-05-20T00:00:00Z')
        self.assertIn('since:2026-05-20 until:2026-10-21', dedicated_input('x',body)['query'])
        self.assertIn('jobs', channel_query('web',body))
        self.assertIn('2026-05-20', channel_query('web',body))
        self.assertNotIn('publishedBefore', dedicated_input('youtube',body))

    def test_query_limit_never_truncates_date_constraint(self):
        from research.scope import scoped_query
        query = scoped_query('x' * 1200, {'focus':'India jobs','dateFrom':'2026-05-20','dateTo':'2026-10-20'})
        self.assertLessEqual(len(query),1200)
        self.assertIn('2026-05-20',query)
        self.assertIn('2026-10-20',query)

    def test_general_editorial_guidance_has_no_implicit_date_filter(self):
        from research.scope import plan_scope
        class Calls:
            def model(self, messages, max_tokens, **kwargs):
                return json.dumps(dict(focus='Compare India supply chains and job opportunities; exclude stock prices', relativePeriod=None, dateFrom=None, dateTo=None, clarification=None))
        scope=asyncio.run(plan_scope(Calls(),dict(title='Company',notes='Compare competitors and prioritize jobs, not stock prices. Prepare challenging interview questions.',notesApproved=True)))
        self.assertIsNone(scope['dateFrom'])
        self.assertIsNone(scope['dateTo'])
        self.assertIn('job opportunities',scope['focus'])
        self.assertIn('exclude stock prices',scope['focus'])

    def test_run_checkpoints_guidance_and_filters_discovery_before_synthesis(self):
        from research.tests.test_runner import StoreFixture, FakeCalls, FakeEngine, body
        from research.store import Store
        from research.worker import run_job
        from pathlib import Path
        import tempfile
        seen=[]
        class Calls(FakeCalls):
            def model(self,messages,max_tokens=1800, **kwargs):
                if 'Extract research search constraints' in messages[0]['content']:
                    return json.dumps(dict(focus='jobs',relativePeriod=None,dateFrom='2026-01-01',dateTo='2026-02-28',clarification=None))
                return '{"claims":[]}'
            def search(self,query):
                seen.append(query)
                return [source(1,publishedAt='2026-01-15'),source(2,publishedAt='2025-10-01'),source(3)]
        class Engine(FakeEngine):
            async def tier(self,body,key,description,sources):
                self_test.assertEqual([s['id'] for s in sources],['src_1'])
                self_test.assertEqual(body['searchScope']['focus'],'jobs')
                return 'A finding [src_1].',sources
        self_test=self
        with tempfile.TemporaryDirectory() as tmp:
            store=Store(Path(tmp)/'runner.sqlite')
            request=body(notes='PRIVATE: prioritize jobs in Jan-Feb 2026',notesApproved=True)
            store.submit(request)
            claim=store.claim()
            asyncio.run(run_job(store,claim,Engine,Calls))
            result=store.get(request['id'])
            self.assertEqual(result['status'],'completed')
            self.assertEqual(claim[4]['searchScope']['dateFrom'],'2026-01-01')
        self.assertTrue(seen)
        self.assertTrue(all('jobs' in q and '2026-01-01' in q and '2026-02-28' in q for q in seen))
        self.assertNotIn('PRIVATE',json.dumps(seen))

    def test_social_evidence_survives_a_failed_supplementary_focus_search(self):
        from research.source_channels import collect_channel
        from research.providers import ProviderError
        record={**source(1,publishedAt='2026-07-01'),'url':'https://instagram.com/p/public'}
        class Calls:
            def social_search(self,*args): return [record]
            def search(self,*args): raise ProviderError('private_failure')
        found,coverage=collect_channel('instagram',dict(title='Company',searchScope={'focus':'jobs','dateFrom':'2026-06-01','dateTo':'2026-08-01'}),Calls())
        self.assertEqual(found,[record])
        self.assertEqual(coverage['status'],'found')
        self.assertEqual(coverage['method'],'dedicated_tool')

    def test_timezone_boundary_and_social_epoch_date(self):
        from research.scope import filter_sources
        from research.source_channels import normalize_social
        row=source(1,publishedAt='2026-05-20T00:30:00+05:30')
        self.assertEqual(filter_sources([row],{'dateFrom':'2026-05-20','dateTo':'2026-10-20'}),[])
        social=normalize_social('instagram',{'posts':[dict(url='https://instagram.com/p/example',caption='Public',timestamp=1767225600)]})
        self.assertEqual(social[0]['publishedAt'],'2026-01-01T00:00:00+00:00')
