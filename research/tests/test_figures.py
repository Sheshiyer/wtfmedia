"""Regression coverage for figure evidence compilation and automatic repair; no network."""
import asyncio
import copy
import json
import unittest
from research.figures import (evidence_bank, figure_schema, materialize_figure, validate_figure,
                              numbers_supported, date_supported, generate_figures)

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
