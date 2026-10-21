"""Direct Messages API contracts, using only synthetic responses and credentials."""
import io
import json
import os
import unittest
from contextlib import redirect_stderr
from unittest.mock import MagicMock, patch

import httpx

from research.providers import Calls, Network, ProviderError, configured, model_info, redact, stream_response
from research.diagnostics import failure
from research.tests.test_runner import StoreFixture


def events(text='Answer', stop='end_turn'):
    return [
        {'type': 'message_start', 'message': {'id': 'msg_fixture', 'model': 'claude-sonnet-5-5', 'usage': {'input_tokens': 11, 'output_tokens': 1}}},
        {'type': 'content_block_start', 'index': 0, 'content_block': {'type': 'thinking', 'thinking': ''}},
        {'type': 'content_block_delta', 'index': 0, 'delta': {'type': 'thinking_delta', 'thinking': 'PRIVATE_REASONING'}},
        {'type': 'content_block_stop', 'index': 0},
        {'type': 'content_block_start', 'index': 1, 'content_block': {'type': 'text', 'text': ''}},
        {'type': 'content_block_delta', 'index': 1, 'delta': {'type': 'text_delta', 'text': text}},
        {'type': 'content_block_stop', 'index': 1},
        {'type': 'message_delta', 'delta': {'stop_reason': stop}, 'usage': {'output_tokens': 17}},
        {'type': 'message_stop'},
    ]


def wire(values):
    return ''.join('event: ' + e['type'] + '\ndata: ' + json.dumps(e) + '\n\n' for e in values).encode()


def message(text='Answer', stop='end_turn'):
    return {'id': 'msg_fixture', 'model': 'claude-sonnet-5-5', 'usage': {'input_tokens': 11, 'output_tokens': 17},
            'content': [{'type': 'thinking', 'thinking': 'PRIVATE_REASONING'}, {'type': 'text', 'text': text}], 'stop_reason': stop}


class ClaudeTests(StoreFixture):
    def setUp(self):
        super().setUp()
        env = patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'fixture-claude-key', 'OPENROUTER_API_KEY': 'legacy-key'})
        env.start()
        self.addCleanup(env.stop)
        self.claimed = self.claim()
        self.net = MagicMock()
        self.net.request.return_value = (message(), {})
        self.calls = Calls(self.db, *self.claimed[:2], network=self.net)

    def test_direct_request_system_translation_schema_and_usage(self):
        schema = {'type': 'object', 'properties': {'ok': {'type': 'boolean'}}, 'required': ['ok'], 'additionalProperties': False}
        result = self.calls.model([{'role': 'system', 'content': 'Rules'}, {'role': 'user', 'content': 'Question'}], 4000,
                                  effort='low', output_schema=schema)
        self.assertEqual(result, 'Answer')
        method, url, headers, body = self.net.request.call_args.args
        self.assertEqual((method, url), ('POST', 'https://api.anthropic.com/v1/messages'))
        self.assertEqual(headers['x-api-key'], 'fixture-claude-key')
        self.assertEqual(headers['anthropic-version'], '2023-06-01')
        self.assertEqual(body['system'], [{'type': 'text', 'text': 'Rules'}])
        self.assertEqual(body['messages'], [{'role': 'user', 'content': 'Question'}])
        self.assertEqual(body['model'], 'claude-sonnet-5-5')
        self.assertEqual(body['thinking'], {'type': 'between_tools'})
        self.assertEqual(body['output_config'], {'effort': 'low', 'format': {'type': 'json_schema', 'schema': schema}})
        self.assertEqual(body['max_tokens'], 4000)
        self.assertFalse(set(body) & {'temperature', 'top_p', 'top_k', 'tool_choice', 'tools', 'provider', 'reasoning'})
        self.assertEqual(self.calls.usage, {'inputTokens': 11, 'outputTokens': 17})
        self.assertEqual(self.calls.model_info, {**model_info(), 'reportedModel': 'claude-sonnet-5-5'})
        self.assertEqual(model_info()['service'], 'anthropic')
        self.assertIsNone(self.db.get(self.body['id'])['cost']['modelUsd'])

    def test_missing_key_never_uses_legacy_credentials(self):
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': ''}):
            self.assertFalse(configured())
            with self.assertRaises(ProviderError) as caught:
                self.calls.model([{'role': 'user', 'content': 'Question'}])
        self.assertEqual(failure(caught.exception, 'runner')['provider'], 'anthropic')
        self.net.request.assert_not_called()
        self.assertEqual(self.db.get(self.body['id'])['cost']['modelUsd'], 0)

    def test_stop_reasons_refusal_empty_tools_and_truncation_fail_closed(self):
        for stop, content, code in [('max_tokens', 'Partial', 'output_truncated'), ('refusal', 'No', 'invalid_output'),
                                     ('tool_use', 'Partial', 'invalid_output'), ('end_turn', ' ', 'empty_output'),
                                     (None, 'Partial', 'invalid_output')]:
            with self.subTest(stop=stop):
                self.net.request.return_value = (message(content, stop), {})
                with self.assertRaises(ProviderError) as caught:
                    self.calls.model([{'role': 'user', 'content': 'Question'}])
                self.assertEqual(caught.exception.code, code)
                if stop == 'refusal':
                    self.assertFalse(failure(caught.exception, 'main')['retryable'])
        self.assertIsNone(self.db.get(self.body['id'])['cost']['modelUsd'])

    def test_secret_redaction_and_diagnostics_do_not_disclose_content(self):
        self.assertEqual(redact({'value': 'fixture-claude-key'}), {'value': '[redacted]'})
        capture = io.StringIO()
        with redirect_stderr(capture):
            self.calls.model([{'role': 'user', 'content': 'PRIVATE_PROMPT'}])
        self.assertNotIn('PRIVATE', capture.getvalue())
        self.assertNotIn('fixture-claude-key', capture.getvalue())


