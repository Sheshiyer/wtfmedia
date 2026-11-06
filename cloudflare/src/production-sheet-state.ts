import type { DB } from "./db.ts";
type Cell = [string | number | boolean | null, string, string];
export type SyncedSheets = Record<string,Record<string,Cell>>;
export interface SheetState {
  checked_at:string;changed_at:string;sheets:SyncedSheets;
  review:{refs:string[];stale:string[];inactiveEvents:string[]};
}

export async function readSheetState(env:{DB:DB;PRODUCTION_SHEET_SYNC_ENABLED?:string}):Promise<SheetState|null>{
  if(env.PRODUCTION_SHEET_SYNC_ENABLED!=="1")return null;
  const row=await env.DB.prepare("SELECT checked_at,changed_at,snapshot,review FROM production_sheet_sync WHERE id=1 AND snapshot IS NOT NULL").first<{checked_at:string;changed_at:string;snapshot:string;review:string}>();
  if(!row)return null;
  return {checked_at:row.checked_at,changed_at:row.changed_at,sheets:JSON.parse(row.snapshot).sheets,review:JSON.parse(row.review)};
}
export function sheetRows(cells:Record<string,Cell>) {
  const rows=new Map<number,{ref:string;value:Cell[0];cachedValue:string|null;formula:string|null;fill:null}[]>();
  for(const [ref,[value,formula,formatted]] of Object.entries(cells)){
    const n=Number(ref.match(/\d+$/)?.[0]);
    const list=rows.get(n)??[];
    list.push({ref,value:formatted||value,cachedValue:formula?formatted:null,formula:formula||null,fill:null});
    rows.set(n,list);
  }
  return [...rows].sort(([a],[b])=>a-b);
}
export function sheetSummary(state:SheetState){
  return Object.entries(state.sheets).map(([name,cells])=>({name,cells:Object.keys(cells).length,rows:sheetRows(cells).length}));
}
