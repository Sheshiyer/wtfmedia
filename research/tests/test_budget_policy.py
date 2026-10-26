"""Offline regression cases for durable admission; never invoke live providers."""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from research.budget import BudgetExceeded
from research.contracts import Failure
from research.diagnostics import failure
from research.remote_store import RemoteStore
from research.diagnostics import StorageError
from research.tests.test_runner import StoreFixture, FakeCalls, FakeEngine
from research.worker import run_job


class BudgetPolicyTests(StoreFixture):
    def setUp(self):
        super().setUp()
        self.body['budgetPolicyVersion'] = 1

    def admit(self, claim, key, phase='preparation', amount=1000, hold=0):
        return self.db.admit(*claim[:2], key, dict(kind='tool', amount=amount, phase=phase, hold=hold))

    def test_cache_and_stale_save_do_not_reset_durable_phase(self):
        claim = self.claim()
        for n in range(12):
            self.admit(claim, str(n))
        self.db.settle(*claim[:2], '0', 1, None, {'cached': True})
        self.db.save(*claim[:2], claim[3], {'_budget': {'phases': {}}, 'resolved': True})
        self.assertEqual(self.admit(claim, '0'), {'cached': True})
        with self.assertRaises(BudgetExceeded) as caught:
            self.admit(claim, 'next')
        self.assertEqual(caught.exception.limit, dict(kind='stage_calls', phase='preparation', used=12, maximum=12))
        with self.db.db() as db:
            db.execute('UPDATE jobs SET expires=0')
        resumed = self.db.claim()
        self.assertEqual(resumed[4]['_budget']['phases']['preparation'], 12)
        with self.assertRaises(BudgetExceeded):
            self.admit(resumed, 'next')
        from research.store import Stopped
        with self.assertRaises(Stopped):
            self.admit(claim, 'stale')

    def test_summary_preflight_does_not_charge_a_settled_model_again(self):
        claim = self.claim()
        self.db.admit(*claim[:2], 'model_cached', dict(kind='model', amount=250000, phase='summaries', hold=0))
        self.db.settle(*claim[:2], 'model_cached', None, None, {'answer': 'Retained summary'})
        available = self.db.allowance(*claim[:2], 'summaries', 250000, 4750000, ['model_cached'])
        self.assertEqual(available['cachedCount'], 1)
        self.assertEqual(available['remaining'], 4750000)

    def test_competing_admissions_cannot_oversubscribe(self):
        claim = self.claim()
        def dispatch(n):
            try:
                self.admit(claim, str(n))
                return True
            except BudgetExceeded:
                return False
        with ThreadPoolExecutor(max_workers=4) as pool:
            self.assertEqual(sum(pool.map(dispatch, range(16))), 12)

    def test_retries_are_counted_and_unknown_attempts_keep_reservations(self):
        claim = self.claim()
        self.admit(claim, 'retry')
        self.admit(claim, 'retry')
        with self.assertRaises(BudgetExceeded) as caught:
            self.admit(claim, 'retry')
        self.assertEqual(caught.exception.limit['kind'], 'call_retries')
        self.assertEqual(self.db.allowance(*claim[:2], 'preparation')['remaining'], 4998000)

    def test_core_hold_and_provider_overrun_close_admission_across_restart(self):
        for overrun in (False, True):
            with self.subTest(overrun=overrun):
                if overrun:
                    from research.tests.test_runner import body
                    self.body = body(budgetPolicyVersion=1)
                claim = self.claim()
                self.admit(claim, 'first')
                if overrun:
                    self.db.settle(*claim[:2], 'first', 1001, None, [])
                else:
                    with self.assertRaises(BudgetExceeded):
                        self.admit(claim, 'held', amount=1000, hold=4999000)
                self.db.save(*claim[:2], claim[3], {})
                with self.assertRaises(BudgetExceeded) as caught:
                    self.admit(claim, 'cheap', phase='write_main', amount=1)
                self.assertEqual(caught.exception.limit['kind'], 'provider_cost_overrun' if overrun else 'job_reservation')
                self.db.cancel(claim[0])

    def test_all_limit_kinds_survive_dto_and_remote_rpc_without_raw_text(self):
        from types import SimpleNamespace
        for kind in ('stage_calls', 'job_reservation', 'call_retries', 'provider_cost_overrun'):
            detail = dict(kind=kind, phase='summaries', used=12, maximum=12)
            remote = object.__new__(RemoteStore)
            remote.url, remote.token = 'https://state.example', 'fixture'
            response = SimpleNamespace(status_code=200, json=lambda: {'error': 'BudgetExceeded', 'limit': detail})
            with patch('research.remote_store.httpx.post', return_value=response):
                with self.assertRaises(BudgetExceeded) as caught:
                    remote.admit('fixture', 'lease', 'call', {})
            info = Failure.model_validate(failure(caught.exception, 'discovery')).model_dump(exclude_none=True)
            self.assertEqual(info['limit'], detail)
        response = SimpleNamespace(status_code=200, json=lambda: {'error': 'BudgetExceeded', 'limit': {'kind': 'PRIVATE'}})
        with patch('research.remote_store.httpx.post', return_value=response):
            with self.assertRaises(StorageError):
                remote.admit('fixture', 'lease', 'call', {})

    def test_visuals_follow_all_core_sections_and_never_fail_completed_text(self):
        claim = self.claim()
        async def omitted(_calls, sections, _sources):
            snapshot = self.db.get(claim[0])
            self.assertTrue(all(s['status'] == 'completed' for s in snapshot['sections']))
            self.assertEqual(len(snapshot['sections']), 4)
            return {s['key']: ('', ['Some diagrams could not be generated within the remaining allowance.']) for s in sections}
        with patch('research.worker.build_visuals', side_effect=omitted):
            asyncio.run(run_job(self.db, claim, FakeEngine, FakeCalls))
        self.assertEqual(self.db.get(claim[0])['status'], 'completed')

    def test_shared_authentication_failure_stops_before_writers(self):
        from research.providers import ProviderError
        class SearchDenied(FakeCalls):
            def search(self, query):
                error = ProviderError(code='authentication')
                error.details = dict(provider='treg', operation='search', httpStatus=401)
                raise error
        class NoWriter(FakeEngine):
            async def tier(self, *args):
                raise AssertionError('No evidence must not invoke a writer')
        claim = self.claim()
        asyncio.run(run_job(self.db, claim, NoWriter, SearchDenied))
        result = self.db.get(claim[0])
        self.assertEqual(result['status'], 'failed')
        self.assertEqual(result['failure']['code'], 'authentication')
        self.assertFalse(result['sources'])
