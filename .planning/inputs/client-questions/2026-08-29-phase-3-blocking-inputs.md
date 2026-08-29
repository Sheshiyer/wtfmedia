# Client authorization & blocking inputs request · Phase 3 (Episode Ingestion + Provenance Spine)

**Drafted:** 2026-08-29
**For:** Nikhai (SpaceBlanket.AI) → Nikhil Kamath Media Group / WTF Editorial
**Blocks:** Execution of repository Phase 3 (Episode Ingestion + Provenance Spine), including Plans `03-01` through `03-06`, D1 provenance migrations, automated YouTube channel synchronization, uncut asset staging, and multi-version transcript activation
**Related requirements:** `PROV-01`, `PROV-02`, `PROV-03`, `PROV-04`, `PROV-05`, `PROV-06`, `PROV-07`, `PROV-08`, `PROV-09`, `PROV-10`, `PROV-11`, `PROV-12`, `PROV-13`, `INTG-07`, `QUAL-05`, `QUAL-12`
**Related decisions & prior requests:**
- `.planning/inputs/client-questions/2026-08-27-ip-taxonomy-reconciliation.md` (IP taxonomy dilemma)
- `.planning/inputs/client-questions/2026-08-27-editorial-evaluation-set.md` (20-query search evaluation set)
- `.planning/ROADMAP.md` (Phase 3 boundaries, success criteria, and dependencies)
**Status:** draft-held, awaiting owner reply

---

## 1. Context & Why This Exists

With the completion of Phase 2 (Platform Foundation + Authenticated Policy Boundary), the repository enforces a hardened, deny-by-default operator surface (`/ops`), D1-backed operator authorization, and a strictly scrubbed, append-only audit ledger (`audit_events`).

Phase 3 builds the **Provenance Spine & Ingestion Engine**. Its objective is to construct a canonical, immutable, versioned evidence relational graph in Cloudflare D1 and R2 uniting:
1. Canonical episode entities (`ep_<ulid>`) independent of platform re-uploads or title edits (`PROV-01`, `PROV-02`).
2. Source media assets with content hashes (`sha256`), storage keys, and availability states (`PROV-03`).
3. Multi-version diarized transcript segments with speaker labels, language tags, and atomic cutover (`PROV-04`, `PROV-08`, `PROV-12`).
4. Dual-coordinate timeline alignment (uncut studio audio vs published YouTube video) resolving bidirectional navigation within $<2$ seconds (`PROV-05`, `PROV-06`, `PROV-13`).
5. Observable asynchronous ingestion jobs for both YouTube channels and uncut media drops (`PROV-10`, `PROV-11`, `INTG-07`).

Per repository security and data integrity mandates, the pipeline **refuses to invent credentials, guess operational channel IDs, assume universal time offsets, fabricate taxonomy classifications, or embed untrusted private storage paths**.

Before remote ingestion workers, D1 provenance migrations, and queue consumers are activated, the client/editorial team must provide the **five blocking authorizations and inputs** detailed below.

---

## 2. Item 1: YouTube Data API v3 Access & Channel Authorization (`INTG-07`, `PROV-10`)

### Context
WTF distributes video content across two primary YouTube properties:
1. **Main Channel**: `@WTFiswithNikhilKamath` (Long-form flagship podcast discussions).
2. **Clips & Secondary Channel**: `@NikhilKamathClips` (Shorts, highlight clips, and *People by WTF* segments).

To automate idempotent metadata extraction (titles, descriptions, guest names, ISO-8601 durations, chapter markers, and official thumbnails) and maintain daily cached analytics without client-side API calls, the server-side ingestion adapter requires authorized read-only API access.

### Security & Secret Storage Instructions
**Zero Credential Storage in Git**: API keys, OAuth tokens, and Google Cloud credentials must **never** be committed to git, written to markdown files, or shared in plain text.

Please provision the credentials directly into the Cloudflare Worker secret store using the Cloudflare Wrangler CLI:

```bash
# Navigate to the cloudflare worker package
cd cloudflare

# Put the read-only YouTube Data API v3 key into the worker environment
npx wrangler secret put YOUTUBE_API_KEY
# (When prompted, paste the Google Cloud API key)
```

If Google Cloud Service Account credentials are used for extended YouTube Analytics access (`INTG-07`):
```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# (When prompted, paste the single-line JSON service account key)
```

### Quota Optimization Architecture
Standard YouTube Data API v3 projects receive a default quota of **10,000 units/day**. Standard search calls (`search.list`) cost **100 units/call** and would exhaust the daily limit in 100 calls.

