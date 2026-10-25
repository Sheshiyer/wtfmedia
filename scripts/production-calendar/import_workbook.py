#!/usr/bin/env python3
"""Read a WTF calendar workbook into a deterministic, reviewable JSON snapshot.

This program never changes the input workbook or a Cloudflare resource. The
caller chooses the output path, which must be kept private because it contains
guest and contact data copied from the workbook.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import posixpath
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from typing import Any
from zipfile import ZipFile

try:
    from openpyxl import load_workbook
except ImportError as exc:  # pragma: no cover - dependency advice, not business logic
    raise SystemExit("openpyxl is required; install scripts/production-calendar/requirements.txt") from exc


IP_NAMES = (
    "WTF Is",
    "WTF Finance",
    "WTF Online",
    "WTF People",
    "Stitched",
    "POV",
    "Animated IP",
    "BTS",
    "Ways Of The World",
)
SHEET_PRODUCTION = "Production Tracker Podcast"
SHEET_OTHER_IPS = "WTF & Nikhil Kamath IPs"
SHEET_DUBBING = "Dubbing Tracker"
SHEET_CALENDAR = "Calendar"
SHEET_PIPELINE = "Pod Pipeline 2026-27"
SHEET_PIPELINE_2 = "Pipeline"
EXPECTED_SHEETS = (
    SHEET_PIPELINE,
    SHEET_PRODUCTION,
    SHEET_OTHER_IPS,
    SHEET_CALENDAR,
    SHEET_DUBBING,
    SHEET_PIPELINE_2,
)
PERMISSION_MAP = {
    "approved": "approved",
    "asked for a sample": "sample_requested",
    "no response": "no_response",
    "rejected": "rejected",
    "yet to reach out": "not_contacted",
}
IP_ALIASES = {
    "bts": "BTS",
    "stitch'd": "Stitched",
    "stitched": "Stitched",
    "pov": "POV",
    "animated ip": "Animated IP",
    "animation ip": "Animated IP",
    "ways of the world": "Ways Of The World",
}
XML_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
XML_OFFICE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
XML_PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships"


def stable_id(kind: str, sheet: str, row: int, suffix: str = "") -> str:
    digest = hashlib.sha256(f"{kind}\0{sheet}\0{row}\0{suffix}".encode()).hexdigest()[:20]
    return f"pc_{kind}_{digest}"


def encoded(value: Any) -> Any:
    if isinstance(value, dt.datetime):
        return {"type": "datetime", "value": value.isoformat()}
    if isinstance(value, dt.date):
        return {"type": "date", "value": value.isoformat()}
    if isinstance(value, dt.time):
        return {"type": "time", "value": value.isoformat()}
    return value


def text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return str(value)


def date_iso(value: Any) -> str | None:
    if isinstance(value, dt.datetime):
        return value.date().isoformat()
    if isinstance(value, dt.date):
        return value.isoformat()
    return None


def color_value(color: Any) -> dict[str, Any] | None:
    if color is None or color.type is None:
        return None
    result = {"type": color.type}
    for key in ("rgb", "indexed", "theme", "tint", "auto"):
        try:
            value = getattr(color, key)
        except (AttributeError, TypeError):
            continue
        if isinstance(value, (str, int, float, bool)) and value is not None:
            result[key] = value
    return result


def fill_value(fill: Any) -> dict[str, Any] | None:
    if fill is None or fill.patternType is None:
        return None
    return {
        "pattern": fill.patternType,
        "foreground": color_value(fill.fgColor),
        "background": color_value(fill.bgColor),
    }


def raw_ooxml_cells(path: Path, sheet_names: list[str]) -> dict[str, dict[str, dict[str, Any]]]:
    """Retain OOXML serials and cached formula values alongside decoded cells."""
    result: dict[str, dict[str, dict[str, Any]]] = {}
    with ZipFile(path) as source:
        workbook = ET.fromstring(source.read("xl/workbook.xml"))
        relations = ET.fromstring(source.read("xl/_rels/workbook.xml.rels"))
        targets = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in relations.findall(f"{{{XML_PACKAGE_REL}}}Relationship")
        }
        for node in workbook.findall(f".//{{{XML_MAIN}}}sheet"):
            name = node.attrib["name"]
            if name not in sheet_names:
                continue
            target = targets[node.attrib[f"{{{XML_OFFICE_REL}}}id"]]
            member = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
            root = ET.fromstring(source.read(member))
            cells: dict[str, dict[str, Any]] = {}
            for cell in root.findall(f".//{{{XML_MAIN}}}sheetData/{{{XML_MAIN}}}row/{{{XML_MAIN}}}c"):
                coord = cell.attrib.get("r")
                if not coord:
                    continue
                value = cell.find(f"{{{XML_MAIN}}}v")
                formula = cell.find(f"{{{XML_MAIN}}}f")
                inline = cell.find(f"{{{XML_MAIN}}}is")
                cells[coord] = {
                    "type": cell.attrib.get("t"),
                    "value": value.text if value is not None else None,
                    "formula": formula.text if formula is not None else None,
                    "inline_text": "".join(inline.itertext()) if inline is not None else None,
                }
            result[name] = cells
    return result


def source_snapshot(path: Path, workbook: Any, cached: Any) -> dict[str, Any]:
    raw = raw_ooxml_cells(path, workbook.sheetnames)
    sheets = []
    cells = []
    for sheet in workbook.worksheets:
        cached_sheet = cached[sheet.title]
        nonempty = 0
        filled_blank = 0
        # Access instantiated cells rather than rectangular max_row/max_column:
        # this workbook styles thousands of otherwise empty trailing cells.
        for cell in sorted(sheet._cells.values(), key=lambda value: (value.row, value.column)):
            fill = fill_value(cell.fill)
            if cell.value is None and fill is None:
                continue
            if cell.value is None:
                filled_blank += 1
            else:
                nonempty += 1
            cells.append({
                "sheet": sheet.title,
                "cell": cell.coordinate,
                "value": encoded(cell.value),
                "cached_value": encoded(cached_sheet[cell.coordinate].value) if cell.data_type == "f" else None,
                "data_type": cell.data_type,
                "raw_ooxml": raw.get(sheet.title, {}).get(cell.coordinate),
                "number_format": cell.number_format,
                "style_id": cell.style_id,
                "fill": fill,
                "comment": cell.comment.text if cell.comment else None,
            })
        conditional = []
        for area in sheet.conditional_formatting:
            for rule in sheet.conditional_formatting[area]:
                conditional.append({
                    "range": str(area.sqref),
                    "type": rule.type,
                    "operator": rule.operator,
                    "formula": list(rule.formula or []),
                    "priority": rule.priority,
                    "fill": fill_value(rule.dxf.fill) if rule.dxf else None,
                })
        conditional.sort(key=lambda item: (item["range"], item["priority"] or 0, item["type"] or ""))
        sheets.append({
            "name": sheet.title,
            "max_row": sheet.max_row,
            "max_column": sheet.max_column,
            "populated_cell_count": nonempty,
            "filled_blank_cell_count": filled_blank,
            "merged_ranges": sorted(str(item) for item in sheet.merged_cells.ranges),
            "conditional_formatting": conditional,
            "data_validations": sorted([
                {"range": str(item.sqref), "type": item.type, "formula1": item.formula1, "formula2": item.formula2}
                for item in sheet.data_validations.dataValidation
            ], key=lambda item: item["range"]),
        })
    return {"sheets": sheets, "cells": cells}


def add_review(review: list[dict[str, str]], code: str, source: str, detail: str) -> None:
    review.append({"code": code, "source": source, "detail": detail})


def add_event(events: list[dict[str, Any]], sheet: str, row: int, field: str, item_id: str,
              kind: str, value: Any, review: list[dict[str, str]]) -> None:
    source = f"{sheet}!{field}{row}"
    day = date_iso(value)
    if day:
        events.append({
            "id": stable_id("event", sheet, row, field),
            "item_id": item_id,
            "kind": kind,
            "date": day,
            # Column B is reference history, not a planned calendar action.
            # Its original publication meaning has not been independently verified.
            "date_state": "unverified" if kind == "original_video_date" else
                          "actual" if day <= dt.date.today().isoformat() and kind in ("shoot", "main_post", "ip_post", "dub_schedule") else "planned",
            "source": source,
        })
    elif value is not None:
        add_review(review, "non_date_schedule_value", source, "Schedule cell contains text or an unrecognized value; no event date was invented.")


def normalize_other_ip(value: Any) -> str | None:
    label = text(value)
    return IP_ALIASES.get(label.casefold()) if label else None


def podcast_ip_from_title(title: str) -> str | None:
    lowered = title.casefold()
    if lowered.strip() == "payments ep":
        # Confirmed by the workbook owner on 2026-10-25.
        return "WTF Is"
    if "people by wtf" in lowered:
        return "WTF People"
    if "wtf is finance" in lowered:
        return "WTF Finance"
    if "wtf is " in lowered or "wtf are " in lowered:
        return "WTF Is"
    return None


def merged_status(sheet: Any, row: int) -> str | None:
    value = text(sheet[f"A{row}"].value)
    if value:
        return value
    for area in sheet.merged_cells.ranges:
        if area.min_col == area.max_col == 1 and area.min_row <= row <= area.max_row:
            return text(sheet.cell(area.min_row, 1).value)
    return None


def merged_column_anchor(sheet: Any, column: int, row: int) -> int:
    for area in sheet.merged_cells.ranges:
        if area.min_col <= column <= area.max_col and area.min_row <= row <= area.max_row:
            return area.min_row
    return row


def normalized_candidates(workbook: Any) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []
    guests: list[dict[str, Any]] = []
    permissions: list[dict[str, Any]] = []
    dubbing: list[dict[str, Any]] = []
    checks: list[dict[str, Any]] = []
    review: list[dict[str, str]] = []

    sheet = workbook[SHEET_PRODUCTION]
    current_item: str | None = None
    # Rows 17–19 are unnamed placeholders, not production records.
    for row in range(2, 17):
        status_text = merged_status(sheet, row)
        current_stage = {"posted": "published", "post production": "post-production"}.get(status_text.casefold()) if status_text else None
        title = text(sheet[f"D{row}"].value)
        guest_name = text(sheet[f"B{row}"].value)
        episode_anchor = merged_column_anchor(sheet, 4, row)
        continuation = episode_anchor < row and bool(text(sheet[f"D{episode_anchor}"].value))
        if title:
            current_item = stable_id("item", SHEET_PRODUCTION, row)
            items.append({
                "id": current_item,
                "source": f"{SHEET_PRODUCTION}!D{row}",
                "source_lane": "podcast_production",
                "title": title,
                "display_title": title,
                "ip": podcast_ip_from_title(title),
                "format": None,
                "stage_raw": status_text,
                "stage": current_stage,
                "episode_number": None,
                "shoot_location_raw": text(sheet[f"E{row}"].value),
            })
            if podcast_ip_from_title(title) is None:
                add_review(review, "podcast_ip_unclassified", f"{SHEET_PRODUCTION}!D{row}", "The title does not clearly identify one of the approved IPs.")
            add_event(events, SHEET_PRODUCTION, row, "F", current_item, "shoot", sheet[f"F{row}"].value, review)
            add_event(events, SHEET_PRODUCTION, row, "G", current_item, "main_post", sheet[f"G{row}"].value, review)
            dubbing.append({
                "id": stable_id("dubbing", SHEET_PRODUCTION, row),
                "item_id": current_item,
                "target_language": "Hindi",
                "status": "unknown",
                "dubbing_flag_raw": encoded(sheet[f"I{row}"].value),
                "hindi_live_flag_raw": encoded(sheet[f"J{row}"].value),
                "source": f"{SHEET_PRODUCTION}!I{row}:J{row}",
            })
        if current_item and any(isinstance(sheet[f"{column}{row}"].value, bool) for column in "HIJ"):
            agreement = sheet[f"H{row}"].value
            checks.append({
                "item_id": current_item,
                "source_row": row,
                "guest_name": guest_name,
                "guest_role": text(sheet[f"C{row}"].value),
                "guest_agreement": "checked" if agreement is True else "unchecked" if agreement is False else "not_box",
                # Preserve the exact note text beside a source checkbox, including
                # whitespace/newlines. The sheet's prose must not be reinterpreted.
                "agreement_note": agreement if isinstance(agreement, str) else None,
                "dubbing": "checked" if sheet[f"I{row}"].value is True else "unchecked" if sheet[f"I{row}"].value is False else "not_box",
                "hindi_live": "checked" if sheet[f"J{row}"].value is True else "unchecked" if sheet[f"J{row}"].value is False else "not_box",
            })
        if guest_name:
            if current_item is None:
                add_review(review, "unlinked_production_guest", f"{SHEET_PRODUCTION}!B{row}", "Guest row has no confident episode link.")
            else:
                guests.append({
                    "id": stable_id("guest", SHEET_PRODUCTION, row),
                    "item_id": current_item,
                    "name_raw": guest_name,
                    "source": f"{SHEET_PRODUCTION}!B{row}",
                    "agreement_raw": encoded(sheet[f"H{row}"].value),
                    "association": "same_row" if title else "merged_episode" if continuation else "adjacent_continuation_review",
                })
                if not title and not continuation:
                    add_review(review, "guest_episode_association", f"{SHEET_PRODUCTION}!B{row}", "Adjacent guest was tentatively linked to the preceding episode; confirm the grouping.")
        elif not title and not continuation and any(sheet[f"{column}{row}"].value is not None for column in ("A", "H", "I", "J")):
            add_review(review, "status_only_production_row", f"{SHEET_PRODUCTION}!A{row}:J{row}", "Status or agreement values have no identified episode/guest.")

    sheet = workbook[SHEET_OTHER_IPS]
    current_ip: str | None = None
    for row in range(2, 20):
        heading = text(sheet[f"A{row}"].value)
        if heading:
            current_ip = normalize_other_ip(heading)
            if current_ip is None:
                add_review(review, "unknown_ip_heading", f"{SHEET_OTHER_IPS}!A{row}", "Section heading needs mapping to the approved IP list.")
        episode_no = sheet[f"B{row}"].value
        title = text(sheet[f"C{row}"].value)
        release = sheet[f"D{row}"].value
        if episode_no is None and title is None and release is None:
            continue
        if title is None and release is None:
            # The numbered POV/Animated rows are still blank planning slots,
            # not named episodes. Preserve them in source_cells only.
            continue
        item_id = stable_id("item", SHEET_OTHER_IPS, row)
        display_title = title or f"Source row {row}"
        items.append({
            "id": item_id,
            "source": f"{SHEET_OTHER_IPS}!A{row}:F{row}",
            "source_lane": "other_ips",
            "title": title,
            "display_title": display_title,
            "display_title_generated": title is None,
            "ip": current_ip,
            "format": None,
            "episode_number": encoded(episode_no),
            "owner_raw": text(sheet[f"F{row}"].value),
            "link_raw": text(sheet[f"E{row}"].value),
        })
        if current_ip is None:
            add_review(review, "item_ip_unclassified", f"{SHEET_OTHER_IPS}!A{row}:F{row}", "Item could not be placed under a confirmed IP.")
        if title is None:
            add_review(review, "missing_source_title", f"{SHEET_OTHER_IPS}!C{row}", "Display label uses IP and episode number; original episode title is blank.")
        add_event(events, SHEET_OTHER_IPS, row, "D", item_id, "ip_post", release, review)

    sheet = workbook[SHEET_DUBBING]
    current_panel_item: str | None = None
    for row in range(3, 118):
        if row == 31:
            current_panel_item = None
            continue
        if row == 30:
            add_review(review, "shifted_dubbing_row", f"{SHEET_DUBBING}!A30:H30", "Date/contact fields appear shifted; do not create an operational candidate until reviewed.")
            continue
        title = text(sheet[f"A{row}"].value)
        guest_name = text(sheet[f"D{row}"].value)
        section = "solo" if row < 31 else "panel"
        if section == "solo":
            if not guest_name and not title:
                continue
            item_id = stable_id("item", SHEET_DUBBING, row)
            items.append({
                "id": item_id,
                "source": f"{SHEET_DUBBING}!A{row}:H{row}",
                "source_lane": "dubbing_solo",
                "title": title,
                "display_title": title or guest_name or f"Source row {row}",
                "display_title_generated": title is None,
                "ip": podcast_ip_from_title(title) if title else None,
                "format": "one_to_one",
                "episode_number": None,
                "linkage_state": "needs_episode_match",
            })
        else:
            if title:
                current_panel_item = stable_id("item", SHEET_DUBBING, row)
                items.append({
                    "id": current_panel_item,
                    "source": f"{SHEET_DUBBING}!A{row}:H{row}",
                    "source_lane": "dubbing_panel",
                    "title": title,
                    "display_title": title,
                    "ip": podcast_ip_from_title(title),
                    "format": "panel",
                    "episode_number": None,
                    "linkage_state": "needs_episode_match",
                })
            if current_panel_item is None:
                if guest_name:
                    add_review(review, "unlinked_panel_guest", f"{SHEET_DUBBING}!D{row}", "No preceding panel title in this section.")
                continue
            item_id = current_panel_item
        if guest_name:
            if "@" in guest_name:
                add_review(review, "guest_field_contains_contact", f"{SHEET_DUBBING}!D{row}", "Guest field contains an email/contact value; preserve the raw cell and confirm the display name.")
            guest_id = stable_id("guest", SHEET_DUBBING, row)
            guests.append({
                "id": guest_id,
                "item_id": item_id,
                "name_raw": guest_name,
                "source": f"{SHEET_DUBBING}!D{row}",
                "association": section,
            })
            raw_permission = text(sheet[f"F{row}"].value)
            status = PERMISSION_MAP.get(raw_permission.casefold()) if raw_permission else "unknown"
            permissions.append({
                "id": stable_id("permission", SHEET_DUBBING, row),
                "item_id": item_id,
                "guest_id": guest_id,
                "status": status or "unrecognized",
                "status_raw": raw_permission,
                "source": f"{SHEET_DUBBING}!F{row}",
            })
            if status is None:
                add_review(review, "unknown_permission_status", f"{SHEET_DUBBING}!F{row}", "Permission wording has no approved status mapping.")
        elif any(sheet[f"{col}{row}"].value is not None for col in ("F", "G", "H")):
            add_review(review, "permission_without_guest", f"{SHEET_DUBBING}!D{row}:H{row}", "Permission or posting flag is present without a guest name.")
        if title or section == "solo":
            has_dub_go_live = date_iso(sheet[f"C{row}"].value) is not None
            dubbing.append({
                "id": stable_id("dubbing", SHEET_DUBBING, row),
                "item_id": item_id,
                "target_language": "Hindi",
                "status": "pushed-out" if has_dub_go_live else "unknown",
                "posted_flag_raw": encoded(sheet[f"G{row}"].value),
                "source": f"{SHEET_DUBBING}!B{row}:H{row}",
            })
            add_event(events, SHEET_DUBBING, row, "B", item_id, "original_video_date", sheet[f"B{row}"].value, review)
            add_event(events, SHEET_DUBBING, row, "C", item_id, "dub_schedule", sheet[f"C{row}"].value, review)
        elif sheet[f"G{row}"].value is not None:
            add_review(review, "panel_posted_flag_followup", f"{SHEET_DUBBING}!G{row}", "Additional panel guest has a posted flag; confirm whether this is episode-level.")

    # The two prospect Pipeline sheets belong to a separate future page. Their
    # raw cells remain in the private snapshot, but they create neither
    # production items nor review work in this calendar.

    return {
        "items": items,
        "events": events,
        "guests": guests,
        "permissions": permissions,
        "dubbing": dubbing,
        "checks": checks,
        "review": review,
    }


def month_views(workbook: Any, candidates: dict[str, Any]) -> list[dict[str, Any]]:
    """Reconstruct the 12 selectable formula months plus cross-IP events."""
    marks: dict[str, list[dict[str, Any]]] = defaultdict(list)
    production = workbook[SHEET_PRODUCTION]
    dubbing = workbook[SHEET_DUBBING]
    for row in range(3, 1001):
        guest = text(production[f"B{row}"].value) or ""
        for column, label, kind in (("F", "🎥", "shoot"), ("G", "📤", "main_post")):
            day = date_iso(production[f"{column}{row}"].value)
            if day:
                marks[day].append({"text": f"{label} {guest}".rstrip(), "kind": kind, "source": f"{SHEET_PRODUCTION}!{column}{row}"})
        guest = text(dubbing[f"D{row}"].value) or ""
        day = date_iso(dubbing[f"C{row}"].value)
        if day:
            marks[day].append({"text": f"🎙️ {guest}".rstrip(), "kind": "dub_schedule", "source": f"{SHEET_DUBBING}!C{row}"})
    extra_events: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in candidates["events"]:
        if event["source"].startswith(SHEET_OTHER_IPS):
            extra_events[event["date"]].append({"kind": event["kind"], "source": event["source"], "item_id": event["item_id"]})

    months = []
    for offset in range(12):
        year = 2026 + (3 + offset) // 12
        month = (3 + offset) % 12 + 1
        first = dt.date(year, month, 1)
        start = first - dt.timedelta(days=first.weekday())
        cells = []
        for index in range(42):
            day = start + dt.timedelta(days=index)
            iso = day.isoformat()
            cells.append({
                "date": iso,
                "in_month": day.month == month and day.year == year,
                "source_calendar_marks": marks.get(iso, []),
                "additional_ip_events": extra_events.get(iso, []),
            })
        months.append({"month": f"{year:04d}-{month:02d}", "cells": cells})
    return months


def build_snapshot(path: Path) -> dict[str, Any]:
    source_bytes = path.read_bytes()
    formula_book = load_workbook(path, data_only=False)
    cached_book = load_workbook(path, data_only=True)
    if tuple(formula_book.sheetnames) != EXPECTED_SHEETS:
        raise ValueError("Unexpected worksheet names or order; review this workbook version before importing")
    source = source_snapshot(path, formula_book, cached_book)
    candidates = normalized_candidates(cached_book)
    months = month_views(cached_book, candidates)
    return {
        "schema_version": 1,
        "source": {
            "filename": path.name,
            "sha256": hashlib.sha256(source_bytes).hexdigest(),
            "size_bytes": len(source_bytes),
            "calendar_selector": "Calendar!B1",
            "selectable_months": [entry["month"] for entry in months],
            "source_legend": [
                {"marker": "blue mic", "meaning": "dubbed episode went live", "source": "Calendar!D13:E13"},
                {"marker": "green inbox", "meaning": "main episode went live", "source": "Calendar!D14:E14"},
                {"marker": "yellow camera", "meaning": "main episode was shot", "source": "Calendar!D15:E15"},
            ],
        },
        "ip_names": list(IP_NAMES),
        "source_snapshot": source,
        "candidates": candidates,
        "month_views": months,
        "counts": {
            "source_cells": len(source["cells"]),
            "source_populated_cells": sum(sheet["populated_cell_count"] for sheet in source["sheets"]),
            "candidate_items": len(candidates["items"]),
            "candidate_events": len(candidates["events"]),
            "candidate_guests": len(candidates["guests"]),
            "candidate_permissions": len(candidates["permissions"]),
            "candidate_dubbing_jobs": len(candidates["dubbing"]),
            "source_check_rows": len(candidates["checks"]),
            "review_issues": len(candidates["review"]),
            "source_formula_marks": sum(len(cell["source_calendar_marks"]) for month in months for cell in month["cells"] if cell["in_month"]),
            "additional_ip_marks": sum(len(cell["additional_ip_events"]) for month in months for cell in month["cells"] if cell["in_month"]),
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path, help="source .xlsx file (read-only)")
    parser.add_argument("--output", type=Path, required=True, help="private JSON destination; do not commit")
    parser.add_argument("--summary", action="store_true", help="print counts only, never raw workbook values")
    args = parser.parse_args(argv)
    if not args.workbook.is_file():
        parser.error("workbook file not found")
    if args.output.resolve() == args.workbook.resolve():
        parser.error("output cannot overwrite the source workbook")
    snapshot = build_snapshot(args.workbook)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":")), encoding="utf-8")
    if args.summary:
        print(json.dumps({"sha256": snapshot["source"]["sha256"], "counts": snapshot["counts"], "months": snapshot["source"]["selectable_months"]}, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
