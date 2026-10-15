import os
import unittest
from unittest.mock import patch
import httpx
from research.remote_store import RemoteStore
from research.store import Stopped

class RemoteStoreTests(unittest.TestCase):
    def setUp(self):
        self.env=patch.dict(os.environ, {'RESEARCH_STATE_URL':'https://state.example.test/state','RESEARCH_STATE_TOKEN':'private-test-token'})
        self.env.start()
        self.addCleanup(self.env.stop)
    def test_remote_errors_keep_lease_fencing(self):
        with patch('research.remote_store.httpx.post',return_value=httpx.Response(200,json={'error':'Stopped'})):
            with self.assertRaises(Stopped):RemoteStore('/unused').heartbeat('job','lease')
    def test_no_local_fallback_or_automatic_write_retry(self):
        with patch('research.remote_store.httpx.post',side_effect=httpx.ReadTimeout('private body')) as post:
            with self.assertRaisesRegex(RuntimeError,'durable research state unavailable'):RemoteStore('/unused').delete('job')
            self.assertEqual(post.call_count,1)
    def test_submit_kind_is_forwarded_and_redirects_disabled(self):
        with patch('research.remote_store.httpx.post',return_value=httpx.Response(200,json={'value':{'status':'queued'}})) as post:
            RemoteStore('/unused').submit({'id':'job'},kind='chat')
            self.assertEqual(post.call_args.kwargs['json']['args'],({'id':'job'},'chat'))
            self.assertFalse(post.call_args.kwargs['follow_redirects'])
    def test_unsafe_state_url_rejected(self):
        with patch.dict(os.environ,{'RESEARCH_STATE_URL':'http://example.test/state'}):
            with self.assertRaises(ValueError):RemoteStore('/unused')
