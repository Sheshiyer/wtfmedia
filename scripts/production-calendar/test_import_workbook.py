"""Small deterministic checks; set WTF_CALENDAR_WORKBOOK for source integration."""

from __future__ import annotations

import datetime as dt
import os
import unittest
from pathlib import Path

from import_workbook import (
    EXPECTED_SHEETS,
    IP_NAMES,
    build_snapshot,
    date_iso,
    normalize_other_ip,
    stable_id,
)


class ImportWorkbookTests(unittest.TestCase):
    def test_stable_source_ids(self) -> None:
        self.assertEqual(stable_id("item", "Sheet", 3), stable_id("item", "Sheet", 3))
        self.assertNotEqual(stable_id("item", "Sheet", 3), stable_id("item", "Sheet", 4))

    def test_dates_are_not_guessed(self) -> None:
        self.assertEqual(date_iso(dt.datetime(2026, 8, 10)), "2026-08-10")
        self.assertIsNone(date_iso("August 10"))

    def test_ip_aliases_are_explicit(self) -> None:
        self.assertEqual(normalize_other_ip("Stitch'd"), "Stitched")
        self.assertEqual(normalize_other_ip("Animated IP"), "Animated IP")
        self.assertIsNone(normalize_other_ip("Social + YT"))
        self.assertEqual(len(IP_NAMES), 9)

    @unittest.skipUnless(os.getenv("WTF_CALENDAR_WORKBOOK"), "set WTF_CALENDAR_WORKBOOK for source integration")
    def test_supplied_workbook_snapshot(self) -> None:
        result = build_snapshot(Path(os.environ["WTF_CALENDAR_WORKBOOK"]))
        self.assertEqual([item["name"] for item in result["source_snapshot"]["sheets"]], list(EXPECTED_SHEETS))
        self.assertEqual(len(result["month_views"]), 12)
        self.assertTrue(all(len(month["cells"]) == 42 for month in result["month_views"]))
        self.assertGreater(result["counts"]["source_populated_cells"], 0)
        self.assertGreater(result["counts"]["candidate_events"], 0)
        self.assertTrue(any(issue["code"] == "shifted_dubbing_row" for issue in result["candidates"]["review"]))
        self.assertFalse(any(issue["source"].startswith(("Pod Pipeline 2026-27!", "Pipeline!")) for issue in result["candidates"]["review"]))
        items = result["candidates"]["items"]
        self.assertEqual(len([item for item in items if item["source_lane"] == "other_ips"]), 13)
        self.assertEqual(len([item for item in items if item["source_lane"] == "other_ips" and item.get("display_title_generated")]), 0)
        self.assertEqual(next(item for item in items if item["source"] == "Production Tracker Podcast!D3")["stage"], "published")
        self.assertEqual(next(item for item in items if item["source"] == "Production Tracker Podcast!D3")["stage_raw"], "Posted")
        self.assertEqual(next(item for item in items if item["source"] == "Production Tracker Podcast!D14")["stage"], "post-production")
        self.assertEqual(next(item for item in items if item["source"] == "Production Tracker Podcast!D3")["ip"], "WTF People")
        self.assertEqual(next(item for item in items if item["source"] == "Production Tracker Podcast!D14")["ip"], "WTF Is")
        self.assertEqual(next(item for item in items if item["source"] == "Production Tracker Podcast!D14")["shoot_location_raw"], "Mumbai, India")
        self.assertFalse(any(item["source"].startswith("Production Tracker Podcast!D17") for item in items))
        self.assertEqual(len(result["candidates"]["checks"]), 15)
        self.assertEqual(result["candidates"]["checks"][0]["dubbing"], "unchecked")
        self.assertEqual(next(check for check in result["candidates"]["checks"] if check["source_row"] == 4)["guest_agreement"], "checked")
        self.assertIn("didn't sign a contract", next(check for check in result["candidates"]["checks"] if check["source_row"] == 5)["agreement_note"])
        self.assertTrue(next(check for check in result["candidates"]["checks"] if check["source_row"] == 5)["guest_role"])
        self.assertFalse(any(check["source_row"] >= 17 for check in result["candidates"]["checks"]))
        self.assertFalse(any(issue["source"].startswith("Production Tracker Podcast!") and issue["code"] in ("guest_episode_association", "status_only_production_row") for issue in result["candidates"]["review"]))
        self.assertEqual(next(event for event in result["candidates"]["events"] if event["kind"] == "dub_schedule")["date_state"], "actual")
        dub_jobs = [job for job in result["candidates"]["dubbing"] if job["source"].startswith("Dubbing Tracker!")]
        self.assertEqual(len([job for job in dub_jobs if job["status"] == "pushed-out"]), 18)
        self.assertEqual(len([job for job in dub_jobs if job["status"] == "unknown"]), 39)
        self.assertEqual(len([job for job in dub_jobs if job["status"] == "unknown" and job["posted_flag_raw"] is True]), 11)
        self.assertEqual(next(item for item in items if item["source"] == "Dubbing Tracker!A37:H37")["ip"], "WTF Is")
        self.assertIsNone(next(item for item in items if item["source"] == "Dubbing Tracker!A3:H3")["ip"])
        original_dates = [event for event in result["candidates"]["events"] if event["kind"] == "original_video_date"]
        self.assertEqual(len(original_dates), 46)
        self.assertTrue(all(event["date_state"] == "unverified" for event in original_dates))
        self.assertEqual([entry["meaning"] for entry in result["source"]["source_legend"]], ["dubbed episode went live", "main episode went live", "main episode was shot"])


if __name__ == "__main__":
    unittest.main()
