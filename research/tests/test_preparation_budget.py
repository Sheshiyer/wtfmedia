"""Real admission/GPTR/writer/figure flow at the observed staging boundary, offline."""
import asyncio
import json
import os
from unittest.mock import patch

from research.providers import Calls, TOOL
from research.gptr import GPTREngine
from research.store import BudgetExceeded
from research.contracts import TIERS, section_spec
from research.tests.test_runner import StoreFixture
from research.tests.test_figures import SOURCES, draft
from research.tests.test_claude_migration import message
from research.tests.test_providers import CATALOG
from research.discovery import evidence_needs, expand_evidence
from research.worker import run_job


class PreparationBudgetTests(StoreFixture):
    def setUp(self):
        super().setUp()
        self.body.update(budgetPolicyVersion=1, visualPolicyVersion=2,
                         researchInput={'guestName': 'Example Person'})

    def test_observed_boundary_finishes_four_writers_and_four_figures(self):
        self.run_boundary()

    def test_numeric_reviews_and_all_four_figure_repairs_fit_the_protected_allowance(self):
        self.run_boundary(numeric=True, repair=True)

    def test_adaptive_collection_over_120_preserves_four_sections_and_all_repairs(self):
        self.run_boundary(numeric=True, repair=True, adaptive=True)

    def run_boundary(self, *, numeric=False, repair=False, adaptive=False):
        claim = self.claim()
        job, lease, body, result, state = claim
        # Exact spent/reserved amount from the sanitized staging failure receipt.
        self.db.admit(job, lease, 'prior_work', dict(kind='tool', amount=573630 if adaptive else 823630, phase='dossier', hold=0))
        state.update(resolved=True, dossier_index=100, channel_index=6,
                     figurePlans=[dict(section=k, goal='Company history', preferredKind='timeline', query='') for k in TIERS])
        result['sources'] = SOURCES + [{**SOURCES[0], 'id': 'src_extra_'+str(i),
            'url': 'https://example.org/history/'+str(i)} for i in range(159 if adaptive else 119)]
        result['figures'] = [dict(id='fig_'+k+'_1', section=k, goal='Company history',
                                 preferredKind='timeline', status='planned', attempts=0) for k in TIERS]
        if adaptive:
            state.pop('figurePlans')
            result['figures'] = []
        self.db.save(job, lease, result, state)
        requests = []
        figure_calls = []
        searches = []
        coverage_calls = []
        class Network:
            def request(self, method, url, headers, body=None):
                if adaptive and '/catalog/endpoints/' in url:
                    return {'endpoint': next(e for e in CATALOG['endpoints'] if url.endswith(e['id']))}, {}
                if adaptive and url.endswith(TOOL):
                    searches.append(body['query'])
                    return {'results': [dict(url='https://example.org/followup/'+str(i), title='Industry evidence',
                        snippet=f'Example Person has documented industry opportunities in market segment {i}.')
                        for i in range(20)]}, {'x-treg-cost-micro': '5000'}
                assert url == 'https://api.anthropic.com/v1/messages', url
                system = json.dumps(body)
                requests.append(system)
                if 'Assess research evidence coverage' in system:
                    coverage_calls.append(True)
                    answer = json.dumps(dict(covered=[], queries=[dict(needId=evidence_needs(self_test.body)[0]['id'],
                        query='Example Person documented industry opportunities', channel='web')],
                        figures=[dict(section=k, goal='Company history', preferredKind='timeline', query='') for k in TIERS]))
                elif 'Create one publication-quality' in system:
                    value = draft()
                    figure_calls.append(True)
                    if repair and len(figure_calls) % 2:
                        value['items'][0]['date'] = '2019'  # Unsupported; exercise actual validation/repair.
                    answer = json.dumps({'figure': value})
                elif 'Write the ' in system:
                    key = next(k for k in TIERS if 'Write the '+k+' tier' in system)
                    statement = 'The business started in March 2020' if numeric else 'A documented company milestone'
                    answer = '# '+section_spec(self_test.body, key)[0]+'\n'+statement+' [src_example].'
                elif 'Extract numeric claims from the report' in system:
                    answer = '{"claims":[]}'
                else:
                    raise AssertionError('Optional preparation must stop before paid dispatch')
                return message(answer), {}
        self_test = self
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'fixture'}, clear=True), \
                patch('socket.socket.connect', side_effect=AssertionError('No live network')):
            asyncio.run(run_job(self.db, claim, GPTREngine,
                                lambda *args: Calls(*args, network=Network())))
        saved = self.db.get(job)
        self.assertEqual(saved['status'], 'completed', saved.get('failure'))
        self.assertEqual([s['status'] for s in saved['sections']], ['completed'] * 4)
        self.assertEqual([s['status'] for s in saved['figures']], ['ready'] * 4)
        self.assertEqual(len(requests), 8 + (4 if numeric else 0) + (4 if repair else 0) + (1 if adaptive else 0))
        self.assertEqual(len(saved['sources']), 180 if adaptive else 120, (coverage_calls, searches, saved['warnings']))
        self.assertEqual(len(coverage_calls), 1 if adaptive else 0)
        self.assertEqual(len(searches), 1 if adaptive else 0)
        with self.db.db() as db:
            stored = json.loads(db.execute('SELECT state FROM jobs WHERE id=?', (job,)).fetchone()[0])
            spent = db.execute('SELECT SUM(MAX(reserve, COALESCE(billed, 0))) FROM calls WHERE job=?', (job,)).fetchone()[0]
        self.assertNotIn('stopped', stored['_budget'])
        self.assertTrue(stored['preparation']['directEvidence'])
        self.assertEqual(stored['_budget']['phases'].get('preparation', 0), 2 if adaptive else 0)
        if adaptive:
            for request in requests:
                if 'Write the ' in request:
                    self.assertIn('documented industry opportunities', request)
            self.assertEqual(stored['adaptiveDiscovery']['reason'], 'budget')
            self.assertEqual(len(stored['adaptiveFigurePlans']), 4)
            # One combined planner, one search, four writers/numeric reviews and eight
            # figure attempts fit the existing allowance; no reservation is reset.
            self.assertEqual(spent, 4828630)

    def test_interrupted_combined_planner_reuses_paid_cache_at_budget_boundary(self):
        job, lease, body, result, state = self.claim()
        self.db.admit(job, lease, 'prior_work', dict(kind='tool', amount=573630, phase='dossier', hold=0))
        result['sources'] = SOURCES
        requests = []
        plan = dict(covered=[dict(needId=n['id'], sourceId='src_example', quote=SOURCES[0]['excerpt'])
                             for n in evidence_needs(body)], queries=[],
                    figures=[dict(section=k, goal='Company history', preferredKind='timeline', query='') for k in TIERS])
        class Network:
            def request(self, method, url, headers, body=None):
                assert url == 'https://api.anthropic.com/v1/messages'
                requests.append(body)
                return message(json.dumps(plan)), {}
        class Interrupted(RuntimeError): pass
        def configured():
            calls = Calls(self.db, job, lease, network=Network())
            calls.budget_policy = 1; calls.hold = 4250000; calls.preparation = {}
            return calls
        calls = configured()
        real_model = calls.model
        def interrupt_after_receipt(*args, **kwargs):
            real_model(*args, **kwargs)
            raise Interrupted()
        calls.model = interrupt_after_receipt
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'fixture'}, clear=True), \
                patch('socket.socket.connect', side_effect=AssertionError('No live network')):
            with self.assertRaises(Interrupted):
                asyncio.run(expand_evidence(body, result, state, calls,
                    lambda: self.db.save(job, lease, result, state)))
            with self.db.db() as db:
                state = json.loads(db.execute('SELECT state FROM jobs WHERE id=?', (job,)).fetchone()[0])
            self.assertTrue(state['adaptiveDiscovery']['figurePlanningPending'])
            self.assertEqual(state['adaptiveFigurePlans'], [])
            asyncio.run(expand_evidence(body, result, state, configured(),
                lambda: self.db.save(job, lease, result, state)))
        self.assertEqual(len(requests), 1)
        self.assertEqual(state['adaptiveDiscovery']['reason'], 'sufficient')
        self.assertEqual(len(state['adaptiveFigurePlans']), 4)
        self.assertEqual(self.db.allowance(job, lease, 'runner')['remaining'], 4176370)

    def test_optional_preflight_preserves_ledger_but_real_stop_stays_fatal(self):
        job, lease, *_ = self.claim()
        calls = Calls(self.db, job, lease)
        calls.budget_policy = 1
        calls.stage('preparation'); calls.hold = 5000000
        with self.assertRaises(BudgetExceeded): calls.admit('optional', 'model', 250000)
        self.assertIsNone(calls.fatal_error)
        self.assertEqual(self.db.allowance(job, lease, 'write_snacks')['remaining'], 5000000)
        calls.stage('write_snacks')
        with self.assertRaises(BudgetExceeded): calls.admit('required', 'model', 250000)
        self.assertIsNotNone(calls.fatal_error)
        calls.hold = 0
        calls.stage('preparation')
        with self.assertRaises(BudgetExceeded): calls.admit('after_stop', 'model', 250000)

    def test_preparation_never_turns_empty_evidence_into_a_report(self):
        job, lease, *_ = self.claim()
        calls = Calls(self.db, job, lease)
        calls.budget_policy = 1; calls.preparation = {}; calls.hold = 5000000
        with self.assertRaises(BudgetExceeded):
            asyncio.run(GPTREngine(calls).prepare(self.body, []))
        self.assertNotIn('context', calls.preparation)
