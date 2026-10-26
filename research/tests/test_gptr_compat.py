"""Real pinned GPTR import/conduct/write with fake external adapters, no credentials."""
import asyncio
import importlib.metadata
import json
import os
import socket
import unittest
from unittest.mock import patch

from research.providers import ProviderError
from research.store import BudgetExceeded, Stopped
from research.diagnostics import StorageError
from research.tests.test_evidence_retention import source

from research.tests.loop_support import enable_if_needed
enable_if_needed()


def installed():
    try:
        return importlib.metadata.version('gpt-researcher') == '0.16.1'
    except importlib.metadata.PackageNotFoundError:
        return False


class RecordingCalls:
    def __init__(self):
        self.stage_error = None
        self.models, self.searches, self.extracts = [], [], []
    def stage(self, phase='runner'):
        self.phase = phase
        self.stage_error = None
    def allowance(self, needed=0, calls=0, keys=None):
        pass
    def model(self, messages, max_tokens=1800, **kwargs):
        encoded = json.dumps(messages)
        if len(encoded) > 90000:
            raise AssertionError('oversized context')
        self.models.append(encoded)
        if 'Write the ' in encoded and max_tokens != 12000:
            raise AssertionError('Report writer must receive the full 12000-token budget')
        if 'Extract findings relevant to the research scope' in encoded:
            return '\n'.join(s['excerpt'][:100] + ' [' + s['id'] + '].' for s in json.loads(messages[-1]['content'])['evidence'])
        if 'Resolve the public entity' in encoded:
            return '{"kind":"resolved","clarification":null,"ambiguousFields":[]}'
        if 'Extract numeric claims' in encoded:
            return '{"claims":[]}'
        if 'Write the ' in encoded or 'Answer only from the supplied evidence' in encoded:
            return 'A bounded editorial observation [src_1].'
        return '{"queries":["Example founder background", "Example founder industry"]}'
    def search(self, query):
        self.searches.append(query)
        return [dict(id='src_1', title='Example founder podcast interview',url='https://example.com/podcast',
                     excerpt='The founder established Example Industries and discussed its public work in an interview.',
                     kind='search_snippet',retrievedAt='2026-10-13')]
    def extract(self, source):
        self.extracts.append(source['url'])
        return [{**source,'kind':'page_extract','excerpt':source['excerpt'] + ' Retained raw public page text.'}]


def prepared_engine(base):
    class PreparedEngine(base):
        async def tier(self, body, key, description, sources):
            if 'context' not in getattr(self.calls, 'preparation', {}):
                sources = await self.prepare(body, sources)
            self.calls.stage('write_' + key)
            return await super().tier(body, key, description, sources)
    return PreparedEngine


