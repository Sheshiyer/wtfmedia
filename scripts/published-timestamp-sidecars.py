#!/usr/bin/env python3
"""Fetch and validate the fixed published-timestamp recovery set.

Only source-native YouTube caption cues are accepted.  This utility never
translates captions and never reads the uncut corpus.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Callable, Iterable
from urllib.parse import parse_qs, urlsplit


RECOVERY_VIDEO_IDS = (
    "2q7-cTPwf-g",
    "FPV5fAkqyBs",
    "VIlfHB7Jk2s",
    "0JDsFpU6pGQ",
    "2_yA6GoqUnY",
    "fEUoJSTYtyc",
    "LqSEfz4YUFA",
    "lRjprPQHuXw",
    "wHQiewz8k9g",
    "g0CjWbgsdTQ",
    "AdI_XWv-ZTk",
    "WMRO9dvD5T0",
    "LcWoP6KtZKw",
)
RECOVERY_VIDEO_ID_SET = frozenset(RECOVERY_VIDEO_IDS)
PREFERRED_LANGUAGE_CODES = ("en", "en-IN", "en-US", "en-GB", "hi")
MINIMUM_CUE_COUNT = 3
MINIMUM_TEXT_COVERAGE = 0.80


class InsufficientTextCoverage(ValueError):
    def __init__(self, ratio: float) -> None:
        self.ratio = ratio
        super().__init__(f"insufficient_text_coverage:{ratio:.6f}")


def _normalized_text(value: Any) -> str:
    if not isinstance(value, str):
        raise ValueError("cue_text_must_be_string")
    text = re.sub(r"\s+", " ", value).strip()
    if not text:
        raise ValueError("cue_text_must_not_be_empty")
    return text


def _normalized_block(value: Any) -> str:
    if not isinstance(value, str):
        raise ValueError("published_transcript_must_be_string")
    text = re.sub(r"\s+", " ", value).strip()
    if not text:
        raise ValueError("published_transcript_must_not_be_empty")
    return text


def text_coverage_ratio(canonical: list[dict[str, Any]], published_text: str) -> float:
    published = _normalized_block(published_text)
    sidecar = " ".join(cue["x"] for cue in canonical)
    return len(sidecar) / len(published)


def _finite_timestamp(value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("cue_timestamp_must_be_numeric")
    timestamp = float(value)
    if not math.isfinite(timestamp):
        raise ValueError("cue_timestamp_must_be_finite")
    if timestamp < 0:
        raise ValueError("cue_timestamp_must_not_be_negative")
    return timestamp


def validate_sidecar(
    value: Any,
    duration: float | int | None = None,
    published_text: str | None = None,
) -> list[dict[str, Any]]:
    """Return canonical ``[{t, x}]`` cues or raise ``ValueError``.

    This conversion boundary accepts either the canonical persisted shape or
    source-native YouTube cue dictionaries (``start``/``text``).  Persisted
    assets must instead pass :func:`validate_stored_sidecar`.
    """

    if not isinstance(value, list) or len(value) < MINIMUM_CUE_COUNT:
        raise ValueError("sidecar_requires_at_least_three_cues")

    episode_duration = None
    if duration is not None:
        episode_duration = _finite_timestamp(duration)

    canonical: list[dict[str, Any]] = []
    previous = -1.0
    for index, cue in enumerate(value):
        if not isinstance(cue, dict):
            raise ValueError(f"cue_{index}_must_be_an_object")
        if "t" in cue and "x" in cue:
            timestamp_value, text_value = cue["t"], cue["x"]
        elif "start" in cue and "text" in cue:
            timestamp_value, text_value = cue["start"], cue["text"]
        else:
            raise ValueError(f"cue_{index}_invalid_schema")

        timestamp = _finite_timestamp(timestamp_value)
        if timestamp < previous:
            raise ValueError(f"cue_{index}_timestamp_not_monotonic")
        if episode_duration is not None and timestamp > episode_duration:
            raise ValueError(f"cue_{index}_timestamp_exceeds_episode_duration")
        canonical.append({"t": timestamp, "x": _normalized_text(text_value)})
        previous = timestamp

    if published_text is not None:
        coverage = text_coverage_ratio(canonical, published_text)
        if coverage < MINIMUM_TEXT_COVERAGE:
            raise InsufficientTextCoverage(coverage)
    return canonical


def validate_stored_sidecar(
    value: Any,
    duration: float | int | None = None,
    published_text: str | None = None,
) -> list[dict[str, Any]]:
    """Validate that an on-disk sidecar is already in the canonical shape."""

    if not isinstance(value, list):
        raise ValueError("sidecar_must_be_an_array")
    for index, cue in enumerate(value):
        if not isinstance(cue, dict) or set(cue) != {"t", "x"}:
            raise ValueError(f"cue_{index}_invalid_schema")
    return validate_sidecar(value, duration=duration, published_text=published_text)


def _encoded_sidecar(value: list[dict[str, Any]]) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")


def _atomic_write(path: Path, body: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        dir=path.parent, prefix=f".{path.name}.", suffix=".tmp"
    )
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(body)
            handle.flush()
            os.fsync(handle.fileno())
        Path(temporary_name).replace(path)
    except BaseException:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


def _track_priority(track: Any) -> tuple[int, int]:
    language_code = (
        track.get("language_code") if isinstance(track, dict) else track.language_code
    )
    is_generated = (
        track.get("is_generated") if isinstance(track, dict) else track.is_generated
    )
    try:
        language_rank = PREFERRED_LANGUAGE_CODES.index(language_code)
    except ValueError:
        language_rank = len(PREFERRED_LANGUAGE_CODES)
    return (1 if bool(is_generated) else 0, language_rank)


def select_source_native_track(
    candidates: Iterable[dict[str, Any]],
    *,
    published_text: str,
    duration: float | int | None = None,
) -> dict[str, Any]:
    """Choose a coverage-valid direct track, preferring valid manual tracks."""

    valid: list[dict[str, Any]] = []
    coverage_failures: list[float] = []
    candidate_video_id = "unknown"
    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        candidate_video_id = str(candidate.get("video_id", candidate_video_id))
        try:
            canonical = validate_sidecar(
                candidate.get("cues"),
                duration=duration,
                published_text=published_text,
            )
        except InsufficientTextCoverage as error:
            coverage_failures.append(error.ratio)
            continue
        except ValueError:
            continue
        valid.append(
            {
                **candidate,
                "cues": canonical,
                "text_coverage_ratio": text_coverage_ratio(canonical, published_text),
            }
        )

    if not valid:
        best = max(coverage_failures, default=0.0)
        raise RuntimeError(
            f"source_native_caption_coverage_unavailable:{candidate_video_id}:"
            f"best_ratio={best:.6f}"
        )
    return min(valid, key=_track_priority)


def fetch_source_native_track(
    video_id: str,
    published_text: str,
    duration: float | int | None = None,
) -> dict[str, Any]:
    """Inspect direct YouTube tracks and choose one preserving published text."""

    from youtube_transcript_api import YouTubeTranscriptApi

    tracks = list(YouTubeTranscriptApi().list(video_id))
    eligible = [track for track in tracks if track.language_code in PREFERRED_LANGUAGE_CODES]
    if not eligible:
        available = sorted({str(track.language_code) for track in tracks})
        raise RuntimeError(
            f"source_native_caption_unavailable:{video_id}:languages={','.join(available)}"
        )

    candidates: list[dict[str, Any]] = []
    fetch_failures: list[str] = []
    for track in eligible:
        try:
            fetched = track.fetch()
        except Exception as error:  # youtube-transcript-api exposes several transport errors
            fetch_failures.append(
                f"{track.language_code}:{'generated' if track.is_generated else 'manual'}:"
                f"{type(error).__name__}"
            )
            continue
        candidates.append(
            {
                "video_id": video_id,
                "language_code": track.language_code,
                "is_generated": bool(track.is_generated),
                "cues": [
                    {
                        "start": snippet.start,
                        "text": snippet.text,
                        "duration": snippet.duration,
                    }
                    for snippet in fetched
                ],
            }
        )
    if not candidates:
        raise RuntimeError(
            f"source_native_caption_fetch_failed:{video_id}:"
            f"{','.join(fetch_failures) or 'no_fetchable_track'}"
        )
    try:
        return select_source_native_track(
            candidates,
            published_text=published_text,
            duration=duration,
        )
    except RuntimeError as error:
        suffix = f":fetch_failures={','.join(fetch_failures)}" if fetch_failures else ""
        raise RuntimeError(f"{error}{suffix}") from error


def parse_source_json3_capture(path: Path, video_id: str) -> dict[str, Any]:
    """Parse a wrapped official YouTube JSON3 timed-text response."""

    wrapper = Path(path).read_text(encoding="utf-8")
    marker = wrapper.find("Markdown Content:")
    if marker < 0:
        raise ValueError(f"source_json3_provenance_invalid:{video_id}")
    source_matches = re.findall(
        r"^URL Source:\s*(\S+)\s*$", wrapper[:marker], flags=re.MULTILINE
    )
    if len(source_matches) != 1:
        raise ValueError(f"source_json3_provenance_invalid:{video_id}")
    try:
        source_url = urlsplit(source_matches[0])
        query = parse_qs(source_url.query, keep_blank_values=True)
        source_is_valid = (
            source_url.scheme == "https"
            and source_url.hostname == "www.youtube.com"
            and source_url.port in (None, 443)
            and source_url.username is None
            and source_url.password is None
            and source_url.path == "/api/timedtext"
            and not source_url.fragment
            and query.get("v") == [video_id]
        )
    except ValueError:
        source_is_valid = False
    if not source_is_valid:
        raise ValueError(f"source_json3_provenance_invalid:{video_id}")
    payload_start = wrapper.find("{", marker)
    if payload_start < 0:
        raise ValueError(f"source_json3_payload_missing:{video_id}")
    payload = json.loads(wrapper[payload_start:])
    events = payload.get("events") if isinstance(payload, dict) else None
    if not isinstance(events, list):
        raise ValueError(f"source_json3_events_missing:{video_id}")

    cues: list[dict[str, Any]] = []
    for event in events:
        if not isinstance(event, dict):
            continue
        start_ms = event.get("tStartMs")
        segments = event.get("segs")
        if (
            isinstance(start_ms, bool)
            or not isinstance(start_ms, (int, float))
            or not isinstance(segments, list)
        ):
            continue
        text = "".join(
            segment.get("utf8", "")
            for segment in segments
            if isinstance(segment, dict) and isinstance(segment.get("utf8", ""), str)
        )
        normalized = re.sub(r"\s+", " ", text).strip()
        if normalized:
            cues.append({"start": float(start_ms) / 1000.0, "text": normalized})
    return {
        "video_id": video_id,
        "language_code": "en",
        "is_generated": True,
        "cues": cues,
    }


def _validate_requested_ids(video_ids: Iterable[str]) -> list[str]:
    selected = list(video_ids)
    if not selected:
        raise ValueError("at_least_one_video_id_is_required")
    if len(set(selected)) != len(selected):
        raise ValueError("duplicate_video_id")
    rejected = [video_id for video_id in selected if video_id not in RECOVERY_VIDEO_ID_SET]
    if rejected:
        raise ValueError(f"video_id_not_approved:{','.join(rejected)}")
    return selected


def fetch_and_write_sidecars(
    video_ids: Iterable[str],
    output_dir: Path,
    *,
    fetch_track: Callable[[str, str, float | int | None], dict[str, Any]] = fetch_source_native_track,
    durations: dict[str, float | int] | None = None,
    published_transcripts: dict[str, str] | None = None,
) -> list[dict[str, Any]]:
    """Fetch and validate the complete batch before atomically replacing files."""

    selected = _validate_requested_ids(video_ids)
    prepared: list[tuple[str, bytes, dict[str, Any]]] = []

    # No destination is touched until every requested source-native track has
    # fetched and validated successfully.
    for video_id in selected:
        if published_transcripts is None:
            published_text = (Path(output_dir) / f"{video_id}.txt").read_text(encoding="utf-8")
        else:
            if video_id not in published_transcripts:
                raise ValueError(f"published_transcript_missing:{video_id}")
            published_text = published_transcripts[video_id]
        duration = durations.get(video_id) if durations is not None else None
        result = fetch_track(video_id, published_text, duration)
        if not isinstance(result, dict) or result.get("video_id") != video_id:
            raise ValueError(f"caption_result_video_id_mismatch:{video_id}")
        canonical = validate_sidecar(
            result.get("cues"),
            duration=duration,
            published_text=published_text,
        )
        coverage = text_coverage_ratio(canonical, published_text)
        body = _encoded_sidecar(canonical)
        prepared.append(
            (
                video_id,
                body,
                {
                    "video_id": video_id,
                    "language_code": str(result.get("language_code", "")),
                    "is_generated": bool(result.get("is_generated")),
                    "cue_count": len(canonical),
                    "first_timestamp_sec": canonical[0]["t"],
                    "last_timestamp_sec": canonical[-1]["t"],
                    "text_coverage_ratio": round(coverage, 6),
                    "bytes": len(body),
                    "sha256": hashlib.sha256(body).hexdigest(),
                },
            )
        )

    output = Path(output_dir)
    for video_id, body, _metadata in prepared:
        _atomic_write(output / f"{video_id}.json", body)
    return [metadata for _video_id, _body, metadata in prepared]


def _load_catalogue(path: Path) -> tuple[list[dict[str, Any]], dict[str, float | int]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = payload.get("entries") if isinstance(payload, dict) else None
    if not isinstance(entries, list):
        raise ValueError("episodes_entries_missing")
    durations = {
        entry["video_id"]: entry["duration"]
        for entry in entries
        if isinstance(entry, dict)
        and isinstance(entry.get("video_id"), str)
        and isinstance(entry.get("duration"), (int, float))
        and not isinstance(entry.get("duration"), bool)
    }
    return entries, durations


def check_sidecars(
    entries: list[dict[str, Any]], transcript_dir: Path, selected_ids: Iterable[str] | None = None
) -> dict[str, Any]:
    selected = set(selected_ids) if selected_ids is not None else None
    results: list[dict[str, Any]] = []
    valid_count = 0
    for episode in entries:
        video_id = episode.get("video_id")
        if not isinstance(video_id, str) or (selected is not None and video_id not in selected):
            continue
        path = transcript_dir / f"{video_id}.json"
        if not path.exists():
            results.append({"video_id": video_id, "available": False, "reason": "missing"})
            continue
        try:
            body = path.read_bytes()
            published_text = (transcript_dir / f"{video_id}.txt").read_text(encoding="utf-8")
            canonical = validate_stored_sidecar(
                json.loads(body),
                duration=episode.get("duration"),
                published_text=published_text,
            )
        except InsufficientTextCoverage as error:
            results.append(
                {
                    "video_id": video_id,
                    "available": False,
                    "reason": "insufficient_text_coverage",
                    "text_coverage_ratio": round(error.ratio, 6),
                }
            )
            continue
        except (OSError, json.JSONDecodeError, ValueError) as error:
            results.append(
                {
                    "video_id": video_id,
                    "available": False,
                    "reason": "invalid_sidecar",
                    "detail": str(error),
                }
            )
            continue
        valid_count += 1
        results.append(
            {
                "video_id": video_id,
                "available": True,
                "cue_count": len(canonical),
                "first_timestamp_sec": canonical[0]["t"],
                "last_timestamp_sec": canonical[-1]["t"],
                "text_coverage_ratio": round(
                    text_coverage_ratio(canonical, published_text), 6
                ),
                "bytes": len(body),
                "sha256": hashlib.sha256(body).hexdigest(),
            }
        )
    return {
        "checked": len(results),
        "valid": valid_count,
        "invalid_or_missing": len(results) - valid_count,
        "entries": results,
    }


def _arguments() -> argparse.Namespace:
    repository_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    operation = parser.add_mutually_exclusive_group(required=True)
    operation.add_argument("--check", action="store_true", help="validate local assets only")
    operation.add_argument("--fetch", action="store_true", help="fetch source-native YouTube cues")
    parser.add_argument("--video-id", action="append", default=[])
    parser.add_argument(
        "--source-json3",
        action="append",
        default=[],
        metavar="VIDEO_ID=PATH",
        help="use an already captured official YouTube JSON3 response",
    )
    parser.add_argument(
        "--episodes",
        type=Path,
        default=repository_root / "web/src/data/episodes.json",
    )
    parser.add_argument(
        "--transcripts-dir",
        type=Path,
        default=repository_root / "web/public/transcripts",
    )
    return parser.parse_args()


def main() -> int:
    arguments = _arguments()
    entries, durations = _load_catalogue(arguments.episodes)
    known_ids = {entry.get("video_id") for entry in entries}

    if arguments.fetch:
        selected = _validate_requested_ids(arguments.video_id)
        missing_from_catalogue = [video_id for video_id in selected if video_id not in known_ids]
        if missing_from_catalogue:
            raise ValueError(f"video_id_not_in_catalogue:{','.join(missing_from_catalogue)}")
        capture_paths: dict[str, Path] = {}
        for declaration in arguments.source_json3:
            if "=" not in declaration:
                raise ValueError("source_json3_requires_video_id_equals_path")
            video_id, raw_path = declaration.split("=", 1)
            if video_id in capture_paths:
                raise ValueError(f"duplicate_source_json3:{video_id}")
            capture_paths[video_id] = Path(raw_path)
        if capture_paths and set(capture_paths) != set(selected):
            raise ValueError("source_json3_ids_must_exactly_match_selected_video_ids")

        def captured_track(
            video_id: str, published_text: str, duration: float | int | None
        ) -> dict[str, Any]:
            candidate = parse_source_json3_capture(capture_paths[video_id], video_id)
            return select_source_native_track(
                [candidate],
                published_text=published_text,
                duration=duration,
            )

        receipt = fetch_and_write_sidecars(
            selected,
            arguments.transcripts_dir,
            durations=durations,
            fetch_track=captured_track if capture_paths else fetch_source_native_track,
        )
        print(json.dumps({"operation": "fetch", "entries": receipt}, separators=(",", ":")))
        return 0

    if arguments.source_json3:
        raise ValueError("source_json3_requires_fetch")
    selected_ids = arguments.video_id or None
    if selected_ids is not None:
        if len(set(selected_ids)) != len(selected_ids):
            raise ValueError("duplicate_video_id")
        unknown = [video_id for video_id in selected_ids if video_id not in known_ids]
        if unknown:
            raise ValueError(f"video_id_not_in_catalogue:{','.join(unknown)}")
    receipt = check_sidecars(entries, arguments.transcripts_dir, selected_ids)
    print(json.dumps({"operation": "check", **receipt}, separators=(",", ":")))
    return 0 if receipt["invalid_or_missing"] == 0 else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as error:
        print(json.dumps({"error": str(error)}, separators=(",", ":")))
        raise SystemExit(1)
