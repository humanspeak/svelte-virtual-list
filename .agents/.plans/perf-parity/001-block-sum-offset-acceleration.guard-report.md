# Guard report — 001 block-sum-offset-acceleration

**Recommendation: PASS** — the O(n) tail walk is gone (read-budget tests hold at <5,000 reads where the pre-fix code did ~90,000–180,000), every criterion reproduced green by guard, and the one STOP-adjacent deviation fixed a real latent bug instead of hiding it.
**Reviewed at** `6eb6f97` (branch `worktree-agent-a89aec2b882ee21f8`) · 2026-07-14 12:07 · **Plan planned at** `b5da256`
**Integrated** — PR <https://github.com/humanspeak/svelte-virtual-list/pull/423> opened via the `pr` skill for the reviewed snapshot commit `6eb6f97`, published as branch `perf/block-sum-offset-acceleration`. Merging is the operator's call.

## Done criteria

| Criterion                                                                     | Result | Evidence                                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm run check` exits 0                                                      | met    | reproduced 2026-07-14 12:05: `COMPLETED 696 FILES 0 ERRORS 4 WARNINGS` (all 4 warnings pre-existing, on untouched lines)                                                                         |
| `pnpm test` exits 0; 3 perf-budget tests exist and pass (failed at plan time) | met    | reproduced: `18 passed (18)` files, `315 passed (315)` tests; red evidence at plan time: 99,761 / 90,000 / 180,001 reads vs 5,000 budget (executor verbatim, thresholds unchanged in final file) |
| Equivalence tests exist and pass                                              | met    | `virtualList.test.ts` (range + transformY sweeps, seeded sparse caches) and `scrollCalculation.test.ts` (4 aligns × 11 targets) — read by guard, included in the 315                             |
| Full e2e exits 0 on all engines incl. tail-scroll-cost spec                   | met    | reproduced by guard at checkpoint 3 on this exact SHA: `350 passed, 5 skipped`, exit 0 (5 projects)                                                                                              |
| `grep getBlockSums()` in component ≥ 4 sites                                  | met    | reproduced: count = 5 (anchor capture/restore, visibleItems, transformY, scroll)                                                                                                                 |
| `grep "if (INTERNAL_DEBUG) updateDebugTailDistance"` matches                  | met    | reproduced at checkpoint 3; per-frame querySelector + forced layout now debug-gated                                                                                                              |
| `trunk check` no new failures                                                 | met    | reproduced: `Checked 10 modified files — No issues`                                                                                                                                              |
| No files outside in-scope list                                                | met    | `git diff --stat f557765...HEAD` = exactly the 10 in-scope files, 637 insertions; tree clean                                                                                                     |

## Spirit

Delivered. The plan's intent was to make positional math stop paying O(prefix) at scroll depth, using the acceleration the repo already owned. The diff does precisely that: binary-searched start in `calculateVisibleRange`, `blockSums` threaded through all four offset consumers, and the manager now invalidates sums on a hysteresis average snap (the staleness bug the plan called out). Guard independently measured the end-to-end effect: after any long jump on a 200k list, the viewport repaints in ~2 frames **at every depth** — 99% deep recovers exactly as fast as 10%. The equivalence-test mandate also earned its keep by exposing a latent pre-existing bug in the dormant fast path (block-aligned index → offset silently collapsed to 0), which is now fixed and regression-pinned.

## Scope & conduct

- In-scope only? **Yes** — 10/10 files on the plan's list, nothing else.
- STOP conditions respected? **One judged deviation, upheld.** The divergence STOP clause ("any input where the blockSums path differs from legacy") technically fired via the latent fast-path bug. The executor fixed the accelerated path to match legacy (never loosened an assertion), documented it prominently, and the fix is pinned by the `targetIndex: 9999` equivalence case (reads offset at index 10,000 = TOTAL). Guard re-derived the arithmetic and confirms correctness. A second documented judgment call — flooring fixture medians at 2ms for WebKit clock quantization instead of taking the plan's sanctioned 4× threshold raise — kept the stricter 3× limit; a real O(n) regression still fails at 10×+.
- Plan amendments during execution: **none** (one markdownlint placeholder correction to the plan file by guard, cosmetic only).

## Residual risk / follow-ups

- Any future mutator of `_heightCache` or `_averageHeight` MUST invalidate block sums — reviewer checklist item for future manager PRs.
- Blank-viewport flash on jumps larger than the buffer (~2 frames, depth-independent) is pre-existing, inherent behavior — visible loudly on the fixture's red backdrop, invisible-by-background in real apps. The ecosystem fix (isScrolling/placeholder rendering) is a candidate future plan.
- PERF-06 (typed-array height cache) deliberately deferred; re-measure post-merge — remaining walks are ≤ blockSize.
- `pnpm run test:only -- <filter>` does not filter (script's trailing `--` swallows args) — small package.json cleanup, out of scope here.
- If `blockSize` (1000) is ever tuned, the 5,000-read budgets in the perf tests must be revisited.