WTF OS implements a zero-waste sync architecture:
- Computes Channel Uploads Playlist ID (`UU...` derived from Channel ID `UC...`).
- Calls `playlistItems.list` (1 unit per 50 videos) + `videos.list` (1 unit per 50 videos).
- Full 100-video channel backfill consumes **$<5$ units total**.
- Daily scheduled sync uses HTTP `If-None-Match` (ETag caching in KV `WTFMEDIA_STATE`); if unchanged (HTTP 304), **0 units** are consumed and 0 database writes occur.

### Structured Response Form: Item 1

| Field | Description / Instructions | Client Response / Value |
|---|---|---|
| **Main Channel ID** | 24-character YouTube Channel ID for `@WTFiswithNikhilKamath` (starts with `UC`) | ⧗ `UC...` |
| **Clips / Secondary Channel ID** | 24-character YouTube Channel ID for `@NikhilKamathClips` (starts with `UC`) | ⧗ `UC...` |
| **`YOUTUBE_API_KEY` Secret Status** | Confirmed added to Cloudflare Worker via `wrangler secret put YOUTUBE_API_KEY` | `[ ] Confirmed Added` / `[ ] Pending` |
| **Google Service Account JSON Status** | Confirmed added via `wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON` (if Analytics enabled) | `[ ] Confirmed Added` / `[ ] Not Applicable (API Key only)` |
| **Preferred Automated Sync Cadence** | Scheduled Worker cron frequency for YouTube catalog polling | `[ ] Every 6 Hours` (Recommended)<br>`[ ] Every 12 Hours`<br>`[ ] Daily (24 Hours)` |
| **Enable Real-Time WebSub Webhook?** | PubSubHubbub push notifications for instant (<60s) new video detection | `[ ] Yes`<br>`[ ] No (Polling only is sufficient)` |
| **Ingest YouTube Shorts as Separate Episodes?** | Ingest standalone Shorts as `content_bucket = 'clip'` | `[ ] Yes, ingest Shorts`<br>`[ ] No, long-form / full episodes only` |

---

## 3. Item 2: Uncut Media & Transcript Storage / Staging Protocol (`PROV-11`)

### Context
In the 2026-08-27 catalogue audit, 494 private capability URLs were identified across Google Drive (`drive.google.com`), Frame.io (`f.io`), and Zset (`web.zset.in`). These URLs were redacted in the repository to prevent token leakage.

To ingest raw uncut audio and studio transcripts into the provenance spine, we require an authorized, reliable staging workflow.

### Ingestion Protocol Options

#### Option A: Direct R2 Vault Staging via Authenticated `/ops/upload` (Recommended)
- **Mechanism**: Operators or editors log into the Control Room (`/ops`), request a secure, short-lived pre-signed upload URL generated by the Cloudflare Worker, and upload audio files (16kHz FLAC / 128kbps Opus / WAV) or transcript JSON/VTT files directly to R2 bucket `wtfmedia-catalogue`.
- **Advantages**: 100% serverless, zero third-party cloud dependencies, zero external token expiration issues, immediate queue job trigger (`INGEST_QUEUE`), full audit logging.
- **Raw Video Handling**: Video files (50–200 GB) remain on external storage; only extracted audio (100–300 MB) is stored in R2 for transcription and timeline alignment.

#### Option B: Google Drive Shared Vault (`WTF_UNCUT_MASTERS/`)
- **Mechanism**: The editorial team uploads audio and transcript files to a designated Google Drive shared folder. An asynchronous worker with Google Drive API read-only service account credentials polls or receives push notifications, verifies file SHA-256 hashes, and mirrors assets to R2.
- **Advantages**: Integrates directly with existing Google Drive production folder workflows.
- **Requirements**: Requires Google Service Account access to the shared folder.

#### Option C: Frame.io Webhook Integration
- **Mechanism**: A webhook endpoint (`/api/ingest/frameio-webhook`) listens for asset state changes in Frame.io (e.g. project tagged "Approved Uncut Master") and downloads the audio track directly to R2.
- **Advantages**: Automates ingestion directly from post-production review.
- **Requirements**: Frame.io Developer App token and webhook secret.

### Structured Response Form: Item 2

