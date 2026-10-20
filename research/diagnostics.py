"""Content-free diagnostics. Never serialize provider exceptions or user inputs."""
import json
import sys
from .store import BudgetExceeded

CODES = {
    'timeout', 'rate_limit', 'authentication', 'budget_exhausted',
    'output_truncated', 'empty_output', 'invalid_output', 'storage_failure',
    'provider_unavailable', 'internal_error',
}
STAGES = {'resolve', 'discovery', 'snacks', 'appetizers', 'main', 'desserts', 'storage', 'runner'}
RETRYABLE = {'timeout', 'rate_limit', 'output_truncated', 'empty_output', 'invalid_output', 'provider_unavailable'}

REASONS = {'http_error', 'transport_error', 'connect_timeout', 'read_timeout', 'deadline',
           'stream_error', 'stream_incomplete', 'stream_invalid', 'response_too_large',
           'context_limit', 'no_matching_sources', 'invalid_json', 'invalid_schema', 'output_truncated', 'empty_output',
           'missing_api_key'}
PROVIDERS = {'treg', 'omniroute', 'openrouter', 'runner'}
OPERATIONS = {'catalog', 'search', 'social_search', 'extract', 'model'}


def safe_details(value):
    safe = {}
    for key, choices in (('reason', REASONS), ('provider', PROVIDERS), ('operation', OPERATIONS)):
        if isinstance(value.get(key), str) and value[key] in choices:
            safe[key] = value[key]
    if type(value.get('httpStatus')) is int and 100 <= value['httpStatus'] <= 599:
        safe['httpStatus'] = value['httpStatus']
    return safe


def failure(error, stage):
    code = getattr(error, 'code', None)
    if isinstance(error, BudgetExceeded):
        code = 'budget_exhausted'
    elif isinstance(error, ValueError) and code is None:
        code = 'invalid_output'
    if code not in CODES:
        code = 'internal_error'
    return {'stage': stage if stage in STAGES else 'runner',
            'code': code, 'retryable': code in RETRYABLE and getattr(error, 'details', {}).get('reason') not in {'context_limit', 'response_too_large', 'no_matching_sources'},
            **safe_details(getattr(error, 'details', {}))}


def emit(event):
    """Whitelist all values, including events parsed from the subprocess pipe."""
    if not isinstance(event, dict):
        return
    stage, status = event.get('stage'), event.get('status')
    if not isinstance(stage, str) or not isinstance(status, str):
        return
    if stage not in STAGES or status not in {
        'started', 'completed', 'failed', 'clarification', 'partial', 'cancelled'
    }:
        return
    safe = {'event': 'research_stage', 'stage': stage, 'status': status}
    safe.update(safe_details(event))
    code, channel = event.get('code'), event.get('channel')
    if isinstance(code, str) and code in CODES:
        safe['code'] = code
    if isinstance(channel, str) and channel in {'web', 'linkedin', 'youtube', 'instagram', 'reddit', 'x'}:
        safe['channel'] = channel
    for key in ('attempt', 'elapsedMs', 'sourceCount', 'outputCharacters', 'inputTokens', 'outputTokens', 'requestBytes', 'responseBytes'):
        value = event.get(key)
        if type(value) is int and 0 <= value <= 1_000_000_000:
            safe[key] = value
    print(json.dumps(safe, separators=(',', ':')), file=sys.stderr, flush=True)


class StorageError(RuntimeError):
    code = 'storage_failure'