@unittest.skipUnless(installed(), 'install research/requirements.lock for real GPTR compatibility check')
class GPTRCompatibilityTests(unittest.TestCase):
    def test_historical_question_context_reaches_planner_and_writer_as_editorial_data(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        from research.tests.test_interview import history
        calls = RecordingCalls()
        body = dict(title='Example founder', sections=[], historicalContext=history())
        output, sources = asyncio.run(GPTREngine(calls).tier(body, 'desserts', 'Interview preparation', []))
        self.assertIn('[src_1]', output)
        planning = [m for m in calls.models if 'Write the ' not in m and 'Extract findings' not in m]
        writing = [m for m in calls.models if 'Write the ' in m]
        self.assertTrue(any('A discussion explored costs' in m for m in planning))
        self.assertTrue(any('historicalEditorialContext' in m for m in writing))
        self.assertTrue(any('not a verbatim transcript' in m for m in writing))
        self.assertTrue(all(s['kind'] != 'alpha_reference' for s in sources))

    def test_summary_truncation_has_one_larger_retry_not_eight_section_retries(self):
        from pathlib import Path
        import tempfile
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        from research.worker import run_job
        from research.store import Store
        from research.tests.test_runner import body
        for recover in [False, True]:
            with self.subTest(recover=recover), tempfile.TemporaryDirectory() as tmp:
                limits = []
                class SummaryCalls(RecordingCalls):
                    def model(self, messages, max_tokens=1800, **kwargs):
                        if 'Extract findings relevant' in json.dumps(messages):
                            limits.append(max_tokens)
                            if not recover or len(limits) == 1:
                                raise ProviderError('truncated', code='output_truncated', reason='output_truncated')
                            return 'A public observation [src_1].'
                        return super().model(messages, max_tokens)
                calls = SummaryCalls()
                sources = [{**source(i), 'excerpt': 'Public company history. ' * 150} for i in range(10)]
                sources[1]['url'] = 'https://example.com/podcast'
                store = Store(Path(tmp) / 'state.sqlite')
                request = body()
                store.submit(request)
                with patch('research.worker.collect_channel', side_effect=lambda channel, *_:
                           (sources, dict(channel=channel, status='found', sourceCount=len(sources), method='web_search'))), \
                     patch('socket.socket.connect', side_effect=AssertionError('unexpected external socket')):
                    asyncio.run(run_job(store, store.claim(), GPTREngine, lambda *_: calls))
                result = store.get(request['id'])
                self.assertEqual(limits, [4000, 8000])
                if recover:
                    self.assertEqual(result['status'], 'completed')
                    self.assertEqual(len(result['sections']), 4)
                    self.assertTrue(all(s['status'] == 'completed' for s in result['sections']))
                else:
                    self.assertEqual(result['status'], 'failed')
                    self.assertEqual(len(result['sections']), 0)
                    self.assertEqual(result['failure']['stage'], 'discovery')
                    self.assertEqual(result['failure']['code'], 'output_truncated')
                    self.assertFalse(any('Write the ' in m for m in calls.models))
                    # Recover after the section checkpoint but before the final job status.
                    with store.db() as db:
                        db.execute("UPDATE jobs SET status='running',expires=0")
                    asyncio.run(run_job(store, store.claim(), GPTREngine, lambda *_: calls))
                    self.assertEqual(limits, [4000, 8000])
                    self.assertEqual(store.get(request['id'])['status'], 'failed')

    def test_four_sections_share_preparation_and_retry_only_failed_writing(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        from research.contracts import TIERS
        class WriteTimeout(RecordingCalls):
            def model(self, messages, max_tokens=1800, **kwargs):
                if 'Write the ' in json.dumps(messages):
                    raise ProviderError('writer timeout', code='timeout', reason='deadline')
                return super().model(messages, max_tokens)
        calls = WriteTimeout()
        calls.preparation = {}
        checkpoints = []
        calls.checkpoint = lambda: checkpoints.append(json.loads(json.dumps(calls.preparation)))
        sources = [source(i) for i in range(90)]
        sources[1]['url'] = 'https://example.com/podcast'
        body = dict(title='Example founder', notes='PRIVATE_EDITORIAL', notesApproved=True,
                    searchScope={'focus': 'India jobs', 'dateFrom': None, 'dateTo': None})
        with patch('socket.socket.connect', side_effect=AssertionError('unexpected external socket')):
            with self.assertRaises(ProviderError):
                asyncio.run(GPTREngine(calls).tier(body, 'snacks', TIERS['snacks'][1], sources))
            self.assertTrue(checkpoints)
            self.assertIn('context', checkpoints[-1])
            resumed = RecordingCalls()
            resumed.preparation = checkpoints[-1]
            engine = GPTREngine(resumed)
            for key, (_, description) in TIERS.items():
                answer, retained = asyncio.run(engine.tier(body, key, description, sources))
                self.assertIn('[src_1]', answer)
                self.assertEqual(len(retained), 90)
        self.assertFalse(resumed.searches)
        self.assertFalse(resumed.extracts)
        self.assertEqual(len(resumed.models), 4)
        self.assertTrue(all('Write the ' in m for m in resumed.models))
        self.assertNotIn('PRIVATE_EDITORIAL', json.dumps(calls.searches))
        self.assertTrue(all('PRIVATE_EDITORIAL' in m for m in resumed.models))

    def test_full_source_pool_completes_with_real_call_and_spend_guards(self):
        from pathlib import Path
        import tempfile
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        from research.worker import run_job
        from research.providers import Calls
        from research.store import Store
        from research.tests.test_runner import body
        from research.tests.test_providers import Network
        from research.tests.test_source_budget import rows
        from research.source_channels import CHANNELS
        recorder = RecordingCalls()
        class Net(Network):
            def request(self, method, url, headers, body=None):
                if url.endswith('/messages'):
                    messages = [{'role': 'system', 'content': b['text']} for b in body.get('system', [])] + body['messages']
                    answer = recorder.model(messages, body['max_tokens'])
                    if 'Write the ' in json.dumps(body['messages']):
                        answer = 'A reported 20 jobs in 2024 [src_web_1].'
                    return {'content': [{'type': 'text', 'text': answer}], 'stop_reason': 'end_turn'}, {}
                return super().request(method, url, headers, body)
        net = Net()
        pool = [{**s, 'excerpt': 'Company history, competitors, India skills and 20 jobs in 2024. ' * 17}
                for c in CHANNELS for s in rows(c, 20)]
        pool[1]['url'] = 'https://example.com/public'
        def collect(channel, *_):
            found = [s for s in pool if s['id'].startswith('src_' + channel + '_')]
            return found, dict(channel=channel, status='found', sourceCount=len(found), method='web_search')
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'fixture-key'}, clear=True), \
                patch('research.worker.collect_channel', side_effect=collect), \
                patch('socket.socket.connect', side_effect=AssertionError('unexpected external socket')):
            store = Store(Path(tmp) / 'runner.sqlite')
            request = body()
            store.submit(request)
            asyncio.run(run_job(store, store.claim(), GPTREngine,
                                lambda *args: Calls(*args, network=net)))
            result = store.get(request['id'])
            self.assertEqual(result['status'], 'completed', result.get('failure'))
            self.assertEqual(len(result['sections']), 4)
            self.assertTrue(all(s['status'] == 'completed' for s in result['sections']))
            self.assertLessEqual(len(recorder.models), 16)
            self.assertIsNone(result['cost']['modelUsd'])

    def test_real_conduct_write_four_tiers_80_sources_and_private_notes(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        from research.contracts import TIERS
        sources = [dict(id=f'src_{i}',title=f'Example founder source {i}',url=f'https://publisher{i}.com/source',
                        excerpt=('Example Industries public background. ' * 500)[:12000],
                        kind='page_extract',retrievedAt='2026-10-13') for i in range(80)]
        sources[0] = dict(id='alpha_video_1', title='Alpha discovery',url='https://youtube.com/watch?v=abcdef',
                          excerpt='',kind='alpha_reference',retrievedAt='2026-10-13',timestampSeconds=42)
        sources[1]['url'] = 'https://example.com/podcast'
        calls = RecordingCalls()
        body = {'title':'Example founder', 'notes':'PRIVATE_NOTES_SENT_ONLY_TO_WRITER',
                'notesApproved':True, 'sections':[dict(key=k,content='prior context ' * 1700) for k in TIERS]}
        async def exercise():
            engine = GPTREngine(calls)
            self.assertEqual((await engine.resolve(body,sources))['kind'], 'resolved')
            current = sources
            for key, (_, description) in TIERS.items():
                answer, current = await engine.tier(body,key,description,current)
                self.assertIn('[src_1]', answer)
                self.assertEqual(len(current),80)
            before = len(calls.searches)
            answer = await engine.chat({**body,'sources':sources,'question':'What is supported?',
                                        'messages':[{'role':'user','content':'question '*750} for _ in range(12)]})
            self.assertIn('[src_1]',answer)
            self.assertEqual(len(calls.searches),before)
        with patch('socket.socket.connect',side_effect=AssertionError('unexpected external socket')):
            asyncio.run(exercise())
        self.assertTrue(calls.extracts)
        self.assertFalse(any('PRIVATE_NOTES' in q for q in calls.searches))
        for message in calls.models:
            if 'PRIVATE_NOTES' in message:
                self.assertTrue('Write the ' in message or 'Answer only from the supplied evidence' in message)
        self.assertTrue(any('PRIVATE_NOTES' in m for m in calls.models))
    def test_unapproved_notes_not_sent_even_to_chat(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        calls = RecordingCalls()
        async def exercise():
            engine = GPTREngine(calls)
            await engine.chat({'sources':calls.search('public'), 'question':'Question',
                               'sections':[], 'messages':[], 'notes':'NEVER_SEND_PRIVATE', 'notesApproved':False})
        with patch('socket.socket.connect',side_effect=AssertionError('unexpected external socket')):
            asyncio.run(exercise())
        self.assertNotIn('NEVER_SEND_PRIVATE',json.dumps(calls.models))

    def test_later_tier_admits_new_evidence_and_protects_full_completed_sections(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        from research.contracts import TIERS
        class LaterEvidence(RecordingCalls):
            def search(self, query):
                self.searches.append(query)
                return [{**source(i), 'title': 'India skills employment',
                         'excerpt': 'NEW_INDIA_EVIDENCE industry skills employment opportunities.'}
                        for i in range(80, 83)]
        calls = LaterEvidence()
        sources = [source(i) for i in range(80)]
        # Citations after compact_sections' 1500-byte slice must still be protected.
        sections = [
            dict(key='snacks', status='completed', content='Background. ' * 200 + '[src_78]'),
            dict(key='appetizers', status='completed',
                 content='Industry. ' * 200 + '\n\n**Numeric evidence comparisons**\n| [src_79] | 20 |'),
        ]
        engine = GPTREngine(calls)
        with patch('socket.socket.connect', side_effect=AssertionError('unexpected external socket')):
            _, retained = asyncio.run(engine.tier(
                dict(title='Example founder', sections=sections), 'main', TIERS['main'][1], sources))
        self.assertEqual(len(retained), 83)
        self.assertIn(sources[78], retained)
        self.assertIn(sources[79], retained)
        self.assertIn('src_80', {s['id'] for s in retained})
        writer = next(m for m in calls.models if 'Write the ' in m)
        self.assertIn('NEW_INDIA_EVIDENCE', writer)

    def test_bare_source_id_in_full_completed_text_is_protected(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        class LaterEvidence(RecordingCalls):
            def search(self, query):
                return [{**source(80), 'title': 'India skills employment'}]
        sources = [source(i) for i in range(80)]
        sections = [dict(key='snacks', status='completed',
                         content='Background. ' * 200 + 'According to src_79, this is documented.')]
        with patch('socket.socket.connect', side_effect=AssertionError('unexpected external socket')):
            _, retained = asyncio.run(GPTREngine(LaterEvidence()).tier(
                dict(title='Example founder', sections=sections), 'main', 'India skills employment', sources))
        self.assertEqual(len(retained), 81)
        self.assertIn(sources[79], retained)
        self.assertIn('src_80', {s['id'] for s in retained})

    def test_all_protected_sources_allow_additional_evidence_and_extraction(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        class LaterEvidence(RecordingCalls):
            def search(self, query):
                return [{**source(80), 'title': 'India skills employment'}]
        calls = LaterEvidence()
        sources = [source(i) for i in range(80)]
        sections = [dict(key='snacks', status='completed',
                         content=' '.join(f'[src_{i}]' for i in range(80)))]
        engine = GPTREngine(calls)
        with patch('socket.socket.connect', side_effect=AssertionError('unexpected external socket')):
            _, retained = asyncio.run(engine.tier(
                dict(title='Example founder', sections=sections), 'main', 'India skills employment', sources))
        self.assertEqual(len(retained),81)
        self.assertEqual(retained[:80], sources)
        self.assertTrue(calls.extracts)
        self.assertFalse(any('80' in warning and 'cited' in warning for warning in engine.warnings))

    def test_search_failure_uses_retained_evidence_with_bounded_extraction_and_private_notes(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        for error in (ProviderError('PRIVATE_ERROR'), ValueError('PRIVATE_ERROR')):
            with self.subTest(error=type(error).__name__):
                class SearchDown(RecordingCalls):
                    def search(self, query):
                        self.searches.append(query)
                        raise error
                calls = SearchDown()
                engine = GPTREngine(calls)
                sources = [source(i) for i in range(80)]
                with patch('socket.socket.connect', side_effect=AssertionError('unexpected external socket')):
                    report, retained = asyncio.run(engine.tier(
                        dict(title='Example founder', notes='PRIVATE_NOTES', notesApproved=True),
                        'main', 'India skills employment', sources))
                self.assertIn('[src_1]', report)
                self.assertEqual(retained, sources)
                self.assertIsNone(calls.stage_error)
                self.assertLessEqual(len(calls.extracts), 8)
                self.assertLessEqual(len(calls.searches), 4)
                self.assertTrue(engine.warnings)
                self.assertNotIn('PRIVATE_ERROR', ' '.join(engine.warnings))
                self.assertNotIn('PRIVATE_NOTES', ' '.join(calls.searches))
                for message in calls.models:
                    if 'PRIVATE_NOTES' in message:
                        self.assertIn('Write the ', message)

    def test_search_failure_without_usable_retained_evidence_stays_fatal(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        for sources in ([], [{**source(1), 'excerpt': ''}],
                        [{**source(1), 'kind': 'alpha_reference'}]):
            with self.subTest(sources=sources):
                error = ProviderError('search failed')
                class SearchDown(RecordingCalls):
                    def search(self, query):
                        raise error
                calls = SearchDown()
                with patch('socket.socket.connect', side_effect=AssertionError('unexpected external socket')):
                    with self.assertRaises(ProviderError) as caught:
                        asyncio.run(GPTREngine(calls).tier(dict(title='Example founder'),
                                                          'main', 'India skills', sources))
                self.assertIs(caught.exception, error)
                self.assertFalse(any('Write the ' in m for m in calls.models))

    def test_search_fallback_never_masks_fatal_errors_or_a_model_stage_error(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        for error in (BudgetExceeded('budget'), Stopped('cancelled or fenced'),
                      StorageError('storage'), ProviderError('model failed')):
            with self.subTest(error=type(error).__name__):
                class FatalSearch(RecordingCalls):
                    def search(self, query):
                        if isinstance(error, ProviderError):
                            # Calls.check rethrows a prior/concurrent model error through search.
                            self.stage_error = error
                        raise error
                calls = FatalSearch()
                with patch('socket.socket.connect', side_effect=AssertionError('unexpected external socket')):
                    with self.assertRaises(type(error)) as caught:
                        asyncio.run(GPTREngine(calls).tier(dict(title='Example founder'),
                                                          'main', 'India skills', [source(1)]))
                self.assertIs(caught.exception, error)
                self.assertFalse(any('Write the ' in m for m in calls.models))

    def test_merge_validation_failure_is_not_search_fallback(self):
        from research.gptr import GPTREngine as BaseEngine
        GPTREngine = prepared_engine(BaseEngine)
        class Collision(RecordingCalls):
            def search(self, query):
                return [{**source(2), 'id': 'src_1'}]
        calls = Collision()
        with patch('socket.socket.connect', side_effect=AssertionError('unexpected external socket')):
            with self.assertRaises(ValueError):
                asyncio.run(GPTREngine(calls).tier(dict(title='Example founder'),
                                                  'main', 'India skills', [source(1)]))
        self.assertFalse(any('Write the ' in m for m in calls.models))
