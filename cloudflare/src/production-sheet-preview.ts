import type { DB } from "./db.ts";

const titleColumns = {
  "Production Tracker Podcast": "D", "WTF & Nikhil Kamath IPs": "C",
  "Calendar": null, "Dubbing Tracker": "A",
} as const;
type Tab = keyof typeof titleColumns;
const tabs = Object.keys(titleColumns) as Tab[];
type Scalar = string | number | boolean | null;
type Cell = [Scalar, string];
interface Snapshot { cells: Record<string, Cell>; ids?: Record<string, string> }
interface Baseline { sheet: Tab; cell_ref: string; raw_value: string; formula: string | null;
  cached_value: string | null; raw_ooxml: string | null }
const maxBytes = 2 * 1024 * 1024;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function reject(): never { throw new Error("invalid_sheet_snapshot"); }
const sha = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",
  new TextEncoder().encode(text))), b => b.toString(16).padStart(2, "0")).join("");

async function readSnapshot(request: Request, expectedSheet: string): Promise<Record<Tab, Snapshot>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_sheet_snapshot");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) { await reader.cancel(); throw new Error("snapshot_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (data.version !== 1 || typeof data.sheetId !== "string" || await sha(data.sheetId) !== expectedSheet ||
      !object(data.tabs) || Object.keys(data.tabs).length !== tabs.length) reject();
  const seen = new Set<string>();
  for (const tab of tabs) {
    const sheet = data.tabs[tab];
    if (!sheet || !object(sheet.cells) || (sheet.ids !== undefined && !object(sheet.ids)) || Object.keys(sheet.cells).length > 25000) reject();
    for (const [ref, cell] of Object.entries(sheet.cells)) {
      if (!/^[A-Z]{1,3}[1-9]\d{0,4}$/.test(ref) || !Array.isArray(cell) || cell.length !== 2 ||
          !(cell[0] === null || ["number","string","boolean"].includes(typeof cell[0])) || typeof cell[1] !== "string") reject();
    }
    const first = {"Production Tracker Podcast":"Status", "WTF & Nikhil Kamath IPs":"IP",
      "Calendar":"Month", "Dubbing Tracker":"Episode Name"}[tab];
    if (sheet.cells.A1?.[0] !== first) reject();
    for (const [row, id] of Object.entries(sheet.ids ?? {})) {
      if (tab === "Calendar" || !/^[1-9]\d{0,4}$/.test(row) || Number(row)<2 || typeof id !== "string" ||
          !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || seen.has(id.toLowerCase())) reject();
      seen.add((id as string).toLowerCase());
    }
  }
  return data.tabs;
}

function archivedCell(row: Baseline): Cell {
  const raw = JSON.parse(row.raw_ooxml || "{}") ?? {};
  let v: Scalar = row.formula ? row.cached_value : row.raw_value;
  if ((!raw.type || raw.type === "n") && raw.value != null) v = Number(raw.value);
  if (raw.type === "b") v = raw.value === "1";
  return [v, row.formula || ""];
}

export async function previewSheet(request: Request, db: DB, tokenDigest?: string, sheetDigest?: string) {
  const reply = (body: unknown, status = 200) => Response.json(body,{status,headers:{"cache-control":"private, no-store"}});
  if (request.method !== "POST") return reply({error:"method_not_allowed"},405);
  const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("authorization") || "")?.[1];
  if (!token || !tokenDigest || await sha(token) !== tokenDigest) return reply({error:"unauthorized"},401);
  if (!sheetDigest) return reply({error:"preview_unconfigured"},503);
  let source;
  try { source = await readSnapshot(request,sheetDigest); }
  catch (e) { return reply({error:e instanceof Error && e.message === "snapshot_too_large" ? "snapshot_too_large" : "invalid_sheet_snapshot"}, e instanceof Error && e.message === "snapshot_too_large" ? 413 : 400); }
  try {
    const archived = await db.prepare(`SELECT sheet,cell_ref,raw_value,raw_ooxml,formula,cached_value FROM production_source_cells
      WHERE sheet IN (?,?,?,?) AND raw_value IS NOT NULL AND import_id=(SELECT id FROM production_imports ORDER BY imported_at DESC,id DESC LIMIT 1)`).bind(...tabs).all<Baseline>();
    const records = await db.prepare("SELECT source_ref,title FROM production_items WHERE source_ref IS NOT NULL").all<{source_ref:string;title:string}>();
    const summaries = tabs.map(tab => {
      const old = new Map(archived.results.filter(r => r.sheet === tab).map(r => [r.cell_ref, archivedCell(r)]));
      if (!old.size) throw Error("missing_baseline");
      const {cells,ids = {}} = source[tab];
      const delta = {added:[] as string[],changed:[] as string[],removed:[] as string[]};
      for (const [ref, cell] of Object.entries(cells)) {
        const previous = old.get(ref);
        if (!previous) delta.added.push(ref);
        else if (previous[0] !== cell[0] || previous[1] !== cell[1]) delta.changed.push(ref);
      }
      for (const ref of old.keys()) if (!Object.hasOwn(cells,ref)) delta.removed.push(ref);
      const column = titleColumns[tab];
      const candidates = records.results.filter(r => r.source_ref.startsWith(tab+"!"));
      const byTitle = new Map<string,string[]>();
      if (column) for (const [ref,[v]] of Object.entries(cells)) {
        if (!new RegExp("^"+column+"[0-9]+$").test(ref) || ref===column+"1" || typeof v!=="string" || !v.trim()) continue;
        const matches = byTitle.get(v) ?? [];
        matches.push(ref); byTitle.set(v,matches);
      }
      const review = candidates.map(r => {
        const matches = byTitle.get(r.title) ?? [];
        const ref = matches.length===1 && candidates.filter(c=>c.title===r.title).length===1 ? matches[0] : null;
        return {stagingSource:r.source_ref, candidate:ref, rowId:ref && column ? ids[ref.slice(column.length)] ?? null : null};
      });
      return {tab,sourceRowsWithIds:Object.keys(ids).length,delta,review};
    });
    return reply({mode:"preview", sheets:summaries});
  } catch { return reply({error:"staging_baseline_unavailable"},503); }
}
