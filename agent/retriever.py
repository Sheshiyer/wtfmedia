"""Retrieval over the timestamped vector store, shared with the Next.js app.

Loads web/src/data/vectors.json (base64 Float32 + start seconds), embeds queries
with NVIDIA nv-embedqa-e5-v5, and returns cosine top-k chunks with timestamps.
"""
from __future__ import annotations

import base64
import json
import math
import struct
import urllib.request
import urllib.error
from pathlib import Path

from nim import nvidia_key

ROOT = Path(__file__).resolve().parent.parent
VECTORS = ROOT / "web" / "src" / "data" / "vectors.json"
EMBED_MODEL = "nvidia/nv-embedqa-e5-v5"
EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings"

_store = None  # {dim, vecs:[list[float] normalized], meta:[dict]}


def _load():
    global _store
    if _store is not None:
        return _store
    data = json.loads(VECTORS.read_text())
    dim = data["dim"]
    vecs, meta = [], []
    for it in data["items"]:
        raw = base64.b64decode(it["embedding"])
        v = list(struct.unpack(f"<{dim}f", raw))
        n = math.sqrt(sum(x * x for x in v)) or 1.0
        vecs.append([x / n for x in v])
        meta.append(it)
    _store = {"dim": dim, "vecs": vecs, "meta": meta}
    return _store


def _embed(text: str) -> list[float]:
    body = json.dumps({
        "input": [text], "model": EMBED_MODEL,
        "input_type": "query", "encoding_format": "float", "truncate": "END",
    }).encode()
    req = urllib.request.Request(EMBED_URL, data=body, headers={
        "Authorization": f"Bearer {nvidia_key()}", "Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=60))
    return d["data"][0]["embedding"]


def fmt_time(s) -> str:
    if s is None:
        return ""
    s = int(s)
    h, m, sec = s // 3600, (s % 3600) // 60, s % 60
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"


def search(query: str, k: int = 5) -> list[dict]:
    store = _load()
    q = _embed(query)
    qn = math.sqrt(sum(x * x for x in q)) or 1.0
    q = [x / qn for x in q]
    scored = []
    for i, v in enumerate(store["vecs"]):
        dot = sum(a * b for a, b in zip(v, q))
        scored.append((dot, i))
    scored.sort(reverse=True)
    hits = []
    for dot, i in scored[:k]:
        m = store["meta"][i]
        start = m.get("start")
        hits.append({
            "video_id": m["video_id"],
            "title": m["title"],
            "start": start,
            "time": fmt_time(start),
            "text": m["text"],
            "score": round(float(dot), 3),
            "url": (
                f"https://www.youtube.com/watch?v={m['video_id']}&t={int(start)}s"
                if start is not None
                else f"https://www.youtube.com/watch?v={m['video_id']}"
            ),
        })
    return hits
