"""Real admission/GPTR/writer/figure flow at the observed staging boundary, offline."""
import asyncio
import json
import os
from unittest.mock import patch

from research.providers import Calls
from research.gptr import GPTREngine
from research.store import BudgetExceeded
from research.contracts import TIERS, section_spec
from research.tests.test_runner import StoreFixture
from research.tests.test_figures import SOURCES, draft
from research.tests.test_claude_migration import message
from research.worker import run_job


class PreparationBudgetTests(StoreFixture):
    def setUp(self):
        super().setUp()
        self.body.update(budgetPolicyVersion=1, visualPolicyVersion=2,
                         researchInput={'guestName': 'Example Person'})

    def test_observed_boundary_finishes_four_writers_and_four_figures(self):
        claim = self.claim()
        job, lease, body, result, state = claim
        # Exact spent/reserved amount from the sanitized staging failure receipt.
        self.db.admit(job, lease, 'prior_work', dict(kind='tool', amount=823630, phase='dossier', hold=0))
        state.update(resolved=True, dossier_index=100, channel_index=6,
                     figurePlans=[dict(section=k, goal='Company history', preferredKind='timeline', query='') for k in TIERS])
        result['sources'] = SOURCES + [{**SOURCES[0], 'id': 'src_extra_'+str(i),
            'url': 'https://example.org/history/'+str(i)} for i in range(119)]
        result['figures'] = [dict(id='fig_'+k+'_1', section=k, goal='Company history',
                                 preferredKind='timeline', status='planned', attempts=0) for k in TIERS]
        self.db.save(job, lease, result, state)
        requests = []
        class Network:
            def request(self, method, url, headers, body=None):
                assert url == 'https://api.anthropic.com/v1/messages', url
                system = json.dumps(body)
                requests.append(system)
                if 'Create one publication-quality' in system:
                    answer = json.dumps({'figure': draft()})
                elif 'Write the ' in system:
                    key = next(k for k in TIERS if 'Write the '+k+' tier' in system)
                    answer = '# '+section_spec(self_test.body, key)[0]+'\nA documented company milestone [src_example].'
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
        self.assertEqual(len(requests), 8)
        self.assertEqual(len(saved['sources']), 120)
        with self.db.db() as db:
            stored = json.loads(db.execute('SELECT state FROM jobs WHERE id=?', (job,)).fetchone()[0])
        self.assertNotIn('stopped', stored['_budget'])
        self.assertTrue(stored['preparation']['directEvidence'])
        self.assertEqual(stored['_budget']['phases'].get('preparation', 0), 0)

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
