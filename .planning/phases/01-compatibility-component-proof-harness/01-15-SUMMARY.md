# Plan 01-15 Summary — /chat Route Migration

**Status**: COMPLETE
**Completed**: 2026-08-23

## What was done

Migrated the `/chat` route to the dual-variant seam pattern (legacy + migrated), matching the pattern established in 01-12 (shell), 01-13 (connections), and 01-14 (episodes).

### Task 1 — MigratedChatPage component
- Created `web/components/domain/public/MigratedChatPage.tsx` (217 lines)
- Implements: AskComposer, ConversationThread, SourcePanel, loading indicator, abstention detection, error recovery, retry, auto-submit from `?q=` param
- No ModelPicker (per D-10)
- UI-SPEC copy: "ask the catalogue", "ask wtf", "looking through the catalogue", "the catalogue doesn't support that claim", "retry answer"

### Task 2 — Route seam + stories + contract tests
- Updated `web/app/chat/page.tsx` to use `publicUiVariant()` selector
- Created `web/stories/MigratedChatPage.stories.tsx` (14 stories, all `render` functions)
- Created `web/tests/contracts/api-chat.contract.test.ts` (23 tests)
- Threats T-01-45/T-01-46 passed

### Task 3 — Journey tests + rollback proof + privacy scan
- Created `web/tests/journeys/chat.spec.ts` (16 tests)
- Created `web/tests/rollback/chat-variant.spec.ts` (5 tests)
- Registered rollback route in `web/tests/rollback/verify.mjs`
- Threats T-01-47/T-01-48 passed

## Key fixes during execution

1. **Streaming mocks**: Playwright's `route.fulfill()` does NOT reliably deliver a web `ReadableStream` to the browser. All mocks switched to plain string bodies.
2. **Abstention detection**: Component checks for specific phrases ("don't have enough information", "cannot answer", "not enough context"). Mock must send one of these, not empty string.
3. **Loading indicator test**: Used `async (route) => { await new Promise(r => setTimeout(r, 500)); route.fulfill({...}) }` instead of ReadableStream with setTimeout.
4. **Axe test**: `lockToLoopback` in `test.beforeEach` blocked CDN request for axe-core. Added `await page.unroute("**/*")` before injecting axe.
5. **Rollback query param test**: Both variants auto-submit `?q=` and clear the textarea. Changed assertion from checking textarea value to verifying auto-submit fires (user message appears).

## Threat results

| Threat | Task | Status |
|--------|------|--------|
| T-01-45 | 2 | passed |
| T-01-46 | 2 | passed |
| T-01-47 | 3 | passed |
| T-01-48 | 3 | passed |

## Files created/modified

- `web/components/domain/public/MigratedChatPage.tsx` (new)
- `web/app/chat/page.tsx` (modified)
- `web/stories/MigratedChatPage.stories.tsx` (new)
- `web/tests/contracts/api-chat.contract.test.ts` (new)
- `web/tests/journeys/chat.spec.ts` (new)
- `web/tests/rollback/chat-variant.spec.ts` (new)
- `web/tests/rollback/verify.mjs` (modified — added /chat route)
