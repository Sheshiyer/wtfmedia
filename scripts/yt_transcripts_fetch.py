#!/usr/bin/env python3
"""Fetch transcripts for every episode in an episodes.json file.

Strategy per video:
  1. Try youtube_transcript_api (fast, no download)
  2. Fall back to `yt-dlp --write-auto-subs --skip-download` and parse the .vtt
  3. Record source="none" on total failure

Outputs:
    transcripts/<video_id>.txt          plain text, paragraph per cue
    transcripts/_index.json             status row per video
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Optional

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    _HAVE_API = True
    _API_CLIENT = YouTubeTranscriptApi()
except Exception:
    _HAVE_API = False
    _API_CLIENT = None


LANGS = ["en", "en-IN", "en-US", "en-GB", "hi"]


def fetch_via_api(video_id: str) -> Optional[tuple[str, str, str]]:
    """Returns (source, text, language_code) or None."""
    if not _HAVE_API:
        return None
    try:
        result = _API_CLIENT.fetch(video_id, languages=LANGS)
        text = "\n".join(s.text.strip() for s in result if s.text and s.text.strip())
        if not text:
            return None
        return ("api", text, result.language_code or "")
    except Exception as exc:
        # Common: TranscriptsDisabled, NoTranscriptFound, VideoUnavailable, IpBlocked
        print(f"    api error: {type(exc).__name__}: {str(exc).splitlines()[0][:120]}", file=sys.stderr)
        return None


_VTT_TIMESTAMP = re.compile(r"^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->")


def parse_vtt(path: Path) -> str:
    lines_out: list[str] = []
    skip_header = True
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if skip_header:
            if line.startswith("WEBVTT") or line == "" or line.startswith("Kind:") or line.startswith("Language:"):
                continue
            skip_header = False
        if not line:
            continue
        if _VTT_TIMESTAMP.match(line):
            continue
        if line.isdigit():
            continue
        # strip inline <c> tags and timestamps
        line = re.sub(r"<[^>]+>", "", line)
        if line and (not lines_out or lines_out[-1] != line):
            lines_out.append(line)
    return "\n".join(lines_out)


def fetch_via_ytdlp(video_id: str) -> Optional[tuple[str, str, str]]:
    url = f"https://www.youtube.com/watch?v={video_id}"
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        cmd = [
            "yt-dlp",
            "--skip-download",
            "--write-auto-subs",
            "--write-subs",
            "--sub-langs", "en.*",
            "--sub-format", "vtt",
            "--no-warnings",
            "-o", str(tmp_path / "%(id)s.%(ext)s"),
            url,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            tail = proc.stderr.strip().splitlines()[-1] if proc.stderr.strip() else "(no stderr)"
            print(f"    yt-dlp error: {tail[:160]}", file=sys.stderr)
            return None
        vtts = sorted(tmp_path.glob(f"{video_id}*.vtt"))
        if not vtts:
            return None
        # Pick first .vtt, infer lang from filename: <id>.<lang>.vtt
        chosen = vtts[0]
        lang = ""
        parts = chosen.name.split(".")
        if len(parts) >= 3:
            lang = parts[-2]
        text = parse_vtt(chosen)
        return ("yt-dlp", text, lang) if text else None


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("episodes_json", help="Path to episodes.json from yt_channel_extract")
    p.add_argument("--limit", type=int, default=0, help="Only process first N (0 = all)")
    p.add_argument("--skip-existing", action="store_true", help="Skip videos whose .txt already exists")
    p.add_argument("--sleep", type=float, default=0.5, help="Seconds to sleep between videos")
    p.add_argument("--no-ytdlp-fallback", action="store_true", help="Disable yt-dlp fallback (avoid 429s)")
    args = p.parse_args()

    episodes_path = Path(args.episodes_json).resolve()
    data = json.loads(episodes_path.read_text())
    entries = data.get("entries", [])
    if args.limit:
        entries = entries[: args.limit]

    out_dir = episodes_path.parent / "transcripts"
    out_dir.mkdir(parents=True, exist_ok=True)
    index_path = out_dir / "_index.json"

    index: list[dict] = []
    counts = {"api": 0, "yt-dlp": 0, "none": 0, "skipped": 0}

    for i, e in enumerate(entries, 1):
        vid = e["video_id"]
        title = e.get("title") or ""
        out_path = out_dir / f"{vid}.txt"
        print(f"[{i}/{len(entries)}] {vid}  {title[:70]}", file=sys.stderr)

        if args.skip_existing and out_path.exists():
            counts["skipped"] += 1
            index.append({
                "video_id": vid, "title": title, "source": "skipped",
                "char_count": out_path.stat().st_size,
            })
            continue

        source = "none"
        text = ""
        language = ""
        error: Optional[str] = None

        result = fetch_via_api(vid)
        if result is None and not args.no_ytdlp_fallback:
            result = fetch_via_ytdlp(vid)
        if result is not None:
            source, text, language = result

        if text:
            out_path.write_text(text, encoding="utf-8")
            counts[source] += 1
        else:
            counts["none"] += 1
            error = "no transcript available via api or yt-dlp"

        index.append({
            "video_id": vid,
            "title": title,
            "source": source,
            "language": language,
            "char_count": len(text),
            "error": error,
        })

        # Re-write index every iteration so partial runs are useful
        index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False))

        if args.sleep:
            time.sleep(args.sleep)

    print(
        f"[yt_transcripts_fetch] done. api={counts['api']} yt-dlp={counts['yt-dlp']} "
        f"none={counts['none']} skipped={counts['skipped']}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
