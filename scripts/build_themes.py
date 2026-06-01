#!/usr/bin/env python3
"""Thematic connections engine — concepts, not surface entities.

Per episode, NVIDIA NIM extracts abstract THEMES discussed (e.g. "AI safety",
"founder mental health", "capital allocation discipline") rather than names of
people/companies/places. Then a clustering pass merges synonymous themes into
canonical nodes, counts episode-spread, and builds the same graph schema as
build_connections.py so /connections + the graph view just work.

Output: web/src/data/connections.json  (mode = "themes")
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
import urllib.error
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TX_DIR = ROOT / "web" / "public" / "transcripts"
EPISODES = ROOT / "data" / "nikhil-kamath" / "episodes.json"
OUT = ROOT / "web" / "src" / "data" / "connections.json"

CHAT_MODEL = "meta/llama-3.3-70b-instruct"
CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
THRESHOLD = 8           # themes spread less than entities; configurable
EMERGING_MIN = 4        # show finer themes appearing in 4+ episodes
ACRONYMS = {"Ai": "AI", "Ml": "ML", "Ev": "EV", "Us": "US", "Uk": "UK",
            "Ceo": "CEO", "Vc": "VC", "Ipo": "IPO", "Llm": "LLM", "Ar": "AR", "Vr": "VR"}


def fix_label(s: str) -> str:
    return " ".join(ACRONYMS.get(w, w) for w in s.split())
MAX_CHARS = 45_000      # transcript window sent per episode (lighter on rate limits)
CACHE = ROOT / ".themes_cache"   # per-episode extraction cache (gitignored)

CATEGORIES = [
    "AI & Technology", "Business & Strategy", "Startups & Founders",
    "Money & Markets", "Geopolitics & Society", "Health & Longevity",
    "Media & Culture", "Mind & Philosophy", "India & Growth", "Science",
]


def read_key() -> str:
    env = Path.home() / ".claude" / ".env"
    for line in env.read_text().splitlines():
        if line.strip().startswith("NVIDIA_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("NVIDIA_API_KEY not found")


def chat_json(key: str, system: str, user: str, max_tokens=1200) -> dict:
    payload = {
        "model": CHAT_MODEL, "temperature": 0.2, "max_tokens": max_tokens,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
    }
    req = urllib.request.Request(CHAT_URL, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    waits = [10, 20, 30, 45, 60]
    for attempt in range(6):
        try:
            raw = json.load(urllib.request.urlopen(req, timeout=120))["choices"][0]["message"]["content"]
            m = re.search(r"\{.*\}", raw, re.S)
            return json.loads(m.group(0)) if m else {}
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < 5:
                w = waits[min(attempt, len(waits) - 1)]
                print(f"    {e.code}; waiting {w}s", file=sys.stderr)
                time.sleep(w); continue
            print(f"    chat HTTP {e.code} (giving up on this call)", file=sys.stderr)
            return {}
        except Exception as e:
            if attempt < 5:
                time.sleep(3); continue
            print(f"    fail: {e}", file=sys.stderr)
            return {}
    return {}


def window(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= MAX_CHARS:
        return text
    a = MAX_CHARS // 2
    b = MAX_CHARS - a
    return text[:a] + " ... " + text[-b:]


EXTRACT_SYS = (
    "You extract abstract THEMES from a podcast transcript. A theme is an idea, "
    "tension, or topic of discussion, NOT a proper noun. GOOD: 'AI safety and "
    "alignment', 'founder mental health', 'capital allocation discipline', "
    "'India's manufacturing ambition', 'creator economy monetization', "
    "'long-term vs short-term thinking'. BAD (do not return): people, company, "
    "city, or country names. Return 6-10 themes as STRICT JSON: "
    "{\"themes\":[{\"label\":\"...\",\"category\":\"<one of the categories>\"}]}. "
    "Categories: " + ", ".join(CATEGORIES) + "."
)

CLUSTER_SYS = (
    "You normalize a list of themes mined from many podcast episodes. Merge ONLY "
    "near-identical paraphrases (e.g. 'long term thinking' + 'thinking long term'). "
    "PRESERVE genuinely distinct ideas as SEPARATE nodes; do not over-merge "
    "different themes into one broad bucket. Aim for roughly 30-45 canonical nodes "
    "so the map stays specific and useful. Use a clear Title Case label (2-5 words) "
    "and keep the assigned category. Return STRICT JSON: "
    "{\"nodes\":[{\"label\":\"AI Safety\",\"category\":\"AI & Technology\","
    "\"variants\":[\"ai safety and alignment\",\"alignment risk\"]}]}."
)

key = read_key()
eps = {e["video_id"]: e for e in json.loads(EPISODES.read_text())["entries"]}
txt_files = sorted(TX_DIR.glob("*.txt"))

# 1) per-episode theme extraction
raw_theme_eps: dict[str, set] = defaultdict(set)   # lower label -> episodes
raw_cat: dict[str, str] = {}
display: dict[str, str] = {}
CACHE.mkdir(exist_ok=True)
for i, f in enumerate(txt_files, 1):
    vid = f.stem
    title = eps.get(vid, {}).get("title", vid)
    cache_f = CACHE / f"{vid}.json"
    if cache_f.exists():
        themes = json.loads(cache_f.read_text())
        print(f"  [{i}/{len(txt_files)}] {vid}: cached ({len(themes)})", file=sys.stderr)
    else:
        res = chat_json(key, EXTRACT_SYS,
                        f"Episode: {title}\n\nTranscript:\n{window(f.read_text(errors='ignore'))}")
        themes = res.get("themes", [])
        if themes:
            cache_f.write_text(json.dumps(themes, ensure_ascii=False))
        print(f"  [{i}/{len(txt_files)}] {vid}: {len(themes)} themes", file=sys.stderr)
        time.sleep(1.5)
    seen = set()
    for t in themes:
        label = (t.get("label") or "").strip()
        if not label or len(label) < 3:
            continue
        k = label.lower()
        if k in seen:
            continue
        seen.add(k)
        raw_theme_eps[k].add(vid)
        raw_cat.setdefault(k, t.get("category", "Business & Strategy"))
        display.setdefault(k, label)

print(f"[themes] {len(raw_theme_eps)} raw themes; clustering…", file=sys.stderr)

# 2) cluster/canonicalize (shortlist the ones seen in >=2 episodes + singletons capped)
ranked = sorted(raw_theme_eps.items(), key=lambda kv: len(kv[1]), reverse=True)
shortlist = [(display[k], len(v), raw_cat[k]) for k, v in ranked][:260]
cluster = chat_json(key, CLUSTER_SYS,
    "Themes (label : episodes : category):\n" +
    "\n".join(f"{lbl} : {n} : {cat}" for lbl, n, cat in shortlist),
    max_tokens=7000)
clean = cluster.get("nodes", [])
print(f"[themes] clustered to {len(clean)} canonical nodes", file=sys.stderr)

# map canonical -> merged episode sets
nodes = []
for node in clean:
    label = fix_label((node.get("label") or "").strip())
    if not label:
        continue
    cat = node.get("category", "Business & Strategy")
    variants = [v.lower() for v in node.get("variants", [])] + [label.lower()]
    ep: set = set()
    for v in variants:
        if v in raw_theme_eps:
            ep |= raw_theme_eps[v]
    if not ep:
        continue
    nodes.append({
        "id": re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-"),
        "label": label, "category": cat,
        "episodes": sorted(ep), "episodeCount": len(ep), "mentions": len(ep),
    })

# dedupe by id
seen_ids = {}
for n in nodes:
    if n["id"] not in seen_ids or n["episodeCount"] > seen_ids[n["id"]]["episodeCount"]:
        seen_ids[n["id"]] = n
nodes = sorted(seen_ids.values(), key=lambda n: n["episodeCount"], reverse=True)

established = [n for n in nodes if n["episodeCount"] >= THRESHOLD]
emerging = [n for n in nodes if EMERGING_MIN <= n["episodeCount"] < THRESHOLD]

# edges: co-occurrence among top nodes
top = nodes[:44]
edges = []
for i in range(len(top)):
    for j in range(i + 1, len(top)):
        shared = set(top[i]["episodes"]) & set(top[j]["episodes"])
        if len(shared) >= 4:
            edges.append({"a": top[i]["id"], "b": top[j]["id"],
                          "shared": len(shared), "episodes": sorted(shared)[:12]})
edges.sort(key=lambda e: e["shared"], reverse=True)
edges = edges[:70]

# category overlaps
cat_eps: dict[str, set] = defaultdict(set)
for n in nodes:
    cat_eps[n["category"]] |= set(n["episodes"])
cats = sorted(cat_eps, key=lambda c: len(cat_eps[c]), reverse=True)
overlaps = []
for i in range(len(cats)):
    for j in range(i + 1, len(cats)):
        sh = cat_eps[cats[i]] & cat_eps[cats[j]]
        if sh:
            overlaps.append({"a": cats[i], "b": cats[j], "shared": len(sh)})
overlaps.sort(key=lambda o: o["shared"], reverse=True)

payload = {
    "mode": "themes",
    "threshold": THRESHOLD, "emergingMin": EMERGING_MIN,
    "totalEpisodes": len(txt_files),
    "categories": [{"name": c, "episodeCount": len(cat_eps[c])} for c in cats],
    "established": established, "emerging": emerging,
    "edges": edges, "overlaps": overlaps[:20],
    "titles": {vid: eps.get(vid, {}).get("title", vid) for vid in eps},
}
OUT.write_text(json.dumps(payload, ensure_ascii=False))
print(f"[themes] wrote {OUT}: {len(established)} nodes >= {THRESHOLD} eps, "
      f"{len(emerging)} emerging, {len(edges)} edges", file=sys.stderr)
