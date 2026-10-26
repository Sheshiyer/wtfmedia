import asyncio
import json
import unittest
from collections import Counter

from research.evidence import merge_sources, synthesis_context
from research.source_channels import CHANNELS, collect_channel, platform_for_url, dedicated_input
from research.tests.test_evidence_retention import source
from research.tests.test_runner import StoreFixture, FakeCalls, FakeEngine
from research.worker import run_job
from research.providers import ProviderError


def rows(channel, count):
    host = {'web': 'example.com', 'x': 'x.com'}.get(channel, channel + '.com')
    return [{**source(i), 'id': f'src_{channel}_{i}', 'url': f'https://{host}/post/{i}'}
            for i in range(count)]


class SourceBudgetTests(unittest.TestCase):
    def test_report_relevance_wins_over_twenty_per_channel_quota(self):
        found = [s for c in CHANNELS for s in rows(c, 30)]
        for s in found:
            if platform_for_url(s['url']) == 'web':
                s['title'] = 'Company market economics India'
        retained = merge_sources([], found, query='Company')
        counts = Counter(platform_for_url(s['url']) for s in retained)
        self.assertEqual(len(retained), 120)
        self.assertEqual(counts['web'], 30)
        self.assertTrue(all(counts[c] >= 2 for c in CHANNELS))

    def test_unused_slots_transfer_to_other_channels_without_duplicates(self):
        found = rows('web', 70) + [s for c in CHANNELS[1:] for s in rows(c, 10)]
        retained = merge_sources(found[:80], found, query='Company')
        self.assertEqual(len(retained), 120)
        self.assertEqual(len({s['url'] for s in retained}), 120)
        self.assertEqual(Counter(platform_for_url(s['url']) for s in retained)['web'], 70)

    def test_new_social_evidence_reclaims_slots_from_web_expansion(self):
        existing = rows('web', 120)
        retained = merge_sources(existing, rows('reddit', 30), protected_ids={'src_web_119'})
        self.assertEqual(len(retained), 120)
        self.assertIn(existing[-1], retained)
        self.assertGreaterEqual(sum(platform_for_url(s['url']) == 'reddit' for s in retained), 2)

    def test_all_saved_citations_survive_even_in_a_legacy_oversized_report(self):
        existing = rows('web', 130)
        retained = merge_sources(existing, rows('reddit', 5), protected_ids={s['id'] for s in existing})
        self.assertEqual(retained, existing)

    def test_scarce_channels_are_not_padded_with_unrelated_sources(self):
        self.assertEqual(merge_sources([], rows('web', 3)), rows('web', 3))
        class Calls:
            def social_search(self, *_): return rows('reddit', 7)
            def search(self, *_): raise AssertionError('Do not pad a useful channel just to reach twenty.')
        found, coverage = collect_channel('reddit', {'title': 'Company'}, Calls())
        self.assertEqual(len(found), 7)
        self.assertEqual(coverage['sourceCount'], 7)
        self.assertTrue(all(platform_for_url(s['url']) == 'reddit' for s in found))

    def test_supported_social_page_sizes_target_twenty(self):
        self.assertEqual(dedicated_input('x', {'title': 'Company'})['limit'], 20)
        self.assertEqual(dedicated_input('youtube', {'title': 'Company'})['maxResults'], 20)

    def test_evidence_digests_reuse_unchanged_batches_after_retry(self):
        class Calls:
            def __init__(self): self.count = 0
            def model(self, messages, *_):
                self.count += 1
                batch = json.loads(messages[-1]['content'])['evidence']
                return '\n'.join('Finding [' + s['id'] + '].' for s in batch)
        calls = Calls()
        sources = [{**s, 'excerpt': 'Company evidence. ' * 600} for s in rows('web', 6)]
        first = asyncio.run(synthesis_context(calls, sources, 'Company jobs'))
        count = calls.count
        self.assertGreater(count, 1)
        # A recreated engine shares the same durable cache after a failed attempt.
        resumed = Calls()
        resumed.evidence_digests = getattr(calls, 'evidence_digests', {})
        self.assertEqual(asyncio.run(synthesis_context(resumed, sources, 'Company jobs')), first)
        self.assertEqual(resumed.count, 0)
        changed = [{**s, 'excerpt': 'Changed evidence. ' * 600} if i == 0 else s
                   for i, s in enumerate(sources)]
        asyncio.run(synthesis_context(resumed, changed, 'Company jobs'))
        self.assertEqual(resumed.count, 1)
        asyncio.run(synthesis_context(resumed, changed, 'Company competitors'))
        self.assertGreater(resumed.count, 1)


class RetryProgressTests(StoreFixture):
    def test_previous_failure_survives_while_retry_is_running(self):
        claim = self.claim()
        store = self.db
        class Engine(FakeEngine):
            attempt = 0
            async def tier(self, body, key, description, sources):
                if key == 'snacks':
                    self.attempt += 1
                    if self.attempt == 1:
                        raise ProviderError('PRIVATE', code='timeout', reason='read_timeout')
                    failure = store.get(claim[0])['sections'][-1].get('failure', {})
                    self_test.assertEqual(failure.get('reason'), 'read_timeout')
                return 'Evidence [src_1].', sources
        self_test = self
        asyncio.run(run_job(self.db, claim, Engine, FakeCalls))
        result = store.get(claim[0])
        self.assertEqual(result['status'], 'completed')
        self.assertTrue(all('failure' not in s for s in result['sections']))
        self.assertNotIn('PRIVATE', json.dumps(result))
