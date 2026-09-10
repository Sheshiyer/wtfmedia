# Beta open-enrollment authentication plan

## Goal

Make staging Beta sign-in predictable: every verified Clerk user receives one
private, owner-scoped member account, while only active D1 operator records can
enter the admin workspace. Public Alpha and production remain unchanged.

## Root cause

Three independent gates were presented as one flow:

1. Clerk development-instance sign-up is restricted, so a Google identity
   without a usable invitation cannot create a Clerk user.
2. Edge membership currently requires a pre-existing `member_users` invitation
   row, so a valid non-operator Clerk session is still denied.
3. Admin authority is a separate active `operators` email mapping; testing the
   member path with that same super-admin address routes to `/beta/ops` by
   design and cannot prove member onboarding.

Repeated callback changes could not remove gates 1 or 2, so they did not resolve
the end-to-end failure.

## Target policy

- Clerk establishes identity only.
- An active D1 `operators` row establishes `editor`, `admin`, or `super_admin`.
- A verified Clerk identity with no active operator row self-provisions exactly
  one active `member_users` row bound to the Clerk subject.
- Existing suspended or revoked member rows remain denied and are never
  recreated.
- Conversation and saved-memory queries continue binding `member_id` at the SQL
  boundary. No admin roster screen may expose member payloads.
- Open enrollment remains staging-only; production member APIs remain denied.

## Execution gates

1. Remove the temporary `/beta/preview` fixture from source and staging.
2. Ship and test the Edge self-provision policy for verified non-operators.
3. In the correct `mighty-hedgehog-2913` Clerk development instance, disable
   restricted sign-up and keep Google enabled. This is a provider configuration
   change and must be verified against that exact instance before mutation.
4. Sign in with the active super-admin address and verify `/beta` resolves to
   `/beta/ops`; confirm no member row is created for that subject.
5. Sign in with two ordinary Google accounts and verify each creates a distinct
   active member row with its own immutable Clerk subject.
6. For Member A, create a conversation, continue it, save memory, archive both,
   sign out, and sign back in.
7. For Member B, confirm Member A identifiers return the same non-enumerating
   denial as unknown identifiers and never appear in list results.
8. Read back only lifecycle and ownership metadata from staging D1. Do not read
   prompt, answer, or saved-memory bodies during acceptance.

## Release evidence

- Clerk: correct instance identifier, unrestricted sign-up state, Google
  provider enabled, successful user/session IDs redacted to prefixes.
- Web: `/beta` redirect destination for operator and member personas.
- Edge: authenticated context, chat list, and memory list return 200 for each
  ordinary member; unsigned requests remain non-enumerating 404.
- D1: one operator mapping for the admin, two distinct member-to-Clerk bindings,
  and owner-scoped conversation/memory counts.
- Tests: Clerk verification, operator exclusion, member self-provisioning,
  suspension/revocation, owner isolation, archive-only behavior, typecheck,
  lint, production build, and Phase 2 deterministic verification.

## Stop conditions

- Stop if the available Clerk CLI/dashboard targets any instance other than
  `mighty-hedgehog-2913`.
- Stop if a proposed change would alter `wtfhq.in`, production Workers, DNS,
  production D1, or public Alpha.
- Do not call the Beta accepted until both ordinary-member accounts and the
  super-admin route have live receipts.
