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
        self.assertEqual(statuses[-1],'partial')
        self.assertEqual(result['sections'][0]['status'], 'partial')
        self.assertNotIn('Interpretation to explore', result['sections'][0]['content'])

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

class ConnectionFeedbackTests(unittest.TestCase):
    def test_failed_candidates_report_fields_without_rejected_content(self):
        from research.connections import CandidateValidationError
        bad = {**CONNECTION, 'title': 'PRIVATE_MARKER' * 20, 'relevance': 9}
        with self.assertRaises(CandidateValidationError) as caught:
            retained_connections(json.dumps({'connections': [bad]}), ITEMS, SOURCES)
        feedback = ' '.join(caught.exception.issues)
        self.assertIn('title', feedback)
        self.assertIn('relevance', feedback)
        self.assertNotIn('PRIVATE_MARKER', feedback)

    def test_repair_receives_specific_checks_and_keeps_strict_validation(self):
        from research.connections import structured, Connections
        calls = Calls(); cp = {}; requests = []
        def model(messages, *args, **kwargs):
            requests.append(messages)
            value = {**CONNECTION, 'title': 'x' * 101} if len(requests) == 1 else CONNECTION
            return json.dumps({'connections': [value]})
        calls.model = model
        result = asyncio.run(structured(calls, cp, 'proposals', Connections, 'Connect', {},
            lambda raw: retained_connections(raw, ITEMS, SOURCES), lambda: None))
        self.assertEqual(result, [CONNECTION])
        self.assertIn('title', requests[1][-1]['content'])
        self.assertIn('string_too_long', requests[1][-1]['content'])
        self.assertNotIn('x' * 101, requests[1][-1]['content'])
        self.assertNotIn('proposalsValidation', cp)
        self.assertEqual(len(requests), 2)

    def test_unknown_exception_text_is_not_echoed_to_repair(self):
        from research.connections import validation_feedback
        self.assertEqual(validation_feedback(ValueError('secret private text')), ['response failed validation'])

class ConnectionWireTests(unittest.TestCase):
    def test_provider_reference_enums_and_local_constraints_are_preserved(self):
        from research.connections import connection_wire_schema, Connections, Extraction, Review
        wire = connection_wire_schema(Connections, {'evidence': ITEMS})
        props = wire['$defs']['Connection']['properties']
        self.assertEqual(props['evidenceIds']['items']['enum'], ['e1', 'e2'])
        self.assertIn('"maxLength": 100', props['title']['description'])
        self.assertNotIn('maxLength', props['title'])
        self.assertEqual(props['strength']['enum'], [1, 2, 3, 4, 5])
        extraction = connection_wire_schema(Extraction, {'sources': SOURCES})
        self.assertEqual(extraction['$defs']['EvidenceItem']['properties']['sourceId']['enum'], ['src_a', 'src_b'])
        review = connection_wire_schema(Review, {'connections': [CONNECTION]})
        self.assertEqual(review['$defs']['Decision']['properties']['connectionId']['enum'], ['c1'])

    def test_repair_includes_rejected_draft_and_survives_resume(self):
        from research.connections import repair_messages
        cp = {'proposalsDraft': json.dumps({'connections': [{**CONNECTION, 'strength': 8}]}),
              'proposalsValidation': ['connections.0.strength: less_than_equal']}
        messages = repair_messages('Connect', {}, cp, 'proposals', 1)
        self.assertEqual([m['role'] for m in messages], ['system', 'user', 'assistant', 'user'])
        self.assertEqual(messages[2]['content'], cp['proposalsDraft'])
        self.assertIn('strength', messages[-1]['content'])
        self.assertIn('untrusted data', messages[-1]['content'])

    def test_repair_does_not_overflow_multibyte_request_limit(self):
        from research.connections import repair_messages
        from research.store import encode
        payload = {'evidence': '背景' * 11000}
        cp = {'proposalsDraft': 'x' * 30000, 'proposalsValidation': ['title: string_too_long']}
        messages = repair_messages('Connect', payload, cp, 'proposals', 1)
        self.assertEqual([m['role'] for m in messages], ['system', 'user', 'user'])
        self.assertLess(len(encode(messages).encode('utf-8')), 85000)

    def test_invalid_evidence_still_fails_after_draft_repair(self):
        from research.connections import structured, Connections
        calls = Calls(); cp = {}; count = []
        def broken(messages, *args, **kwargs):
            count.append(messages)
            return json.dumps({'connections': [{**CONNECTION, 'evidenceIds': ['e1', 'unknown']}]})
        calls.model = broken
        with self.assertRaises(ProviderError):
            asyncio.run(structured(calls, cp, 'proposals', Connections, 'Connect',
                {'evidence': ITEMS}, lambda raw: retained_connections(raw, ITEMS, SOURCES), lambda: None))
        self.assertEqual(len(count), 2)
        self.assertEqual(count[1][2]['role'], 'assistant')
        self.assertNotIn('proposals', cp)

