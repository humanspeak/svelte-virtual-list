# Guard report — 003 center-align-and-scroll-to-offset

**Recommendation: PASS** — `align: 'center'` and `scrollToOffset()` both land proven (red-first evidence, 2px-tolerance fixture green on all 5 engines), every criterion reproduced on the host by guard, and the one real defect found in review (a racy spec pair) was fixed and re-verified before this verdict.
**Reviewed at** `9860eb5` (branch `feat/165-center-align-scroll-to-offset`, worktree `.claude/worktrees/plan-003-codex`) · 2026-07-14 14:36 · **Plan planned at** `899ba3e` (guard-amended re-baseline of the original `b5da256` plan; amendment logged at checkpoint 1)
**Integrated** — PR <https://github.com/humanspeak/svelte-virtual-list/pull/425> opened via the `pr` skill for the reviewed snapshot `9860eb5` on branch `feat/165-center-align-scroll-to-offset`. Merging is the operator's call.
**Executor** — Codex / GPT-5.6 "Sol" via the codex-rescue runtime — the first non-Claude executor under this guard regime. Verification was split by necessity (sandbox denies localhost binds and worktree git metadata writes): Codex authored and gated on in-sandbox unit+typecheck; guard ran all e2e/trunk gates on the host and made every commit. No gate was waived.

## Done criteria

| Criterion                                                                       | Result | Evidence                                                                                                                                                             |
| ------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run check` exits 0                                                        | met    | reproduced on host at final: `COMPLETED 702 FILES 0 ERRORS 4 WARNINGS` (warnings pre-existing)                                                                       |
| `pnpm test` exits 0; Step-1 center test exists and passes (failed at plan time) | met    | reproduced: `324 passed (324)`; red evidence verbatim from the run: `expected null to be 1820`, 1 failed / 319 passed — exactly the plan's predicted failure         |
| Full e2e exits 0 incl. `tests/issues/issue-165.spec.ts`                         | met    | reproduced on host: `375 passed, 5 skipped`, exit 0 (5 projects; +15 new spec runs over base)                                                                        |
| `grep "'center'"` in types.ts align union                                       | met    | reproduced: 2 matches (union + JSDoc)                                                                                                                                |
| `grep scrollToOffset` in component                                              | met    | reproduced: 2 matches (method + JSDoc); README 3 matches                                                                                                             |
| README documents center + scrollToOffset                                        | met    | reproduced greps; diff read                                                                                                                                          |
| Deprecated `scrollToIndex` byte-identical                                       | met    | function-body diff against `899ba3e` returns identical (region line-shifted only by insertions after it)                                                             |
| No files outside in-scope list                                                  | met    | committed diff = 6 in-scope modified + 2 in-scope created; `src/lib/index.ts` untouched (correct — no new exported type); tree clean after reviewer-artifact cleanup |

## Spirit

Delivered. Issue #165's ask — center an item programmatically — works within 2px on every engine, proven by a self-judging fixture in the house red/green style, and the end-of-list clamp holds (`scrollTop` lands exactly at max, e2e-verified). Issue #66's restore case is covered by `scrollToOffset`, which reuses the extracted `executeScrollToTarget` machinery so abort semantics and anchor suspension behave identically to `scroll()` — the extraction is diff-verified as a pure refactor (70/70 on the scroll + keyboard-abort specs before any new feature landed on top). Red-first ordering was honored across two sandbox interruptions: the failing evidence was captured before any implementation existed.

## Scope & conduct

- In-scope only? **Yes.** The executor explicitly declined the plan's conditional invitation to touch `SvelteVirtualList.test.ts` (not on the scope list) and covered `scrollToOffset` in e2e instead — the right call. One tasteful judgment: the scroll.spec tests inject a `center` option into the test page's align dropdown at runtime rather than editing the out-of-scope page.
- STOP conditions respected? **Yes — five times.** Every STOP across the run was a genuine environment failure (reaped worktree, sandbox network, pnpm version-pin verification, localhost-bind EPERM, git-metadata EPERM), each reported cleanly with zero improvisation and zero stray writes. Full trail in the guard log, checkpoints 2–7.
- Executor drift: **one instance, fixed.** Both new scroll.spec center tests raced the page's smooth-scroll animation (waited for element existence, measured mid-flight — 239,522px error on mobile-safari). Caught by guard's host e2e (invisible to the sandbox's unit gates), diagnosed from Playwright error context, fixed by the executor in one round (`getByLabel('Smooth Scroll').uncheck()`), re-verified 80/80 targeted and 375/375 full.
- Plan amendments during execution: **one, pre-dispatch** — the checkpoint-1 re-baseline (`b5da256` → `899ba3e`) after plans 001/002 merged; recorded with a dated revision note. None during execution.

## Residual risk / follow-ups

- Center alignment for items taller than the viewport anchors past-center then clamps (documented in the plan); if users want virtuoso-style top-anchoring for oversized items, it's a one-line policy change — recorded as a follow-up, not built.
- `initialScrollIndex`/`initialScrollOffset` remain deliberately deferred; `scrollToOffset` in `onMount` is the documented workaround.
- Runtime recipe for future Codex executors on this repo (hard-won, checkpoints 2–7): persistent worktree (ephemeral ones outlive their agent, not the async task); pnpm via the tools-store absolute path (`~/Library/pnpm/.tools/pnpm/11.5.0/bin/pnpm` — no PATH pnpm matches the pin, and the sandbox can't fetch); all e2e and git operations on the host. Alternatively, enabling `[sandbox_workspace_write] network_access = true` in `~/.codex/config.toml` removes the pnpm constraint — guard's attempt to set it was denied by the harness classifier and deliberately not retried; that decision belongs to the operator.
- The reviewer-provided `PLAN-003.md` and the sandbox's stray `.pnpm-store/` were removed from the worktree at close-out; neither was ever committed.
