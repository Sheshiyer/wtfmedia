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
test("reject unauthorized, extra tabs, wrong book, duplicate IDs or missing tabs", async()=>{
  assert.equal((await run(fixture(),"wrong")).status,401);
  for(const modify of [p=>p.tabs.Pipeline={},p=>p.sheetId="wrong",
      p=>p.tabs[names[3]].ids[2]=p.tabs[names[0]].ids[2],p=>delete p.tabs.Calendar]){
    const p=fixture();modify(p);assert.equal((await run(p)).status,400);
  }
});

test("preview matches source titles and coordinates without any sheet ID columns",async()=>{
  const p = fixture();
  for (const tab of Object.values(p.tabs)) delete tab.ids;
  const response = await run(p);
  assert.equal(response.status,200);
  const result = await response.json();
  assert.equal(result.sheets[0].sourceRowsWithIds,0);
  assert.deepEqual(result.sheets[0].review,[{stagingSource:names[0]+"!D2",candidate:"D2",rowId:null}]);
});

test("Apps Script constructs all four snapshots with exclusively read methods on the workbook", async()=>{
  const {readFile} = await import("node:fs/promises");
  const vm = await import("node:vm");
  const script = await readFile(new URL("../../scripts/production-calendar/prepare_sheet_ids.gs",import.meta.url),"utf8");
  const book = {
    getId:()=>sheetId, getSpreadsheetTimeZone:()=>"Asia/Kolkata",
    getSheetByName(name){
      const i=names.indexOf(name);
      assert.ok(i>=0);
      const range={getValues:()=>[[headers[i]],["Episode"]],getFormulas:()=>[[""],[""]]};
      return {getDataRange:()=>range};
    }
  };
  let payload;
  const env={
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==="WTF_STAGING_PREVIEW_TOKEN"?token:sheetId})},
    SpreadsheetApp:{getActiveSpreadsheet:()=>book},
    UrlFetchApp:{fetch:(_url,options)=>{
      payload=JSON.parse(options.payload);
      return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({mode:"preview",sheets:names})};
    }},
  };
  vm.runInNewContext(script,env);
  env.fetchStagingPreview_();
  assert.deepEqual(Object.keys(payload.tabs),names);
  assert.ok(names.every(n=>!Object.hasOwn(payload.tabs[n],"ids")));
  assert.equal((await run(payload)).status,200);
});