class ClaudeStreamingTests(unittest.TestCase):
    def test_typed_stream_requires_terminal_event_and_combines_usage(self):
        result = stream_response(wire(events('Hello')))
        self.assertEqual(result['content'], [{'type': 'text', 'text': 'Hello'}])
        self.assertEqual(result['usage'], {'input_tokens': 11, 'output_tokens': 17})
        self.assertEqual(result['stop_reason'], 'end_turn')
        self.assertNotIn('PRIVATE', json.dumps(result))
        for incomplete in [events()[:-1], events()[:6], [{'type': 'message_stop'}]]:
            with self.subTest(incomplete=incomplete), self.assertRaises(ProviderError):
                stream_response(wire(incomplete))

    def test_split_utf8_and_multiple_text_blocks_stop_without_socket_eof(self):
        values = events('नमस्ते')
        values[7:7] = [
            {'type': 'content_block_start', 'index': 2, 'content_block': {'type': 'text', 'text': ''}},
            {'type': 'content_block_delta', 'index': 2, 'delta': {'type': 'text_delta', 'text': ' world'}},
            {'type': 'content_block_stop', 'index': 2},
        ]
        raw = wire(values).replace(b'\\u0928', 'न'.encode())
        def chunks():
            for index in range(0, len(raw), 7):
                yield raw[index:index + 7]
            raise AssertionError('Read past message_stop')
        response = MagicMock(status_code=200, headers={})
        response.iter_bytes.side_effect = chunks
        client = MagicMock()
        client.__enter__.return_value.stream.return_value.__enter__.return_value = response
        with patch('research.providers.httpx.Client', return_value=client):
            result, _ = Network().request('POST', 'https://api.anthropic.com/v1/messages', {}, {'stream': True})
        self.assertEqual(''.join(b['text'] for b in result['content']), 'नमस्ते world')

    def test_http_errors_are_attributed_and_invalid_requests_not_retried(self):
        for status, code, retryable in [(400, 'invalid_output', False), (401, 'authentication', False),
                                         (403, 'authentication', False), (429, 'rate_limit', True),
                                         (500, 'provider_unavailable', True), (529, 'provider_unavailable', True)]:
            response = MagicMock(status_code=status, headers={})
            client = MagicMock()
            client.__enter__.return_value.stream.return_value.__enter__.return_value = response
            with self.subTest(status=status), patch('research.providers.httpx.Client', return_value=client):
                with self.assertRaises(ProviderError) as caught:
                    Network().request('POST', 'https://api.anthropic.com/v1/messages', {}, {})
            details = failure(caught.exception, 'main')
            self.assertEqual((details['provider'], details['operation'], details['code'], details['retryable']),
                             ('anthropic', 'model', code, retryable))
            response.iter_bytes.assert_not_called()

    def test_stream_errors_map_without_provider_message(self):
        for kind, code in [('rate_limit_error', 'rate_limit'), ('authentication_error', 'authentication'),
                           ('overloaded_error', 'provider_unavailable'), ('invalid_request_error', 'invalid_output')]:
            with self.subTest(kind=kind), self.assertRaises(ProviderError) as caught:
                stream_response(wire([{'type': 'error', 'error': {'type': kind, 'message': 'PRIVATE'}}]))
            self.assertEqual(caught.exception.code, code)
            self.assertNotIn('PRIVATE', str(caught.exception))

    def test_read_timeout_and_aborted_connections_never_return_partial_text(self):
        for error, reason in [(httpx.ReadTimeout('PRIVATE'), 'read_timeout'), (httpx.ReadError('PRIVATE'), 'transport_error')]:
            response = MagicMock(status_code=200, headers={})
            def chunks():
                yield wire(events()[:6])
                raise error
            response.iter_bytes.side_effect = chunks
            client = MagicMock()
            client.__enter__.return_value.stream.return_value.__enter__.return_value = response
            with self.subTest(reason=reason), patch('research.providers.httpx.Client', return_value=client):
                with self.assertRaises(ProviderError) as caught:
                    Network().request('POST', 'https://api.anthropic.com/v1/messages', {}, {'stream': True})
            self.assertEqual(caught.exception.details['reason'], reason)
            self.assertNotIn('PRIVATE', str(caught.exception))
