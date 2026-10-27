// One serialized SQLite authority for the staging runner, independent of container disk.
export class StoreError extends Error {
  constructor(name, limit) { super(name); this.limit = limit; }
}
const phases = new Set(['runner','resolve','dossier','channels','preparation','extraction','summaries','visuals',
  ...['write','numeric','visual'].flatMap(p=>['snacks','appetizers','main','desserts'].map(s=>`${p}_${s}`))]);
const integer = (v,max=5000000) => Number.isSafeInteger(v) && v>=0 && v<=max;
export function initialize(sql) {
  sql.exec(`CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,body_hash TEXT NOT NULL,body TEXT NOT NULL,result TEXT NOT NULL,status TEXT NOT NULL,state TEXT NOT NULL DEFAULT '{}',lease TEXT,expires REAL NOT NULL DEFAULT 0,created REAL NOT NULL,kind TEXT NOT NULL DEFAULT 'research');
    CREATE TABLE IF NOT EXISTS deleted(hash TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS calls(job TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,key TEXT NOT NULL,kind TEXT NOT NULL,reserve INTEGER NOT NULL,billed INTEGER,receipt TEXT,response TEXT,tries INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(job,key));`);
}
export const methods = new Set(['submit','get','cancel','delete','claim','claim_id','heartbeat','save','reserve','started','settle','admit','allowance']);
export function dispatch(sql, method, args, hashes, now = Date.now()/1000) {
  const rows = (q,...a) => [...sql.exec(q,...a)];
  const first = (q,...a) => rows(q,...a)[0];
  const exec = (q,...a) => { sql.exec(q,...a); };
  const fail = (name,limit) => { throw new StoreError(name,limit); };
  const limit = (kind,phase,used,maximum) => fail('BudgetExceeded',{kind,phase,used,maximum});
  const spentFor = id => first('SELECT COALESCE(SUM(MAX(reserve,COALESCE(billed,0))),0) AS n FROM calls WHERE job=?',id).n;
  const owned = row => {
    if(JSON.parse(row.body).budgetPolicyVersion!==1)fail('InvalidPolicy');
    const state=JSON.parse(row.state);
    state._budget ??= {version:1,phases:{},calls:{}};
    return [state,state._budget];
  };
  const guard = (id,lease) => first("SELECT * FROM jobs WHERE id=? AND lease=? AND status='running' AND expires>?",id,lease,now) || fail('Stopped');
  const cost = id => {
    const calls=rows('SELECT kind,billed,reserve,tries FROM calls WHERE job=?',id);
    const versioned=JSON.parse(first('SELECT body FROM jobs WHERE id=?',id).body).budgetPolicyVersion===1;
    return {toolMicro:calls.filter(c=>c.kind==='tool').reduce((n,c)=>n+(c.billed!==null&&(!versioned||c.tries<=1)?c.billed:Math.max(c.reserve,c.billed??0)),0),modelUsd:calls.some(c=>c.kind==='model'&&c.billed===null)?null:calls.filter(c=>c.kind==='model').reduce((n,c)=>n+(c.billed??0),0)/1000000};
  };
  const [id,lease,key]=args;
  switch(method) {
    case 'submit': {
      const [body,kind='research']=args, id=body.id;
      if(first('SELECT 1 FROM deleted WHERE hash=?',hashes.id)) fail('Gone');
      const old=first('SELECT * FROM jobs WHERE id=?',id);
      if(old){if(old.body_hash!==hashes.body)fail('Conflict');return {id,status:old.status};}
      if(first("SELECT COUNT(*) AS n FROM jobs WHERE status IN ('queued','running')").n>=100)fail('QueueFull');
      const sections=body.mode==='visuals'?(body.sections||[]):body.section?(body.sections||[]).filter(s=>s.key!==body.section):[];
      const result={id,status:'queued',sections,sources:body.sources||[],progress:[],warnings:[],clarification:null,...(body.visualPolicyVersion===2?{visualPolicyVersion:2,figures:body.figures||[],coverage:body.coverage||[]}: {})};
      exec('INSERT INTO jobs(id,body_hash,body,result,status,created,kind) VALUES(?,?,?,?,?,?,?)',id,hashes.body,JSON.stringify(body),JSON.stringify(result),'queued',now,kind);
      return {id,status:'queued'};
    }
    case 'get': {
      const row=first('SELECT * FROM jobs WHERE id=?',id);if(!row)return null;
      const result={...JSON.parse(row.result),status:row.status,cost:cost(id)};
      if(first("SELECT 1 FROM calls WHERE job=? AND kind='tool' AND (billed IS NULL OR (?=1 AND tries>1))",id,JSON.parse(row.body).budgetPolicyVersion===1?1:0))result.warnings.push('Tool cost includes reserved estimates where receipts unavailable');
      return result;
    }
    case 'cancel': {
      const row=first('SELECT status FROM jobs WHERE id=?',id);
      if(!row){exec('INSERT OR IGNORE INTO deleted VALUES(?)',hashes.id);return {id,status:'cancelled'};}
      if(['queued','running'].includes(row.status)){exec("UPDATE jobs SET status='cancelled',lease=NULL,expires=0 WHERE id=?",id);return {id,status:'cancelled'};}
      return {id,status:row.status};
    }
    case 'delete':
      exec('INSERT OR IGNORE INTO deleted VALUES(?)',hashes.id);
      exec('DELETE FROM calls WHERE job=?',id);exec('DELETE FROM jobs WHERE id=?',id);return null;
    case 'claim': {
      exec("DELETE FROM calls WHERE job IN (SELECT id FROM jobs WHERE kind='chat' AND created<?)",now-180);
      exec("DELETE FROM jobs WHERE kind='chat' AND created<?",now-180);
      const row=first("SELECT * FROM jobs WHERE kind='research' AND (status='queued' OR (status='running' AND expires<?)) ORDER BY created LIMIT 1",now);
      if(!row)return null;
      const lease=crypto.randomUUID();exec("UPDATE jobs SET status='running',lease=?,expires=? WHERE id=?",lease,now+120,row.id);
      return [row.id,lease,JSON.parse(row.body),JSON.parse(row.result),JSON.parse(row.state)];
    }
    case 'claim_id': {
      if(!first("SELECT * FROM jobs WHERE id=? AND kind='chat' AND status='queued'",id))return null;
      const lease=crypto.randomUUID();exec("UPDATE jobs SET status='running',lease=?,expires=? WHERE id=?",lease,now+120,id);return [id,lease];
    }
    case 'heartbeat':guard(id,lease);exec('UPDATE jobs SET expires=? WHERE id=?',now+120,id);return null;
    case 'save': {
      const row=guard(id,lease), state={...args[3]}, budget=JSON.parse(row.state)._budget;
      delete state._budget;if(budget!==undefined)state._budget=budget;
      exec('UPDATE jobs SET result=?,state=?,status=? WHERE id=?',JSON.stringify(args[2]),JSON.stringify(state),args[4]||'running',id);return null;
    }
    case 'allowance': {
      const row=guard(id,lease),[,budget]=owned(row),phase=args[2],needed=args[3]??0,hold=args[4]??0;
      if(!phases.has(phase)||!integer(needed)||!integer(hold))fail('InvalidAdmission');
      if(budget.stopped)fail('BudgetExceeded',budget.stopped);
      const spent=spentFor(id),maximum=JSON.parse(row.body).budgetMicro;
      const keys=args[5]??[];
      if(!Array.isArray(keys)||keys.length>256||keys.some(k=>typeof k!=='string'||k.length>100))fail('InvalidAdmission');
      const cachedCount=[...new Set(keys)].filter(k=>first('SELECT 1 FROM calls WHERE job=? AND key=? AND response IS NOT NULL',id,k)).length;
      if(spent+Math.max(0,needed-cachedCount*250000)+hold>maximum)limit('job_reservation',phase,spent,maximum);
      return {remaining:maximum-spent,cachedCount,callsRemaining:Math.max(0,12-(budget.phases[phase]||0))};
    }
    case 'admit': {
      const row=guard(id,lease),[state,budget]=owned(row),spec=args[3];
      if(!spec||Object.keys(spec).sort().join(',')!=='amount,hold,kind,phase'||!['tool','model'].includes(spec.kind)
        ||!phases.has(spec.phase)||!integer(spec.amount)||!integer(spec.hold))fail('InvalidAdmission');
      if(budget.stopped)fail('BudgetExceeded',budget.stopped);
      const prior=first('SELECT * FROM calls WHERE job=? AND key=?',id,key);
      if(prior?.response!=null)return JSON.parse(prior.response);
      const {phase,amount}=spec,used=budget.phases[phase]||0;
      if(prior&&prior.tries>=2)limit('call_retries',phase,prior.tries,2);
      if(used>=12)limit('stage_calls',phase,used,12);
      const spent=spentFor(id),maximum=JSON.parse(row.body).budgetMicro;
      if(spent+amount+spec.hold>maximum){
        budget.stopped={kind:'job_reservation',phase,used:spent,maximum};
        exec('UPDATE jobs SET state=? WHERE id=?',JSON.stringify(state),id);
        fail('BudgetExceeded',budget.stopped);
      }
      if(prior)exec('UPDATE calls SET reserve=reserve+?,tries=tries+1 WHERE job=? AND key=?',amount,id,key);
      else exec('INSERT INTO calls(job,key,kind,reserve,tries) VALUES(?,?,?,?,1)',id,key,spec.kind,amount);
      budget.phases[phase]=used+1;budget.calls[key]={phase,amount};
      exec('UPDATE jobs SET state=? WHERE id=?',JSON.stringify(state),id);return null;
    }
    case 'reserve': {
      const row=guard(id,lease);if(JSON.parse(row.body).budgetPolicyVersion===1)fail('InvalidPolicy');
      const prior=first('SELECT * FROM calls WHERE job=? AND key=?',id,key);
      if(prior){if(prior.response!==null)return JSON.parse(prior.response);if(prior.tries>=2)limit('call_retries','runner',prior.tries,2);return null;}
      const spent=first('SELECT COALESCE(SUM(MAX(reserve,COALESCE(billed,0))),0) AS n FROM calls WHERE job=?',id).n;
      if(spent+args[4]>JSON.parse(row.body).budgetMicro)limit('job_reservation','runner',spent,JSON.parse(row.body).budgetMicro);
      exec('INSERT INTO calls(job,key,kind,reserve) VALUES(?,?,?,?)',id,key,args[3],args[4]);return null;
    }
    case 'started': {
      const job=guard(id,lease);if(JSON.parse(job.body).budgetPolicyVersion===1)fail('InvalidPolicy');
      const row=first('SELECT tries FROM calls WHERE job=? AND key=?',id,key);
      if(!row||row.tries>=2)limit('call_retries','runner',row?.tries??2,2);exec('UPDATE calls SET tries=tries+1 WHERE job=? AND key=?',id,key);return null;
    }
    case 'settle': {
      const row=guard(id,lease),state=JSON.parse(row.state),budget=state._budget,entry=budget?.calls[key];
      if(entry&&args[3]!=null&&args[3]>entry.amount){
        budget.stopped={kind:'provider_cost_overrun',phase:entry.phase,used:args[3],maximum:entry.amount};
        exec('UPDATE jobs SET state=? WHERE id=?',JSON.stringify(state),id);
      }
      exec('UPDATE calls SET billed=?,receipt=?,response=? WHERE job=? AND key=?',args[3],args[4],args[5]===null?null:JSON.stringify(args[5]),id,key);return null;
    }
    default:fail('InvalidMethod');
  }
}
