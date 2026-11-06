import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { previewSheet } from "../src/production-sheet-preview.ts";
const names=["Production Tracker Podcast","WTF & Nikhil Kamath IPs","Calendar","Dubbing Tracker"];
const headers=["Status","IP","Month","Episode Name"];
const hash = text => createHash("sha256").update(text).digest("hex");
const token = "a".repeat(64), sheetId="test-book";
const db={prepare(sql){
  assert.match(sql,/^SELECT /);
  const statement={bind(...namesInQuery){assert.deepEqual(namesInQuery,names);return statement;},async all(){
    return {results:sql.includes("production_items") ? [{source_ref:names[0]+"!D2",title:"Episode"}]
      : names.map((sheet,i)=>({sheet,cell_ref:"A1",raw_value:headers[i],raw_ooxml:'{"type":"s"}'}))};
  }}; return statement;
}};
function fixture(){
  const tabs=Object.fromEntries(names.map((tab,i)=>[tab,{cells:{A1:[headers[i],""]},ids:{}}]));
  tabs[names[0]].cells.D2=["Episode",""];
  tabs[names[0]].ids[2]="45093fb8-3d80-4a93-997d-0cbbb6fd4ff0";
  return {version:1,sheetId,tabs};
}
function run(payload,credential=token){
  return previewSheet(new Request("https://test.invalid",{method:"POST",headers:{authorization:"Bearer "+credential},
    body:JSON.stringify(payload)}),db,hash(token),hash(sheetId));
}
test("preview is repeatable, compares cells and returns a candidate tied to a source UUID",async()=>{
  const payload=fixture(), result=await (await run(payload)).json();
  assert.deepEqual(result,await (await run(payload)).json());
  assert.equal(result.mode,"preview");
  assert.deepEqual(result.sheets[0].delta,{added:["D2"],changed:[],removed:[]});
  assert.equal(result.sheets[0].review[0].rowId,payload.tabs[names[0]].ids[2]);
});
test("reject unauthorized, extra tabs, wrong book, duplicate or missing IDs", async()=>{
  assert.equal((await run(fixture(),"wrong")).status,401);
  for(const modify of [p=>p.tabs.Pipeline={},p=>p.sheetId="wrong",p=>delete p.tabs[names[0]].ids[2],
      p=>p.tabs[names[3]].ids[2]=p.tabs[names[0]].ids[2],p=>delete p.tabs.Calendar]){
    const p=fixture();modify(p);assert.equal((await run(p)).status,400);
  }
});
