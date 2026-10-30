import asyncio
import json
import unittest
from unittest.mock import patch

from research.discovery import evidence_needs, expand_evidence, validate_plan
from research.evidence import merge_sources
from research.store import BudgetExceeded, Stopped


def source(index, channel='web'):
    domain = 'example.com' if channel == 'web' else channel + '.com'
    return dict(id=f'src_{index}', title=f'Example evidence {index}', url=f'https://{domain}/item/{index}',
                excerpt=f'Example Company documents operating evidence for topic {index}.', kind='page_extract', retrievedAt='2026-10-30')


def result():
    return dict(sources=[source(0)], sections=[], warnings=[], progress=[])


class Calls:
    def __init__(self, plans, pages=()):
        self.plans = iter(plans)
        self.pages = iter(pages)
        self.preparation = {}
        self.hold = 1000000
        self.models = []; self.searches = []
    def stage(self, phase): self.phase = phase
    def allowance(self, **kwargs): pass
    def model(self, messages, *args, **kwargs):
        self.models.append(messages)
        return json.dumps(next(self.plans))
    def search(self, query):
        self.searches.append(query)
        return next(self.pages)


class AdaptiveDiscoveryTests(unittest.TestCase):
    body = dict(title='Example Company', researchInput={'companyName': 'Example Company'}, notes='PRIVATE NOTES')

    def covered(self, sources):
        return dict(covered=[dict(needId=need['id'], sourceId=sources[0]['id'], quote=sources[0]['excerpt'])
                             for need in evidence_needs(self.body)], queries=[])

    def plan(self, channel='web', query='Example Company official financial reporting'):
        return dict(covered=[], queries=[dict(needId=evidence_needs(self.body)[0]['id'], query=query, channel=channel)])

    def run_flow(self, calls, output=None, state=None):
        output = output if output is not None else result()
        state = state if state is not None else {}
        asyncio.run(expand_evidence(self.body, output, state, calls, lambda: None))
        return output, state

    def test_sufficient_evidence_stops_without_source_target_or_extra_search(self):
        calls = Calls([self.covered([source(0)])])
        output, state = self.run_flow(calls)
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'sufficient')
        self.assertEqual(calls.searches, [])
        self.assertEqual(len(output['sources']), 1)
        self.assertNotIn('PRIVATE NOTES', json.dumps(calls.models))
        self.assertEqual(calls.hold, 1000000)

    def test_uncovered_need_expands_youtube_beyond_one_twenty_result_batch(self):
        first = [source(i, 'youtube') for i in range(20)]
        second = [source(i, 'youtube') for i in range(20, 40)]
        calls = Calls([self.plan('youtube', 'Example Company leaders long interview'), self.covered(second)], [second])
        output, state = self.run_flow(calls, {**result(), 'sources': first})
        self.assertEqual(len(output['sources']), 40)
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'sufficient')
        self.assertIn('site:youtube.com', calls.searches[0])

    def test_paused_discovery_module_still_respects_restored_total_cap(self):
        initial = [source(i) for i in range(120)] + [source(i, 'reddit') for i in range(120, 122)]
        more = [source(i, 'reddit') for i in range(122, 137)]
        calls = Calls([self.plan('reddit', 'Example Company customer experience'), self.covered(more)], [more])
        output, state = self.run_flow(calls, {**result(), 'sources': initial, 'coverage': [dict(channel='reddit', method='dedicated_tool')]})
        self.assertEqual(len(output['sources']), 120)
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'source_limit')
        self.assertEqual(output['coverage'][0]['method'], 'web_search')
        self.assertGreaterEqual(sum('reddit.com' in s['url'] for s in output['sources']), 2)
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'source_limit')

    def test_duplicate_evidence_stops_without_padding_sources(self):
        calls = Calls([self.plan()], [[source(0)]])
        output, state = self.run_flow(calls)
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'no_new_evidence')
        self.assertEqual(len(output['sources']), 1)
        self.assertIn('not proof', output['warnings'][0])

    def test_false_coverage_and_unknown_requirements_fail_closed(self):
        for entry in [dict(needId='not_a_need', sourceId='src_0', quote=source(0)['excerpt']),
                      dict(needId=evidence_needs(self.body)[0]['id'], sourceId='src_0', quote='An invented claim not in the retained evidence.')]:
            with self.assertRaises(ValueError):
                validate_plan(json.dumps(dict(covered=[entry], queries=[])), evidence_needs(self.body), [source(0)])

    def test_allowance_stops_discovery_and_preserves_writer_reservation_and_sources(self):
        calls = Calls([])
        def denied(**kwargs): raise BudgetExceeded(kind='stage_calls', phase='preparation', used=9, maximum=12)
        calls.allowance = denied
        output, state = self.run_flow(calls)
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'budget')
        self.assertEqual(calls.hold, 1000000)
        self.assertEqual(calls.models, [])
        self.assertEqual(output['sources'], [source(0)])

    def test_cancelled_jobs_do_not_continue_searching(self):
        calls = Calls([])
        calls.allowance = lambda **_: (_ for _ in ()).throw(Stopped())
        with self.assertRaises(Stopped): self.run_flow(calls)
        self.assertEqual(calls.hold, 1000000)

    def test_checkpoint_resumes_remaining_query_without_replaying_first(self):
        plan = self.plan()
        plan['queries'].append({**plan['queries'][0], 'query': 'Example Company market competition'})
        state = {'adaptiveDiscovery': {'startedAt': 100, 'tried': ['example company official financial reporting'],
                'round': 0, 'plan': plan, 'index': 1, 'added': True}}
        calls = Calls([self.covered([source(2)])], [[source(2)]])
        with patch('research.discovery.time.time', return_value=101):
            _, state = self.run_flow(calls, state=state)
        self.assertEqual(calls.searches, ['Example Company market competition'])
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'sufficient')

    def test_visual_retry_never_searches_or_assesses(self):
        calls = Calls([])
        asyncio.run(expand_evidence({**self.body, 'mode': 'visuals'}, result(), {}, calls, lambda: None))
        self.assertEqual(calls.models, [])
        from research.contracts import section_spec
        legacy = dict(mode='visuals', researchInput={'guestName': 'Example Person'}, sections=[dict(key='main', status='skipped')])
        self.assertIsNone(section_spec(legacy, 'main'))
        self.assertIsNotNone(section_spec({**legacy, 'mode': 'full'}, 'main'))

    def test_storage_is_byte_bounded_with_protected_quotes_unchanged(self):
        rows = [{**source(i), 'excerpt': 'Evidence ' * 1000} for i in range(20)]
        saved = merge_sources(rows[:1], rows, protected_ids={'src_0'}, byte_budget=20000)
        self.assertIn(rows[0], saved)
        self.assertLessEqual(len(json.dumps(saved).encode()), 20000)
        self.assertEqual(len(merge_sources([], [source(i) for i in range(300)])), 120)

    def test_deadline_and_empty_search_plan_are_truthful_stops(self):
        calls = Calls([])
        state = {'adaptiveDiscovery': {'startedAt': 1, 'tried': [], 'round': 0}}
        with patch('research.discovery.time.time', return_value=182):
            _, state = self.run_flow(calls, state=state)
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'deadline')
        self.assertEqual(calls.models, [])
        _, state = self.run_flow(Calls([dict(covered=[], queries=[])]))
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'no_new_queries')

    def test_completed_checkpoint_does_not_spend_again(self):
        calls = Calls([])
        self.run_flow(calls, state={'adaptiveDiscovery': {'reason': 'sufficient'}})
        self.assertEqual(calls.models, [])

    def test_disputed_identity_cannot_be_reintroduced_by_a_followup_query(self):
        calls = Calls([self.plan(query='Excluded Person companies')])
        state = {}
        asyncio.run(expand_evidence({**self.body, 'searchScope': {'excludedSubjects': ['Excluded Person']}}, result(), state, calls, lambda: None))
        self.assertEqual(calls.searches, [])
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'unavailable')


