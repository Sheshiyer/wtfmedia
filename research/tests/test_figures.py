"""Regression coverage for figure evidence compilation and automatic repair; no network."""
import asyncio
import copy
import json
import unittest
from research.figures import (evidence_bank, figure_schema, materialize_figure, validate_figure,
                              numbers_supported, date_supported, generate_figures, comparison_draft,
                              normalize_draft)
from research.providers import ProviderError
from research.store import BudgetExceeded, Stopped

QUOTE = 'The business started in March 2020. The team expanded in June 2021. Capacity is 3 or 4 orders and completion is 90 percent.'
SOURCES = [dict(id='src_example', title='Company history', url='https://example.org/history',
                kind='page_extract', evidenceType='page_extract', excerpt=QUOTE)]

def draft():
    def item(id, date, detail):
        return dict(id=id, label='Company milestone', detail=detail, evidence=['ev0'],
                    group='', value=None, displayValue='', date=date, cells=[])
    return dict(version=2, kind='timeline', title='Company history', takeaway='Recorded milestones.', caveat='',
                items=[item('a', '2020-03', 'Started operations.'), item('b', '2021-06', 'Expanded the team.'),
                       item('c', '', 'Capacity is 3–4 orders; completion is 90%.')], edges=[], columns=[],
                metric=dict(unit='', period='', geography='', definition=''))

class FigureTests(unittest.TestCase):
    def test_format_equivalence_preserves_negative_and_percentage_meaning(self):
        for value, quote, expected in [('3-4','3 or 4',True), ('pre-2012','2012',True),
                ('90%','90 percent',True), ('90%','90 per cent',True), ('1,000','1000',True),
                ('-4','4',False), ('4%','4',False), ('12','120',False)]:
            with self.subTest(value=value): self.assertEqual(numbers_supported(value,quote),expected)
        self.assertTrue(date_supported('2020-03', 'March 2020'))
        self.assertFalse(date_supported('2020-03', 'In 2020'))
        self.assertFalse(date_supported('2020-02-30', '2020-02-30'))

    def test_schema_preserves_title_and_constrains_direct_passage_ids(self):
        bank=evidence_bank(SOURCES,'company history'); schema=figure_schema(bank)
        self.assertIn('title',schema['$defs']['FigureDraft']['properties'])
        self.assertEqual(schema['$defs']['DraftItem']['properties']['evidence']['items']['enum'],['ev0'])
        value=materialize_figure(draft(),bank)
        self.assertEqual(len(value['evidence']),1)
        self.assertTrue(validate_figure(value,SOURCES))
        bad=draft();bad['items'][0]['evidence']=['ev_missing']
        with self.assertRaises(ValueError): materialize_figure(bad,bank)

    def test_unsupported_dates_remain_rejected_and_identify_the_item(self):
        value=draft();value['items'][0]['date']='2019'
        issues=[]
        self.assertIsNone(validate_figure(materialize_figure(value,evidence_bank(SOURCES,'history')),SOURCES,issues))
        self.assertIn('items[0].date:unsupported_date_precision_or_evidence',issues)

    def test_automatic_repair_receives_draft_and_preserves_successful_slots(self):
        good=materialize_figure(draft(),evidence_bank(SOURCES,'history'))
        slots=[dict(id='fig_'+key+'_1',section=key,goal='Company history',preferredKind='timeline',
                    status='planned',attempts=0) for key in ('snacks','appetizers','main','desserts')]
        slots[-1].update(status='ready',attempts=1,figure=good)
        existing=copy.deepcopy(slots[-1])
        result=dict(figures=slots,sources=SOURCES,progress=[],sections=[dict(key=s['section'],status='completed',content='Saved written report.') for s in slots])
        original_sections=copy.deepcopy(result['sections'])
        class Calls:
            def __init__(self):self.payloads=[];self.holds=[];self.hold=0
            def stage(self,phase):pass
            def allowance(self,**kwargs):self.holds.append(self.hold)
            def model_key(self,*args,**kwargs):return 'key'
            def model(self,messages,*args,**kwargs):
                self.payloads.append(json.loads(messages[-1]['content']))
                value=draft()
                if len(self.payloads)==1:value['items'][0]['date']='2019'
                return json.dumps({'figure':value})
        calls=Calls();state={}
        asyncio.run(generate_figures(calls,{},result,state,lambda:None))
        self.assertTrue(all(s['status']=='ready' for s in result['figures']))
        self.assertEqual(len(calls.payloads),4)
        self.assertEqual(calls.payloads[1]['previousDraft']['items'][0]['date'],'2019')
        self.assertIn('items[0].date',calls.payloads[1]['repair'])
        self.assertEqual(result['figures'][-1],existing)
        self.assertEqual(result['sections'],original_sections)
        self.assertEqual(calls.holds[0],1000000)
        self.assertEqual(calls.hold,0)


