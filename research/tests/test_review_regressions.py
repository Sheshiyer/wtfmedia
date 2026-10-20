"""Offline regressions for provider receipts and the untrusted diagnostics pipe."""
import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from research.api import relay_diagnostics
from research.diagnostics import emit
from research.providers import Calls, ProviderError
from research.store import Store


class ResponseNetwork:
    def __init__(self, payload):
        self.payload = payload

    def request(self, method, url, headers, body=None):
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload, {}


class ModelReceiptRegressions(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.store = Store(Path(temporary.name) / 'runner.sqlite')
        self.store.submit({'id': 'rrun_' + str(uuid4()), 'title': 'Public research',
                           'budgetMicro': 5_000_000})
        self.claim = self.store.claim()
        endpoint = patch('research.providers.model_endpoint',
                         return_value=('https://provider.example/v1', 'fixture-key'))
        endpoint.start()
        self.addCleanup(endpoint.stop)
        self.payload = {
            'id': 'receipt_fixture', 'model': 'vendor/observed-model',
            'choices': [{'finish_reason': 'stop',
                         'message': {'content': 'Retained public answer.'}}],
            'usage': None,
        }
        self.network = ResponseNetwork(self.payload)
        self.calls = Calls(self.store, *self.claim[:2], network=self.network)

    def test_null_usage_returns_answer_and_settles_unknown_cost(self):
        self.calls.usage = {'inputTokens': 99, 'outputTokens': 40}
        self.assertEqual(self.calls.model([]), 'Retained public answer.')
        self.assertIsNone(self.store.get(self.claim[0])['cost']['modelUsd'])
        self.assertEqual(self.calls.usage, {})
        with self.store.db() as db:
            row = db.execute('SELECT billed,receipt,response FROM calls').fetchone()
            self.assertIsNone(row['billed'])
            self.assertEqual(row['receipt'], 'receipt_fixture')
            self.assertEqual(json.loads(row['response']), {})
        self.assertTrue(self.calls.model_receipt_received)
        self.assertEqual(self.calls.model_info['reportedModel'], 'vendor/observed-model')

    def test_receipt_flag_starts_false_and_transport_failure_keeps_it_false(self):
        self.assertFalse(self.calls.model_receipt_received)
        self.network.payload = ProviderError('provider unavailable', code='timeout')
        with self.assertRaises(ProviderError):
            self.calls.model([])
        self.assertFalse(self.calls.model_receipt_received)

    def test_valid_billing_and_tokens_are_retained(self):
        self.payload['usage'] = {'prompt_tokens': 12, 'completion_tokens': 8,
                                 'cost': 0.000025}
        self.assertEqual(self.calls.model([]), 'Retained public answer.')
        self.assertTrue(self.calls.model_receipt_received)
        self.assertEqual(self.calls.usage, {'inputTokens': 12, 'outputTokens': 8})
        self.assertEqual(self.store.get(self.claim[0])['cost']['modelUsd'], 0.000025)

    def test_truncated_output_keeps_valid_receipt_metadata(self):
        self.payload['usage'] = {'cost': 0.000025}
        self.payload['choices'][0]['finish_reason'] = 'length'
        with self.assertRaises(ProviderError) as error:
            self.calls.model([])
        self.assertEqual(error.exception.code, 'output_truncated')
        self.assertTrue(self.calls.model_receipt_received)
        self.assertEqual(self.calls.model_info['reportedModel'], 'vendor/observed-model')
        self.assertEqual(self.store.get(self.claim[0])['cost']['modelUsd'], 0.000025)

    def test_malformed_metadata_is_safe_and_does_not_mark_a_receipt(self):
        for usage in [['private-provider-body'], 'private-provider-body', 7, True]:
            with self.subTest(usage=usage):
                self.payload['usage'] = usage
                with self.assertRaises(ProviderError) as error:
                    self.calls.model([])
                self.assertEqual(error.exception.code, 'invalid_output')
                self.assertNotIn('private-provider-body', str(error.exception))
                self.assertFalse(self.calls.model_receipt_received)

    def test_missing_usage_is_unknown_billing_not_zero(self):
        del self.payload['usage']
        self.assertEqual(self.calls.model([]), 'Retained public answer.')
        self.assertTrue(self.calls.model_receipt_received)
        self.assertIsNone(self.store.get(self.claim[0])['cost']['modelUsd'])


class DiagnosticsRelayRegressions(unittest.TestCase):
    def test_invalid_required_fields_and_nonobjects_are_ignored(self):
        baseline = {'stage': 'runner', 'status': 'failed'}
        for event in [None, [], 'private-provider-body', 1] + [
            {**baseline, field: value}
            for field in ('stage', 'status')
            for value in ([], {'private-provider-body': True}, None, 1, True)
        ]:
            with self.subTest(event=event):
                output = io.StringIO()
                with redirect_stderr(output):
                    emit(event)
                self.assertEqual(output.getvalue(), '')

    def test_invalid_optional_values_are_omitted_without_losing_safe_event(self):
        for field in ('code', 'channel'):
            for value in ([], {'private-provider-body': True}, None, 1, True):
                with self.subTest(field=field, value=value):
                    output = io.StringIO()
                    with redirect_stderr(output):
                        emit({'stage': 'runner', 'status': 'failed', field: value,
                              'message': 'private-provider-body', 'sourceCount': True})
                    self.assertEqual(json.loads(output.getvalue()), {
                        'event': 'research_stage', 'stage': 'runner', 'status': 'failed',
                    })

    def test_relay_survives_malformed_events_and_forwards_following_valid_event(self):
        events = [
            {'event': 'research_stage', 'stage': [], 'status': 'failed'},
            {'event': 'research_stage', 'stage': 'runner', 'status': {}},
            {'event': 'research_stage', 'stage': 'runner', 'status': 'failed',
             'code': ['private-provider-body'], 'channel': {'private-provider-body': True}},
            {'event': 'research_stage', 'stage': 'discovery', 'status': 'completed',
             'channel': 'reddit', 'sourceCount': 3, 'outputCharacters': 120,
             'owner': 'private-provider-body', 'message': 'private-provider-body'},
        ]
        pipe = io.BytesIO(b'private-provider-body\n\xff\n' +
                          b''.join(json.dumps(e).encode() + b'\n' for e in events))
        output = io.StringIO()
        with redirect_stderr(output):
            relay_diagnostics(pipe)
        self.assertTrue(pipe.closed)
        self.assertEqual([json.loads(line) for line in output.getvalue().splitlines()], [
            {'event': 'research_stage', 'stage': 'runner', 'status': 'failed'},
            {'event': 'research_stage', 'stage': 'discovery', 'status': 'completed',
             'channel': 'reddit', 'sourceCount': 3, 'outputCharacters': 120},
        ])
        self.assertNotIn('private-provider-body', output.getvalue())


if __name__ == '__main__':
    unittest.main()
