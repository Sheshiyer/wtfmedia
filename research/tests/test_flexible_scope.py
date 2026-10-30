import asyncio
import itertools
import json
from unittest.mock import patch

from research.contracts import JobInput, ResearchInput, Section, TIERS
from research.gptr import GPTREngine
from research.providers import ProviderError
from research.source_channels import CHANNELS, channel_query, dedicated_input, public_subject
from research.tests.test_runner import StoreFixture, FakeCalls, FakeEngine
from research.worker import run_job


class FlexibleScopeTests(StoreFixture):
    def test_all_seven_field_combinations_normalize_without_inventing_entities(self):
        names = ('guestName', 'companyName', 'industry')
        for mask in itertools.product((False, True), repeat=3):
            if not any(mask):
                continue
            supplied = {name: '  Public ' + name + '  ' for name, present in zip(names, mask) if present}
            parsed = ResearchInput.model_validate(supplied).model_dump()
            self.assertEqual([bool(parsed[n]) for n in names], list(mask))
            self.assertTrue(all(parsed[n] == supplied.get(n, '').strip() for n in names))
        for fields in [{}, {'guestName': '  '}, {'companyName': 4}, {'industry': None},
                       {'guestName': 'a'}, {'industry': 'x' * 121}, {'guestName': '😀' * 61}]:
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                ResearchInput.model_validate(fields)

    def test_skip_is_strict_root_property_and_skipped_content_must_be_empty(self):
        value = JobInput.model_validate({**self.body, 'researchInput': {'industry': 'Energy'}, 'skipClarification': True})
        self.assertTrue(value.model_dump()['skipClarification'])
        self.assertNotIn('skipClarification', value.researchInput.model_dump())
        for request in [{**self.body, 'skipClarification': 'true'},
                        {**self.body, 'researchInput': {'industry': 'Energy', 'skipClarification': True}}]:
            with self.assertRaises(ValueError):
                JobInput.model_validate(request)
        self.assertEqual(Section(key='snacks', title='Guest omitted', content='', status='skipped').content, '')
        with self.assertRaises(ValueError):
            Section(key='snacks', title='Guest omitted', content='Invented biography', status='skipped')

    def test_search_channels_use_only_populated_fields(self):
        for key, label in [('guestName', 'Guest'), ('companyName', 'company'), ('industry', 'industry')]:
            fields = {n: '' for n in ('guestName', 'companyName', 'industry')}
            fields[key] = 'Public subject'
            request = {**self.body, 'researchInput': fields}
            self.assertEqual(public_subject(request), f'{label}: Public subject')
            for channel in CHANNELS:
                self.assertIn('Public subject', channel_query(channel, request))
                if channel != 'web':
                    query = dedicated_input(channel, request)
                    self.assertIn('Publicsubject' if channel == 'instagram' else 'Public subject', json.dumps(query))

    def test_every_starting_field_expands_to_all_four_sections(self):
        for mask in itertools.product((False, True), repeat=3):
            if not any(mask):
                continue
            fields = {key: value for key, value, enabled in zip(
                ('guestName', 'companyName', 'industry'), ('Example Person', 'Acme', 'Energy'), mask) if enabled}
            expected = list(TIERS)
            with self.subTest(fields=fields):
                self.db.delete(self.body['id'])
                from research.tests.test_runner import body
                self.body = body(researchInput=fields)
                called = []
                class Engine(FakeEngine):
                    async def tier(self, request, key, description, sources):
                        called.append(key)
                        from research.contracts import section_spec
                        return '# ' + section_spec(request, key)[0] + '\nA scoped observation [src_1].', sources
                asyncio.run(run_job(self.db, self.claim(), Engine, FakeCalls))
                result = self.db.get(self.body['id'])
                self.assertEqual(called, expected)
                self.assertEqual(result['status'], 'completed')
                self.assertEqual([s['key'] for s in result['sections']], list(TIERS))
                for section in result['sections']:
                    self.assertEqual(section['status'], 'completed' if section['key'] in expected else 'skipped')
                    if section['status'] == 'skipped':
                        self.assertEqual(section['content'], '')

    def test_skip_conflicting_guest_researches_clear_scope_and_survives_retry(self):
        self.body.update(researchInput={'guestName': 'Mukesh Bansal', 'companyName': 'Zomato', 'industry': 'Food delivery'}, skipClarification=True)
        seen = []
        class Ambiguous(FakeEngine):
            resolves = 0
            async def resolve(self, body, sources):
                self.__class__.resolves += 1
                return dict(kind='identity_conflict', clarification='Which person?', ambiguousFields=['guestName'])
            async def tier(self, body, key, description, sources):
                from research.contracts import section_spec
                seen.append(body['researchInput'])
                return '# ' + section_spec(body, key)[0] + '\nA company observation [src_1].', sources
        asyncio.run(run_job(self.db, self.claim(), Ambiguous, FakeCalls))
        first = self.db.get(self.body['id'])
        self.assertEqual(first['status'], 'completed')
        self.assertEqual(len(first['sections']), 4)
        self.assertEqual(first['sections'][0]['status'], 'completed')
        self.assertIn('People and leadership: Zomato', first['sections'][0]['title'])
        self.assertTrue(all(s['guestName'] == '' and s['companyName'] == 'Zomato' and s['industry'] == 'Food delivery' for s in seen))
        self.assertNotIn('Deepinder', json.dumps(first))
        self.assertIsNone(first['clarification'])
        with self.db.db() as db:
            db.execute("UPDATE jobs SET status='running',expires=0")
        resumed = self.db.claim()
        self.assertTrue(resumed[2]['skipClarification'])
        self.assertEqual(resumed[2]['researchInput']['guestName'], 'Mukesh Bansal')
        asyncio.run(run_job(self.db, resumed, Ambiguous, FakeCalls))
        self.assertEqual(Ambiguous.resolves, 1)
        self.assertEqual(self.db.get(self.body['id'])['sections'], first['sections'])

    def test_ambiguous_guest_with_clear_industry_researches_industry(self):
        self.body.update(researchInput={'guestName': 'Alex Smith', 'companyName': '', 'industry': 'Energy'}, skipClarification=True)
        class Ambiguous(FakeEngine):
            async def resolve(self, *args):
                return dict(kind='identity_conflict', clarification='Which Alex?', ambiguousFields=['guestName'])
            async def tier(self, body, key, description, sources):
                from research.contracts import section_spec
                self_test.assertEqual(body['researchInput'], {'guestName': '', 'companyName': '', 'industry': 'Energy'})
                return '# ' + section_spec(body, key)[0] + '\nIndustry finding [src_1].', sources
        self_test = self
        asyncio.run(run_job(self.db, self.claim(), Ambiguous, FakeCalls))
        result = self.db.get(self.body['id'])
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(result['sections'][0]['status'], 'completed')
        self.assertIn('People and leadership: Energy', result['sections'][0]['title'])
        self.assertTrue(all(s['status'] == 'completed' for s in result['sections'][1:]))

    def test_all_ambiguous_never_completes_or_searches_or_repeats_resolution(self):
        self.body.update(researchInput={'guestName': 'Alex Smith', 'companyName': '', 'industry': ''}, skipClarification=True)
        class Ambiguous(FakeEngine):
            resolves = 0
            async def resolve(self, *args):
                self.__class__.resolves += 1
                return dict(kind='identity_conflict', clarification='Which Alex?', ambiguousFields=['guestName'])
        with patch('research.worker.collect_channel', side_effect=AssertionError('No clear scope')):
            asyncio.run(run_job(self.db, self.claim(), Ambiguous, FakeCalls))
            result = self.db.get(self.body['id'])
            self.assertEqual(result['status'], 'clarification')
            self.assertFalse(any(s['status'] == 'completed' for s in result['sections']))
            with self.db.db() as db:
                db.execute("UPDATE jobs SET status='running',expires=0")
            asyncio.run(run_job(self.db, self.db.claim(), Ambiguous, FakeCalls))
        self.assertEqual(Ambiguous.resolves, 1)

    def test_optional_resolver_guidance_on_skip_does_not_remove_subject(self):
        self.body.update(researchInput={'guestName': '', 'companyName': '', 'industry': 'Energy'}, skipClarification=True)
        class Optional(FakeEngine):
            async def resolve(self, *args):
                return dict(kind='optional_guidance', clarification='Which angle?', ambiguousFields=[])
            async def tier(self, body, key, description, sources):
                from research.contracts import section_spec
                return '# ' + section_spec(body, key)[0] + '\nFinding [src_1].', sources
        asyncio.run(run_job(self.db, self.claim(), Optional, FakeCalls))
        result = self.db.get(self.body['id'])
        self.assertEqual(result['status'], 'completed')
        self.assertTrue(result['sources'])

    def test_optional_scope_clarification_skipped_keeps_safe_guidance(self):
        self.body.update(researchInput={'industry': 'Energy', 'guestName': '', 'companyName': ''},
                         notes='PRIVATE priorities unclear dates', notesApproved=True, skipClarification=True)
        class ScopedEngine(FakeEngine):
            async def tier(self, request, key, description, sources):
                from research.contracts import section_spec
                return '# ' + section_spec(request, key)[0] + '\nA finding [src_1].', sources
        with patch('research.worker.plan_scope', return_value={'focus': 'public competition', 'clarification': 'Which period?'}):
            asyncio.run(run_job(self.db, self.claim(), ScopedEngine, FakeCalls))
        result = self.db.get(self.body['id'])
        self.assertEqual(result['status'], 'completed')
        self.assertIsNone(result['clarification'])
        self.assertTrue(any('clarification' in w.lower() for w in result['warnings']))

    def test_arbitrary_missing_or_empty_completed_slots_do_not_finish(self):
        claim = self.claim()
        claim[4].update(resolved=True, channel_index=6, snacks=2, appetizers=2, main=2, desserts=2)
        claim[3]['sections'] = [dict(key='snacks', title='Invalid', content='', status='completed')]
        asyncio.run(run_job(self.db, claim, FakeEngine, FakeCalls))
        result = self.db.get(self.body['id'])
        self.assertNotEqual(result['status'], 'completed')

    def test_report_identity_check_rejects_substitution_before_completion(self):
        self.body.update(researchInput={'guestName': 'Mukesh Bansal', 'companyName': 'Zomato', 'industry': ''})
        class Substitution(FakeEngine):
            async def tier(self, *args):
                return '# Guest: Deepinder Goyal\nDeepinder founded the company [src_1].', args[-1]
        asyncio.run(run_job(self.db, self.claim(), Substitution, FakeCalls))
        result = self.db.get(self.body['id'])
        self.assertNotEqual(result['sections'][0]['status'], 'completed')

    def test_engine_requests_low_effort_structured_resolution_and_scope(self):
        from research.scope import plan_scope
        from research.tests.test_gptr_compat import RecordingCalls
        class Calls(RecordingCalls):
            options = []
            def model(self, messages, max_tokens=1800, **kwargs):
                self.options.append(kwargs)
                if 'Extract research search constraints' in json.dumps(messages):
                    return json.dumps(dict(focus='public competition', relativePeriod=None, dateFrom=None, dateTo=None, clarification=None))
                return super().model(messages, max_tokens)
        calls = Calls()
        request = {**self.body, 'researchInput': {'guestName': '', 'companyName': '', 'industry': 'Energy'},
                   'notes': 'PRIVATE_GUIDANCE about competitors', 'notesApproved': True, 'skipClarification': True}
        asyncio.run(GPTREngine(calls).resolve(request, []))
        asyncio.run(plan_scope(calls, request))
        for options in calls.options:
            self.assertEqual(options.get('effort'), 'low')
            self.assertEqual(options['output_schema']['type'], 'object')
            self.assertFalse(options['output_schema']['additionalProperties'])

    def test_real_gptr_planning_and_writing_receive_only_applicable_scope(self):
        from research.tests.test_gptr_compat import RecordingCalls, prepared_engine
        class Calls(RecordingCalls):
            options = []
            def model(self, messages, max_tokens=1800, **kwargs):
                self.options.append(kwargs)
                return super().model(messages, max_tokens)
        request = {**self.body, 'researchInput': {'guestName': '', 'companyName': '', 'industry': 'Energy'}}
        calls = Calls()
        from research.contracts import section_spec
        with patch('socket.socket.connect', side_effect=AssertionError('unexpected network')):
            asyncio.run(prepared_engine(GPTREngine)(calls).tier(request, 'appetizers', section_spec(request, 'appetizers')[1], []))
        self.assertTrue(any(o.get('output_schema', {}).get('properties', {}).get('queries') for o in calls.options))
        writer = next(m for m in calls.models if 'Write the ' in m)
        self.assertIn('# Industry: Energy', writer)
        self.assertIn('tables', writer)
        self.assertNotIn('Who the guest is: expanded background', json.dumps(calls.searches))
        self.assertNotIn('Company strategy, products', json.dumps(calls.searches))

    def test_followup_only_reads_saved_evidence_without_search_or_extract(self):
        from research.tests.test_gptr_compat import RecordingCalls
        from research.tests.test_runner import source
        calls = RecordingCalls()
        request = {**self.body, 'sources': [source()], 'question': 'What does the evidence support?',
                   'sections': [], 'messages': [], 'notes': 'UNAPPROVED', 'notesApproved': False}
        with patch.object(calls, 'search', side_effect=AssertionError('no followup search')), \
             patch.object(calls, 'extract', side_effect=AssertionError('no followup extraction')), \
             patch('socket.socket.connect', side_effect=AssertionError('unexpected network')):
            response = asyncio.run(GPTREngine(calls).chat(request))
        self.assertIn('[src_1]', response)
        self.assertEqual(len(calls.models), 1)
        self.assertIn('Revenue was 20 USD million', calls.models[0])
        self.assertNotIn('UNAPPROVED', calls.models[0])

    def test_single_section_cannot_claim_missing_slots_complete(self):
        self.body.update(section='main', sections=[])
        asyncio.run(run_job(self.db, self.claim(), FakeEngine, FakeCalls))
        self.assertEqual(self.db.get(self.body['id'])['status'], 'partial')

    def test_recovery_preserves_completed_people_research_from_industry_start(self):
        self.body.update(researchInput={'guestName': '', 'companyName': '', 'industry': 'Energy'})
        claim = self.claim()
        claim[4].update(resolved=True, channel_index=6)
        claim[3]['sections'] = [dict(key=key, title='Saved', content='Retained associated industry research', status='completed') for key in TIERS]
        asyncio.run(run_job(self.db, claim, FakeEngine, FakeCalls))
        guest = self.db.get(self.body['id'])['sections'][0]
        self.assertEqual((guest['status'], guest['content']), ('completed', 'Retained associated industry research'))

    def test_resolution_cannot_change_values_or_dispute_omitted_fields(self):
        request = {**self.body, 'researchInput': {'guestName': 'Alex Smith', 'companyName': '', 'industry': 'Energy'}}
        invalid = [
            {'kind': 'identity_conflict', 'clarification': 'Which?', 'ambiguousFields': ['companyName']},
            {'kind': 'identity_conflict', 'clarification': 'Which?', 'ambiguousFields': []},
            {'kind': 'resolved', 'clarification': None, 'ambiguousFields': ['guestName']},
            {'kind': 'optional_guidance', 'clarification': 'Which?', 'ambiguousFields': ['guestName']},
            {'kind': 'identity_conflict', 'clarification': 'Which?', 'ambiguousFields': ['guestName'], 'guestName': 'Other'},
            {'clarification': None},
        ]
        class Calls:
            def model(self, *args, **kwargs):
                return json.dumps(value)
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(ProviderError):
                asyncio.run(GPTREngine(Calls()).resolve(request, []))

    def test_followup_does_not_restore_guest_excluded_by_clarification_skip(self):
        from research.tests.test_gptr_compat import RecordingCalls
        from research.tests.test_runner import source
        calls = RecordingCalls()
        request = {**self.body, 'researchInput': {'guestName': 'Mukesh Bansal', 'companyName': 'Zomato', 'industry': ''},
                   'sources': [source()], 'question': 'Summarize the company?', 'messages': [],
                   'sections': [dict(key='snacks', title='Guest omitted: identity unresolved', content='', status='skipped'),
                                dict(key='appetizers', title='Company', content='Company evidence.', status='completed')]}
        asyncio.run(GPTREngine(calls).chat(request))
        context = json.loads(json.loads(calls.models[-1])[-1]['content'])
        self.assertEqual(context['researchInput']['guestName'], '')
        self.assertEqual(context['researchInput']['companyName'], 'Zomato')
        self.assertIn('identity unresolved', json.dumps(context))
        self.assertEqual(request['researchInput']['guestName'], 'Mukesh Bansal')

    def test_followup_keeps_narrowed_company_or_industry_scope(self):
        from research.tests.test_gptr_compat import RecordingCalls
        from research.tests.test_runner import source
        for title, expected in [('Industry: Energy', {'guestName': '', 'companyName': '', 'industry': 'Energy'}),
                                ('Company: Acme', {'guestName': '', 'companyName': 'Acme', 'industry': ''})]:
            calls = RecordingCalls()
            request = {**self.body, 'researchInput': {'guestName': '', 'companyName': 'Acme', 'industry': 'Energy'},
                       'sources': [source()], 'question': 'Summarize?', 'messages': [],
                       'sections': [dict(key='snacks', title='Guest omitted', content='', status='skipped'),
                                    dict(key='appetizers', title=title, content='Finding.', status='completed')]}
            asyncio.run(GPTREngine(calls).chat(request))
            context = json.loads(json.loads(calls.models[-1])[-1]['content'])
            self.assertEqual(context['researchInput'], expected)

    def test_narrowed_scope_note_visible_and_original_identity_not_in_query_inputs(self):
        self.body.update(title='Mukesh Bansal and Zomato', clarification='Research Mukesh Bansal with this company',
                         researchInput={'guestName': 'Mukesh Bansal', 'companyName': 'Zomato', 'industry': ''},
                         notes='Private info', notesApproved=True, skipClarification=True)
        public = []
        class Ambiguous(FakeEngine):
            async def resolve(self, *args):
                return dict(kind='identity_conflict', clarification='Which person?', ambiguousFields=['guestName'])
            async def tier(self, body, key, description, sources):
                from research.contracts import section_spec
                public.append([body['title'], public_subject(body), body.get('clarification'), body['searchScope'].get('focus', '')])
                return '# ' + section_spec(body, key)[0] + '\nA finding [src_1].', sources
        with patch('research.worker.plan_scope', return_value={'focus': 'Mukesh Bansal career', 'clarification': None}):
            asyncio.run(run_job(self.db, self.claim(), Ambiguous, FakeCalls))
        result = self.db.get(self.body['id'])
        self.assertEqual(result['status'], 'completed')
        self.assertNotIn('Mukesh', json.dumps(public))
        self.assertIn('Scope:', result['sections'][0]['content'])
        self.assertIn('identity', result['sections'][0]['content'])
        self.assertNotIn('Scope:', result['sections'][2]['content'])
