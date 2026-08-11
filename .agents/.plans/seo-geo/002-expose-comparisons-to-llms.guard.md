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
