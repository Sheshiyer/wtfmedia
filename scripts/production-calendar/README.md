# Local workbook import

## Pick up this branch on another computer

After the merged branch is pushed, clone `futures/nikhai`, not the repository's
default `main` branch. The source code, migrations, tests, and this guide are
on the merged branch locally until then.
Install the web dependencies with `npm --prefix web ci`. The local calendar
preview was verified with Node.js 26 and Python 3; it uses `node:sqlite` and
Node's TypeScript stripping support. For the workbook import, create a local
Python environment and install the pinned dependency:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/production-calendar/requirements.txt
```

The public GitHub repository intentionally contains **no real workbook data**.
The WTF workbook contains guest contacts and internal notes; do not commit the
`.xlsx`, the generated JSON, `.local/`, SQLite files, screenshots, credentials,
or copied contact lists. Obtain the workbook privately from the owner and
keep the generated files in `.local/`, which is ignored by Git. Without that
private workbook, a clone can run the code but cannot display the same
populated calendar that was reviewed on Nikhai's computer.

From the repository root, after obtaining the workbook, use three terminals:

```bash
# Terminal 1: creates/updates only the ignored local SQLite schema and runs the API
node scripts/local-production-api.mjs

# Terminal 2: one-time source import into that local database
.venv/bin/python scripts/production-calendar/import_workbook.py \
  '/private/path/WTF Pod_ Live Calendar.xlsx' \
  --output .local/wtf-calendar-import.json --summary
node scripts/production-calendar/load_local.mjs \
  --input .local/wtf-calendar-import.json \
  --db .local/production-calendar.sqlite

# Terminal 3: local web UI
npm --prefix web run dev:production
```

Open `http://127.0.0.1:3001/ops/production`. In local preview mode this
route renders the calendar directly; deployed operator access stays under
the Beta gate. Start the API before the loader
so the local schema exists. `load_local.mjs` is idempotent for the same workbook
hash; a revised workbook needs the documented reconciliation review rather
than an assumed overwrite. This preview uses a local super-admin context; it
does not verify deployed Clerk roles or remote Cloudflare D1. No remote
migration or production deployment is part of this pickup procedure.

`import_workbook.py` reads the supplied WTF calendar workbook without changing
it. It writes a deterministic private JSON snapshot with every populated cell,
fill-bearing blank cell, formula, cached value, source coordinate, and the
original OOXML serial. The snapshot also carries conservative item/event and
dubbing candidates, a review queue, and all twelve reconstructed month views
from April 2026 through March 2027. The workbook's formula calendar does not
include the separate IP sheet; reconstructed month cells expose those events
separately.

Install `requirements.txt` into a local Python environment, then run:

```bash
python3 scripts/production-calendar/import_workbook.py \
  '/path/to/WTF Pod_ Live Calendar.xlsx' \
  --output '/private/local/path/wtf-calendar-import.json' --summary
```

The JSON contains guest names, contacts, and notes. Keep it outside Git and
restrict access. It does not authorize a remote D1 import. `load_local.mjs`
loads the generated file only into an explicitly named **local** SQLite/D1
database after migrations `0025_production_calendar.sql`,
`0026_production_source_checks.sql`, `0027_production_ip_targets.sql`, and
`0028_production_tracker_details.sql`
have been applied.
Repeated loads of the same workbook SHA are idempotent. A changed workbook is
preserved as a new import version and needs review before reconciling old
candidate rows.

```bash
node scripts/production-calendar/load_local.mjs \
  --input '/private/local/path/wtf-calendar-import.json' \
  --db '/private/local/path/production.sqlite'
```

