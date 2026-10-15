"""Real pinned GPTR import/conduct/write with fake external adapters, no credentials."""
import asyncio
import importlib.metadata
import json
import os
import socket
import unittest
from unittest.mock import patch

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
    def stage(self):
        self.stage_error = None
    def model(self, messages, max_tokens=1800):
        encoded = json.dumps(messages)
        if len(encoded) > 90000:
            raise AssertionError('oversized context')
        self.models.append(encoded)
        if 'Write the ' in encoded and max_tokens != 12000:
            raise AssertionError('Report writer must receive the full 12000-token budget')
        if 'Resolve the public entity' in encoded:
            return '{"clarification":null}'
        if 'Extract numeric claims' in encoded:
            return '{"claims":[]}'
        if 'Write the ' in encoded or 'Answer only from the supplied evidence' in encoded:
            return 'A bounded editorial observation [src_1].'
        return '["Example founder background", "Example founder industry"]'
    def search(self, query):
        self.searches.append(query)
        return [dict(id='src_1', title='Example founder podcast interview',url='https://example.com/podcast',
                     excerpt='The founder established Example Industries and discussed its public work in an interview.',
                     kind='search_snippet',retrievedAt='2026-10-13')]
    def extract(self, source):
        self.extracts.append(source['url'])
        return [{**source,'kind':'page_extract','excerpt':source['excerpt'] + ' Retained raw public page text.'}]


@unittest.skipUnless(installed(), 'install research/requirements.lock for real GPTR compatibility check')
class GPTRCompatibilityTests(unittest.TestCase):
    def test_real_conduct_write_four_tiers_80_sources_and_private_notes(self):
        from research.gptr import GPTREngine
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
            self.assertIsNone(await engine.resolve(body,sources))
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
        from research.gptr import GPTREngine
        calls = RecordingCalls()
        async def exercise():
            engine = GPTREngine(calls)
            await engine.chat({'sources':calls.search('public'), 'question':'Question',
                               'sections':[], 'messages':[], 'notes':'NEVER_SEND_PRIVATE', 'notesApproved':False})
        with patch('socket.socket.connect',side_effect=AssertionError('unexpected external socket')):
            asyncio.run(exercise())
        self.assertNotIn('NEVER_SEND_PRIVATE',json.dumps(calls.models))
