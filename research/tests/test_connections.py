import asyncio
import copy
import json
import unittest
from unittest.mock import patch
from research.connections import (validated_items, retained_items, retained_connections, validated_connections, render_sections,
    fallback_figure, run_connections, TITLES)
from research.contracts import JobInput
from research.providers import ProviderError

SOURCES = [dict(id='src_a', title='Distribution',url='https://example.com/a',excerpt='The company uses local stores to deliver orders to nearby customers.',retrievedAt='2026-01-01',evidenceType='page_extract'),
           dict(id='src_b', title='Customer survey',url='https://other.org/b',excerpt='Customers prefer reliable delivery windows over the shortest estimated time.',retrievedAt='2026-01-01',evidenceType='page_extract')]
ITEMS = [dict(id='e'+str(n+1),sourceId=s['id'],quote=s['excerpt'],summary=s['excerpt'],kind='observation',attribution='Publisher',period='',scope='Delivery',origin=s['url']) for n,s in enumerate(SOURCES)]
CONNECTION = dict(id='c1',title='Local delivery and reliability',evidenceIds=['e1','e2'],relation='complement',basis='interpretation',explanation='Local distribution and delivery reliability may be considered together.',significance='Explore whether operations match customer needs.',alternative='Customers may value different services in different circumstances.',limitation='These accounts do not establish a causal relationship.',question='How do you balance proximity and reliable delivery?',followup='What evidence would change that decision?',relevance=5,strength=3,usefulness=5,query='')

class Calls:
    hold=0
    fatal_error=None
    def __init__(self): self.invocations=[]
    def stage(self, stage): pass
    def model_key(self,*args,**kwargs): return 'cache'
    def allowance(self,**kwargs): pass
    def model(self,messages,*args,**kwargs):
        self.invocations.append(messages)
        p=json.loads(messages[1]['content'])
        if 'Extract useful evidence' in messages[0]['content']:
            return json.dumps({'items':[i for i in ITEMS if i['sourceId'] in {s['id'] for s in p['sources']}]})
        if 'Develop useful podcast' in messages[0]['content']:
            return json.dumps({'connections':[CONNECTION]})
        return json.dumps({'decisions':[dict(connectionId='c1',accepted=True,reason='Qualified interpretation supported by both passages.')]})