class FormatRecoveryTests(unittest.TestCase):
    def test_fenced_json_null_query_and_duplicate_refs_are_format_only(self):
        candidate = {**CONNECTION, 'title': '  '+CONNECTION['title']+'  ',
                     'query': None, 'evidenceIds': ['e1', 'e2', 'e1']}
        raw = '```json\n'+json.dumps({'connections': [candidate]})+'\n```'
        self.assertEqual(retained_connections(raw, ITEMS, SOURCES), [CONNECTION])
        candidate['evidenceIds'] = ['e1', 'e1']
        with self.assertRaises(ValueError):
            retained_connections(json.dumps({'connections': [candidate]}), ITEMS, SOURCES)

    def test_provider_output_failure_uses_existing_bounded_repair(self):
        from research.connections import structured, Connections
        calls = Calls(); cp = {}; limits = []
        def model(messages, max_tokens, **kwargs):
            limits.append(max_tokens)
            if len(limits) == 1:
                raise ProviderError('incomplete output', code='invalid_output', reason='invalid_schema')
            return json.dumps({'connections': [CONNECTION]})
        calls.model = model
        result = asyncio.run(structured(calls, cp, 'proposals', Connections, 'Connect',
            {'evidence': ITEMS}, lambda raw: retained_connections(raw, ITEMS, SOURCES), lambda: None))
        self.assertEqual(result, [CONNECTION])
        self.assertEqual(limits, [7000, 12000])

    def test_refusals_do_not_retry(self):
        from research.connections import structured, Connections
        calls = Calls(); count = []
        def model(*args, **kwargs):
            count.append(1)
            raise ProviderError('refused', code='invalid_output', retryable=False)
        calls.model = model
        with self.assertRaises(ProviderError):
            asyncio.run(structured(calls, {}, 'proposals', Connections, 'Connect', {}, lambda raw: [], lambda: None))
        self.assertEqual(len(count), 1)

