# WTF One Brain Visuals — Imagegen Prompt Ledger

**Mode:** Built-in `image_gen`

**Generated:** 2026-08-19

**Status:** Review candidate; not yet committed

Both assets were generated as new images from repository style references, not
as edits. The references were:

1. `web/public/brand/contact-sheet.png` — composition and UI language.
2. `web/public/brand/control-room.png` — tactile icons, cards, and print texture.
3. `web/public/brand/flow-diagram.png` — editorial flow and hierarchy.

The generated moodboard became the primary reference for the flow board.

## Moodboard Prompt

```text
Use case: ui-mockup
Asset type: 16:9 project visual moodboard for the WTF Media evidence-native podcast operating system
Input images: Image 1 is the primary composition and UI-language reference; Image 2 is the tactile icon/card and control-room reference; Image 3 is the editorial flow and information-hierarchy reference. Treat all three as style references, not edit targets.
Primary request: Create a polished visual moodboard showing the new design-system direction for WTF Media. The new narrative is “receipts become actions”: source evidence flows into an accountable owner, workflow state, and next action. This is dependable daily operator software with the personality of an irreverent independent-media zine, not a generic SaaS dashboard.
Scene/backdrop: warm cream paper field with subtle halftone grain, screenprint imperfections, crisp ink rules, offset shadows, clipped paper layers, and generous structured whitespace.
Subject: one coherent board with six visual zones: (1) brand DNA and material texture; (2) typography hierarchy; (3) semantic color chips; (4) accessible UI primitives such as buttons, fields, tabs, status chips, tooltips, dialogs, drawers, toasts, focus rings, skeletons, and error/empty/offline states; (5) reusable patterns such as workspace header, command search, filters, evidence cards, source panel, timeline, dense table, board, calendar, graph plus accessible list; (6) small representative screen fragments for public catalogue, operator shell, canonical episode workspace, Knowledge, Production, Analytics, People, and Integrations.
Style/medium: realistic high-fidelity product-design moodboard, editorial Swiss grid fused with 1970s underground newspaper and risograph/letterpress texture; practical product UI, not concept art.
Composition/framing: wide landscape 16:9, modular asymmetric grid, strong scan path, cream and ink dominate at least 80%, color is purposeful and sparse, readable large headings, no tiny body copy.
Lighting/mood: flat printed-paper lighting, tactile but crisp, energetic, exact, warm, trustworthy.
Color palette: canvas #FFF6EA, subtle paper #F0EADF, raised #FFFCF7, ink #1A1A1A; committed accents red #C53B3A, green #0C9367, yellow #F1B333, purple #6758A5, blue #2D6BE0; provisional orange #F07633 only for production/in-progress examples.
Typography: condensed black editorial display energy; Bricolage Grotesque-style grotesk for UI; Fraunces-style serif for editorial moments; Poppins-style clean body text. Preserve the reference images’ tactile weight, but do not copy their outdated Anton labeling.
Text (verbatim, only these large labels): “WTF MEDIA”, “RECEIPTS BECOME ACTIONS”, “PUBLIC”, “OPERATIONS”, “EVIDENCE”, “OWNER”, “STATE”, “NEXT ACTION”, “COMPONENT STATES”.
Constraints: preserve the existing WTF brand theme and palette; do not invent a new logo; do not use glassmorphism, neon gradients, glossy 3D, generic blue enterprise styling, excessive rounded cards, stock photography, or decorative analytics without provenance; show clear black focus rings and distinguish unknown, unavailable, stale, partial, error, empty, offline, and measured zero visually; no private data, no real names, no credentials, no watermark; render exact requested labels once each where practical and do not add gibberish text.
```

## Application Flow Prompt

