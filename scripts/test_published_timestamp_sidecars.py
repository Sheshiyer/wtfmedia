from __future__ import annotations

import importlib.util
import json
import math
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("published-timestamp-sidecars.py")


def load_module():
    if not MODULE_PATH.exists():
        raise AssertionError("published-timestamp-sidecars.py does not exist")
    spec = importlib.util.spec_from_file_location("published_timestamp_sidecars", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError("published timestamp sidecar module is not loadable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PublishedTimestampSidecarsTest(unittest.TestCase):
    def setUp(self):
        self.module = load_module()

    def test_validate_canonical_sidecar_normalizes_whitespace(self):
        actual = self.module.validate_sidecar([
            {"t": 0, "x": " First   cue "},
            {"t": 1.25, "x": "Second\ncue"},
            {"t": 2.5, "x": "Third cue"},
        ])

        self.assertEqual(actual, [
            {"t": 0.0, "x": "First cue"},
            {"t": 1.25, "x": "Second cue"},
            {"t": 2.5, "x": "Third cue"},
        ])

    def test_validate_source_native_sidecar_converts_to_canonical(self):
        actual = self.module.validate_sidecar([
            {"start": 3.52, "text": " First cue ", "duration": 1.2},
            {"start": 4.72, "text": "Second cue", "duration": 1.1},
            {"start": 5.82, "text": "Third cue", "duration": 1.0},
        ])

        self.assertEqual(actual, [
            {"t": 3.52, "x": "First cue"},
            {"t": 4.72, "x": "Second cue"},
            {"t": 5.82, "x": "Third cue"},
        ])

    def test_validate_sidecar_rejects_invalid_rows(self):
        invalid_values = {
            "empty": [],
            "textless": [{"t": 0, "x": ""}, {"t": 1, "x": "ok"}, {"t": 2, "x": "ok"}],
            "negative": [{"t": -1, "x": "bad"}, {"t": 1, "x": "ok"}, {"t": 2, "x": "ok"}],
            "nonfinite": [{"t": 0, "x": "ok"}, {"t": math.inf, "x": "bad"}, {"t": 2, "x": "ok"}],
            "nonmonotonic": [{"t": 0, "x": "ok"}, {"t": 2, "x": "ok"}, {"t": 1, "x": "bad"}],
            "too_short": [{"t": 0, "x": "one"}, {"t": 1, "x": "two"}],
        }

        for name, value in invalid_values.items():
            with self.subTest(name=name):
                with self.assertRaises(ValueError):
                    self.module.validate_sidecar(value)

    def test_validate_stored_sidecar_requires_canonical_shape(self):
        source_native = [
            {"start": 0.0, "text": "one"},
            {"start": 1.0, "text": "two"},
            {"start": 2.0, "text": "three"},
        ]

        with self.assertRaises(ValueError):
            self.module.validate_stored_sidecar(source_native)

    def test_validate_sidecar_rejects_sparse_same_video_text_coverage(self):
        cues = [
            {"t": 0.0, "x": "one"},
            {"t": 1.0, "x": "two"},
            {"t": 2.0, "x": "three"},
        ]

        with self.assertRaisesRegex(ValueError, "insufficient_text_coverage"):
            self.module.validate_stored_sidecar(
                cues,
                published_text="one two three four five six seven eight nine ten",
            )

    def test_track_selection_uses_full_generated_when_manual_is_sparse(self):
        published_text = "one two three four five six seven eight nine ten"
        sparse_manual = {
            "video_id": "FPV5fAkqyBs",
            "language_code": "en-IN",
            "is_generated": False,
            "cues": [
                {"start": 0.0, "text": "one"},
                {"start": 1.0, "text": "two"},
                {"start": 2.0, "text": "three"},
            ],
        }
        complete_generated = {
            "video_id": "FPV5fAkqyBs",
            "language_code": "en",
            "is_generated": True,
            "cues": [
                {"start": 0.0, "text": "one two three four"},
                {"start": 1.0, "text": "five six seven"},
                {"start": 2.0, "text": "eight nine ten"},
            ],
        }

        selected = self.module.select_source_native_track(
            [sparse_manual, complete_generated], published_text=published_text
        )

        self.assertEqual(selected["language_code"], "en")
        self.assertEqual(selected["is_generated"], True)
        self.assertGreaterEqual(selected["text_coverage_ratio"], 0.80)

    def test_track_selection_prefers_manual_only_when_coverage_valid(self):
        published_text = "one two three four five six seven eight nine ten"
        candidates = [
            {
                "video_id": "2_yA6GoqUnY",
                "language_code": "en-IN",
                "is_generated": False,
                "cues": [
                    {"start": 0.0, "text": "one two three four"},
                    {"start": 1.0, "text": "five six seven"},
                    {"start": 2.0, "text": "eight nine"},
                ],
            },
            {
                "video_id": "2_yA6GoqUnY",
                "language_code": "en",
                "is_generated": True,
                "cues": [
                    {"start": 0.0, "text": "one two three four"},
                    {"start": 1.0, "text": "five six seven"},
                    {"start": 2.0, "text": "eight nine ten"},
                ],
            },
        ]

        selected = self.module.select_source_native_track(
            candidates, published_text=published_text
        )

        self.assertEqual(selected["language_code"], "en-IN")
        self.assertEqual(selected["is_generated"], False)

    def test_parse_wrapped_source_json3_uses_only_timed_text_events(self):
        payload = {
            "events": [
                {"tStartMs": 0, "segs": [{"utf8": "one "}, {"utf8": "two"}]},
                {"tStartMs": 1000},
                {"tStartMs": 1500, "segs": [{"utf8": "three"}]},
                {"tStartMs": 2500, "segs": [{"utf8": "four five"}]},
            ]
        }
        wrapper = (
            "URL Source: https://www.youtube.com/api/timedtext?"
            "v=FPV5fAkqyBs&lang=en\n"
            "Markdown Content:\n"
            + json.dumps(payload)
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "capture.txt"
            source.write_text(wrapper)
            actual = self.module.parse_source_json3_capture(source, "FPV5fAkqyBs")

        self.assertEqual(actual["video_id"], "FPV5fAkqyBs")
        self.assertEqual(actual["language_code"], "en")
        self.assertEqual(actual["is_generated"], True)
        self.assertEqual(actual["cues"], [
            {"start": 0.0, "text": "one two"},
            {"start": 1.5, "text": "three"},
            {"start": 2.5, "text": "four five"},
        ])

    def test_parse_source_json3_rejects_unbound_or_unofficial_source_url(self):
        invalid_sources = {
            "different_video": (
                "https://www.youtube.com/api/timedtext?v=2_yA6GoqUnY&lang=en"
            ),
            "non_youtube_host": (
                "https://www.youtube.com.evil.example/api/timedtext?"
                "v=FPV5fAkqyBs&lang=en"
            ),
            "non_https": (
                "http://www.youtube.com/api/timedtext?v=FPV5fAkqyBs&lang=en"
            ),
            "missing_video_id": "https://www.youtube.com/api/timedtext?lang=en",
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            for name, source_url in invalid_sources.items():
                with self.subTest(name=name):
                    source = Path(temp_dir) / f"{name}.txt"
                    source.write_text(
                        f"URL Source: {source_url}\nMarkdown Content:\n{{not-json"
                    )
                    with self.assertRaisesRegex(
                        ValueError, "source_json3_provenance_invalid"
                    ):
                        self.module.parse_source_json3_capture(
                            source, "FPV5fAkqyBs"
                        )

    def test_fetch_rejects_unapproved_video_before_network(self):
        calls = []

        with tempfile.TemporaryDirectory() as temp_dir:
            with self.assertRaises(ValueError):
                self.module.fetch_and_write_sidecars(
                    ["RSB58m7Xwhg"],
                    Path(temp_dir),
                    fetch_track=lambda video_id, published_text, duration: calls.append(video_id),
                )

        self.assertEqual(calls, [])

    def test_fetch_batch_writes_nothing_when_one_track_is_unavailable(self):
        selected = ["2q7-cTPwf-g", "FPV5fAkqyBs"]

        def fetch_track(video_id, published_text, duration):
            if video_id == "FPV5fAkqyBs":
                raise RuntimeError("captions unavailable")
            return {
                "video_id": video_id,
                "language_code": "en",
                "is_generated": False,
                "cues": [
                    {"start": 0.0, "text": "one"},
                    {"start": 1.0, "text": "two"},
                    {"start": 2.0, "text": "three"},
                ],
            }

        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            with self.assertRaises(RuntimeError):
                self.module.fetch_and_write_sidecars(
                    selected,
                    output_dir,
                    fetch_track=fetch_track,
                    published_transcripts={video_id: "one two three" for video_id in selected},
                )
            self.assertEqual(list(output_dir.iterdir()), [])

    def test_fetch_writes_canonical_sidecars_and_returns_body_free_metadata(self):
        selected = ["2q7-cTPwf-g"]

        def fetch_track(video_id, published_text, duration):
            return {
                "video_id": video_id,
                "language_code": "en",
                "is_generated": True,
                "cues": [
                    {"start": 0.0, "text": "one", "duration": 1.0},
                    {"start": 1.0, "text": "two", "duration": 1.0},
                    {"start": 2.0, "text": "three", "duration": 1.0},
                ],
            }

        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            receipt = self.module.fetch_and_write_sidecars(
                selected,
                output_dir,
                fetch_track=fetch_track,
                published_transcripts={"2q7-cTPwf-g": "one two three"},
            )
            stored = json.loads((output_dir / "2q7-cTPwf-g.json").read_text())

        self.assertEqual(stored, [
            {"t": 0.0, "x": "one"},
            {"t": 1.0, "x": "two"},
            {"t": 2.0, "x": "three"},
        ])
        self.assertEqual(receipt[0]["video_id"], "2q7-cTPwf-g")
        self.assertEqual(receipt[0]["cue_count"], 3)
        self.assertEqual(receipt[0]["language_code"], "en")
        self.assertEqual(receipt[0]["is_generated"], True)
        self.assertEqual(receipt[0]["text_coverage_ratio"], 1.0)
        self.assertRegex(receipt[0]["sha256"], r"^[a-f0-9]{64}$")
        self.assertNotIn("cues", receipt[0])
        self.assertNotIn("text", receipt[0])


if __name__ == "__main__":
    unittest.main()
