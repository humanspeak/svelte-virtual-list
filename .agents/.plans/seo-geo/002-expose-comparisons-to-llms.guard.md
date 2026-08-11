# Guard log — 002 expose comparisons to LLMs

## Checkpoint 1 — 2026-08-11 09:15 — PLAN AMENDED

`d8be6c8` · preflight after Plan 001 completed

- Plan 001 legitimately changed the shared `docs/e2e/demo.test.ts`, making the
  original `2dd2a8c` drift anchor stale for Plan 002.
- The plan now anchors at reviewed tip `d8be6c8` and explicitly requires the
  Plan 001 regression test to be preserved.
- Action: plan amended and re-stamped before executor dispatch; no source code
  changed during preflight.

## Checkpoint 2 — 2026-08-11 09:24 — PLAN AMENDED

`cd90ef6` · operator-directed cross-repository redesign

- The repo-local manual link list duplicated comparison knowledge and did not
  create the requested `/compare/<slug>.md` citation surfaces.
- Plan 002 now targets a clean docs-kit worktree and defines one pre-build
  comparison bundle input that generates mirrors, `llms.txt` discovery, and
  `llms-full.txt` content.
- Plan 003 now owns consumption of the GA-generated docs-kit tag in this repo.
- Action: interrupted the original executor, had it revert all Plan 002 source
  edits, and amended the batch before redispatch.

## Checkpoint 3 — 2026-08-11 09:34 — ON TRACK

`cb29390` · final docs-kit close-out and release

- Guard reproduced 6 focused Node tests, docs-kit check with 0 errors/warnings,
  package build, Trunk checks, and clean diff checks.
- Full diff inspection confirmed one `comparisons` input generates the index
  and per-slug Markdown mirrors, `.md` discovery links with canonical HTML
  notes, and optional `llms-full.txt` inclusion while preserving legacy output.
- Scope audit found only the six docs-kit files authorized by the plan.
- Direct push advanced docs-kit `main` from `16556e6` to `cb29390`; GA workflow
  run `31496812608` passed and published tag `2026.8.1` at that commit.
- Action: Plan 002 marked DONE; tag `2026.8.1` unblocks Plan 003.