from research.tests.test_runner import StoreFixture, FakeCalls, FakeEngine, source as runner_source
from research.worker import run_job
from research.contracts import section_spec


class AdaptiveWorkflowTests(StoreFixture):
    def test_guest_only_job_skips_paused_adaptive_pass_and_writes_all_four_sections(self):
        self.body.update(budgetPolicyVersion=1, researchInput={'guestName': 'Example Person'})
        requirements = evidence_needs(self.body)
        assessed, written = [], []
        class LocalCalls(FakeCalls):
            def model(self, messages, *args, **kwargs):
                if messages[0]['content'].startswith('Assess research evidence coverage'):
                    assessed.append(True)
                    return json.dumps(dict(covered=[dict(needId=need['id'], sourceId='src_1', quote=runner_source()['excerpt']) for need in requirements], queries=[]))
                return '{"claims":[]}'
        class LocalEngine(FakeEngine):
            async def tier(self, body, key, description, sources):
                written.append(key)
                return '# ' + section_spec(body, key)[0] + '\nSupported observation [src_1].', sources
        with patch('socket.socket.connect', side_effect=AssertionError('unexpected network')):
            asyncio.run(run_job(self.db, self.claim(), LocalEngine, LocalCalls))
        saved = self.db.get(self.body['id'])
        self.assertEqual(assessed, [])
        self.assertEqual(written, ['snacks', 'appetizers', 'main', 'desserts'])
        self.assertEqual(saved['status'], 'completed')
        self.assertTrue(all(section['status'] == 'completed' for section in saved['sections']))
        self.assertIn('Companies and industries: Example Person', saved['sections'][1]['title'])
