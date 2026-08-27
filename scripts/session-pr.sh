#!/usr/bin/env bash
#
# session-pr.sh — open a clean, single-concern PR from a bounded set of paths.
#
# Encodes the safety pattern this repo has settled on:
#   * one branch per concern, named wtf/<slug>-<date>
#   * only paths you explicitly pass get staged (no `git add .`)
#   * refuses to run if the working tree also carries unstaged changes to
#     unrelated files unless you pass --allow-dirty
#   * pushes and opens a PR via the GitHub CLI using the repo's PR template
#
# Usage:
#   scripts/session-pr.sh \
#     --slug session-planning-inputs \
#     --title "docs(planning): snapshot podcast catalogue + drafts" \
#     --paths .planning/inputs/podcast-catalog .planning/inputs/client-questions \
#     [--base main] \
#     [--body-file docs/pr-bodies/<slug>.md] \
#     [--allow-dirty] \
#     [--dry-run]
#
# If --body-file is omitted, the PR opens with the repo's template so you
# can edit in the browser.
#
# Requires: git, gh (authenticated), bash 4+.

set -euo pipefail

BASE="main"
SLUG=""
TITLE=""
BODY_FILE=""
DRY_RUN=0
ALLOW_DIRTY=0
declare -a PATHS=()

die() {
  echo "session-pr: $*" >&2
  exit 1
}

usage() {
  sed -n '3,26p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)        SLUG="$2"; shift 2 ;;
    --title)       TITLE="$2"; shift 2 ;;
    --base)        BASE="$2"; shift 2 ;;
    --body-file)   BODY_FILE="$2"; shift 2 ;;
    --paths)
      shift
      while [[ $# -gt 0 && "$1" != --* ]]; do
        PATHS+=("$1"); shift
      done
      ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --dry-run)     DRY_RUN=1; shift ;;
    -h|--help)     usage ;;
    *) die "unknown flag: $1 (try --help)" ;;
  esac
done

[[ -n "$SLUG"  ]] || die "--slug is required"
[[ -n "$TITLE" ]] || die "--title is required"
[[ ${#PATHS[@]} -gt 0 ]] || die "--paths must list at least one path"

command -v git >/dev/null || die "git not found on PATH"
command -v gh  >/dev/null || die "gh CLI not found on PATH"
gh auth status >/dev/null 2>&1 || die "gh is not authenticated (run: gh auth login)"

DATE="$(date +%Y-%m-%d)"
BRANCH="wtf/${SLUG}-${DATE}"

# --- safety: base is clean and we can fast-forward from it -------------------

git fetch origin "$BASE" >/dev/null 2>&1 || die "cannot fetch origin/$BASE"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$BASE" ]]; then
  die "start from $BASE (currently on $CURRENT_BRANCH). git switch $BASE first."
fi

if ! git diff-index --quiet HEAD -- && [[ "$ALLOW_DIRTY" -eq 0 ]]; then
  # unstaged modifications exist somewhere
  UNRELATED=0
  while IFS= read -r line; do
    file="${line:3}"
    included=0
    for p in "${PATHS[@]}"; do
      case "$file" in "$p"|"$p"/*) included=1; break ;; esac
    done
    [[ "$included" -eq 0 ]] && UNRELATED=1 && break
  done < <(git status --porcelain)
  if [[ "$UNRELATED" -eq 1 ]]; then
    die "working tree carries changes outside --paths. re-run with --allow-dirty if intentional, or stash/commit them first."
  fi
fi

# --- create branch, stage only the declared paths ----------------------------

if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  die "branch $BRANCH already exists locally. pick a different --slug or delete it."
fi

echo "session-pr: branching $BRANCH off $BASE"
[[ "$DRY_RUN" -eq 1 ]] || git switch -c "$BRANCH"

for p in "${PATHS[@]}"; do
  [[ -e "$p" ]] || die "path does not exist: $p"
done

echo "session-pr: staging ${#PATHS[@]} path(s)"
[[ "$DRY_RUN" -eq 1 ]] || git add -- "${PATHS[@]}"

STAGED="$(git diff --cached --name-only | wc -l | tr -d ' ')"
if [[ "$STAGED" -eq 0 && "$DRY_RUN" -eq 0 ]]; then
  die "nothing staged. did the paths already match HEAD?"
fi

echo "session-pr: staged file count = $STAGED"
git diff --cached --stat | tail -20 || true

# --- commit + push -----------------------------------------------------------

COMMIT_MSG="$TITLE"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "session-pr: DRY RUN — would commit '$COMMIT_MSG', push $BRANCH, open PR against $BASE"
  exit 0
fi

git commit -m "$COMMIT_MSG"
git push -u origin "$BRANCH"

# --- open the PR -------------------------------------------------------------

PR_ARGS=(pr create --base "$BASE" --head "$BRANCH" --title "$TITLE")
if [[ -n "$BODY_FILE" ]]; then
  [[ -f "$BODY_FILE" ]] || die "--body-file not found: $BODY_FILE"
  PR_ARGS+=(--body-file "$BODY_FILE")
else
  # gh will use .github/PULL_REQUEST_TEMPLATE.md automatically
  PR_ARGS+=(--body "")
fi

echo "session-pr: opening PR"
gh "${PR_ARGS[@]}"
