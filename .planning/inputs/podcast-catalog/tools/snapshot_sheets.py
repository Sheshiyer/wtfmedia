#!/usr/bin/env python3
"""
Faithful, versioned JSON snapshot of the WTF podcast catalogue Excel sources.
Local-only. Reads source .xlsx files (unzipped as OpenXML), preserves original
column headers (including surrounding whitespace), computes per-file and
per-row SHA-256 hashes, redacts http(s) URLs before write, and writes one
JSON per sheet plus a top-level manifest.

Design rules:
- No taxonomy normalization. Column headers stay as-authored in the sheet.
- No fetches. Capability URLs are redacted to scheme+host plus sha256 of
  the original string so a public clone cannot replay Frame.io / Drive / Zset
  shares.
- Row hash = sha256 of canonical JSON of the ordered {header: value} map
  after redaction (the committed snapshot is self-consistent).
- File hash = sha256 of raw .xlsx bytes.
- snapshot_at is passed in (repo-controlled), not derived from wall clock.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
# tools/ -> podcast-catalog/ -> inputs/ -> .planning/ -> repo root
REPO = Path(__file__).resolve().parents[4]
SNAPSHOT_AT = "2026-08-27"
OUT_ROOT = REPO / ".planning/inputs/podcast-catalog" / SNAPSHOT_AT
URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)


def catalogue_xlsx_dir() -> Path:
    """Operator-local Excel sources. Override with WTF_CATALOGUE_XLSX_DIR."""
    override = os.environ.get("WTF_CATALOGUE_XLSX_DIR")
    if override:
        return Path(override).expanduser().resolve()
    return Path.home() / "Downloads"


SOURCES = [
    {
        "label": "internal",
        "filename": "Internal - PODCAST Links .xlsx",
        "role": "internal-catalogue-with-uncut-and-transcript-links",
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
        "filename": "Podcast Transcripts (1).xlsx",
        "role": "leaner-catalogue-name-transcript-dates-clean-cut-frame",
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
    payload = json.dumps(list(fields.items()), ensure_ascii=False, separators=(",", ":"))
    return "sha256:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def payload_hash(payload: dict) -> str:
    return "sha256:" + hashlib.sha256(
        json.dumps(
            payload, ensure_ascii=False, sort_keys=False, separators=(",", ":")
        ).encode("utf-8")
    ).hexdigest()


def redact_url(url: str) -> str:
    parsed = urlparse(url)
    fragment = parsed.fragment or ""
    if fragment.startswith("sha256:") and len(fragment) == len("sha256:") + 64:
        return url
    host = (parsed.hostname or "").lower() or "unknown"
    scheme = (parsed.scheme or "https").lower()
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
    return f"{scheme}://{host}/#sha256:{digest}"


def redact_cell(value: str) -> tuple[str, list[str]]:
    hosts: list[str] = []

    def repl(match: re.Match[str]) -> str:
        original = match.group(0)
        redacted = redact_url(original)
        parsed = urlparse(original)
        hosts.append((parsed.hostname or "unknown").lower())
        return redacted

    return URL_RE.sub(repl, value), hosts


def redact_records(records: list[dict]) -> tuple[list[dict], Counter]:
    hosts: Counter = Counter()
    out = []
    for rec in records:
        fields = {}
        for key, value in rec.get("fields", {}).items():
            if isinstance(value, str):
                redacted, found = redact_cell(value)
                hosts.update(found)
                fields[key] = redacted
            else:
                fields[key] = value
        out.append(
            {
                "source_row": rec["source_row"],
                "row_hash": canonical_row_hash(fields),
                "fields": fields,
            }
        )
    return out, hosts


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
    while header_vals and not header_vals[-1].strip():
        header_vals.pop()
    headers = header_vals

    records = []
    start_1based = data_starts_at_0based + 1
    for r_idx, r in enumerate(rows[data_starts_at_0based:], start=start_1based):
        vals = row_values(r)
        vals = (vals + [""] * len(headers))[: len(headers)]
        if not any(v.strip() for v in vals):
            continue
        fields = {}
        for h, v in zip(headers, vals):
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


def write_json(path: Path, payload: dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")


def redact_existing_snapshot(snapshot_dir: Path) -> int:
    manifest_path = snapshot_dir / "manifest.json"
    if not manifest_path.exists():
        print(f"MISSING: {manifest_path}", file=sys.stderr)
        return 2
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    hosts: Counter = Counter()

    for source in manifest.get("sources", []):
        for sheet in source.get("sheets", []):
            rel = sheet["relative_path"]
            path = snapshot_dir / rel
            payload = json.loads(path.read_text(encoding="utf-8"))
            records, sheet_hosts = redact_records(payload.get("records", []))
            hosts.update(sheet_hosts)
            payload["records"] = records
            payload.setdefault("meta", {})
            payload["meta"]["url_redaction"] = {
                "policy": "scheme-host-plus-sha256-of-original-url",
                "form": "{scheme}://{host}/#sha256:{hex}",
                "url_count": int(sum(sheet_hosts.values())),
            }
            write_json(path, payload)
            sheet["snapshot_hash"] = payload_hash(payload)
            print(f"  redacted {path.relative_to(REPO)}  urls={sum(sheet_hosts.values())}")

    manifest["url_redaction"] = {
        "policy": "scheme-host-plus-sha256-of-original-url",
        "form": "{scheme}://{host}/#sha256:{hex}",
        "url_count": int(sum(hosts.values())),
        "hosts": dict(sorted(hosts.items())),
    }
    write_json(manifest_path, manifest)
    print(f"\nmanifest -> {manifest_path.relative_to(REPO)}")
    print(f"redacted {sum(hosts.values())} urls across {len(hosts)} hosts")
    return 0


def extract_snapshot() -> int:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    hosts: Counter = Counter()

    manifest = {
        "snapshot_at": SNAPSHOT_AT,
        "purpose": "Faithful versioned snapshot of WTF podcast catalogue sources. "
                   "No taxonomy reconciliation, no derived fields, no external fetches. "
                   "http(s) URLs are redacted to scheme+host plus sha256 of the original.",
        "authority": "External source files copied out of the operator's local Excel "
                     "directory. Repository is the redacted snapshot store; the Google "
                     "Sheet arriving later becomes the live authority for the same shape.",
        "sources": [],
    }

    for src in SOURCES:
        src_path = catalogue_xlsx_dir() / src["filename"]
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
            records, sheet_hosts = redact_records(data["records"])
            hosts.update(sheet_hosts)

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
                    "record_count": len(records),
                    "url_redaction": {
                        "policy": "scheme-host-plus-sha256-of-original-url",
                        "form": "{scheme}://{host}/#sha256:{hex}",
                        "url_count": int(sum(sheet_hosts.values())),
                    },
                },
                "records": records,
            }
            write_json(out_file, payload)
            source_entry["sheets"].append(
                {
                    "source_sheet_name": sheet_name,
                    "slug": slug,
                    "relative_path": str(out_file.relative_to(OUT_ROOT)),
                    "record_count": len(records),
                    "column_headers": data["headers"],
                    "snapshot_hash": payload_hash(payload),
                }
            )
            print(f"  wrote {out_file.relative_to(REPO)}  records={len(records)}")

        manifest["sources"].append(source_entry)

    manifest["url_redaction"] = {
        "policy": "scheme-host-plus-sha256-of-original-url",
        "form": "{scheme}://{host}/#sha256:{hex}",
        "url_count": int(sum(hosts.values())),
        "hosts": dict(sorted(hosts.items())),
    }
    manifest_path = OUT_ROOT / "manifest.json"
    write_json(manifest_path, manifest)
    print(f"\nmanifest -> {manifest_path.relative_to(REPO)}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--redact-existing",
        action="store_true",
        help="Rewrite the committed snapshot JSON in place (no Excel read).",
    )
    args = parser.parse_args()
    if args.redact_existing:
        return redact_existing_snapshot(OUT_ROOT)
    return extract_snapshot()


if __name__ == "__main__":
    sys.exit(main())
