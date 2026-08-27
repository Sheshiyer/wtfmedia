#!/usr/bin/env python3
"""
Faithful, versioned JSON snapshot of the WTF podcast catalogue Excel sources.
Local-only. Reads source .xlsx files (unzipped as OpenXML), preserves original
column headers verbatim, computes per-file and per-row SHA-256 hashes for
idempotent re-runs, and writes one JSON per sheet plus a top-level manifest.

Design rules:
- No taxonomy normalization. Column headers stay as-authored in the sheet.
- No fetches. Drive/Zset/Frame.io URLs are stored as-provided strings.
- Row hash = sha256 of canonical JSON of the ordered {header: value} map.
- File hash = sha256 of raw .xlsx bytes.
- snapshot_at is passed in (repo-controlled), not derived from wall clock.
"""

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REPO = Path("/Volumes/madara/2026/Projects/thoughtseed/wtfmedia")
SNAPSHOT_AT = "2026-08-27"
OUT_ROOT = REPO / ".planning/inputs/podcast-catalog" / SNAPSHOT_AT

SOURCES = [
    {
        "label": "internal",
        "path": "/Users/sheshnarayaniyer/Downloads/Internal - PODCAST Links .xlsx",
        "role": "internal-catalogue-with-uncut-and-transcript-links",
        # Row 1 (0-indexed 0) is a section banner ("Episode Final Files",
        # "Subtitle Files", "Internal", "Hindi"); row 2 (0-indexed 1) is the
        # real column header row.
        "header_row_index_0based": 1,
        "data_starts_at_0based": 2,
        "sheet_slug": {
            "Podcasts by WTF": "podcasts-by-wtf",
            "People by WTF": "people-by-wtf",
            "WTF is Finance": "wtf-is-finance",
            "Special Episodes": "special-episodes",
            "WTF Online": "wtf-online",
        },
    },
    {
        "label": "transcripts",
        "path": "/Users/sheshnarayaniyer/Downloads/Podcast Transcripts (1).xlsx",
        "role": "leaner-catalogue-name-transcript-dates-clean-cut-frame",
        # No section banner in this file; row 1 (0-indexed 0) is already the
        # column header row ("Name of Episode", "Transcripts", ...).
        "header_row_index_0based": 0,
        "data_starts_at_0based": 1,
        "sheet_slug": {
            "WTF is Podcast": "wtf-is-podcast",
            "People by WTF": "people-by-wtf",
            "WTF is Finance": "wtf-is-finance",
            "Special Episode": "special-episode",
            "Online": "online",
        },
    },
]


def col_of(ref: str) -> int:
    m = re.match(r"([A-Z]+)", ref)
    s = m.group(1)
    n = 0
    for c in s:
        n = n * 26 + (ord(c) - 64)
    return n - 1


def load_shared_strings(bundle: Path) -> list[str]:
    p = bundle / "xl/sharedStrings.xml"
    if not p.exists():
        return []
    out = []
    for si in ET.parse(p).getroot():
        parts = [t.text for t in si.iter() if t.tag.endswith("}t") and t.text]
        out.append("".join(parts))
    return out


def cell_value(c, strings: list[str]) -> str:
    t = c.get("t", "")
    if t == "inlineStr":
        istr = c.find("s:is", NS)
        if istr is not None:
            return "".join(n.text or "" for n in istr.iter() if n.tag.endswith("}t"))
        return ""
    v = c.find("s:v", NS)
    if v is None or v.text is None:
        return ""
    if t == "s":
        try:
            return strings[int(v.text)]
        except (ValueError, IndexError):
            return v.text
    return v.text


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def canonical_row_hash(fields: dict) -> str:
    # Ordered by original column order via list-of-pairs input; the caller
    # passes an ordered dict so preserve that.
    payload = json.dumps(list(fields.items()), ensure_ascii=False, separators=(",", ":"))
    return "sha256:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def extract_sheet(sheet_xml: Path, strings: list[str],
                  header_row_index_0based: int, data_starts_at_0based: int):
    root = ET.parse(sheet_xml).getroot()
    sheetdata = root.find("s:sheetData", NS)
    rows = list(sheetdata) if sheetdata is not None else []

    if len(rows) <= header_row_index_0based:
        return {"headers": [], "records": []}

    def row_values(r):
        cells = {}
        maxcol = -1
        for c in r:
            ref = c.get("r", "A1")
            col = col_of(ref)
            cells[col] = cell_value(c, strings)
            if col > maxcol:
                maxcol = col
        return [cells.get(i, "") for i in range(maxcol + 1)]

    header_vals = row_values(rows[header_row_index_0based])
    # Trim trailing empty header cells so we don't invent columns.
    while header_vals and not header_vals[-1].strip():
        header_vals.pop()
    headers = [h.strip() for h in header_vals]

    records = []
    start_1based = data_starts_at_0based + 1
    for r_idx, r in enumerate(rows[data_starts_at_0based:], start=start_1based):
        vals = row_values(r)
        # Pad/truncate to header width
        vals = (vals + [""] * len(headers))[: len(headers)]
        # Skip blank rows: every visible field empty
        if not any(v.strip() for v in vals):
            continue
        # Preserve original headers verbatim as keys; ordered by column index
        fields = {}
        for h, v in zip(headers, vals):
            # For truly duplicate header names (rare), suffix with column index
            key = h if h and h not in fields else (h or f"col_{len(fields)}")
            if key in fields:
                key = f"{h}#{len(fields)}"
            fields[key] = v
        records.append(
            {
                "source_row": r_idx,
                "row_hash": canonical_row_hash(fields),
                "fields": fields,
            }
        )
    return {"headers": headers, "records": records}


