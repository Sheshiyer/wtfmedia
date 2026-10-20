"""Retain all discoveries without losing saved citation identity."""
import unittest

from research.evidence import merge_sources


def source(index, **changes):
    return dict(id=f'src_{index}', title='Company background',
                url=f'https://example.com/source/{index}',
                excerpt='Public company history.', kind='search_snippet',
                retrievedAt='2026-10-20', **changes)


class EvidenceRetentionTests(unittest.TestCase):
    def test_later_evidence_is_added_without_evicting_existing_sources(self):
        existing = [source(i) for i in range(80)]
        incoming = {**source(80), 'title': 'India employment skills',
                    'excerpt': 'India employment skills evidence.'}
        retained = merge_sources(existing, [incoming], protected_ids={'src_0', 'src_79'},
                                 query='India employment skills')
        self.assertEqual(len(retained), 81)
        self.assertIn(incoming, retained)
        self.assertIn(existing[0], retained)
        self.assertIn(existing[79], retained)
        self.assertEqual(existing, [source(i) for i in range(80)])

    def test_default_merge_keeps_discovery_behavior(self):
        existing = [source(i) for i in range(80)]
        self.assertEqual(merge_sources(existing, [source(80)]), existing + [source(80)])

    def test_web_expansion_keeps_usable_evidence_from_discovered_channels(self):
        social = [{**source(i), 'url': url} for i, url in enumerate([
            'https://instagram.com/p/one', 'https://reddit.com/r/ev/comments/one',
            'https://x.com/example/status/1', 'https://linkedin.com/posts/one',
            'https://youtube.com/watch?v=one',
        ])]
        incoming = [{**source(i), 'title': 'India employment skills'} for i in range(5, 100)]
        retained = merge_sources(social, incoming, query='India employment skills')
        self.assertEqual(len(retained), 100)
        for item in social:
            self.assertIn(item, retained)

    def test_channel_retention_never_replaces_protected_citations(self):
        existing = [source(i) for i in range(80)]
        protected = {s['id'] for s in existing[:79]}
        social = {**source(80), 'url': 'https://reddit.com/r/ev/comments/one'}
        retained = merge_sources(existing, [social], protected_ids=protected, query='Company')
        self.assertEqual(len(retained), 81)
        self.assertTrue(protected.issubset({s['id'] for s in retained}))
        self.assertIn(social, retained)

    def test_all_protected_sources_survive(self):
        existing = [source(i) for i in range(80)]
        incoming = {**source(80), 'title': 'India employment skills'}
        retained = merge_sources(existing, [incoming],
                                 protected_ids={s['id'] for s in existing}, query='India employment skills')
        self.assertEqual(retained, existing + [incoming])

    def test_duplicate_url_preserves_id_and_protected_excerpt(self):
        original = source(1)
        page = {**original, 'id': 'new_provider_id', 'kind': 'page_extract',
                'excerpt': 'A changed page no longer containing the quoted statement.'}
        protected = merge_sources([original], [page], protected_ids={'src_1'}, query='company')
        self.assertEqual(protected, [original])
        upgraded = merge_sources([original], [page], protected_ids=set(), query='company')
        self.assertEqual(upgraded[0]['id'], 'src_1')
        self.assertEqual(upgraded[0]['kind'], 'page_extract')

    def test_collision_is_rejected_beyond_80_sources(self):
        existing = [source(i) for i in range(80)]
        collision = {**source(80), 'id': 'src_0'}
        with self.assertRaises(ValueError):
            merge_sources(existing, [collision], protected_ids={'src_0'}, query='India')

class EvidenceBatchTests(unittest.TestCase):
    def test_writer_context_considers_all_sources_beyond_80_and_keeps_originals(self):
        import asyncio
        import json
        from research.tests.loop_support import enable_if_needed
        enable_if_needed()
        from research.evidence import synthesis_context
        class Calls:
            def __init__(self): self.seen = set()
            def model(self, messages, max_tokens):
                payload = json.loads(messages[-1]['content'])
                rows = payload['evidence']
                self.seen.update(s['id'] for s in rows)
                return '\n'.join('A reported 20 jobs [' + s['id'] + '].' for s in rows)
        sources = [{**source(i), 'excerpt': 'Evidence for this company: 20 jobs. ' * 100} for i in range(110)]
        calls = Calls()
        context = asyncio.run(synthesis_context(calls, sources, 'Company'))
        self.assertEqual(calls.seen, {f'src_{i}' for i in range(110)})
        self.assertIn('[src_109]',json.dumps(context))
        self.assertEqual(len(sources),110)
        self.assertEqual(sources[-1]['excerpt'],'Evidence for this company: 20 jobs. ' * 100)

    def test_contract_and_normalizers_keep_all_valid_returned_sources(self):
        from research.contracts import Context
        from research.evidence import normalize_results
        from research.source_channels import normalize_social
        rows=[source(i) for i in range(125)]
        self.assertEqual(len(Context(sources=rows).sources),125)
        web=normalize_results({'results':[dict(url=s['url'],title=s['title'],snippet=s['excerpt']) for s in rows]})
        social=normalize_social('reddit',{'posts':[dict(url=f'https://reddit.com/comments/a{i}',title='Title',text='Evidence') for i in range(21)]})
        self.assertEqual(len(web),125)
        self.assertEqual(len(social),21)