def comparison():
    return dict(title='Operating comparison', takeaway='Documented operating factors.', caveat='Source account.',
                rows=[dict(label=label, position='Capacity is 3–4 orders.', opportunity='Not available',
                           constraint='Not available', evidence=['ev0']) for label in ('Capacity', 'Operations')])


class RepairTests(unittest.TestCase):
    def run_repair(self, responses, preferred='comparison', pending=(2,), allowance_error=None):
        good=materialize_figure(draft(), evidence_bank(SOURCES, 'history'))
        slots=[dict(id='fig_'+key+'_1', section=key, goal='Company history', preferredKind=preferred,
                    status='ready', attempts=1, figure=copy.deepcopy(good)) for key in ('snacks','appetizers','main','desserts')]
        for index in pending:
            slots[index].update(status='planned', attempts=0); slots[index].pop('figure')
        result=dict(figures=slots, sources=copy.deepcopy(SOURCES), progress=[], sections=[
            dict(key=s['section'],status='completed',content='Saved report text.') for s in slots])
        original=copy.deepcopy(result)
        class Calls:
            hold=0
            def __init__(self): self.payloads=[]; self.schemas=[]
            def stage(self,phase): pass
            def allowance(self,**kwargs):
                if allowance_error: raise allowance_error
            def model_key(self,*args,**kwargs): return 'fixture-key'
            def model(self,messages,*args,**kwargs):
                self.payloads.append(json.loads(messages[-1]['content'])); self.schemas.append(kwargs['output_schema'])
                response=responses[len(self.payloads)-1]
                if isinstance(response, Exception): raise response
                return response
        calls=Calls(); state={}
        asyncio.run(generate_figures(calls,{},result,state,lambda:None))
        self.assertEqual(result['sections'],original['sections'])
        self.assertEqual(result['sources'],original['sources'])
        for index in set(range(4))-set(pending): self.assertEqual(result['figures'][index],original['figures'][index])
        self.assertLessEqual(len(calls.payloads),2*len(pending))
        return result,state,calls

    def test_comparison_repair_completes_all_four_with_named_cells_and_all_errors(self):
        bad=comparison_draft(comparison()); bad['items'][0]['cells']=['Capacity is 88 orders.']
        bad['items'][1]['label']='Capacity 99'
        result,state,calls=self.run_repair([json.dumps({'figure':bad}),json.dumps({'figure':comparison()})])
        self.assertTrue(all(s['status']=='ready' for s in result['figures']))
        self.assertEqual(len(calls.payloads),2)
        checks=calls.payloads[1]['validationChecks']
        self.assertIn('items[0].cells[0]:unsupported_number',checks)
        self.assertIn('items[0].cells:column_count_mismatch',checks)
        self.assertIn('items[1].label:unsupported_number',checks)
        self.assertEqual(calls.payloads[1]['previousDraft'],bad)
        self.assertIn('ComparisonRow',calls.schemas[1]['$defs'])
        fixed=result['figures'][2]['figure']
        self.assertEqual(fixed['columns'],['Position','Opportunity','Constraint'])
        self.assertTrue(validate_figure(fixed,SOURCES))
        self.assertNotIn('checks',result['figures'][2])
        self.assertNotIn('fig_main_1',state['figureDrafts'])

    def test_malformed_responses_use_one_repair_without_aborting_or_double_counting(self):
        for first in ['not JSON', '[]', '{}', '{"figure":42}', '{"figure":{},"extra":true}']:
            with self.subTest(first=first):
                result,state,calls=self.run_repair([first,json.dumps({'figure':comparison()})])
                self.assertEqual(result['figures'][2]['status'],'ready')
                self.assertEqual(result['figures'][2]['attempts'],2)
                self.assertEqual(len(calls.payloads),2)
                self.assertEqual(calls.payloads[1]['validationChecks'],['invalid_json' if first=='not JSON' else 'invalid_response'])

    def test_repair_still_rejects_fabricated_data_and_persists_only_safe_categories(self):
        bad=comparison();bad['rows'][0]['position']='Capacity is 123456 orders.'
        result,state,calls=self.run_repair(['[]',json.dumps({'figure':bad})])
        slot=result['figures'][2]
        self.assertEqual((slot['status'],slot['attempts'],slot['reason']),('failed',2,'invalid_output'))
        self.assertEqual(slot['checks'],['numbers'])
        self.assertNotIn('figure',slot)
        self.assertNotIn('123456',json.dumps(slot))

    def test_schema_errors_identify_fields_without_copying_private_values_or_keys(self):
        bad=draft();bad.pop('title');bad['PRIVATE_FIELD']='PRIVATE_VALUE'
        result,state,calls=self.run_repair([json.dumps({'figure':bad}),json.dumps({'figure':comparison()})])
        checks=calls.payloads[1]['validationChecks']
        self.assertIn('title:schema_missing',checks)
        self.assertNotIn('PRIVATE',json.dumps(checks))
        self.assertTrue(all(s['status']=='ready' for s in result['figures']))

    def test_exhausted_malformed_slot_does_not_abort_remaining_figures(self):
        result,state,calls=self.run_repair(['[]','{}',json.dumps({'figure':draft()})],pending=(2,3))
        self.assertEqual(result['figures'][2]['status'],'failed')
        self.assertEqual(result['figures'][2]['checks'],['response'])
        self.assertEqual(result['figures'][3]['status'],'ready')
        self.assertEqual(len(calls.payloads),3)

    def test_provider_retry_is_bounded_and_authentication_failure_clears_stale_checks(self):
        result,state,calls=self.run_repair([ProviderError(code='timeout'),json.dumps({'figure':comparison()})])
        self.assertEqual(result['figures'][2]['status'],'ready')
        result,state,calls=self.run_repair(['[]',ProviderError('PRIVATE_PROVIDER_TEXT',code='authentication')])
        self.assertEqual(result['figures'][2]['reason'],'provider_unavailable')
        self.assertNotIn('checks',result['figures'][2])
        self.assertNotIn('PRIVATE_PROVIDER_TEXT',json.dumps(state))
        result,state,calls=self.run_repair([ProviderError(code='authentication')])
        self.assertEqual(len(calls.payloads),1)

    def test_budget_and_cancellation_stop_before_any_model_call(self):
        result,state,calls=self.run_repair([],allowance_error=BudgetExceeded())
        self.assertEqual(calls.payloads,[])
        self.assertEqual(result['figures'][2]['reason'],'budget_exhausted')
        with self.assertRaises(Stopped): self.run_repair([],allowance_error=Stopped())

    def test_layout_normalization_keeps_evidence_and_dates_without_changing_input(self):
        raw=draft();raw['title']=' Company\n history ';raw['items'].reverse();original=copy.deepcopy(raw)
        value=materialize_figure(normalize_draft(raw),evidence_bank(SOURCES,'history'))
        self.assertTrue(validate_figure(value,SOURCES))
        self.assertEqual(value['title'],'Company history')
        self.assertEqual([i['date'] for i in value['items']],['2020-03','2021-06',''])
        self.assertEqual(raw,original)

    def test_unicode_limits_and_empty_comparisons_match_public_contract(self):
        value=materialize_figure(comparison_draft(comparison()),evidence_bank(SOURCES,'history'))
        value['items'][0]['cells'][0]='😀'*71;issues=[]
        self.assertIsNone(validate_figure(value,SOURCES,issues))
        self.assertEqual(issues,['items[0].cells[0]:text_too_long'])
        empty=comparison()
        for row in empty['rows']:
            for key in ('position','opportunity','constraint'):row[key]='Not available'
        self.assertIsNone(validate_figure(materialize_figure(comparison_draft(empty),evidence_bank(SOURCES,'history')),SOURCES))