class ConnectionTests(unittest.TestCase):
    def test_quotes_and_metadata_are_checked(self):
        self.assertEqual(len(validated_items(json.dumps({'items':ITEMS}),SOURCES)),2)
        bad=copy.deepcopy(ITEMS);bad[0]['quote']='An invented passage that is not in the source.'
        with self.assertRaises(ValueError): validated_items(json.dumps({'items':bad}),SOURCES)
        bad=copy.deepcopy(ITEMS);bad[0]['summary']='Revenue increased 900 percent'
        with self.assertRaises(ValueError): validated_items(json.dumps({'items':bad}),SOURCES)

    def test_mixed_batch_retains_valid_evidence_without_unsupported_dates(self):
        rows = copy.deepcopy(ITEMS)
        rows[0]['period'] = '2026'
        rows.append({**ITEMS[0], 'id': 'e3', 'summary': 'Revenue increased 900 percent'})
        rows.append({**ITEMS[0], 'id': 'e4', 'quote': 'An invented passage absent from the source.'})
        kept = retained_items(json.dumps({'items': rows}), SOURCES)
        self.assertEqual(len(kept), 2)
        self.assertEqual(kept[0]['period'], '')
        self.assertEqual(kept[0]['summary'], ITEMS[0]['summary'])
        with self.assertRaises(ValueError):
            retained_items(json.dumps({'items': rows[2:]}), SOURCES)

    def test_schema_invalid_candidates_do_not_discard_valid_batch(self):
        rows = [{**ITEMS[0], 'summary': 'x' * 181}, *ITEMS]
        rows.extend([{**ITEMS[0], 'id': 'e' + str(n)} for n in range(3, 20)])
        kept = retained_items(json.dumps({'items': rows}), SOURCES)
        self.assertEqual(len(kept), 2)
        self.assertTrue(all(len(i['summary']) <= 180 for i in kept))
        for invalid in [{'wrong': []}, {'items': {}}, {'items': [ITEMS[0]] * 65}]:
            with self.assertRaises(ValueError): retained_items(json.dumps(invalid), SOURCES)

    def test_connection_candidates_keep_valid_references_only(self):
        rows = [{**CONNECTION, 'title': 'x' * 101},
                {**CONNECTION, 'evidenceIds': ['missing', 'e1']}, CONNECTION]
        self.assertEqual(retained_connections(json.dumps({'connections': rows}), ITEMS, SOURCES), [CONNECTION])
        with self.assertRaises(ValueError):
            retained_connections(json.dumps({'connections': rows[:2]}), ITEMS, SOURCES)

    def test_provider_schema_removes_numeric_constraints_but_local_validation_keeps_them(self):
        from research.connections import Connections, Extraction, Review
        from research.figures import provider_schema
        forbidden = {'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
                     'minItems', 'maxItems', 'minLength', 'maxLength', 'pattern'}
        def check(value):
            if isinstance(value, dict):
                self.assertFalse(forbidden.intersection(value))
                for item in value.values(): check(item)
            elif isinstance(value, list):
                for item in value: check(item)
        for schema in (Connections, Extraction, Review):
            check(provider_schema(schema.model_json_schema()))
        named = {'properties': {'minimum': {'type': 'number', 'minimum': 1}}}
        self.assertEqual(provider_schema(named), {'properties': {'minimum': {'type': 'number'}}})
        with self.assertRaises(ValueError):
            validated_connections(json.dumps({'connections': [{**CONNECTION, 'strength': 6}]}), ITEMS, SOURCES)

    def test_review_request_bounds_serialized_bytes_and_preserves_cited_passages(self):
        from research.connections import review_payload, VERIFY, normal
        from research.store import encode
        sources = [{**s, 'excerpt': ('背景 ' * 2500) + s['excerpt'] + ('後文 ' * 2500)} for s in SOURCES]
        sources += [dict(SOURCES[0], id='extra'+str(n), excerpt='背景 ' * 2500) for n in range(50)]
        payload = review_payload({'title': 'Delivery'}, ITEMS, [CONNECTION], sources)
        messages = [{'role': 'system', 'content': VERIFY},
                    {'role': 'user', 'content': json.dumps(payload, ensure_ascii=False)}]
        self.assertLessEqual(len(encode(messages).encode()), 80000)
        originals = {s['id']: s for s in payload['originalSources']}
        for item in ITEMS:
            self.assertTrue(any(normal(item['quote']) in normal(p)
                                for p in originals[item['sourceId']]['passages']))
        self.assertEqual(payload['connections'], [CONNECTION])
        self.assertEqual(len(sources), 52)

    def test_connection_extraction_uses_original_sources_not_high_ranked_snippets(self):
        calls=Calls();state={};statuses=[]
        snippets=[{**SOURCES[0], 'id':'snippet'+str(n), 'url':'https://snippet.example/'+str(n), 'evidenceType':'search_snippet'} for n in range(40)]
        result=dict(sources=snippets+copy.deepcopy(SOURCES),sections=[],figures=[],warnings=[],progress=[],visualPolicyVersion=2)
        async def unavailable(*args): pass
        with patch('research.connections.generate_figures', unavailable):
            asyncio.run(run_connections(dict(title='Delivery'),result,state,calls,lambda status='running':statuses.append(status)))
        chosen={s['id'] for batch in state['connectionsV1']['batches'] for s in batch}
        self.assertEqual(chosen,{'src_a','src_b'})
        self.assertEqual(statuses[-1],'completed')
        self.assertEqual([f['status'] for f in result['figures']],['ready']*4)

    def test_fallback_does_not_promote_unsupported_scope_numbers(self):
        items=copy.deepcopy(ITEMS);items[0]['scope']='Market in 2099'
        figure=fallback_figure(CONNECTION,items,SOURCES)
        self.assertIsNotNone(figure)
        self.assertNotIn('2099',json.dumps(figure))

    def test_video_metadata_is_not_evidence(self):
        with self.assertRaises(ValueError): validated_items(json.dumps({'items':ITEMS}),[{**s,'evidenceType':'video_metadata'} for s in SOURCES])

    def test_relationship_is_not_required_to_be_a_disagreement(self):
        self.assertEqual(validated_connections(json.dumps({'connections':[CONNECTION]}),ITEMS,SOURCES)[0]['relation'],'complement')

    def test_repeated_origin_invalid_references_and_causality_rejected(self):
        for connection,items in [({**CONNECTION,'evidenceIds':['e1','unknown']},ITEMS),
                                  ({**CONNECTION,'relation':'causal'},ITEMS),
                                  (CONNECTION,[{**i,'origin':'one original interview'} for i in ITEMS])]:
            with self.assertRaises(ValueError): validated_connections(json.dumps({'connections':[connection]}),items,SOURCES)

    def test_rendered_brief_has_four_insight_sections_and_source_links(self):
        sections=render_sections([CONNECTION],ITEMS)
        self.assertEqual([s['title'] for s in sections],list(TITLES.values()))
        self.assertIn('Interpretation to explore',sections[0]['content'])
        self.assertIn('[src_a]',sections[1]['content'])
        self.assertIn('Proposed follow-up',sections[3]['content'])
        self.assertNotIn('editorial verification checklist',' '.join(s['content'] for s in sections).lower())

    def test_fallback_comparison_validates_without_model_or_causal_arrows(self):
        fig=fallback_figure(CONNECTION,ITEMS,SOURCES)
        self.assertIsNotNone(fig)
        self.assertEqual(fig['kind'],'comparison')
        self.assertEqual(fig['edges'],[])

    def test_full_flow_and_recovery_reuse_evidence_and_preserve_figures(self):
        calls=Calls();state={};result=dict(sources=copy.deepcopy(SOURCES),sections=[],figures=[],warnings=[],progress=[],visualPolicyVersion=2)
        body=dict(title='Delivery',researchInput={'industry':'Delivery'},contextPolicyVersion=1)
        statuses=[]
        async def unavailable(*args): pass
        with patch('research.connections.generate_figures', unavailable):
            asyncio.run(run_connections(body,result,state,calls,lambda status='running':statuses.append(status)))
            self.assertEqual(statuses[-1],'completed')
            self.assertEqual(len(result['figures']),4)
            self.assertTrue(all(f['status']=='ready' for f in result['figures']))
            original=copy.deepcopy(result['sections']);count=len(calls.invocations)
            asyncio.run(run_connections(body,result,state,calls,lambda status='running':statuses.append(status)))
            self.assertEqual(len(calls.invocations),count)
            self.assertEqual(result['sections'],original)

    def test_rejected_connections_do_not_become_completed_report(self):
        calls=Calls();base=calls.model
        def rejected(messages,*args,**kwargs):
            if 'Independently audit' in messages[0]['content']:
                return json.dumps({'decisions':[dict(connectionId='c1',accepted=False,reason='Evidence is not comparable.')]})
            return base(messages,*args,**kwargs)
        calls.model=rejected
        result=dict(sources=copy.deepcopy(SOURCES),sections=[],figures=[],warnings=[],progress=[]);statuses=[]
        asyncio.run(run_connections(dict(title='Delivery'),result,{},calls,lambda status='running':statuses.append(status)))
        self.assertEqual(statuses[-1],'partial');self.assertEqual(result['sections'],[])

