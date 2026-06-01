#!/usr/bin/env python3
"""Extract every video URL + metadata from a YouTube channel tab / playlist.

Shells out to yt-dlp with --flat-playlist (fast, no per-video API calls).
Writes JSON + a plain urls.txt for human inspection / downstream piping.

Usage:
    python3 yt_channel_extract.py "https://www.youtube.com/@nikhil.kamath/podcasts"
    python3 yt_channel_extract.py "<url>" --slug nikhil-kamath --out-root ../data
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "channel"


def derive_slug(url: str) -> str:
    m = re.search(r"@([A-Za-z0-9._-]+)", url)
    if m:
        return slugify(m.group(1))
    m = re.search(r"(?:channel|c|user)/([A-Za-z0-9_-]+)", url)
    if m:
        return slugify(m.group(1))
    m = re.search(r"list=([A-Za-z0-9_-]+)", url)
    if m:
        return slugify(m.group(1))
    return slugify(url)


def run_yt_dlp(url: str) -> dict:
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--dump-single-json",
        "--no-warnings",
        url,
    ]
    print(f"[yt_channel_extract] running: {' '.join(cmd)}", file=sys.stderr)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        raise SystemExit(f"yt-dlp exited {proc.returncode}")
    return json.loads(proc.stdout)


_PLAYLIST_ID_PREFIXES = ("PL", "UU", "OL", "LL", "FL", "RD")


def _is_playlist_entry(e: dict) -> bool:
    if (e.get("_type") or "").lower() == "playlist":
        return True
    url = e.get("url") or ""
    if "youtube.com/playlist" in url or "list=" in url:
        return True
    vid = e.get("id") or ""
    # Channel/playlist IDs are longer than the 11-char video id
    return len(vid) > 11 and vid.startswith(_PLAYLIST_ID_PREFIXES)


def normalize_entries(payload: dict, *, expand_playlists: bool = True) -> list[dict]:
    raw = payload.get("entries") or []
    out: list[dict] = []
    for e in raw:
        if not e:
            continue
        if _is_playlist_entry(e):
            if not expand_playlists:
                continue
            pl_url = e.get("url") or f"https://www.youtube.com/playlist?list={e.get('id')}"
            pl_title = e.get("title") or e.get("id")
            print(
                f"[yt_channel_extract] expanding playlist: {pl_title}",
                file=sys.stderr,
            )
            try:
                inner = run_yt_dlp(pl_url)
            except SystemExit:
                continue
            inner_norm = normalize_entries(inner, expand_playlists=False)
            for x in inner_norm:
                x.setdefault("playlist_id", e.get("id"))
                x.setdefault("playlist_title", pl_title)
                out.append(x)
            continue
        vid = e.get("id")
        if not vid:
            continue
        out.append({
            "video_id": vid,
            "title": e.get("title"),
            "url": e.get("url") or f"https://www.youtube.com/watch?v={vid}",
            "duration": e.get("duration"),
            "view_count": e.get("view_count"),
            "uploader": e.get("uploader") or payload.get("uploader"),
            "channel_id": e.get("channel_id") or payload.get("channel_id"),
            "live_status": e.get("live_status"),
        })
    # Dedupe by video_id, keep first occurrence
    seen: set[str] = set()
    deduped: list[dict] = []
    for x in out:
        vid = x.get("video_id")
        if vid in seen:
            continue
        seen.add(vid)
        deduped.append(x)
    return deduped


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("url", help="YouTube channel tab, playlist, or @handle URL")
    p.add_argument("--slug", help="Override derived channel slug")
    p.add_argument(
        "--out-root",
        default=str(Path(__file__).resolve().parent.parent / "data"),
        help="Output root directory (default: ../data relative to script)",
    )
    args = p.parse_args()

    slug = args.slug or derive_slug(args.url)
    out_dir = Path(args.out_root) / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    payload = run_yt_dlp(args.url)
    entries = normalize_entries(payload)

    episodes_path = out_dir / "episodes.json"
    urls_path = out_dir / "urls.txt"

    record = {
        "source_url": args.url,
        "channel_slug": slug,
        "channel_title": payload.get("title"),
        "channel_id": payload.get("channel_id"),
        "uploader": payload.get("uploader"),
        "entry_count": len(entries),
        "entries": entries,
    }
    episodes_path.write_text(json.dumps(record, indent=2, ensure_ascii=False))
    urls_path.write_text("\n".join(e["url"] for e in entries) + ("\n" if entries else ""))

    print(
        f"[yt_channel_extract] wrote {len(entries)} entries -> {episodes_path}",
        file=sys.stderr,
    )
    print(str(episodes_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
