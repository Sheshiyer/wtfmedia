import { Container, getContainer } from '@cloudflare/containers';
import { DurableObject } from 'cloudflare:workers';
import { dispatch, initialize, methods, StoreError } from './store.js';

interface Env {
  RUNNER: DurableObjectNamespace<ResearchContainer>;
  STATE: DurableObjectNamespace<ResearchState>;
  RESEARCH_RUNNER_TOKEN: string;
  RESEARCH_STATE_TOKEN: string;
  RESEARCH_STATE_URL: string;
  TREG_TOKEN: string;
  ANTHROPIC_API_KEY: string;
}
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])) : value;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: {'cache-control':'no-store'} });
async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}
async function authorized(request: Request, secret: string) {
  if (!secret) return false;
  const actual = request.headers.get('authorization') || '';
  const [a,b] = await Promise.all([digest(actual),digest('Bearer '+secret)]);
  return crypto.subtle.timingSafeEqual(a,b);
}
async function read(request: Request) {
  if(Number(request.headers.get('content-length')||0)>1_200_000) throw new Error('body_limit');
  const reader=request.body?.getReader();if(!reader)throw new Error('missing_body');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>1_200_000){await reader.cancel();throw new Error('body_limit');}chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
export class ResearchState extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {super(ctx,env);initialize(ctx.storage.sql);}
  async active() {return this.ctx.storage.sql.exec<{n:number}>("SELECT COUNT(*) AS n FROM jobs WHERE kind='research' AND status IN ('queued','running')").one().n>0;}
  async fetch(request: Request) {
    if(!await authorized(request,this.env.RESEARCH_STATE_TOKEN))return json({error:'unauthorized'},401);
    try {
      const body=await read(request);
      if(!methods.has(body.method)||!Array.isArray(body.args)||body.args.length>6)return json({error:'invalid_request'},400);
      const id=body.method==='submit'?body.args[0]?.id:body.args[0];
      if(body.method!=='claim'&&(typeof id!=='string'||!/^rrun_[0-9a-f-]{36}$/.test(id)))return json({error:'invalid_request'},400);
      const hex=async(value:string)=>Array.from(await digest(value),b=>b.toString(16).padStart(2,'0')).join('');
      const hashes={id:await hex(id||''),body:body.method==='submit'?await hex(JSON.stringify(canonical(body.args[0]))):''};
      const value=this.ctx.storage.transactionSync(()=>dispatch(this.ctx.storage.sql,body.method,body.args,hashes));
      return json({value});
    } catch(error) {
      return error instanceof StoreError?json({error:error.message}):json({error:'state_unavailable'},503);
    }
  }
}
export class ResearchContainer extends Container<Env> {
  defaultPort=8080;
  sleepAfter='5m';
  enableInternet=true;
  envVars={
    RESEARCH_RUNNER_TOKEN:this.env.RESEARCH_RUNNER_TOKEN,
    RESEARCH_STATE_TOKEN:this.env.RESEARCH_STATE_TOKEN,
    RESEARCH_STATE_URL:this.env.RESEARCH_STATE_URL,
    TREG_TOKEN:this.env.TREG_TOKEN,
    ANTHROPIC_API_KEY:this.env.ANTHROPIC_API_KEY,
  };
}
export default {
  async fetch(request:Request,env:Env) {
    const path=new URL(request.url).pathname;
    if(path==='/state') {
      if(request.method!=='POST'||!await authorized(request,env.RESEARCH_STATE_TOKEN))return json({error:'unauthorized'},401);
      return env.STATE.getByName('staging').fetch(request);
    }
    if(!await authorized(request,env.RESEARCH_RUNNER_TOKEN))return json({error:'unauthorized'},401);
    if(!((path==='/health'&&request.method==='GET')||(path==='/jobs'&&request.method==='POST')||(path==='/chat'&&request.method==='POST')||(/^\/jobs\/rrun_[0-9a-f-]{36}$/.test(path)&&['GET','DELETE'].includes(request.method))||(/^\/jobs\/rrun_[0-9a-f-]{36}\/cancel$/.test(path)&&request.method==='POST')))return json({error:'not_found'},404);
    try{return await getContainer(env.RUNNER,'staging').fetch(request);}
    catch{return json({error:'runner_unavailable'},503);}
  },
  async scheduled(_event:ScheduledController,env:Env,ctx:ExecutionContext) {
    ctx.waitUntil((async()=>{
      if(await env.STATE.getByName('staging').active()) {
        const response=await getContainer(env.RUNNER,'staging').fetch(new Request('http://runner/health',{headers:{authorization:'Bearer '+env.RESEARCH_RUNNER_TOKEN}}));
        await response.body?.cancel();
      }
    })());
  }
} satisfies ExportedHandler<Env>;
