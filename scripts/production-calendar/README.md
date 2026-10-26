# Local workbook import

## Beta integration

The Production page is `/beta/workspace/production` and all calendar, board,
dubbing, source review and editing requests use `/beta/api/production` through
the existing Beta Clerk/principal gate. Editors can read and edit; administrators
can additionally manage IPs and inspect source contacts. Members cannot access
this operator workspace. `/ops/production` redirects to Beta; the old Production
API paths and separate unauthenticated preview server are retired.

Both `feature/pavun` and `futures/nikhai` receive the reviewed merge. For normal
work use `feature/pavun`. Install web dependencies with `npm --prefix web ci`
and use the existing authenticated local frontend/Edge setup described in
`PROJECT.md`; open `http://localhost:3000/beta/workspace/production` after sign-in.
There is no separate Production development server or fake operator identity.

The private workbook, guest contacts, notes and generated snapshots are not in
Git. The page needs migrations 0025–0028 and an authorized import in its paired
D1 database. A source merge does not apply remote migrations, import data or
deploy Workers. Without these prerequisites it shows an empty or unavailable
calendar, not a populated demo. Do not point local import tools at a live database.

For private import preparation, use a Python environment with the pinned
`requirements.txt`. Generated JSON and local SQLite files belong in ignored
`.local/` or another private location. The importer and loader below remain
available for isolated data review; that SQLite file is not automatically
connected to the Beta application.

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

## Run the calendar through Beta

Use the common authenticated frontend and Edge service, and the selected
DB binding with migrations 0025–0028. Follow `PROJECT.md` for the localhost
hostname and Clerk configuration. Verify operator admission before testing
writes at `/beta/workspace/production`; the browser uses the shared session
fetch helper and `/beta/api/production`. No local auth bypass is supported.

A production or staging migration/import/deployment is a separate authorized
operation. Private workbook data stays outside Git and this source merge.

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