```text
Use case: infographic-diagram
Asset type: 16:9 visual application-flow board for WTF Media v1.0 One Brain Re-foundation
Input images: Image 1 is the newly approved moodboard and primary design-language reference; Image 2 is the existing editorial flow-diagram reference; Image 3 is the existing screen-system reference. Treat all as style references, not edit targets.
Primary request: Create a polished, readable system-flow infographic for the complete WTF Media product. Show two distinct user lanes over shared evidence: a PUBLIC lane and an authenticated OPERATIONS lane. Make Phases 1 and 2 visually dominant and marked as “EXECUTE FIRST”; show Phases 3 through 8 as a quieter sequenced roadmap marked “LATER”, without implying they are already built.
Scene/backdrop: warm cream paper field with subtle halftone grain, black ink rules, offset-print shadows, clipped-panel structure, and sparse editorial accent color.
Subject and exact flow:
PUBLIC lane: “HOME” -> “EPISODES” -> “EPISODE” -> “CONNECTIONS” -> “ASK WTF”.
OPERATIONS lane entry: “SIGN IN” -> “CONTROL ROOM” -> “EPISODES” -> “EPISODE WORKSPACE”.
Inside EPISODE WORKSPACE, show these tabs as a compact cluster: “OVERVIEW”, “ASSETS”, “TRANSCRIPT”, “TIMELINES”, “CLIPS”, “PRODUCTION”, “ANALYTICS”, “ACTIVITY”.
From EPISODE WORKSPACE, connect outward to “KNOWLEDGE”, “PRODUCTION”, “ANALYTICS”, “PEOPLE”, and “INTEGRATIONS”.
Shared center spine: “EVIDENCE” -> “OWNER” -> “STATE” -> “NEXT ACTION”, with arrows showing that both public and operations projections read from shared evidence but never share permissions or interaction state.
Roadmap ribbon: “PHASE 1 — CONTRACTS + COMPONENT PROOF” -> “PHASE 2 — AUTH + OPERATOR SHELL” -> “PHASE 3 — PROVENANCE” -> “PHASE 4 — KNOWLEDGE” -> “PHASE 5 — PRODUCTION + CONTROL ROOM” -> “PHASE 6 — ANALYTICS + PEOPLE” -> “PHASE 7 — READ-ONLY INTEGRATIONS” -> “PHASE 8 — MIGRATION CLOSURE”. Highlight only Phase 1 and Phase 2 as active/execute-first; the rest are planned later.
Style/medium: clean vector-like editorial infographic fused with practical product UI, Swiss information hierarchy plus 1970s independent-media screenprint texture; not futuristic concept art.
Composition/framing: wide landscape, left-to-right route flow on top, central evidence spine, operator workspace map in the middle, roadmap ribbon across the bottom; large readable labels, limited body text, strong arrows, scan-friendly whitespace.
Color palette: #FFF6EA and #1A1A1A dominate; use #C53B3A and #F1B333 to emphasize execute-first; #0C9367 for verified/shared evidence; #6758A5 for Knowledge; #2D6BE0 for information; #F07633 only for production; later phases mostly ink outlines on #F0EADF.
Typography: condensed black editorial headings, clean grotesk UI labels, small serif editorial accents.
Text (verbatim): use only the exact labels specified above plus “PUBLIC”, “OPERATIONS”, “SHARED EVIDENCE”, “EXECUTE FIRST”, “LATER”, and “RECEIPTS BECOME ACTIONS”.
Constraints: preserve the existing WTF identity; accurately separate public and authenticated flows; do not depict provider logos, credentials, private data, real people, or completed later-phase features; do not add a new logo; no glassmorphism, neon gradients, glossy 3D, generic blue enterprise styling, excessive rounded cards, tiny illegible text, gibberish, or watermark.
```

## Accuracy Boundary

The raster boards are visual companions. `docs/design/APP-FLOW.md`,
`docs/design/COMPONENT-INVENTORY.md`, `DESIGN.md`, `ISA.md`, and the GSD
requirements/roadmap govern exact behavior. Provider logos visible in a visual
example do not authorize or assert an integration.
