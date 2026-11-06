// Stable identity is based on corroborating source fields, never the current row position.
export const podcast = "Production Tracker Podcast", ips = "WTF & Nikhil Kamath IPs", calendar = "Calendar";
export const tabs = [podcast,ips,calendar];
const ipNames = {"bts":"bts","stitch'd":"stitched","stitched":"stitched","pov":"pov","animated ip":"animated-ip","animation ip":"animated-ip","ways of the world":"ways-of-the-world"};
const text = v => String(v ?? "").trim();
const fold = v => text(v).toLowerCase().replace(/\s+/g," ");
export function rowsOf(cells) {
  const rows = new Map();
  for (const [ref,cell] of Object.entries(cells)) {
    const [,col,n] = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!rows.has(+n)) rows.set(+n,{});
    rows.get(+n)[col]=cell[0];
  }
  return [...rows].sort((a,b)=>a[0]-b[0]);
}
export function episodes(tab,cells,merges=[]) {
  const output=[]; let group="", current=null;
  for (const [n,r] of rowsOf(cells)) {
    if(n===1)continue;
    if(r.A)group=fold(r.A);
    if(tab===ips) {
      if(!text(r.C))continue;
      output.push({tab,n,title:text(r.C),key:group && r.B!=null ? group+"|"+fold(r.B):"",
        ip:ipNames[group]??null, owner:text(r.F)||null,release:r.D,ref:tab+"!A"+n+":F"+n});
    } else {
      if(text(r.D)){
        current={tab,n,title:text(r.D), key:fold(r.B), stage:({"posted":"published","post production":"post-production"})[group]??"unverified",
          place:text(r.E)||null,shoot:r.F,release:r.G, ref:tab+"!D"+n, guests:[]};
        output.push(current);
      }
      // A continuation belongs to the episode only if its title cell is merged with the anchor.
      const belongs=current&&(current.n===n||merges.some(m=>m.startColumnIndex===3 && m.startRowIndex===current.n-1 && n<=m.endRowIndex));
      if(belongs)current.guests.push({n,r});
    }
  }
  return output;
}
export function align(incoming,known) {
  const matched=[],review=[];
  const proposed=incoming.map(item=>{
    const peers=incoming.filter(e=>e.tab===item.tab);
    const old=known.filter(e=>e.tab===item.tab);
    const candidates=new Set();
    let ambiguous=false;
    for(const [field,v] of [["title",fold(item.title)],["key",item.key]]) {
      if(!v)continue;
      const get=e=>field==="title"?fold(e.title):e.key;
      const choices=old.filter(e=>get(e)===v);
      if(peers.filter(e=>get(e)===v).length!==1 || choices.length>1){if(field==="title" || choices.length)ambiguous=true;continue}
      if(choices.length===1)candidates.add(choices[0].id);
    }
    return {item,id:candidates.size===1?[...candidates][0]:null,ambiguous:ambiguous||candidates.size>1};
  });
  // A rename must not steal another title's unique match. If all identifying
  // fields changed, don't add a potential duplicate for a missing prior item.
  for(const p of proposed){
    const {item,id}=p;
    if(p.ambiguous || (id&&proposed.filter(q=>q.id===id).length!==1) ||
       (!id && known.some(k=>k.tab===item.tab && !proposed.some(q=>q.id===k.id && !q.ambiguous)))){
      review.push(item.ref);continue;
    }
    matched.push({item,id:id??"pitem_"+crypto.randomUUID()});
  }
  return {matched,review};
}
export function day(v){
  if(typeof v!=="number" || v<30000 || v>80000)return null;
  return new Date((Math.floor(v)-25569)*86400000).toISOString().slice(0,10);
}
