#!/usr/bin/env python3
"""Connections engine — cross-podcast curation graph.

The internal goal of Ask WTF: find what recurs and what connects across the
whole catalogue. This builds that graph:

1. Deterministic pass: extract candidate entities (capitalized phrases) from every
   transcript; count how many distinct EPISODES each appears in (episode-spread)
   plus total mentions.
2. Hybrid pass: hand the shortlist to NVIDIA NIM (llama-3.3-70b) to merge variants,
   drop non-entities, and assign a category + clean label.
3. Nodes = canonical entities appearing in >= THRESHOLD episodes (default 20);
   "emerging" = below threshold but climbing.
4. Edges = node co-occurrence across episodes. Overlaps = category x category.

Output: web/src/data/connections.json
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
import urllib.error
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TX_DIR = ROOT / "web" / "public" / "transcripts"
EPISODES = ROOT / "data" / "nikhil-kamath" / "episodes.json"
OUT = ROOT / "web" / "src" / "data" / "connections.json"

THRESHOLD = 20            # node = appears in >= 20 distinct episodes
EMERGING_MIN = 8          # show climbing nodes from here up to threshold
CHAT_MODEL = "meta/llama-3.3-70b-instruct"
CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

STOP = set("""the a an and or but if then so of to in on at by for with from as is are was were be been being this that these those it its
i you he she we they them his her our your their my me us him there here what which who whom whose how why when where
yeah ok okay yes no not do does did done doing have has had having will would can could should may might must shall
about over under into out up down off than too very just like get got go going gone come came say said see saw know knew
think thought want wanted need needed make made take took give gave one two three first second lot really actually maybe
people thing things time year years day days way ways right good great big small new old much many more most some any all
mr mrs dr sir let lets gonna wanna kind sort bit something someone anyone everyone nothing everything because okay uh um
""".split())

# obvious sentence-leaders / non-entities that survive capitalization
BAD = set("""I We You They He She It The This That There Here What When Where Why How And But So Or If Then Now Today
Yeah Yes No Okay Ok Well Right Like Maybe Actually Because Mr Mrs Dr Sir Let Lets God Oh Hey Hi Thanks Thank
People Episode Podcast WTF""".split())

CAP_SEQ = re.compile(r"\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b")


def read_key() -> str:
    env = Path.home() / ".claude" / ".env"
    for line in env.read_text().splitlines():
        if line.strip().startswith("NVIDIA_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("NVIDIA_API_KEY not found")


def candidates_for(text: str) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for m in CAP_SEQ.finditer(text):
        phrase = m.group(1).strip()
        words = phrase.split()
        # single word: must be long-ish and not a sentence-leader
        if len(words) == 1:
            w = words[0]
            if w in BAD or w.lower() in STOP or len(w) < 4:
                continue
            counts[w] += 1
        else:
            # drop phrases that are all sentence-leaders / stopwords
            if all(w in BAD or w.lower() in STOP for w in words):
                continue
            counts[phrase] += 1
    return counts


def canonicalize(key: str, shortlist: list[dict]) -> list[dict]:
    """Ask NIM to merge variants, drop junk, assign category + clean label."""
    payload = {
        "model": CHAT_MODEL,
        "temperature": 0.1,
        "max_tokens": 3000,
        "messages": [
            {"role": "system", "content":
             "You clean a list of candidate entities mined from podcast transcripts. "
             "Merge spelling/case variants of the same thing (e.g. 'Open Ai','OpenAI' -> 'OpenAI'; "
             "'United States','US' -> 'United States'). Drop anything that is NOT a real recurring "
             "topic, person, company, place, or concept (drop generic words, names of the host, "
             "filler). Assign each kept node a category from exactly this set: "
             "[AI, Startups, Finance, Geopolitics, Health, Media, India, Science, Crypto, People]. "
             "Return STRICT JSON only: {\"nodes\":[{\"label\":\"OpenAI\",\"category\":\"AI\",\"variants\":[\"open ai\",\"openai\"]}]}."},
            {"role": "user", "content":
             "Candidates (label : episodes_seen):\n" +
             "\n".join(f"{c['label']} : {c['episodeCount']}" for c in shortlist)},
        ],
    }
    req = urllib.request.Request(CHAT_URL, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    raw = json.load(urllib.request.urlopen(req, timeout=120))["choices"][0]["message"]["content"]
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        raise SystemExit("LLM did not return JSON: " + raw[:200])
    return json.loads(m.group(0)).get("nodes", [])


key = read_key()
eps = {e["video_id"]: e for e in json.loads(EPISODES.read_text())["entries"]}

# 1) deterministic: per-candidate episode-spread + total mentions
episodes_of: dict[str, set] = defaultdict(set)   # lower key -> set(video_id)
mentions_of: dict[str, int] = defaultdict(int)
display_of: dict[str, str] = {}

txt_files = sorted(TX_DIR.glob("*.txt"))
for f in txt_files:
    vid = f.stem
    counts = candidates_for(f.read_text(encoding="utf-8", errors="ignore"))
    for label, c in counts.items():
        kkey = label.lower()
        episodes_of[kkey].add(vid)
        mentions_of[kkey] += c
        display_of.setdefault(kkey, label)

# shortlist: top candidates by episode-spread for the LLM to clean
ranked = sorted(episodes_of.items(), key=lambda kv: len(kv[1]), reverse=True)
shortlist = [
    {"label": display_of[k], "key": k, "episodeCount": len(v), "mentions": mentions_of[k]}
    for k, v in ranked if len(v) >= EMERGING_MIN
][:120]
print(f"[connections] {len(txt_files)} transcripts, {len(shortlist)} candidates >= {EMERGING_MIN} eps", file=sys.stderr)

# 2) hybrid: canonicalize via NIM
clean = canonicalize(key, shortlist)
print(f"[connections] LLM returned {len(clean)} canonical nodes", file=sys.stderr)

# map canonical nodes back to merged episode sets
shortlist_keys = {c["key"] for c in shortlist}
nodes = []
for node in clean:
    label = node.get("label", "").strip()
    cat = node.get("category", "People")
    variants = [v.lower() for v in node.get("variants", [])] or [label.lower()]
    ep: set = set()
    ment = 0
    for v in variants:
        if v in episodes_of:
            ep |= episodes_of[v]
            ment += mentions_of[v]
    # also try the label itself
    if label.lower() in episodes_of:
        ep |= episodes_of[label.lower()]
    if not ep:
        continue
    nodes.append({
        "id": label.lower().replace(" ", "-"),
        "label": label,
        "category": cat,
        "episodes": sorted(ep),
        "episodeCount": len(ep),
        "mentions": ment,
    })

nodes.sort(key=lambda n: n["episodeCount"], reverse=True)
established = [n for n in nodes if n["episodeCount"] >= THRESHOLD]
emerging = [n for n in nodes if EMERGING_MIN <= n["episodeCount"] < THRESHOLD]

# 3) edges: co-occurrence across episodes (top nodes only)
top = nodes[:40]
edges = []
for i in range(len(top)):
    for j in range(i + 1, len(top)):
        shared = set(top[i]["episodes"]) & set(top[j]["episodes"])
        if len(shared) >= 8:
            edges.append({
                "a": top[i]["id"], "b": top[j]["id"],
                "shared": len(shared),
                "episodes": sorted(shared)[:12],
            })
edges.sort(key=lambda e: e["shared"], reverse=True)
edges = edges[:60]

# 4) category overlaps: episodes where two categories co-occur
cat_eps: dict[str, set] = defaultdict(set)
for n in nodes:
    cat_eps[n["category"]] |= set(n["episodes"])
cats = sorted(cat_eps, key=lambda c: len(cat_eps[c]), reverse=True)
overlaps = []
for i in range(len(cats)):
    for j in range(i + 1, len(cats)):
        shared = cat_eps[cats[i]] & cat_eps[cats[j]]
        if shared:
            overlaps.append({"a": cats[i], "b": cats[j], "shared": len(shared)})
overlaps.sort(key=lambda o: o["shared"], reverse=True)

payload = {
    "threshold": THRESHOLD,
    "emergingMin": EMERGING_MIN,
    "totalEpisodes": len(txt_files),
    "categories": [{"name": c, "episodeCount": len(cat_eps[c])} for c in cats],
    "established": established,
    "emerging": emerging,
    "edges": edges,
    "overlaps": overlaps[:20],
    "titles": {vid: eps.get(vid, {}).get("title", vid) for vid in eps},
}
OUT.write_text(json.dumps(payload, ensure_ascii=False))
print(f"[connections] wrote {OUT}: {len(established)} nodes >= {THRESHOLD} eps, "
      f"{len(emerging)} emerging, {len(edges)} edges, {len(overlaps)} overlaps", file=sys.stderr)