from research.tests.test_runner import StoreFixture, FakeEngine
from research.providers import Calls as RealCalls
from research.tests.test_claude_migration import message
from research.worker import run_job
import os

class ConnectionWorkerTests(StoreFixture):
    def test_real_budget_and_worker_with_failed_model_figures_complete_offline(self):
        self.body.update(contextPolicyVersion=1,budgetPolicyVersion=1,visualPolicyVersion=2)
        claim=self.claim();job,lease,body,result,state=claim
        state.update(resolved=True,dossier_index=100,channel_index=6)
        result['sources']=copy.deepcopy(SOURCES)
        self.db.save(job,lease,result,state)
        model=Calls()
        class Network:
            def request(self,method,url,headers,body=None):
                assert url=='https://api.anthropic.com/v1/messages',url
                system=body['system']
                text=system if isinstance(system,str) else ' '.join(x['text'] for x in system)
                messages=[dict(role='system',content=text)]+body['messages']
                if 'Create one publication-quality' in text or 'Repair this comparison' in text:
                    answer=json.dumps({'figure':None})
                else:
                    # Actual provider encodes user content as text blocks.
                    for m in messages:
                        if isinstance(m['content'],list): m['content']=' '.join(x['text'] for x in m['content'])
                    answer=model.model(messages)
                return message(answer),{}
        with patch.dict(os.environ,{'ANTHROPIC_API_KEY':'fixture'},clear=True),patch('socket.socket.connect',side_effect=AssertionError('No live network')):
            asyncio.run(run_job(self.db,claim,FakeEngine,lambda *args:RealCalls(*args,network=Network())))
        saved=self.db.get(job)
        self.assertEqual(saved['status'],'completed',saved.get('failure'))
        self.assertEqual(saved['contextPolicyVersion'],1)
        self.assertEqual(len(saved['sections']),4)
        self.assertEqual([f['status'] for f in saved['figures']],['ready']*4)
        with self.db.db() as db:
            spent=db.execute('SELECT SUM(MAX(reserve,COALESCE(billed,0))) FROM calls WHERE job=?',(job,)).fetchone()[0]
        self.assertLessEqual(spent,5000000)

class ConnectionRepairTests(unittest.TestCase):
    def test_repair_is_bounded_and_does_not_repeat_successful_extraction(self):
        from research.connections import structured, Extraction
        calls=Calls();cp={};count=[]
        def broken(*args,**kwargs):
            count.append(True)
            return json.dumps({'items':[{**ITEMS[0],'quote':'This invented passage was never retained anywhere.'}]})
        calls.model=broken
        for _ in range(2):
            with self.assertRaises(ProviderError):
                asyncio.run(structured(calls,cp,'extract',Extraction,'Extract',{},lambda raw:validated_items(raw,SOURCES),lambda:None))
        self.assertEqual(len(count),2)

    def test_single_resource_and_incompatible_number_are_rejected(self):
        same=[{**ITEMS[0]},{**ITEMS[1],'sourceId':ITEMS[0]['sourceId']}]
        with self.assertRaises(ValueError): validated_connections(json.dumps({'connections':[CONNECTION]}),same,SOURCES)
        with self.assertRaises(ValueError): validated_connections(json.dumps({'connections':[{**CONNECTION,'explanation':'Revenue increased by 700 percent.'}]}),ITEMS,SOURCES)
