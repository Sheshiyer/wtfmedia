import {readWorkbook} from "./google.js";
import {align,day,episodes,ips,podcast} from "./model.js";
const iso=()=>new Date().toISOString();
const hex=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,"0")).join("");
const flag=v=>v===true?"checked":v===false?"unchecked":"not_box";
const ownedTabs="substr(source_ref,1,instr(source_ref,'!')-1) IN ('Production Tracker Podcast','WTF & Nikhil Kamath IPs')";
const sourceTab=ref=>ref.split("!")[0];
async function bootstrap(db,items){
  const {results}=await db.prepare(`SELECT sheet,cell_ref,raw_value FROM production_source_cells
    WHERE import_id=(SELECT id FROM production_imports ORDER BY imported_at DESC,id DESC LIMIT 1)
    AND sheet IN (?,?) AND raw_value IS NOT NULL`).bind(podcast,ips).all();
  const byTab={[podcast]:{},[ips]:{}};
  for(const r of results)byTab[r.sheet][r.cell_ref]=[r.raw_value];
  const historic=[...episodes(podcast,byTab[podcast]),...episodes(ips,byTab[ips])];
  return items.map(x=>({id:x.id,title:x.title,tab:sourceTab(x.source_ref),key:historic.find(h=>h.ref===x.source_ref)?.key??""}));
}
export async function sync(env, loadWorkbook=readWorkbook){
  const db=env.DB,lease=crypto.randomUUID(),start=Date.now();
  const acquired=await db.prepare("UPDATE production_sheet_sync SET lease=?,lease_until=? WHERE id=1 AND lease_until<?").bind(lease,start+120000,start).run();
  if(!acquired.meta.changes)return;
  try{
    const snapshot=await loadWorkbook(env);
    const today=new Date(start+19800000).toISOString().slice(0,10);
    const json=JSON.stringify(snapshot),digest=await hex(today+"|"+json);
    if(json.length>800000)throw Error("snapshot_too_large");
    const state=await db.prepare("SELECT digest,bindings FROM production_sheet_sync WHERE id=1").first();
    if(digest===state.digest){
      await db.prepare("UPDATE production_sheet_sync SET checked_at=?,lease=NULL,lease_until=0 WHERE id=1 AND lease=?").bind(iso(),lease).run();return;
    }
    const query=async sql=>(await db.prepare(sql).all()).results;
    const items=await query("SELECT id,title,source_ref FROM production_items WHERE "+ownedTabs);
    const originalGuestIds=new Set();
    const archivedGuests=await db.prepare("SELECT DISTINCT row_number FROM production_source_cells WHERE sheet=? AND raw_value IS NOT NULL AND cell_ref='B'||row_number AND row_number>=2").bind(podcast).all();
    for(const {row_number} of archivedGuests.results)originalGuestIds.add("pc_guest_"+(await hex(["guest",podcast,row_number,""].join("\0"))).slice(0,20));
    const memberships=await query("SELECT item_id,guest_id FROM production_item_guests");
    const events=await query("SELECT id, item_id, kind, source_ref FROM production_events WHERE "+ownedTabs);
    const known=state.bindings?JSON.parse(state.bindings):await bootstrap(db,items);
    const incoming=[...episodes(podcast,snapshot.sheets[podcast],snapshot.merges),...episodes(ips,snapshot.sheets[ips])];
    const {matched,review}=align(incoming,known);
    const next=new Map(known.map(k=>[k.id,k]));
    const inactiveEvents=[];
    const sqls=[];
    const add=(sql,...params)=>sqls.push(db.prepare(sql).bind(...params));
    add("INSERT INTO production_sheet_sync_guard(ok) SELECT CASE WHEN lease=? THEN 1 ELSE 0 END FROM production_sheet_sync WHERE id=1",lease);

    for(const {item:x,id} of matched){
      next.set(id,{id,tab:x.tab,title:x.title,key:x.key});
      if(x.tab===ips){
        add(`INSERT INTO production_items(id,title,ip_id,owner,source_ref,source_status) VALUES(?,?,?,?,?,'verified')
          ON CONFLICT(id) DO UPDATE SET title=excluded.title,ip_id=excluded.ip_id,owner=excluded.owner,source_ref=excluded.source_ref,source_status='verified'`,id,x.title,x.ip,x.owner,x.ref);
      }else{
        add(`INSERT INTO production_items(id,title,stage,shoot_location,source_ref,source_status) VALUES(?,?,?,?,?,'verified')
          ON CONFLICT(id) DO UPDATE SET title=excluded.title,stage=excluded.stage,shoot_location=excluded.shoot_location,source_ref=excluded.source_ref,source_status='verified'`,id,x.title,x.stage,x.place,x.ref);
        add("DELETE FROM production_source_checks WHERE item_id=?",id);
        const linked=new Set();
        for(const {n,r} of x.guests){
          if(typeof r.B==="string" && r.B.trim()){
            const guestId="sheetguest_"+(await hex(id+"\0"+r.B.trim().toLowerCase())).slice(0,32);
            linked.add(guestId);
            add("INSERT INTO production_guests(id,name) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name",guestId,r.B.trim());
            add("INSERT INTO production_item_guests(item_id,guest_id,agreement_status) VALUES(?,?,?) ON CONFLICT(item_id,guest_id) DO UPDATE SET agreement_status=excluded.agreement_status",id,guestId,r.H===true?"source_checked":r.H===false?"source_unchecked":"unknown");
          }
          add(`INSERT INTO production_source_checks(item_id,source_row,guest_name,guest_role,guest_agreement,agreement_note,dubbing,hindi_live)
            VALUES(?,?,?,?,?,?,?,?)`,id,n,r.B==null?null:String(r.B),r.C==null?null:String(r.C),flag(r.H),typeof r.H==="string"?r.H:null,flag(r.I),flag(r.J));
        }
        for(const m of memberships.filter(m=>m.item_id===id && !linked.has(m.guest_id))){
          if(originalGuestIds.has(m.guest_id)||m.guest_id.startsWith("sheetguest_"))add("DELETE FROM production_item_guests WHERE item_id=? AND guest_id=?",id,m.guest_id);
        }
      }
      const dates=x.tab===ips?[["ip_post","D",x.release]]:[["shoot","F",x.shoot],["main_post","G",x.release]];
      for(const [kind,column,value] of dates){
        const previous=events.filter(e=>e.item_id===id&&e.kind===kind);
        if(previous.length>1){review.push(x.ref+" "+kind);continue}
        const date=day(value);
        if(!date){if(previous.length)inactiveEvents.push(previous[0].id);continue}
        const eventId=previous[0]?.id??"pevt_"+crypto.randomUUID();
        add(`INSERT INTO production_events(id,item_id,kind,day,date_state,source_ref) VALUES(?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET day=excluded.day,date_state=excluded.date_state,source_ref=excluded.source_ref`,
          eventId,id,kind,date,date<=today?"actual":"planned",x.tab+"!"+column+x.n);
      }
    }
    // The labels include the target (e.g. "Stitch'd (20+)"); row 4 holds progress.
    const ipAliases={bts:"bts","stitch'd":"stitched",stitched:"stitched",pov:"pov",animation:"animated-ip","animated ip":"animated-ip"};
    for(const col of ["H","I","J","K"]){
      const label=String(snapshot.sheets[ips][col+"3"]?.[0]??"");
      const match=/^(.+?)\s*\((\d{1,5})(\+?)\)$/.exec(label);
      const ip=match && ipAliases[match[1].trim().toLowerCase()];
      if(ip)add("UPDATE production_ips SET target_count=?,target_plus=? WHERE id=?",Number(match[2]),match[3]?1:0,ip);
    }
    const stale=known.filter(k=>!matched.some(m=>m.id===k.id)).map(k=>k.id);
    const at=iso();
    add("UPDATE production_sheet_sync SET checked_at=?,changed_at=?,digest=?,snapshot=?,bindings=?,review=?,lease=NULL,lease_until=0 WHERE id=1",
      at,at,digest,json,JSON.stringify([...next.values()]),JSON.stringify({refs:review,stale,inactiveEvents}));
    add("DELETE FROM production_sheet_sync_guard");
    await db.batch(sqls);
  }finally{
    await db.prepare("UPDATE production_sheet_sync SET lease=NULL,lease_until=0 WHERE lease=?").bind(lease).run();
  }
}
export default { scheduled(_event,env,ctx){ctx.waitUntil(sync(env));} };