| Field | Description / Instructions | Client Response / Value |
|---|---|---|
| **Selected Uncut Staging Protocol** | Primary protocol for staging uncut audio and transcripts | `[ ] Option A (Direct R2 via /ops/upload)`<br>`[ ] Option B (Google Drive Shared Vault)`<br>`[ ] Option C (Frame.io Webhooks)` |
| **Shared Vault Identifier / Folder ID** | If Option B or C: Shared Google Drive Folder ID or Frame.io Project ID | ⧗ |
| **Uncut File Naming Convention** | Standardized filename pattern used by video editors | ⧗ e.g., `WTF_EP{N}_{GUEST}_UNCUT_AUDIO.wav` |
| **Master Mapping Sheet Link** | Authoritative sheet or manifest mapping uncut filenames to YouTube Video IDs | ⧗ (Link to Google Sheet or uploaded CSV) |
| **Raw Audio Retention Policy in R2** | How long extracted uncut audio (FLAC/Opus) should be retained in R2 | `[ ] Permanent` (Recommended for instant dual-playback)<br>`[ ] 365 Days`<br>`[ ] 90 Days (Purge audio, keep transcripts & alignments)` |
| **Authorized Production Uploaders** | Operator emails authorized to upload uncut media in `/ops` | ⧗ (e.g., `aditi@allthingswtf.com`, `editor@allthingswtf.com`) |

---

## 4. Item 3: Multi-Language / Hinglish & Transliteration Policy (`PROV-12`, `KNOW-07`)

### Context
WTF episodes feature natural conversational code-switching (Hinglish: seamless alternation between English and Hindi phrases, idioms, and colloquialisms). How these dialogues are transcribed, stored, and indexed directly dictates search accuracy in Phase 4 (`KNOW-07`, `KNOW-08`) and playback readability.

### Script & Indexing Options

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │ Spoken Utterance: "Humne yeh socha tha ki startup me..."   │
                    └──────────────────────────────┬──────────────────────────────┘
                                                   │
                ┌──────────────────────────────────┼──────────────────────────────────┐
                ▼                                  ▼                                  ▼
      [ Option A: Latin Hinglish ]       [ Option B: Devanagari + Latin ]   [ Option C: Verbatim + English ]
      - Verbatim phonetic Latin          - Native Devanagari text           - Spoken text (A or B)
      - Segment lang: `hi-Latn`          - Latin transliteration sidecar    - English translation sidecar
      - Natural editorial reading        - High linguistic formality        - Pure English search matches
      - Standard Whisper output          - Dual-script token indexing       - Multi-language RAG parity