class PartialRecoveryTests(unittest.TestCase):
    def test_valid_connections_survive_failed_repair_and_resume(self):
        from research.connections import structured, Connections
        calls = Calls(); cp = {}; requests = []
        bad = {**CONNECTION, 'id': 'c2', 'evidenceIds': ['e1', 'missing']}
        def model(messages, *args, **kwargs):
            requests.append(messages)
            if len(requests) == 1:
                return json.dumps({'connections': [CONNECTION, bad]})
            return '{broken'
        calls.model = model
        validator = lambda raw: retained_connections(raw, ITEMS, SOURCES, repair_partial=True)
        for _ in range(2):
            result = asyncio.run(structured(calls, cp, 'proposals', Connections, 'Connect',
                {'evidence': ITEMS}, validator, lambda: None, tolerant=True))
            self.assertEqual(result, [CONNECTION])
        self.assertEqual(len(requests), 2)
        self.assertIn('Retained IDs: ["c1"]', requests[1][-1]['content'])
        self.assertIn('invalid_references', cp['proposalsIssues'])

    def test_partial_review_never_promotes_missing_or_duplicate_decisions(self):
        from research.connections import retained_review, CandidateValidationError
        proposals = [CONNECTION, {**CONNECTION, 'id': 'c2'}]
        good = dict(connectionId='c1', accepted=True, reason='Supported.')
        duplicate = dict(connectionId='c2', accepted=True, reason='Supported.')
        with self.assertRaises(CandidateValidationError) as caught:
            retained_review(json.dumps({'decisions': [good, duplicate, duplicate]}), proposals)
        self.assertEqual(caught.exception.retained, [good])

    def test_exhausted_proposal_format_returns_partial_evidence_not_failed(self):
        calls = Calls(); original = calls.model
        def model(messages, *args, **kwargs):
            if 'Develop useful podcast insights' in messages[0]['content']:
                return '{broken'
            return original(messages, *args, **kwargs)
        calls.model = model
        result = dict(sources=copy.deepcopy(SOURCES), sections=[], figures=[], warnings=[], progress=[])
        statuses = []
        asyncio.run(run_connections(dict(title='Delivery'), result, {}, calls, lambda status='running': statuses.append(status)))
        self.assertEqual(statuses[-1], 'partial')
        self.assertEqual(result['sections'][0]['status'], 'partial')
        self.assertTrue(any('invalid response structure' in w for w in result['warnings']))
        self.assertEqual(result['figures'], [])

    def test_fatal_authentication_is_not_hidden_by_partial_mode(self):
        from research.connections import structured, Connections
        calls = Calls()
        def model(*args, **kwargs):
            raise ProviderError('authentication', code='authentication', retryable=False)
        calls.model = model
        with self.assertRaises(ProviderError):
            asyncio.run(structured(calls, {}, 'proposals', Connections, 'Connect', {}, lambda raw: [], lambda: None, tolerant=True))

    def test_diagnostics_exclude_untrusted_fields(self):
        import io
        from contextlib import redirect_stderr
        from research.diagnostics import emit
        output = io.StringIO()
        with redirect_stderr(output):
            emit(dict(stage='discovery', status='partial', validationStep='connections',
                      validationCategory='invalid_references', secret='PRIVATE'))
            emit(dict(stage='discovery', status='partial', validationStep='PRIVATE', validationCategory='PRIVATE'))
        self.assertNotIn('PRIVATE', output.getvalue())
        self.assertIn('invalid_references', output.getvalue())

class MixedRunRecoveryTests(unittest.TestCase):
    def test_invalid_proposal_does_not_block_review_report_and_visuals(self):
        calls = Calls(); original = calls.model; attempts = []
        def model(messages, *args, **kwargs):
            if 'Develop useful podcast insights' in messages[0]['content']:
                attempts.append(1)
                good = json.loads(original(messages, *args, **kwargs))['connections'][0]
                bad = {**good, 'id':'c2', 'evidenceIds':['missing','e1']}
                return json.dumps({'connections': [good, bad] if len(attempts) == 1 else [bad]})
            return original(messages, *args, **kwargs)
        calls.model = model
        result = dict(sources=copy.deepcopy(SOURCES), sections=[], figures=[], warnings=[], progress=[], visualPolicyVersion=2)
        statuses = []
        async def no_model_visuals(*args): pass
        with patch('research.connections.generate_figures', no_model_visuals):
            asyncio.run(run_connections(dict(title='Delivery'), result, {}, calls, lambda status='running':statuses.append(status)))
        self.assertEqual(statuses[-1], 'completed')
        self.assertEqual(len(result['sections']), 4)
        self.assertEqual([f['status'] for f in result['figures']], ['ready']*4)
        self.assertTrue(any('invalid evidence references' in w for w in result['warnings']))
        self.assertEqual(len(attempts), 2)

    def test_invalid_quote_with_reused_id_does_not_hide_valid_candidate(self):
        bad = {**ITEMS[0], 'quote':'This passage is not in any of the retained sources.'}
        self.assertEqual(retained_items(json.dumps({'items':[bad,ITEMS[0]]}), SOURCES), [ITEMS[0]])
