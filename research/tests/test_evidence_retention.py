"""Bounded retention must admit later evidence without losing saved citations."""
import unittest

from research.evidence import merge_sources


def source(index, **changes):
    return dict(id=f'src_{index}', title='Company background',
                url=f'https://example.com/source/{index}',
                excerpt='Public company history.', kind='search_snippet',
                retrievedAt='2026-10-20', **changes)


class EvidenceRetentionTests(unittest.TestCase):
    def test_relevant_new_source_replaces_only_uncited_evidence(self):
        existing = [source(i) for i in range(80)]
        incoming = {**source(80), 'title': 'India employment skills',
                    'excerpt': 'India employment skills evidence.'}
        retained = merge_sources(existing, [incoming], protected_ids={'src_0', 'src_79'},
                                 query='India employment skills')
        self.assertEqual(len(retained), 80)
        self.assertIn(incoming, retained)
        self.assertIn(existing[0], retained)
        self.assertIn(existing[79], retained)
        self.assertEqual(existing, [source(i) for i in range(80)])

    def test_default_merge_keeps_discovery_behavior(self):
        existing = [source(i) for i in range(80)]
        self.assertEqual(merge_sources(existing, [source(80)]), existing)

    def test_all_protected_sources_survive(self):
        existing = [source(i) for i in range(80)]
        incoming = {**source(80), 'title': 'India employment skills'}
        retained = merge_sources(existing, [incoming],
                                 protected_ids={s['id'] for s in existing}, query='India employment skills')
        self.assertEqual(retained, existing)

    def test_duplicate_url_preserves_id_and_protected_excerpt(self):
        original = source(1)
        page = {**original, 'id': 'new_provider_id', 'kind': 'page_extract',
                'excerpt': 'A changed page no longer containing the quoted statement.'}
        protected = merge_sources([original], [page], protected_ids={'src_1'}, query='company')
        self.assertEqual(protected, [original])
        upgraded = merge_sources([original], [page], protected_ids=set(), query='company')
        self.assertEqual(upgraded[0]['id'], 'src_1')
        self.assertEqual(upgraded[0]['kind'], 'page_extract')

    def test_collision_is_rejected_even_when_source_would_be_trimmed(self):
        existing = [source(i) for i in range(80)]
        collision = {**source(80), 'id': 'src_0'}
        with self.assertRaises(ValueError):
            merge_sources(existing, [collision], protected_ids={'src_0'}, query='India')
