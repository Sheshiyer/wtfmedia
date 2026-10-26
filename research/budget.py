"""Versioned, code-owned request allowances. Amounts are reservations, not invoices."""
POLICY_VERSION = 1
PHASE_MAX = 12
MODEL_RESERVE = 250000
STATE_KEY = '_budget'
SECTIONS = ('snacks', 'appetizers', 'main', 'desserts')
PHASES = ('runner', 'resolve', 'dossier', 'channels', 'preparation', 'extraction', 'summaries', 'visuals') + tuple(
    f'{operation}_{section}' for operation in ('write', 'numeric', 'visual') for section in SECTIONS)
KINDS = ('stage_calls', 'job_reservation', 'call_retries', 'provider_cost_overrun')


def validate_limit(value):
    if not isinstance(value, dict) or set(value) - {'kind', 'phase', 'used', 'maximum'}:
        raise ValueError('invalid limit metadata')
    if value.get('kind') not in KINDS or value.get('phase') not in PHASES:
        raise ValueError('invalid limit metadata')
    if any(type(v) is not int or not 0 <= v <= 1_000_000_000_000
           for k, v in value.items() if k in ('used', 'maximum')):
        raise ValueError('invalid limit metadata')
    return dict(value)


class BudgetExceeded(Exception):
    def __init__(self, message='research allowance reached', *, kind=None, phase='runner', used=None, maximum=None, limit=None):
        super().__init__(message)
        self.limit = validate_limit(limit) if limit is not None else validate_limit({
            'kind': kind, 'phase': phase, **({'used': used} if used is not None else {}),
            **({'maximum': maximum} if maximum is not None else {}),
        }) if kind else None


def admission_spec(spec):
    if (not isinstance(spec, dict) or set(spec) != {'kind', 'amount', 'phase', 'hold'}
            or spec['kind'] not in ('tool', 'model') or spec['phase'] not in PHASES
            or any(type(spec[k]) is not int or not 0 <= spec[k] <= 5000000 for k in ('amount', 'hold'))):
        raise ValueError('invalid admission')
    return spec
