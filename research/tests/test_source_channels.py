import unittest
import json
from pathlib import Path
from research.source_channels import platform_for_url, public_subject, channel_query, normalize_social, CHANNELS, collect_channel
from research.tests.test_research_v2 import INPUT
from research.tests.test_runner import StoreFixture
from research.providers import Calls, ProviderError

class ChannelTests(unittest.TestCase):
    def test_platform_is_domain_based_not_substring(self):
        self.assertEqual(platform_for_url('https://www.reddit.com/r/ev/abc'), 'reddit')
        for url in ['https://reddit.com.evil.example/','https://example.com/reddit.com','https://example.com/?x=twitter.com']:
            self.assertEqual(platform_for_url(url), 'web')
        self.assertEqual(platform_for_url('https://youtu.be/abcdefghijk'), 'youtube')

    def test_public_queries_preserve_structured_subject_without_notes_or_india_on_every_query(self):
        body={'researchInput':INPUT,'title':'short title','notes':'PRIVATE_NOTES'}
        subject=public_subject(body)
        for part in ['Elon Musk','Tesla','Electric vehicles']:self.assertIn(part,subject)
        for channel in CHANNELS:
            self.assertNotIn('PRIVATE_NOTES', channel_query(channel,body))
        self.assertNotIn('India',channel_query('youtube',body))
        self.assertIn('India',channel_query('web',body))

    def test_youtube_metadata_is_not_transcript(self):
        data={'items':[{'id':{'videoId':'abcdefghijk'},'snippet':{'title':'Public interview','description':'An interview description','publishedAt':'2026-01-01T00:00:00Z'}}]}
        rows=normalize_social('youtube',data)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['evidenceType'],'video_metadata')
        self.assertNotIn('timestampSeconds', rows[0])

    def test_social_normalizer_rejects_wrong_domain_and_handles_reddit_envelope(self):
        data={'data':{'children':[{'data':{'permalink':'/r/ev/comments/abc/topic/','title':'EV experience','selftext':'My experience is anecdotal.'}},{'data':{'url':'https://evil.example','title':'bad','selftext':'bad'}}]}}
        rows=normalize_social('reddit',data)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['platform'],'reddit')
        self.assertEqual(rows[0]['evidenceType'],'post')

    def test_unknown_response_is_not_reported_as_no_results(self):
        with self.assertRaises(ValueError):normalize_social('x',{'unexpected':'broken schema'})
        self.assertEqual(normalize_social('x',{'posts':[]}),[])

    def test_empty_author_only_and_restricted_records_are_not_evidence(self):
        for record in [
            {},
            {'authorName': 'An account'},
            {'text': '[deleted]'},
            {'text': 'A private post', 'isPrivate': True},
            {'title': 'Restricted post', 'visibility': 'restricted'},
        ]:
            with self.subTest(record=record), self.assertRaises(ValueError):
                normalize_social('x', {'posts': [{'url': 'https://x.com/example/status/123', **record}]})

    def test_observed_anyapi_envelope_and_reddit_external_link(self):
        rows=normalize_social('linkedin', {'items':1,'output':{'data':{'posts':[
            {'url':'https://www.linkedin.com/posts/example','text':'A public statement.',
             'authorName':'Public author','createdUtc':1760000000}
        ]},'found':True}})
        self.assertEqual(rows[0]['excerpt'],'A public statement.')
        self.assertTrue(rows[0]['publishedAt'].startswith('2025'))
        rows=normalize_social('reddit', {'posts':[
            {'id':'abcd123','subreddit':'electricvehicles','url':'https://example.com/news',
             'title':'Discussion title','selftext':None}
        ]})
        self.assertEqual(rows[0]['url'],'https://www.reddit.com/comments/abcd123')

    def test_fallback_does_not_claim_dedicated_access(self):
        class FailDirect:
            def social_search(self,*args): raise ProviderError('unavailable')
            def search(self,query):
                return [{'url':'https://youtube.com/watch?v=abcdefghijk'}, {'url':'https://notyoutube.example/'}]
        sources, coverage=collect_channel('youtube',{'researchInput':INPUT},FailDirect())
        self.assertEqual(len(sources),1)
        self.assertEqual(coverage,{'channel':'youtube','status':'found','sourceCount':1,'method':'web_search'})


class SocialAdapterTests(StoreFixture):
    def test_live_envelope_shape_and_cached_charge(self):
        class Network:
            paid=0
            def request(self, method, url, headers, body=None):
                if '/catalog/' in url:
                    endpoints=json.loads((Path(__file__).parents[1]/'social-catalog-receipt.json').read_text())['endpoints']
                    return {'endpoint':next(e for e in endpoints if url.endswith(e['id']))},{}
                self.paid+=1
                self.outer.assertEqual(headers['X-Treg-Route-Max-Cost'],'0.002')
                self.outer.assertEqual(body,{'query':'Elon Musk Tesla'})
                return {'output':{'data':{'posts':[{'url':'https://linkedin.com/posts/test','text':'Public post'}]},'found':True},'items':1},{'x-treg-cost-micro':'1200'}
        claim=self.claim()
        net=Network();net.outer=self
        calls=Calls(self.db,*claim[:2],network=net)
        first=calls.social_search('linkedin',{'researchInput':INPUT})
        second=calls.social_search('linkedin',{'researchInput':INPUT})
        self.assertEqual(first,second)
        self.assertEqual(net.paid,1)
        self.assertEqual(self.db.get(claim[0])['cost']['toolMicro'],1200)
