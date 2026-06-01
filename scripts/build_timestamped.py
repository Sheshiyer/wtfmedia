#!/usr/bin/env python3
"""Rebuild the vector store WITH per-chunk start timestamps.

Re-fetches transcripts via youtube_transcript_api (which carries .start per
caption snippet), chunks by snippet accumulation, records each chunk's start
second, embeds with nvidia/nv-embedqa-e5-v5, and writes web/src/data/vectors.json
with an added `start` field so citations can deep-link to youtube ?t=<sec>s.

Also writes per-video timestamped JSON to web/public/transcripts/<id>.json
(for a future clickable-transcript drawer).
"""
from __future__ import annotations

import base64
import json
import struct
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPISODES = ROOT / "data" / "nikhil-kamath" / "episodes.json"
OUT = ROOT / "web" / "src" / "data" / "vectors.json"
PUB_TX = ROOT / "web" / "public" / "transcripts"

EMBED_MODEL = "nvidia/nv-embedqa-e5-v5"
EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings"
LANGS = ["en", "en-IN", "en-US", "en-GB", "hi"]
CHUNK_CHARS = 2200
MAX_CHUNKS = 40
BATCH = 32

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except Exception:
    print("youtube_transcript_api not installed", file=sys.stderr)
    raise SystemExit(1)


def read_key() -> str:
    env = Path.home() / ".claude" / ".env"
    for line in env.read_text().splitlines():
        if line.strip().startswith("NVIDIA_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("NVIDIA_API_KEY not found")


def fetch_snippets(client, vid):
    try:
        res = client.fetch(vid, languages=LANGS)
        return [(float(s.start), s.text.strip()) for s in res if s.text and s.text.strip()]
    except Exception as e:
        print(f"    skip {vid}: {type(e).__name__}", file=sys.stderr)
        return []


def chunk_snippets(snips):
    """Group consecutive snippets into ~CHUNK_CHARS chunks; keep chunk start."""
    chunks = []
    cur, cur_len, cur_start = [], 0, None
    for start, text in snips:
        if cur_start is None:
            cur_start = start
        cur.append(text)
        cur_len += len(text) + 1
        if cur_len >= CHUNK_CHARS:
            chunks.append((cur_start, " ".join(cur).strip()))
            cur, cur_len, cur_start = [], 0, None
    if cur and cur_len > 60:
        chunks.append((cur_start, " ".join(cur).strip()))
    return chunks[:MAX_CHUNKS]


def embed_batch(key, texts):
    body = json.dumps({
        "input": texts, "model": EMBED_MODEL,
        "input_type": "passage", "encoding_format": "float", "truncate": "END",
    }).encode()
    req = urllib.request.Request(EMBED_URL, data=body, headers={
        "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    for attempt in range(4):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=60))
            return [r["embedding"] for r in sorted(d["data"], key=lambda r: r["index"])]
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < 3:
                time.sleep(2 ** attempt); continue
            raise SystemExit(f"embed HTTP {e.code}: {e.read().decode()[:200]}")
    raise SystemExit("embed failed")


def pack(vec):
    return base64.b64encode(struct.pack(f"<{len(vec)}f", *vec)).decode()


def main():
    key = read_key()
    client = YouTubeTranscriptApi()
    eps = {e["video_id"]: e for e in json.loads(EPISODES.read_text())["entries"]}
    PUB_TX.mkdir(parents=True, exist_ok=True)

    records = []  # {video_id, title, chunk_idx, start, text}
    vids = list(eps.keys())
    for i, vid in enumerate(vids, 1):
        title = eps[vid].get("title", vid)
        snips = fetch_snippets(client, vid)
        if not snips:
            continue
        # save timestamped transcript for the drawer
        (PUB_TX / f"{vid}.json").write_text(
            json.dumps([{"t": round(s, 1), "x": t} for s, t in snips], ensure_ascii=False)
        )
        chunks = chunk_snippets(snips)
        for ci, (start, text) in enumerate(chunks):
            records.append({
                "video_id": vid, "title": title, "chunk_idx": ci,
                "start": int(start), "text": text,
            })
        print(f"  [{i}/{len(vids)}] {vid}: {len(chunks)} chunks", file=sys.stderr)
        time.sleep(0.8)

    print(f"[build] {len(records)} chunks; embedding…", file=sys.stderr)
    embs = []
    dim = 0
    for b in range(0, len(records), BATCH):
        batch = records[b:b + BATCH]
        vecs = embed_batch(key, [r["text"] for r in batch])
        dim = len(vecs[0])
        embs.extend(pack(v) for v in vecs)
        print(f"  embedded {b + len(batch)}/{len(records)}", file=sys.stderr)
        time.sleep(0.2)

    payload = {
        "model": EMBED_MODEL, "dim": dim, "count": len(records),
        "items": [
            {**{k: r[k] for k in ("video_id", "title", "chunk_idx", "start", "text")},
             "embedding": embs[i]}
            for i, r in enumerate(records)
        ],
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False))
    print(f"[build] wrote {OUT} ({OUT.stat().st_size/1e6:.1f} MB, dim={dim})", file=sys.stderr)


if __name__ == "__main__":
    main()