```

#### Option A: Phonetic Latin Script Hinglish (Recommended)
- **Description**: Spoken Hindi words are transcribed phonetically in Latin script (e.g., *"humne yeh socha tha ki startup ecosystem me risk lena padega"*).
- **Segment Metadata**: `language_code = 'hi-Latn'`.
- **Search Behavior**: Indexed with phonetic normalization (handling spelling variants like *crore / cr*, *paisa / paise*, *jugaad*).
- **Pros**: Matches standard Whisper ASR Hinglish output; matches how editors type queries into search boxes and communication tools.
- **Cons**: Requires phonetic synonym expansion for English-only semantic queries.

#### Option B: Devanagari Native Script + Latin Transliteration Dual Layer
- **Description**: Hindi speech is transcribed in native Devanagari script (*"हमने यह सोचा था कि..."*) with an automated Latin transliteration layer.
- **Segment Metadata**: `language_code = 'hi'`, sidecar `text_transliterated = '...'`.
- **Pros**: High grammatical and typographical fidelity.
- **Cons**: High complexity in vector indexing and UI rendering; editors rarely type queries in Devanagari script.

#### Option C: Verbatim Spoken Text + English Translation Layer Sidecar
- **Description**: The transcript stores the verbatim spoken words (Option A or B) plus a sentence-aligned English translation sidecar (`text_english_translation`).
- **Segment Metadata**: `language_code = 'hi-Latn'`, `text_english_translation = "We had thought that in the startup ecosystem we must take risks..."`.
- **Pros**: Pure English queries (e.g. *"taking risks in startups"*) reliably retrieve the exact Hindi passage; zero search friction.
- **Cons**: Additional ASR translation compute step during ingestion.

### Structured Response Form: Item 3

| Field | Description / Instructions | Client Response / Value |
|---|---|---|
| **Primary Script Standard for Hindi Dialogues** | Standard script stored in `transcript_segments.text` | `[ ] Option A (Phonetic Latin Hinglish - Recommended)`<br>`[ ] Option B (Devanagari Native Script)`<br>`[ ] Option C (Verbatim Script + English Translation Layer)` |
| **Generate English Translation Sidecar?** | Produce sentence-aligned English translation for non-English passages | `[ ] Yes (Enables English semantic search across all Hindi moments)`<br>`[ ] No (Search verbatim phonetic text only)` |
| **Colloquial Financial & Slang Normalization** | Normalize Indian business terms (*crore, cr, lakh, bhai, jugaad, dhandha*) | `[ ] Yes, normalize into search index dictionary`<br>`[ ] No, keep raw ASR tokens only` |
| **Primary ASR Engine Specification** | Target transcription model for uncut audio processing | `[ ] OpenAI Whisper Large v3 (Self-hosted / Workers AI)`<br>`[ ] AssemblyAI Indic Conformer`<br>`[ ] Custom / Third-party ASR Provider` |

---

## 5. Item 4: IP Taxonomy & Show Category Reconciliation (`PROV-10`, `KNOW-07`)

### Context
As analyzed in `2026-08-27-ip-taxonomy-reconciliation.md`, two differing classification schemes exist in client artifacts:

1. **Source A (Client Build Spec v2.0 §1.2)** defines **6 Content Brand IPs**:
   - `Nitya Kamat`
   - `BTS`
   - `POV`
   - `Animation`
   - `Stitched`
   - `Ways of the World`

2. **Source B (Catalogue Excel Workbooks 2026-08-27)** organizes episodes into **5 Show Properties**:
   - `Podcasts by WTF` (26/27 episodes)
   - `People by WTF` (23/24 episodes)
   - `WTF is Finance` (3/4 episodes)
   - `Special Episodes` (4/4 episodes)
   - `WTF Online` (3/3 episodes)

### Proposed Reconciliation Model

To prevent schema breakage and support both content brand reporting and show filtering, we propose **Option 2 (Two-Dimensional Relational Model)**:
- **`show_title`** (Relational Show Dimension): Stored as one of the 5 show properties (*Podcasts by WTF, People by WTF, WTF is Finance, Special Episodes, WTF Online*).
- **`ip`** (Brand / Format Dimension): Stored as one of the 6 brand categories (*Nitya Kamat, BTS, POV, Animation, Stitched, Ways of the World*), or tagged `WTF Core` where brand IP is not yet designated.

### Structured Response Form: Item 4

| Field | Description / Instructions | Client Response / Value |
|---|---|---|
| **Selected Taxonomy Reconciliation Model** | Choose how WTF OS models IP and Show categories in D1 | `[ ] Option 2: Two-Dimensional (Both 'ip' and 'show_title' stored)`<br>`[ ] Option 1: 5 Show Tabs only (Spec 6-brand list retired)`<br>`[ ] Option 3: Custom Taxonomy (Defined below)` |
| **Master Episode Classification Link** | Link to catalogue spreadsheet with `ip` and `show_title` columns assigned for all 62 rows | ⧗ |
| **Editorial Authority for Taxonomy Disputes** | Name and email of editorial lead who resolves ambiguous episode classifications | ⧗ Name: ____________________<br>Email: ____________________ |
| **Handling of Retired or Legacy Shows** | How to handle discontinued formats (e.g. historical *WTF Online* episodes) | `[ ] Retain historical show tag with status = 'archived'`<br>`[ ] Remap to closest active show category`<br>`[ ] Mark as 'Special Episodes'` |

---

## 6. Item 5: Golden Ten Evaluation Episodes for Timeline Sync (`PROV-13`, `PROV-14`)

### Context
Requirement `PROV-13` establishes a hard performance and precision acceptance gate:
> "Per-episode transcript alignment converts between uncut and published-video coordinates within two seconds for ten owner-approved evaluation episodes."

Because YouTube videos contain intro graphics, sponsor breaks, dynamic chapter cuts, and b-roll inserts, a static mathematical offset ($T_{pub} = T_{uncut} - \Delta$) is mathematically impossible. WTF OS uses a **piecewise linear interval alignment model** (`timeline_alignments` and `alignment_intervals` in D1).

To formally benchmark this engine during Phase 3 verification, we request approval of **10 representative benchmark episodes** spanning different shows, recording durations, edit complexities, and language mixes.

### Candidate Nomination Table (10 Episodes)

Please confirm or replace the nominated episodes below. Each selected episode must have both the **published YouTube Video ID** and matching **uncut raw audio/media asset** available for testing.

| Slot # | Show Category | Nominated Guest / Title | YouTube Video ID / URL | Uncut Asset Filename / Key | Language Mix | Editorial Cut Complexity | Client Confirmation |
|---|---|---|---|---|---|---|---|
| **1** | Podcasts by WTF | Ranbir Kapoor | `⧗` (e.g. `youtube.com/watch?v=...`) | `⧗` | Hinglish | High (Intros, sponsor cut, b-roll) | `[ ] Approved` / `[ ] Replace` |
| **2** | Podcasts by WTF | Gaming in India (Multi-guest) | `⧗` | `⧗` | English / Hinglish | High (Multi-camera cuts, panel) | `[ ] Approved` / `[ ] Replace` |
| **3** | Podcasts by WTF | AI & Future of Tech | `⧗` | `⧗` | English | Standard (Linear discussion) | `[ ] Approved` / `[ ] Replace` |
| **4** | People by WTF | Kishore Biyani | `⧗` | `⧗` | Hinglish | Medium (1-on-1 interview cuts) | `[ ] Approved` / `[ ] Replace` |
| **5** | People by WTF | Nandan Nilekani | `⧗` | `⧗` | English | Standard (Clean studio master) | `[ ] Approved` / `[ ] Replace` |
| **6** | People by WTF | Solo Founder Deep Dive | `⧗` | `⧗` | English / Hinglish | Medium | `[ ] Approved` / `[ ] Replace` |
| **7** | WTF is Finance | Real Estate vs Stocks | `⧗` | `⧗` | Hinglish | High (Graphic inserts, slide sync) | `[ ] Approved` / `[ ] Replace` |
| **8** | WTF is Finance | Mutual Funds & Compounding | `⧗` | `⧗` | English | Medium (Visual chapter cues) | `[ ] Approved` / `[ ] Replace` |
| **9** | Special Episodes | Live Event / Off-site Panel | `⧗` | `⧗` | Mixed | High (Ambient audio, stage cuts) | `[ ] Approved` / `[ ] Replace` |
| **10** | WTF Online / Recent | Recent 2026 Release (Current Pipeline) | `⧗` | `⧗` | Hinglish | Current Standard Pipeline Baseline | `[ ] Approved` / `[ ] Replace` |

---

## 7. Security, Privacy & Boundary Guarantees

In alignment with Phase 2 requirements (`QUAL-05`, `QUAL-12`, `AUTH-10`):

1. **Zero Raw Secret / Credential Storage**: No API keys, OAuth tokens, private bucket keys, or passwords will ever be stored in D1, git, client bundles, or unencrypted storage.
2. **Zero Private Path Leakage**: Internal file paths (e.g. local machine checkouts, private Google Drive folder paths, Frame.io project IDs, S3 bucket ARNs) will **never** be exposed in public API responses, client DOM elements, or frontend errors. All assets are accessed via opaque ULID handles (`ast_<ulid>`) resolved server-side through authenticated `/ops` endpoints.
3. **Role-Gated Media Ingestion**: Only authenticated operators with `super_admin` or `admin` roles can trigger YouTube sync jobs, upload uncut media, or activate transcript versions.
4. **Append-Only Auditing**: Every ingestion trigger, asset upload, transcript activation, and alignment verification records an immutable event in D1 `audit_events` with actor ID, timestamp, entity ULID, and scrubbed metadata.

---

## 8. What We Will Not Do Until Answered (Negative Scope Guardrails)

Until the owner/editorial team reviews this document, populates the response tables, and explicitly authorizes execution:

- ❌ **No Remote YouTube API Calls**: We will not call the YouTube Data API against production channels or consume API quotas.
- ❌ **No Cloud Media Ingestion**: We will not upload raw media or pull assets from private Drive/Frame.io folders into Cloudflare R2.
- ❌ **No D1 Schema Migrations on Staging/Production**: Migration `0005_provenance_spine.sql` will not be executed against remote D1 databases.
- ❌ **No Vector Embedding or Indexing**: We will not generate Vectorize embeddings for unapproved transcript versions or ambiguous taxonomy buckets.
- ❌ **No Universal Time Assumptions**: We will not apply hardcoded mathematical offsets to the dual player interface.
- ❌ **No Remote Worker Deployment**: Phase 3 queue consumers and scheduled cron triggers will remain undeployed on staging and production environments.

---

## 9. Response Submission & Next Steps

To unblock Phase 3 execution:
1. Fill in the values in the structured tables across Items 1 through 5 above (or reply with a completed copy of this document / spreadsheet link).
2. Set the `YOUTUBE_API_KEY` secret in Cloudflare via `cd cloudflare && npx wrangler secret put YOUTUBE_API_KEY`.
3. Provide the link to the master episode mapping sheet with IP and uncut asset mappings.
4. Confirm approval to proceed with Phase 3 execution waves (`03-01` through `03-06`).

---
*Draft-held. Repository state and remote infrastructure remain strictly unchanged until each required value above is authorized by the repository owner.*
