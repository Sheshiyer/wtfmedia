# Session-PR workflow

A minimal, reusable pattern for turning a working session's output into a
clean, reviewable PR without accidentally bundling unrelated in-flight work.

## When to use it

Any time a session produces a bounded set of new or updated files that:

- live under a single concern (planning docs, snapshot data, one code
  slice, one docs slice), and
- can be reviewed on their own without the reviewer needing context from
  other in-flight work in the same tree.

The typical example: a session added planning inputs under
`.planning/inputs/` while the working tree also carried unrelated
in-progress edits under `web/`. Session-PR keeps those two apart.

## The primitive

`scripts/session-pr.sh` encodes the safety pattern:

1. **One branch per concern.** Branch name is `wtf/<slug>-<YYYY-MM-DD>`.
2. **Explicit paths only.** No `git add .`. You pass every path that
   should ship, and the script refuses to run if the working tree also
   carries unrelated changes (unless you pass `--allow-dirty` deliberately).
3. **Base is `main`.** The script fetches `origin/main` first and refuses
   to run from any other branch, so you never accidentally branch off
   stale state.
4. **PR opens with the repository template.** See
   `.github/PULL_REQUEST_TEMPLATE.md`. If you have a longer body already
   drafted, pass `--body-file`.
5. **Dry-run supported.** `--dry-run` prints what would happen without
   creating the branch or touching remote.

## Example

```bash
scripts/session-pr.sh \
  --slug session-planning-inputs \
  --title "docs(planning): snapshot podcast catalogue + drafts" \
  --paths \
    .planning/inputs/podcast-catalog \
    .planning/inputs/client-questions
```

Result: fresh branch `wtf/session-planning-inputs-2026-08-27` off `main`,
only the two given paths staged, one commit with the given title, pushed
to `origin`, PR opened via `gh` using the repo template.

## What the safety pattern rules out

- Bundling a docs update with unrelated code changes just because both
  were in the tree.
- Force-pushing over a branch someone else may be reviewing (the script
  refuses if the branch already exists).
- Branching off a stale `main` (the script fetches first).
- Silently including secrets: since only paths you name are staged, a
  stray `.env` in the tree cannot land unless you name it.

## What the safety pattern does not do

- It does not run tests. Add a `--verify` hook per-concern if you want that.
- It does not update `.planning/STATE.md` or open a GSD task. That
  remains the caller's responsibility.
- It does not squash. If your session made multiple commits on `main`
  before running this script, they will not be included — only what you
  stage now goes in.
- It does not lint the PR body. The template has checkboxes; use them.

## Rollback

Every step is reversible up until push:

- Before push: `git switch main && git branch -D wtf/<slug>-<date>`.
- After push, before merge: `gh pr close <number>` then push a delete of
  the remote branch — `git push origin --delete wtf/<slug>-<date>`.
- After merge: `git revert -m 1 <merge-commit>` on `main`, or
  `git revert <squash-commit>` if you squash-merge.

## Triggering multi-agent review

Once the PR is open, comment `/code-review ultra` on the PR (or run the
same command in a Claude Code terminal targeting the PR number) to launch
the cloud review. This is user-triggered and billed — it is not
automated, and no session-PR script step launches it.

## The complementary rule that lives outside this script

**Never `git add .` in this repo.** The working tree routinely carries
multi-concern in-flight work. The rule the script encodes for one branch
also applies to any commit made without the script: stage the specific
files you meant to stage, review `git status` and `git diff --cached`
before committing, and check any newly-added file for secrets before
pushing.
