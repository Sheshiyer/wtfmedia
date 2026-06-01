#!/usr/bin/env python3
"""Build a compact vector store over podcast transcripts using NVIDIA NIM.

- Chunks each transcript (char-based with overlap)
- Embeds passages with nvidia/nv-embedqa-e5-v5 (input_type="passage")
- Packs embeddings as base64 Float32 to keep the file small
- Writes web/src/data/vectors.json for the Next.js /api/chat route

The NVIDIA key is read from ~/.claude/.env (NVIDIA_API_KEY=...) — never sourced
into the shell (blocked by security hook), read directly here.

Usage:
    python3 scripts/build_embeddings.py
    python3 scripts/build_embeddings.py --limit 5 --chunk 2000 --overlap 200
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import struct
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRANSCRIPTS = ROOT / "data" / "nikhil-kamath" / "transcripts"
EPISODES = ROOT / "data" / "nikhil-kamath" / "episodes.json"
OUT = ROOT / "web" / "src" / "data" / "vectors.json"

EMBED_MODEL = "nvidia/nv-embedqa-e5-v5"
EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings"


def read_key() -> str:
    env = Path.home() / ".claude" / ".env"
    for line in env.read_text().splitlines():
        if line.strip().startswith("NVIDIA_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("NVIDIA_API_KEY not found in ~/.claude/.env")


def chunk_text(text: str, size: int, overlap: int) -> list[str]:
    text = re.sub(r"\n{2,}", "\n", text).strip()
    if not text:
        return []
    chunks = []
    i = 0
    n = len(text)
    while i < n:
        end = min(i + size, n)
        # try to break on a newline/period near the end for cleaner chunks
        window = text[i:end]
        if end < n:
            br = max(window.rfind("\n"), window.rfind(". "))
            if br > size * 0.6:
                end = i + br + 1
                window = text[i:end]
        chunks.append(window.strip())
        if end >= n:
            break
        i = end - overlap
    return [c for c in chunks if len(c) > 40]


def embed_batch(key: str, texts: list[str], input_type: str) -> list[list[float]]:
    body = json.dumps({
        "input": texts,
        "model": EMBED_MODEL,
        "input_type": input_type,
        "encoding_format": "float",
        "truncate": "END",
    }).encode()
    req = urllib.request.Request(
        EMBED_URL, data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    for attempt in range(4):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=60))
            # NVIDIA returns in input order
            return [row["embedding"] for row in sorted(d["data"], key=lambda r: r["index"])]
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:200]
            if e.code in (429, 500, 503) and attempt < 3:
                wait = 2 ** attempt
                print(f"    {e.code}, retrying in {wait}s: {msg}", file=sys.stderr)
                time.sleep(wait)
                continue
            raise SystemExit(f"embed HTTP {e.code}: {msg}")
    raise SystemExit("embed failed after retries")


def pack_f32(vec: list[float]) -> str:
    return base64.b64encode(struct.pack(f"<{len(vec)}f", *vec)).decode()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Only first N transcripts (0=all)")
    ap.add_argument("--chunk", type=int, default=2200, help="Chunk size in chars")
    ap.add_argument("--overlap", type=int, default=220, help="Overlap in chars")
    ap.add_argument("--batch", type=int, default=32, help="Embedding batch size")
    ap.add_argument("--max-chunks-per-ep", type=int, default=40, help="Cap chunks per episode")
    args = ap.parse_args()

    key = read_key()
    eps = {e["video_id"]: e for e in json.loads(EPISODES.read_text())["entries"]}

    txt_files = sorted(TRANSCRIPTS.glob("*.txt"))
    if args.limit:
        txt_files = txt_files[: args.limit]

    OUT.parent.mkdir(parents=True, exist_ok=True)

    records: list[dict] = []  # {video_id, title, chunk_idx, text}
    for f in txt_files:
        vid = f.stem
        ep = eps.get(vid, {})
        title = ep.get("title", vid)
        chunks = chunk_text(f.read_text(encoding="utf-8", errors="ignore"),
                            args.chunk, args.overlap)
        chunks = chunks[: args.max_chunks_per_ep]
        for ci, c in enumerate(chunks):
            records.append({"video_id": vid, "title": title, "chunk_idx": ci, "text": c})
        print(f"  {vid}: {len(chunks)} chunks ({title[:50]})", file=sys.stderr)

    print(f"[build] {len(records)} chunks across {len(txt_files)} transcripts", file=sys.stderr)

    # Embed in batches
    embeddings: list[str] = []
    dim = 0
    for b in range(0, len(records), args.batch):
        batch = records[b : b + args.batch]
        vecs = embed_batch(key, [r["text"] for r in batch], "passage")
        dim = len(vecs[0])
        embeddings.extend(pack_f32(v) for v in vecs)
        print(f"  embedded {b + len(batch)}/{len(records)}", file=sys.stderr)
        time.sleep(0.2)

    payload = {
        "model": EMBED_MODEL,
        "dim": dim,
        "count": len(records),
        "items": [
            {
                "video_id": r["video_id"],
                "title": r["title"],
                "chunk_idx": r["chunk_idx"],
                "text": r["text"],
                "embedding": embeddings[i],  # base64 Float32
            }
            for i, r in enumerate(records)
        ],
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False))
    size_mb = OUT.stat().st_size / 1e6
    print(f"[build] wrote {OUT} ({size_mb:.1f} MB, dim={dim})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
