import unittest
from research.contracts import ResearchInput, section_spec, validate_section_subject
from research.subjects import subjects
from research.interview import dossier_queries, DOSSIER
from research.evidence import extraction_targets, select_context, merge_sources
from research.source_channels import collect_channel
from research.tests.test_evidence_retention import source as base_source

def source(index, **changes):
    return {**base_source(index), **changes}


class MultipleSubjectsTests(unittest.TestCase):
    def test_legacy_and_multiple_names_normalize_without_splitting_company_commas(self):
        data = ResearchInput(guestName=' Ada Guest \nada guest\nBea Guest', companyName='Example, Inc.\nOther Co', industry='Payments').model_dump()
        self.assertEqual(data['guestName'], 'Ada Guest\nBea Guest')
        self.assertEqual(len(subjects({'researchInput': data})), 5)
        self.assertEqual(ResearchInput(companyName='Legacy').companyName, 'Legacy')
        for data in [dict(guestName='\n'.join('Name '+str(i) for i in range(6))), dict(companyName='X'),
                     dict(guestName='\n'.join('Guest '+str(i) for i in range(5)), companyName='\n'.join('Company '+str(i) for i in range(5)), industry='Payments')]:
            with self.assertRaises(ValueError): ResearchInput(**data)

    def test_each_entity_gets_own_bounded_search_and_primary_company_queries(self):
        fields = dict(guestName='Ada Guest\nBea Guest', companyName='Example, Inc.\nOther Co', industry='Payments\nHospitality')
        body = dict(researchInput=fields, notes='PRIVATE NOTE', title='ignored')
        queries = dossier_queries(body)
        self.assertLessEqual(len(queries), 12)
        for name in subjects(body): self.assertTrue(any(query.startswith(name + ' ') for query in queries))
        for company in fields['companyName'].split('\n'):
            self.assertTrue(any(query.startswith(company) and 'audited financial statements' in query for query in queries))
        self.assertNotIn('PRIVATE NOTE', ' '.join(queries))
        for tier in ('snacks', 'appetizers'):
            heading = section_spec(body, tier)[0]
            self.assertNotIn('\n', heading)
            validate_section_subject(body, tier, '# '+heading+'\nEvidence')

    def test_extraction_prioritizes_primary_financial_candidates_and_each_subject(self):
        rows = [source(i, title='General news') for i in range(15)]
        rows += [source(20, title='First Co annual report audited financial statements', excerpt='First Co revenue and net profit'),
                 source(21, title='Second Co official biography', excerpt='Second Co operations')]
        selected = extraction_targets(rows, ['First Co', 'Second Co'])
        self.assertEqual(selected[:2], ['src_20', 'src_21'])
        self.assertEqual(len(selected), 10)
        retained = merge_sources(rows, [source(i, title='Popular unrelated coverage') for i in range(30, 170)], query='Popular unrelated coverage', subjects=['First Co','Second Co'])
        self.assertTrue({'src_20', 'src_21'}.issubset({s['id'] for s in retained}))

    def test_writer_sees_late_financial_passage_and_both_entities(self):
        passage = 'Revenue profit margin fiscal year operating metrics: 123 million in FY2025.'
        rows = [source(1, title='First Co annual report', excerpt='Welcome to First Co. '*260 + passage),
                source(2, title='Second Co annual report', excerpt='Second Co financial statements '+passage)]
        context = select_context(rows, 'revenue profit margin fiscal year operating metrics', 3500, subjects=['First Co','Second Co'])
        self.assertEqual(len(context), 2)
        self.assertTrue(all(passage in row['excerpt'] for row in context))
        self.assertEqual(rows[0]['excerpt'][-len(passage):], passage)

    def test_multi_entity_social_queries_do_not_build_combined_hashtags(self):
        class Calls:
            def search(self, query): self.query = query; return []
            def social_search(self, *args): raise AssertionError('No AND query or combined hashtag')
        calls = Calls()
        _, coverage = collect_channel('instagram', {'researchInput': {'companyName': 'First Co\nSecond Co'}, 'title': 'Combined'}, calls)
        self.assertEqual(coverage['method'], 'web_search')
        self.assertIn('"First Co" OR "Second Co"', calls.query)
