#!/usr/bin/env bash
# Demo orchestrator: extract Nikhil Kamath podcast catalog + transcripts.
set -euo pipefail

CHANNEL_URL="https://www.youtube.com/@nikhil.kamath/podcasts"
SLUG="nikhil-kamath"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

EPISODES_JSON="$(python3 "$HERE/yt_channel_extract.py" "$CHANNEL_URL" --slug "$SLUG")"
python3 "$HERE/yt_transcripts_fetch.py" "$EPISODES_JSON" --skip-existing --no-ytdlp-fallback

INDEX="$(dirname "$EPISODES_JSON")/transcripts/_index.json"
if [[ -f "$INDEX" ]]; then
  python3 -c "
import json,sys
i=json.load(open('$INDEX'))
from collections import Counter
c=Counter(x['source'] for x in i)
print(f\"Extracted {len(i)} URLs, api={c.get('api',0)} yt-dlp={c.get('yt-dlp',0)} none={c.get('none',0)} skipped={c.get('skipped',0)}\")
"
fi
