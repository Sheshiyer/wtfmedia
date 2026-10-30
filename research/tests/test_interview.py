import asyncio
import json
import unittest
from pydantic import ValidationError
from research.contracts import HistoricalContext
from research.interview import dossier_queries, historical_appendix, historical_sources
from research.evidence import supports, validate_report
from research.tests.test_runner import StoreFixture, FakeCalls, FakeEngine
from research.worker import run_job


def history():
    return dict(status='available', summary='A discussion explored costs [1, 2]. Speaker unknown.', sources=[
        dict(id=f'alpha_abcdefghij{k}_{k}', citationNumber=k, title='Earlier episode',
             url=f'https://www.youtube.com/watch?v=abcdefghij{k}', excerpt='',
             kind='alpha_reference', retrievedAt='2026-10-26T00:00:00Z') for k in (1, 2)])


class InterviewTests(unittest.TestCase):
    def test_historical_summary_is_never_current_factual_evidence(self):
        context = HistoricalContext(**history()).model_dump(exclude_none=True)
        refs = historical_sources(context)
        self.assertTrue(all(not supports(s) for s in refs))
        content, warnings = validate_report('A current fact [alpha_abcdefghij1_1].', refs)
        self.assertIn('Unsupported citation removed.', warnings)
        appendix = historical_appendix(context)
        self.assertIn('not a verbatim question transcript', appendix)
        self.assertIn('[alpha_abcdefghij1_1] [alpha_abcdefghij2_2]', appendix)
        self.assertNotIn('[1, 2]', appendix)

    def test_invalid_historical_payload_fails_closed(self):
        for mutate in [lambda h: h['sources'][0].update(excerpt='raw transcript'),
                       lambda h: h['sources'][0].update(url='https://example.com'),
                       lambda h: h.update(status='unavailable'),
                       lambda h: h['sources'][1].update(citationNumber=1)]:
            h = history(); mutate(h)
            with self.assertRaises(ValidationError): HistoricalContext(**h)

    def test_scope_drives_dossier_searches_without_private_notes(self):
        body = dict(title='ignored', researchInput=dict(guestName='', companyName='', industry='Hotels'),
                    notes='PRIVATE NOTE', notesApproved=False)
        queries = dossier_queries(body)
        self.assertEqual(len(queries), 6)
        self.assertTrue(any('unit economics' in q for q in queries))
        self.assertTrue(all('Hotels' in q and 'PRIVATE' not in q and 'biography' not in q for q in queries))
        body['researchInput'] = dict(guestName='Guest', companyName='', industry='')
        self.assertEqual(len(dossier_queries(body)), 6)


class InterviewWorkflowTests(StoreFixture):
    def test_report_retains_separate_historical_references_and_passes_context_to_writer(self):
        self.body['historicalContext'] = history()
        captured = []
        class Engine(FakeEngine):
            async def tier(self, body, key, description, sources):
                captured.append(body['historicalContext'])
                return 'A useful current finding [src_1].', sources
        asyncio.run(run_job(self.db, self.claim(), Engine, FakeCalls))
        result = self.db.get(self.body['id'])
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(len(captured), 4)
        self.assertTrue(all(h == history() for h in captured))
        last = next(s for s in result['sections'] if s['key'] == 'desserts')['content']
        self.assertIn('[alpha_abcdefghij1_1]', last)
        self.assertEqual(len([s for s in result['sources'] if s.get('kind') == 'alpha_reference']), 2)
        self.assertNotIn('citationNumber', json.dumps(result['sources']))

    def test_resumed_job_does_not_repeat_completed_topic_discovery(self):
        claim = self.claim()
        claim[-1]['dossier_index'] = 6
        searches = []
        class Calls(FakeCalls):
            def search(self, query):
                searches.append(query)
                return super().search(query)
        asyncio.run(run_job(self.db, claim, FakeEngine, Calls))
        self.assertEqual(len(searches), 6)
