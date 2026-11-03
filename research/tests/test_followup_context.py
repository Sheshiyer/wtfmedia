import asyncio
import json
import unittest
from research.contracts import ChatInput
from research.gptr import GPTREngine

class Calls:
    def __init__(self): self.messages = None
    def model(self, messages, *args, **kwargs):
        self.messages = messages
        return 'Proposed interview angles, not established findings.'
    def search(self, *args): raise AssertionError('No new search')
    def extract(self, *args): raise AssertionError('No new extraction')

class FollowupContextTests(unittest.TestCase):
    def test_options_focus_and_subject_available_without_source_extracts(self):
        problem = dict(id='p1', title='Trust', question='How can trust be established?',
                       why='Explore public ideas.', domain='Technology', sourceIds=['src_a'])
        body = ChatInput(question='Show the other problems and sensitive topics',
                         title='Public guest', researchProblems=[problem], selectedProblem=problem,
                         notes='Private unapproved guidance', notesApproved=False).model_dump()
        calls = Calls()
        answer = asyncio.run(GPTREngine(calls).chat(body))
        context = json.loads(calls.messages[-1]['content'])
        self.assertEqual(context['offeredProblems'], [problem])
        self.assertEqual(context['selectedProblem'], problem)
        self.assertEqual(context['title'], 'Public guest')
        self.assertNotIn('Private unapproved', json.dumps(calls.messages))
        self.assertIn('editorial suggestions', calls.messages[0]['content'])
        self.assertIn('Do not invent allegations', calls.messages[0]['content'])
        self.assertIn('Proposed', answer)

    def test_legacy_brief_does_not_invent_original_options(self):
        calls = Calls()
        asyncio.run(GPTREngine(calls).chat(ChatInput(question='What were the other options?').model_dump()))
        self.assertEqual(json.loads(calls.messages[-1]['content'])['offeredProblems'], [])
        self.assertIn('original list is unavailable', calls.messages[0]['content'])

class ResolutionGuidanceTests(unittest.TestCase):
    def test_optional_spelling_confirmation_does_not_interrupt(self):
        class Resolver(Calls):
            def model(self, messages, *args, **kwargs):
                self.messages = messages
                return json.dumps(dict(kind='optional_guidance', clarification='Confirm spelling?', ambiguousFields=[]))
        calls = Resolver()
        result = asyncio.run(GPTREngine(calls).resolve({'researchInput': {'guestName':'Balaji Srinivase'}}, []))
        self.assertEqual(result, dict(kind='resolved', clarification=None, ambiguousFields=[]))
        self.assertIn('minor spelling errors', calls.messages[0]['content'])

    def test_genuine_identity_conflict_still_requires_clarification(self):
        class Resolver(Calls):
            def model(self, *args, **kwargs):
                return json.dumps(dict(kind='identity_conflict', clarification='Which Alex?', ambiguousFields=['guestName']))
        result = asyncio.run(GPTREngine(Resolver()).resolve({'researchInput': {'guestName':'Alex Smith'}}, []))
        self.assertEqual(result['kind'], 'identity_conflict')
