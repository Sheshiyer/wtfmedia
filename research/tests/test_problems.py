import asyncio
import json
import unittest
from research.problems import validate_problems, discover_problems
from research.tests.test_connections import SOURCES, Calls

OPTIONS = [dict(id='p1', title='Operational reliability', question='How can local delivery become more reliable?', why='Local operations and customer expectations can be compared.', domain='Operations', sourceIds=['src_a']),
           dict(id='p2', title='Customer expectations', question='When does reliability matter more than speed?', why='Customer research suggests a useful question.', domain='Customer behavior', sourceIds=['src_b'])]

class ProblemTests(unittest.TestCase):
    def test_requires_distinct_supported_options(self):
        self.assertEqual(validate_problems(json.dumps({'problems':OPTIONS}),SOURCES),OPTIONS)
        for bad in [[OPTIONS[0]], [OPTIONS[0],{**OPTIONS[1],'domain':'Operations'}], [OPTIONS[0],{**OPTIONS[1],'sourceIds':['invented']}]]:
            with self.assertRaises(ValueError): validate_problems(json.dumps({'problems':bad}),SOURCES)

    def test_discovery_pauses_before_writing_and_checkpoints_calls(self):
        calls=Calls();searches=[]
        calls.search_key=lambda query:query
        calls.search=lambda query: searches.append(query) or SOURCES
        calls.model=lambda *args,**kwargs:json.dumps({'problems':OPTIONS})
        result=dict(sources=[],progress=[],sections=[],figures=[]);state={};statuses=[]
        async def run():
            await discover_problems({'title':'Public guest'},result,state,calls,lambda status='running':statuses.append(status))
        asyncio.run(run());asyncio.run(run())
        self.assertEqual(len(searches),2)
        self.assertEqual(statuses[-1],'clarification')
        self.assertEqual(result['researchProblems'],OPTIONS)
        self.assertEqual(result['sections'],[])
        self.assertEqual(result['figures'],[])

from unittest.mock import patch
from research.tests.test_runner import StoreFixture, FakeEngine
from research.providers import Calls as RealCalls
from research.worker import run_job

class ProblemWorkerTests(StoreFixture):
    def test_worker_pauses_before_full_discovery(self):
        self.body.update(contextPolicyVersion=1,problemSelectionVersion=1,budgetPolicyVersion=1)
        claim=self.claim();job,lease,body,result,state=claim
        state['resolved']=True;self.db.save(job,lease,result,state)
        async def discover(body,result,state,calls,save):
            result['researchProblems']=OPTIONS;save('clarification')
        with patch('research.problems.discover_problems',discover),patch('socket.socket.connect',side_effect=AssertionError('No network')):
            asyncio.run(run_job(self.db,claim,FakeEngine,RealCalls))
        self.assertEqual(self.db.get(job)['status'],'clarification')
        self.assertEqual(self.db.get(job)['sections'],[])

    def test_selected_problem_reaches_queries_and_connection_pipeline(self):
        from research.interview import dossier_queries
        self.body.update(contextPolicyVersion=1,problemSelectionVersion=1,selectedProblem=OPTIONS[1],budgetPolicyVersion=1)
        claim=self.claim();job,lease,body,result,state=claim
        state.update(resolved=True,dossier_index=100,channel_index=6)
        self.db.save(job,lease,result,state);captured=[]
        async def connections(body,result,state,calls,save):
            captured.append(body)
            self.assertIn(OPTIONS[1]['question'],dossier_queries(body)[0])
            self.assertEqual(calls.scope['focus'],OPTIONS[1]['question']+' ')
            save('partial')
        with patch('research.connections.run_connections',connections),patch('research.problems.discover_problems',side_effect=AssertionError('Already selected')),patch('socket.socket.connect',side_effect=AssertionError('No network')):
            asyncio.run(run_job(self.db,claim,FakeEngine,RealCalls))
        self.assertEqual(len(captured),1)
        self.assertEqual(self.db.get(job)['selectedProblem'],OPTIONS[1])