def main() -> int:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    manifest = {
        "snapshot_at": SNAPSHOT_AT,
        "purpose": "Faithful versioned snapshot of WTF podcast catalogue sources. "
                   "No taxonomy reconciliation, no derived fields, no external fetches.",
        "authority": "External source files copied out of the repo owner's Downloads "
                     "directory. Repository is the snapshot store; the Google Sheet "
                     "arriving later becomes the live authority for the same shape.",
        "sources": [],
    }

    for src in SOURCES:
        src_path = Path(src["path"])
        if not src_path.exists():
            print(f"MISSING: {src_path}", file=sys.stderr)
            return 2

        src_hash = file_sha256(src_path)
        src_bytes = src_path.stat().st_size

        tmp = Path(tempfile.mkdtemp(prefix=f"xlsx-{src['label']}-"))
        subprocess.check_call(["unzip", "-q", "-o", str(src_path), "-d", str(tmp)])

        strings = load_shared_strings(tmp)
        wb_root = ET.parse(tmp / "xl/workbook.xml").getroot()
        sheets = wb_root.find("s:sheets", NS)

        source_entry = {
            "label": src["label"],
            "role": src["role"],
            "source_file_basename": src_path.name,
            "source_file_sha256": src_hash,
            "source_file_bytes": src_bytes,
            "sheets": [],
        }

        for i, sh in enumerate(sheets, start=1):
            sheet_name = sh.get("name")
            slug = src["sheet_slug"].get(sheet_name)
            if slug is None:
                print(f"UNKNOWN SHEET NAME (not in slug map): {sheet_name}", file=sys.stderr)
                return 3

            sheet_xml = tmp / f"xl/worksheets/sheet{i}.xml"
            data = extract_sheet(
                sheet_xml, strings,
                src["header_row_index_0based"],
                src["data_starts_at_0based"],
            )

            sheet_dir = OUT_ROOT / src["label"]
            sheet_dir.mkdir(parents=True, exist_ok=True)
            out_file = sheet_dir / f"{slug}.json"

            payload = {
                "meta": {
                    "snapshot_at": SNAPSHOT_AT,
                    "source_file_basename": src_path.name,
                    "source_file_sha256": src_hash,
                    "source_sheet_name": sheet_name,
                    "source_sheet_index": i,
                    "header_row_source_index": src["header_row_index_0based"] + 1,
                    "data_starts_at_source_index": src["data_starts_at_0based"] + 1,
                    "column_headers": data["headers"],
                    "record_count": len(data["records"]),
                },
                "records": data["records"],
            }

            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
                f.write("\n")

            # Sheet hash over the written payload (stable json).
            sheet_hash = "sha256:" + hashlib.sha256(
                json.dumps(payload, ensure_ascii=False, sort_keys=False,
                           separators=(",", ":")).encode("utf-8")
            ).hexdigest()

            source_entry["sheets"].append(
                {
                    "source_sheet_name": sheet_name,
                    "slug": slug,
                    "relative_path": str(out_file.relative_to(OUT_ROOT)),
                    "record_count": len(data["records"]),
                    "column_headers": data["headers"],
                    "snapshot_hash": sheet_hash,
                }
            )
            print(f"  wrote {out_file.relative_to(REPO)}  records={len(data['records'])}")

        manifest["sources"].append(source_entry)

    manifest_path = OUT_ROOT / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\nmanifest -> {manifest_path.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