No dates or consent are guessed. Clear podcast-title matches (for example,
"People by WTF" or "WTF is …") assign an IP in both podcast and dubbing
records; ambiguous titles still need review. Past typed
shoot, post, and dubbed-go-live dates are actuals per the WTF team's
clarification. A dated Dubbing Tracker column-C mark establishes publication,
not the date dubbing work itself finished. A blank column C means the dubbed
episode has not been published, even if column G ("Posted?") is ticked.
Column B (original video date) remains source history in the item details; it
is not a calendar action, and its actual-versus-planned interpretation has not
been independently verified. The raw column-G tick is shown separately from
publication. Guest-level permission status (F), workbook follow-up notes (H),
and manager-only contact details (E) remain attached to their source rows.
Merged panel rows stay one episode with multiple guests. Dubbing work status
is tracked separately and is not inferred from a tick or missing date. Row 30
has shifted data and is held for manual review, not silently converted into a
job. Rows 61 and 62 have contact-shaped text in the guest field and are flagged
for name review. Blank numbered POV/Animated rows remain source-only planning
slots, not fabricated episode titles. The Pod Pipeline 2026–27 and Pipeline
prospect worksheets are reserved for a separate page. Their raw cells remain
in the private import archive, but they do not create calendar items, board
cards, or import-review tasks here. Named BTS, Stitched, and Ways Of The World
rows from the IP worksheet remain in this production area.

The workbook's 🎙️ blue, 📤 green, and 🎥 yellow calendar action marks are
reused across matching event kinds in the month calendar, board, and detail
views. IP colors remain separately editable. The ⭕️ Not Live source marker
has no calendar date. Podcast tracker ☑ / ☐ boxes are copied into an editable
operational checklist while the original source cells stay immutable;
unchecked means "not ticked in the source," not a definitive negative status.
The IP legend shows editable workbook targets and named-item progress: BTS
12, Stitched 20+, POV 15, and Animated IP 20. Empty numbered slots do not
count toward progress.

The working UI uses Calendar, Board, and Dubbing views instead of copying the
Production Tracker grid into the primary navigation. A manager-only workbook
reference and each episode's details preserve source rows, fills, boxes, and
notes for verification. `Payments EP` belongs to WTF Is by owner confirmation.
The Dubbing view shows the workbook's Posted? checkbox separately from the
confirmed dubbed go-live state: among 57 imported jobs, 29 are checked, 25
unchecked, and 3 have no box; 11 checked jobs still have no column-C date and
are therefore not published. Authenticated editors can read the imported
column-H follow-up notes in episode details and add a separate team note;
private source contacts remain manager-only. Add episode from the Dubbing view
creates an episode and dubbing job together. A confirmed go-live date is
entered in the dubbing detail panel, not inferred from the source checkbox.
Shoot location and per-source-row guest role are structured working fields;
the raw workbook remains unchanged. Unnamed Production Tracker rows 17–19 are
omitted from operational records and the working source-row view, but their
original cells stay in the private import archive. A checked Guest Agreement
box remains a checked box even when an adjacent note says no contract was
signed; no legal outcome is inferred.

For an already imported local database, back it up and apply outstanding
production migrations through 0028,
then run `reconcile_local.mjs` with the regenerated private JSON and local
database path. Reconciliation updates only unchanged source-derived records.

## Run the calendar locally

From the repository root, after the import above:

```bash
node scripts/local-production-api.mjs
```

In a second terminal:

```bash
npm --prefix web run dev:production
```

Open [the local production calendar](http://127.0.0.1:3001/ops/production).
The local API and web server bind to `127.0.0.1`. The web development route
forwards only `/ops/api/production` to this local SQLite-backed API when
`WTF_PRODUCTION_LOCAL_PREVIEW=1`; other app routes retain their normal behavior.
Local preview assumes one super-admin operator and is for the developer's computer only.
It is **not** deployed authentication. The deployed edge route still checks
the real operator role and uses Cloudflare D1, but this calendar change has
neither applied the migration to remote D1 nor written data there. Only its
source-code branch has been pushed to GitHub; private workbook data has not.

The manager-only workbook reference shows the Production Tracker, Calendar,
Dubbing Tracker, and IP worksheets with their original cell references,
formulas, cached display values, and fills. The other two pipeline sheets are
kept in the private archive for the separate future page, not surfaced in this
production area. Ambiguous IPs, permissions, and undated dubbing progress are
not guessed.
The twelve month selector states from April 2026 to March 2027 are
reconstructed from the dated source rows and shown in the month calendar.
The import's private JSON additionally retains each complete reconstructed
month grid. Review issues should be resolved with the WTF team before any
remote migration.
