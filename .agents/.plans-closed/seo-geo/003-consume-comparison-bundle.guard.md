# Guard log — 003 consume comparison bundle

## Checkpoint 1 — 2026-08-11 09:35 — PLAN AMENDED

`cac2749` · preflight after docs-kit GA release

- Docs-kit commit `cb29390` passed guard verification and GA workflow
  `31496812608` published tag `2026.8.1` at that exact commit.
- Plan 003 now names the immutable dependency tag and anchors its consumer
  drift check at the current reviewed branch tip.
- Action: plan amended and re-stamped before executor dispatch.

## Checkpoint 2 — 2026-08-11 09:40 — PLAN AMENDED

`61bafea` · executor STOP on pnpm allowBuilds contract

- `pnpm --filter docs check` rejected the released dependency because
  `pnpm-workspace.yaml` still allowed only the previous docs-kit tarball SHA.
- The file's existing comment explicitly requires refreshing this key whenever
  the tag changes, so omitting it from Scope was a plan defect.
- Action: added `pnpm-workspace.yaml` to Scope and specified the exact
  `cb29390...` key/value replacement; executor may resume.

## Checkpoint 3 — 2026-08-11 09:42 — PLAN AMENDED

`61bafea` · executor STOP on generated comparison artifacts

- The released bundle generated all six `docs/static/compare/*.md` files, but
  the consumer ignored only `static/llms*.txt`; `git status` exposed the new
  directory as untracked.
- The plan requires generated artifacts to remain ignored, so omitting
  `docs/.gitignore` from Scope was a plan defect.
- Action: added `docs/.gitignore` to Scope and required the
  `static/compare/` rule plus a `git check-ignore` gate.

## Checkpoint 4 — 2026-08-11 09:52 — ON TRACK

`7fbbd18` · final consumer close-out after test hardening

- Guard found and corrected through the executor a vacuous canonical-link
  substring assertion; the final test requires the exact llmstxt.org
  `.md`-target plus `: canonical HTML` line shape.
- Guard reproduced docs check (0 errors, 6 pre-existing warnings), fresh build,
  all 5 Playwright tests, Trunk, diff checks, ignore rules, six generated
  mirrors, priority ordering, and comparison bodies in `llms-full.txt`.
- Scope audit found only the six amended implementation files; generated
  comparison and LLM artifacts remain ignored.
- Action: Plan 003 marked DONE and batch closed. No PR opened per operator's
  request to eye test the branch first.
