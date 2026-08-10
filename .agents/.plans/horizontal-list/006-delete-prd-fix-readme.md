# Plan 006: Delete the stale PRD and repair README test commands

> **Executor instructions**: The maintainer explicitly chose deletion over refreshing
> the PRD. Do not rewrite or replace it. Update the sibling README status when done.
>
> **Drift check (run first)**:
> `git diff --stat 0e343e5..HEAD -- PRD.md README.md`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `0e343e5`, 2026-08-09

## Why this matters

`PRD.md` presents shipped infinite-loading behavior as planned work and contains stale
phase numbering and API proposals. The maintainer has directed that this obsolete
document be deleted, not updated. README also provides a nonexistent unit-test path,
so copied commands fail.

## Current state

- `PRD.md:80-108` calls infinite scrolling planned and proposes APIs different from
  the shipped `onLoadMore`, `loadMoreThreshold`, and `hasMore` props.
- `PRD.md:182-199` repeats the stale roadmap.
- `README.md:219-220` references nonexistent
  `src/lib/utils/throttle.test.ts` and omits the package-runner form used elsewhere.
- `README.md:232-233` has a valid existing E2E file but uses `npx` rather than the
  repository's pinned `pnpm exec` convention.

## Commands

Use `rg -n "PRD\.md|throttle\.test" . --glob '!node_modules/**' --glob '!.git/**'` to
find references, `trunk check README.md` for lint, and `git diff --check` for whitespace.

## Scope

**In scope**: delete `PRD.md`; edit `README.md`; remove direct links to `PRD.md` only
where found in tracked Markdown/navigation files.

**Out of scope**: authoring a replacement roadmap, changing runtime behavior, broad
README restructuring, or modifying generated/static mirrors.

## Steps

1. Search all tracked files for `PRD.md` references and record each owner.
   **Verify**: `git grep -n 'PRD\.md'` produces a finite reviewed list.
2. Delete `PRD.md` completely. Remove direct navigation/link references; do not copy
   its content elsewhere. **Verify**: `test ! -e PRD.md && ! git grep -n 'PRD\.md'`.
3. Replace the nonexistent unit example with a real focused test, preferably
   `pnpm exec vitest run src/lib/utils/virtualList.test.ts`. Normalize the focused E2E
   example to `pnpm exec playwright test tests/docs-visit.spec.ts --project=chromium`
   unless plan 005 moved that test; if so, use a stable existing root spec.
   **Verify**: both documented focused commands execute and pass.
4. Run `trunk fmt README.md`, `trunk check README.md`, and `git diff --check`.

## Test plan and done criteria

This is documentation/tooling only, so no red runtime test is appropriate.

- [ ] `PRD.md` is deleted and no tracked file links to it.
- [ ] No replacement PRD or roadmap is introduced.
- [ ] Both README commands refer to existing files and pass.
- [ ] Markdown lint and whitespace checks pass.
- [ ] Only scoped docs and the batch status change.

## STOP conditions

- A build tool requires `PRD.md` as an input.
- A public site route embeds the file and deletion needs a product redirect decision.
- Plan 005 changes the recommended focused E2E path while this plan is in progress;
  rebase and use the post-005 stable path.

## Git workflow and maintenance

Use branch `docs/remove-stale-prd`, commit `docs: remove stale PRD and fix test commands`.
Future product direction belongs in issues/plans rather than restoring this stale PRD.
