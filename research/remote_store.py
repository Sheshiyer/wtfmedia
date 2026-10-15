"""Private method-level RPC to durable runner storage; never fall back to local disk."""
import os
from urllib.parse import urlsplit
import httpx
from .store import Conflict, Gone, QueueFull, Stopped, BudgetExceeded

METHODS = ('submit', 'get', 'cancel', 'delete', 'claim', 'claim_id', 'heartbeat', 'save', 'reserve', 'started', 'settle')
ERRORS = {c.__name__: c for c in (Conflict, Gone, QueueFull, Stopped, BudgetExceeded)}

class RemoteStore:
    def __init__(self, path):
        self.path = str(path)
        self.url = os.environ['RESEARCH_STATE_URL']
        self.token = os.environ['RESEARCH_STATE_TOKEN']
        u = urlsplit(self.url)
        if u.scheme != 'https' or not u.hostname or u.username or u.password or u.query or u.fragment:
            raise ValueError('HTTPS state endpoint required')

    def __getattr__(self, method):
        if method not in METHODS:
            raise AttributeError(method)
        def call(*args, **kwargs):
            if kwargs:
                if method == 'submit' and set(kwargs) == {'kind'}:
                    args = (*args, kwargs['kind'])
                else:
                    raise TypeError('unsupported state arguments')
            try:
                response = httpx.post(self.url, headers={'Authorization': 'Bearer ' + self.token},
                                      json={'method': method, 'args': args}, timeout=20, follow_redirects=False)
                if response.status_code != 200:
                    raise RuntimeError('durable research state unavailable')
                data = response.json()
            except (httpx.HTTPError, ValueError):
                raise RuntimeError('durable research state unavailable') from None
            if data.get('error'):
                raise ERRORS.get(data['error'], RuntimeError)('durable research operation failed')
            return data['value']
        return call


def open_store(path):
    if os.environ.get('RESEARCH_STATE_URL') or os.environ.get('RESEARCH_STATE_TOKEN'):
        return RemoteStore(path)
    from .store import Store
    return Store(path)
