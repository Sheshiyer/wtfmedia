"""Read-only, four-tab source comparison against the latest staging import.

Only coordinates and counts are returned. Source coordinates describe differences
between snapshots, not entity identity or a list of safe database updates.
"""
import argparse
from collections import Counter
from datetime import date, datetime, time
from decimal import Decimal
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import UUID

from openpyxl import load_workbook
from openpyxl.utils import get_column_letter
from openpyxl.utils.datetime import to_excel

from import_workbook import SHEET_PRODUCTION, SHEET_OTHER_IPS, SHEET_DUBBING, SHEET_CALENDAR

TABS = (SHEET_PRODUCTION, SHEET_OTHER_IPS, SHEET_CALENDAR, SHEET_DUBBING)
ID_HEADER = "_wtf_row_id"
ROOT = Path(__file__).resolve().parents[2]


def value(v):
    if isinstance(v, (datetime, date, time)):
        v = to_excel(v)
    if isinstance(v, bool):
        return ("bool", v)
    if isinstance(v, (int, float)):
        return ("number", Decimal(str(v)))
    return ("text", v) if v is not None else None


def workbook_source(path):
    book = load_workbook(path, data_only=False, read_only=True)
    cache = load_workbook(path, data_only=True, read_only=True)
    try:
        result = {}
        for tab in TABS:
            rows = {}
            for originals, evaluated in zip(book[tab].rows, cache[tab].rows, strict=True):
                for cell, cached in zip(originals, evaluated, strict=True):
                    if cell.value is not None:
                        rows[cell.coordinate] = (str(cell.value) if cell.data_type == "f" else None,
                                                 value(cached.value if cell.data_type == "f" else cell.value))
            result[tab] = rows
        return result
    finally:
        book.close()
        cache.close()


def live_source(sheet_id):
    if not re.fullmatch(r"[A-Za-z0-9_-]+", sheet_id):
        raise ValueError("Invalid spreadsheet identifier")
    token = os.environ.get("WTF_SHEETS_ACCESS_TOKEN")
    if not token:
        raise ValueError("Provide a Sheets-authorized access token through WTF_SHEETS_ACCESS_TOKEN")
    query = urlencode([("ranges", "'" + tab + "'") for tab in TABS] + [
        ("fields", "sheets(properties(title),data(startColumn,startRow,rowData(values(userEnteredValue,effectiveValue))))")])
    req = Request(f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}?{query}",
                  headers={"Authorization": "Bearer " + token})
    with urlopen(req, timeout=45) as response:
        sheets = json.load(response)["sheets"]
    result = {}
    for sheet in sheets:
        tab = sheet["properties"]["title"]
        if tab not in TABS or tab in result:
            raise ValueError("Unexpected sheet response")
        cells = result[tab] = {}
        for grid in sheet.get("data", []):
            for ri, row in enumerate(grid.get("rowData", []), 1 + grid.get("startRow", 0)):
                for ci, cell in enumerate(row.get("values", []), 1 + grid.get("startColumn", 0)):
                    entered = cell.get("userEnteredValue", {})
                    effective = cell.get("effectiveValue", {})
                    if not entered and not effective:
                        continue
                    ev = effective.get("errorValue", {}).get("type") if "errorValue" in effective else next(iter(effective.values()), None)
                    cells[f"{get_column_letter(ci)}{ri}"] = (entered.get("formulaValue"), value(ev))
    if set(result) != set(TABS):
        raise ValueError("Required tab missing")
    return result


def staging_select(sql):
    cmd = ["wrangler", "d1", "execute", "wtfmedia-ops-staging", "--env", "staging", "--remote",
           "--config", str(ROOT/"cloudflare/wrangler.jsonc"), "--json", "--command", sql]
    return json.loads(subprocess.check_output(cmd, cwd=ROOT))[0]["results"]


def baseline():
    names = ",".join("'" + t + "'" for t in TABS)
    sql = f"""SELECT sheet,cell_ref,raw_value,raw_ooxml,formula,cached_value
        FROM production_source_cells
        WHERE sheet IN ({names}) AND raw_value IS NOT NULL AND import_id=(
          SELECT id FROM production_imports ORDER BY imported_at DESC,id DESC LIMIT 1)"""
    result = {tab: {} for tab in TABS}
    for cell in staging_select(sql):
        raw = json.loads(cell["raw_ooxml"] or "{}") or {}
        typ, number = raw.get("type"), raw.get("value")
        v = cell["cached_value"] if cell["formula"] else cell["raw_value"]
        if typ in (None, "n") and number is not None:
            effective = ("number", Decimal(number))
        elif typ == "b":
            effective = ("bool", number == "1")
        else:
            effective = value(v)
        result[cell["sheet"]][cell["cell_ref"]] = (cell["formula"], effective)
    if not all(result.values()):
        raise ValueError("Incomplete staging source baseline; preview stopped")
    return result


def item_preview(data):
    # Exact unique titles can suggest matches. Never bind on coordinates alone.
    # Missing or ambiguous titles require owner review, particularly on panel rows.
    columns = {SHEET_PRODUCTION: "D", SHEET_OTHER_IPS: "C", SHEET_DUBBING: "A"}
    refs = staging_select("SELECT source_ref, title FROM production_items WHERE source_ref IS NOT NULL")
    report = {}
    for tab, col in columns.items():
        titles = Counter(cell[1] for coord, cell in data[tab].items()
                         if re.fullmatch(col + r"[0-9]+", coord) and coord != col + "1" and cell[1])
        records = [r for r in refs if r["source_ref"].startswith(tab + "!")]
        old = Counter(value(r["title"]) for r in records)
        exact = sum(1 for title in old if old[title] == 1 and titles[title] == 1)
        report[tab] = {"existing_records": len(records), "unique_title_candidates": exact,
                       "records_requiring_other_evidence": len(records) - exact}
    return report


def summarize(source, previous):
    report = {}
    seen = set()
    for tab in TABS:
        incoming, old = source[tab], previous[tab]
        headers = [a[:-1] for a, (_, v) in incoming.items() if re.fullmatch(r"[A-Z]+1", a) and v == value(ID_HEADER)]
        if len(headers) > 1:
            raise ValueError("Duplicate ID column on " + tab)
        ids = 0
        content = {}
        for coord, cell in incoming.items():
            if headers and re.fullmatch(headers[0] + r"[0-9]+", coord):
                if coord != headers[0]+"1":
                    uid = str(UUID(cell[1][1]))
                    if uid in seen:
                        raise ValueError("Duplicate row ID on " + tab)
                    seen.add(uid)
                    ids += 1
            else:
                content[coord] = cell
        delta = {}
        for coord in sorted(content.keys() | old.keys()):
            if content.get(coord) != old.get(coord):
                delta[coord] = "added" if coord not in old else "removed" if coord not in content else "changed"
        report[tab] = {"counts": dict(Counter(delta.values())), "coordinates": delta,
                       "row_ids": ids, "id_column": headers[0] if headers else None}
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--reference-xlsx", type=Path)
    mode.add_argument("--live-sheet-id")
    args = parser.parse_args()
    data = workbook_source(args.reference_xlsx) if args.reference_xlsx else live_source(args.live_sheet_id)
    print(json.dumps({"source": "reference export" if args.reference_xlsx else "live sheet",
                      "comparison": "staging import cell values and formulas", "item_review": item_preview(data), "tabs": summarize(data, baseline())}, indent=2))
