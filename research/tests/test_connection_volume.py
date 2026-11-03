"""Offline high-volume connection pipeline; sockets forbidden, private SQLite only."""
import asyncio,copy,json,os,unittest
from unittest.mock import patch
from research.tests.test_runner import StoreFixture
from research.tests.test_claude_migration import message
from research.providers import Calls
from research.connections import run_connections
from research.store import encode
from research.figures import validate_figure

from research.tests.test_connections import ITEMS,CONNECTION,SOURCES
from research.tests.test_runner import body as new_body

class ConnectionVolumeTests(unittest.TestCase):
 def test_review_and_four_figures_with_large_evidence_and_fallback(self):
  body=new_body(contextPolicyVersion=1,budgetPolicyVersion=1,visualPolicyVersion=2)
  items=[];sources=[]
  for n in range(26):
   quote='The company operates local delivery stores and customers describe predictable delivery as useful. ' + ('Evidence context ' * 20) + chr(65+n)
   source={**SOURCES[n%2], 'id':'src_'+str(n),'url':'https://source'+str(n)+'.example/report','excerpt':('Background context ' * 100)+quote+(' Further context' * 100)}
   sources.append(source)
   items.append({**ITEMS[n%2], 'id':'e'+str(n),'sourceId':source['id'],'quote':quote,'summary':'Customers discuss predictable local delivery.', 'origin':source['url']})
  proposals=[{**CONNECTION,'id':'c'+str(n),'evidenceIds':['e'+str(n*3+j) for j in range(3)],'query':''} for n in range(7)]
  sources.extend([{**SOURCES[0],'id':'extra'+str(n),'excerpt':'Additional background context. '*200} for n in range(150)])
  state={'connectionsV1':{'batches':[sources[:13],sources[13:26]],'extract0':items[:13],'extract1':items[13:],'proposals':proposals}}
  # run_connections renumbers extracted IDs starting at one.
  for c in proposals:c['evidenceIds']=['e'+str(int(i[1:])+1) for i in c['evidenceIds']]
  result=dict(sources=sources,sections=[],figures=[],warnings=[],progress=[],visualPolicyVersion=2)
  for mode in ('valid_figures','fallback_figures'):
   fixture=StoreFixture();fixture.setUp()
   try:
    fixture.body={**body,'id':fixture.body['id']};claim=fixture.claim();job,lease,_,_,_=claim
    s=copy.deepcopy(state);r=copy.deepcopy(result);r['id']=job;r['status']='running';r.pop('failure',None)
    s.pop('_budget',None)
    for n in range(3):s['connectionsV1']['searched'+str(n)]=True
    sizes=[];statuses=[]
    class Network:
     def request(self,method,url,headers,body=None):
      assert url=='https://api.anthropic.com/v1/messages'
      system=' '.join(x['text'] for x in body['system'])
      messages=[{'role':'system','content':system}]+body['messages']
      sizes.append(len(encode(messages).encode()))
      text=body['messages'][0]['content']
      if isinstance(text,list):text=' '.join(x['text'] for x in text)
      payload=json.loads(text)
      if 'Independently audit' in system:
       answer={'decisions':[dict(connectionId=c['id'],accepted=True,reason='Simulated review for offline execution testing only.') for c in payload['connections']]}
      elif mode=='fallback_figures':answer={'figure':None}
      else:
       refs=payload['evidenceBank'][:2]
       answer={'figure':dict(version=2,kind='comparison',title='Evidence comparison',takeaway='Compare these retained accounts.',caveat='Offline test figure.',items=[dict(id='i'+str(n),label='Source account',detail='',evidence=[x['evidenceId']],group='',value=None,displayValue='',date='',cells=['Retained account','Source context']) for n,x in enumerate(refs)],edges=[],columns=['Evidence','Context'],metric=dict(unit='',period='',geography='',definition=''))}
      return message(json.dumps(answer)),{}
    with patch.dict(os.environ,{'ANTHROPIC_API_KEY':'offline-fixture'},clear=True),patch('socket.socket.connect',side_effect=AssertionError('Live network forbidden')):
     calls=Calls(fixture.db,job,lease,network=Network());calls.budget_policy=1
     def save(status='running'):
      statuses.append(status);fixture.db.save(job,lease,r,s)
     asyncio.run(run_connections(fixture.body,r,s,calls,save))
    assert statuses[-1]=='completed',statuses[-1]
    assert len(r['sections'])==4 and len(r['figures'])==4
    assert all(f['status']=='ready' and validate_figure(f['figure'],r['sources']) for f in r['figures'])
    if mode == 'valid_figures':
     assert not s.get('figureDiagnostics'),s.get('figureDiagnostics')
     assert len(sizes)==5,len(sizes)
   finally:fixture.tearDown()
