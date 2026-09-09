# Clerk operator Beta auth boundary — 2026-09-08

## Decision

Clerk replaces Cloudflare Access as the authentication provider for the
operator Beta only. Anonymous Alpha remains the public, stateless experience
at `/`, `/chat`, and `/api/chat`; this change does not make the public chat
account-gated.

## Session-token flow

The Clerk dashboard's Sessions → Customize session token editor contains:

```json
{ "email": "{{user.primary_email_address}}" }
```

Clerk's default `sub` claim supplies the user id. No role, operator id, or
permissions are placed in the token. The edge verifies the signed session
JWT, reads the custom email claim, normalizes it, resolves the active D1
operator, and applies the existing deny-by-default RBAC policy.

## Preserved contracts

- Clerk session JWTs are verified at the edge against issuer and JWKS, with an
  authorized-party check where configured.
- The verified email is normalized and resolved against the existing active D1
  `operators` roster. D1 remains the role authority; Clerk claims and browser
  state never grant `super_admin`, `admin`, or `editor` capability.
- The existing deny-by-default policy, signed edge-to-origin context, audit
  envelope, owner-scoped chat history, release manifest, route set, and
  unavailable/permission/recovery states remain in place.
- The credential is stripped before the web origin receives the signed
  operator context.

## Issue boundary

For this slice, the work represented by GitHub issues #50–#52 is constrained
to the Clerk operator-Beta foundation: public `/chat` remains anonymous Alpha.
The existing operator-owned history implementation stays scoped to the D1
operator identity; cross-user public history and cross-chat memory remain
follow-on work and must not be inferred from this provider swap.

## Open release gates

The repository implementation is merged to `release/beta` through PRs #53–#55
but is not a deployment receipt. Staging still needs a Clerk publishable key in
the web build, the matching Clerk authorized party, interactive sign-in,
sign-out, and revocation checks, and separate owner-approved migration and
deployment. No production instance, secret, DNS, or Cloudflare policy was
changed by this slice.
