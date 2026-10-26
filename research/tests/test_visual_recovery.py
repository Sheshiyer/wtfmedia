"""Offline source fixtures for visual recovery; no provider or browser calls."""
import asyncio
import copy
import json
import unittest

from research.visuals import BATCH_SCHEMA, VISUAL_SCHEMA, build_visual, build_visuals, evidence_map, repair_visual, validate_visual

QUOTE = 'The platform receives a booking and sends the confirmed reservation to the hotel.'
SOURCES = [{'id': 'src_booking', 'title': 'Booking process', 'url': 'https://example.com/booking',
            'kind': 'page_extract', 'evidenceType': 'page_extract', 'excerpt': QUOTE,
            'retrievedAt': '2026-10-26'}]


def figure():
    return dict(version=1, kind='flow', title='Booking flow', explanation='The cited booking process.', items=[
        dict(label='Receive booking', detail='The platform receives the booking.', sourceId='src_booking', quote=QUOTE),
        dict(label='Confirm reservation', detail='The platform sends confirmation to the hotel.', sourceId='src_booking', quote=QUOTE),
    ])


class VisualRecoveryTests(unittest.TestCase):
    def test_unsupported_heading_date_is_removed_without_changing_evidence(self):
        value = figure()
        value['title'] = 'Booking flow since 2007'
        original = copy.deepcopy(value)
        self.assertIsNone(validate_visual(value, SOURCES))
        repaired = repair_visual(value, SOURCES)
        self.assertIsNotNone(repaired)
        self.assertEqual(repaired['items'], original['items'])
        self.assertNotIn('2007', repaired['title'] + repaired['explanation'])
        self.assertEqual(value, original)
        self.assertIsNotNone(validate_visual(repaired, SOURCES))

    def test_numeric_item_uses_only_its_complete_verified_quote(self):
        value = figure()
        value['items'][0]['detail'] = 'The platform received 2007 bookings.'
        repaired = repair_visual(value, SOURCES)
        self.assertIsNotNone(repaired)
        self.assertEqual(repaired['items'][0]['detail'], QUOTE)
        self.assertEqual(repaired['kind'], 'comparison')
        self.assertIsNotNone(validate_visual(repaired, SOURCES))

    def test_recovery_never_repairs_missing_or_fabricated_quotes(self):
        for invalid in ('source', 'quote', 'long_quote'):
            value, sources = figure(), copy.deepcopy(SOURCES)
            value['title'] = 'Booking in 2007'
            if invalid == 'source':
                value['items'][0]['sourceId'] = 'missing'
            elif invalid == 'quote':
                value['items'][1]['quote'] = 'This fabricated process is not part of the retained source.'
            else:
                sources[0]['excerpt'] = QUOTE * 3
                value['items'][0].update(quote=QUOTE * 3, detail='The platform received 2007 bookings.')
            self.assertIsNone(repair_visual(value, sources))

    def test_null_and_invalid_numbers_have_different_visible_reasons(self):
        class Calls:
            count = 0
            def __init__(self, value): self.value = value
            def model(self, messages, max_tokens, **kwargs):
                self.count += 1
                self.schema = kwargs['output_schema']
                return json.dumps({'visual': self.value})
        calls = Calls(None)
        visual, notes = asyncio.run(build_visual(calls, 'Booking process', SOURCES))
        self.assertFalse(visual)
        self.assertIn('did not identify', notes[0])
        self.assertEqual(calls.count, 1)
        value = figure()
        value['title'] = 'Booking in 2007'
        calls = Calls(value)
        visual, notes = asyncio.run(build_visual(calls, 'Booking process', SOURCES))
        self.assertIn('```research-visual', visual)
        self.assertIn('simplified', notes[0])
        self.assertEqual(calls.count, 1)


class VisualBatchTests(unittest.TestCase):
    def test_request_schemas_omit_provider_unsupported_constraints(self):
        def inspect(value):
            if isinstance(value, dict):
                self.assertFalse(set(value) & {'maxItems', 'minLength', 'maxLength', 'minimum', 'maximum'})
                self.assertIn(value.get('minItems', 0), (0, 1))
                for child in value.values(): inspect(child)
            elif isinstance(value, list):
                for child in value: inspect(child)
        inspect(VISUAL_SCHEMA)
        inspect(BATCH_SCHEMA)

    def test_four_sections_share_one_request_and_invalid_figure_does_not_hide_others(self):
        sections = [{'key': key, 'content': 'Booking process'} for key in ('snacks', 'appetizers', 'main', 'desserts')]
        class Calls:
            count = 0
            def model(self, messages, max_tokens, **kwargs):
                self.count += 1
                invalid = figure()
                invalid['items'][0]['quote'] = 'This statement does not occur in the source excerpt.'
                return json.dumps({'sections': [{'key': s['key'], 'visual': invalid if s['key'] == 'main' else figure()}
                                                for s in sections]})
        calls = Calls()
        outcomes = asyncio.run(build_visuals(calls, sections, SOURCES))
        self.assertEqual(calls.count, 1)
        self.assertEqual(len(outcomes), 4)
        self.assertFalse(outcomes['main'][0])
        self.assertIn('quote did not match', outcomes['main'][1][0])
        self.assertTrue(all(outcomes[key][0] for key in ('snacks', 'appetizers', 'desserts')))


class EvidenceMapTests(unittest.TestCase):
    def test_null_batch_recovers_cited_extracts_without_another_request(self):
        sources = SOURCES + [{**SOURCES[0], 'id': 'src_other',
            'excerpt': 'The hotel confirms availability before accepting the reservation.'}]
        sections = [{'key': 'main', 'content': 'Booking evidence [src_booking] [src_other].'}]
        class Calls:
            count = 0
            def model(self, *args, **kwargs):
                self.count += 1
                return json.dumps({'sections': [{'key': 'main', 'visual': None}]})
        calls = Calls()
        outcomes = asyncio.run(build_visuals(calls, sections, sources))
        self.assertEqual(calls.count, 1)
        self.assertIn('"kind":"evidence"', outcomes['main'][0])
        value = evidence_map(sections[0]['content'], sources)
        self.assertIsNotNone(validate_visual(value, sources))
        self.assertEqual(value['items'][0]['detail'], QUOTE)

    def test_no_map_from_uncited_snippets_or_cut_off_sentences(self):
        other = {**SOURCES[0], 'id': 'src_other', 'excerpt': 'Another complete supporting statement about hotel reservations.'}
        self.assertIsNone(evidence_map('No citations', SOURCES + [other]))
        self.assertIsNone(evidence_map('[src_booking] [src_other]', [
            {**SOURCES[0], 'evidenceType': 'search_snippet'}, other]))
        self.assertIsNone(evidence_map('[src_booking] [src_other]', [
            {**SOURCES[0], 'excerpt': 'A sentence too long to display ' * 20 + '.'}, other]))
