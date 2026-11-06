import assert from "node:assert/strict";
import test from "node:test";
import {align,episodes,podcast,ips} from "../../sheet-sync/model.js";
test("title, guest and IP episode number reconcile reordered or renamed episodes without using row positions",()=>{
 const prev=[{tab:podcast,title:"First",key:"guest one",id:"a"},{tab:ips,title:"Second",key:"bts|2",id:"b"}];
 const result=align([{tab:ips,title:"Renamed episode",key:"bts|2",ref:"new row"},{tab:podcast,title:"First",key:"guest one",ref:"moved"}],prev);
 assert.deepEqual(result.matched.map(m=>m.id),["b","a"]);assert.deepEqual(result.review,[]);
});
test("competing identities and possible replacements require review",()=>{
 const prev=["one","two"].map((id,i)=>({id,tab:podcast,title:id,key:"guest"+i}));
 const result=align([{tab:podcast,title:"one",key:"guest1",ref:"A"},{tab:podcast,title:"different",key:"",ref:"B"}],prev);
 assert.deepEqual(result.matched,[]);assert.deepEqual(result.review,["A","B"]);
});
test("new tracker rows are included and only merged guest rows attach to their anchor",()=>{
 const one=episodes(podcast,{A1:["Status"],D17:["Panel"],B17:["Guest A"],B18:["Guest B"],B19:["Unlinked"]},
   [{startColumnIndex:3,startRowIndex:16,endRowIndex:18}]);
 assert.equal(one.length,1);assert.deepEqual(one[0].guests.map(g=>g.n),[17,18]);
});
