# Guard log — 001 block-sum-offset-acceleration

## Checkpoint 1 — 2026-07-13 12:51 — ON TRACK

b5da256 · pre-flight baseline, no executor work yet

- Drift check clean: HEAD == Planned-at SHA (`b5da256`); `git diff --stat b5da256..HEAD -- src/lib/` empty; working tree clean except untracked `.agents/`.
- Dependencies: plan declares none; batch README confirms.
- Executor being dispatched: general-purpose subagent, model Opus 4.8, isolated worktree, full plan text inlined (batch folder was uncommitted at authoring; committed at this checkpoint so the record travels with the branch).
- Operator instruction of record: operator explicitly authorized execution of 001 and 002 on Opus agents; the house fixture-ritual's human red-review pause is therefore satisfied by capturing red evidence in the executor report for guard verification instead of an interactive pause.
- Action: none needed — dispatching.

## Checkpoint 2 — 2026-07-13 12:58 — BLOCKED (dispatch environment, resolved by re-dispatch)

06561e9 · first executor attempt stopped pre-work; no code to judge

- First executor (Opus 4.8) STOPPED correctly at its first precondition: worktree was based on origin/main tip `f557765`, not on the plan-batch commit `06561e9` — `.agents/` absent from that lineage. Zero files changed, zero commands run. Exemplary STOP discipline; no drift, no violation.
- Guard verified the base is source-equivalent: `git diff --stat b5da256..f557765 -- src/lib/ tests/` is EMPTY (the #416 branch was squash-merged to main as `59c5296`). Plan excerpts remain valid at that base; drift check satisfied by tree-equivalence, not ancestry.
- Root cause was guard's own dispatch deviation: relied on the committed plan file instead of inlining plan text (the improve execute reference mandates inlining). Corrected: second executor dispatched with the full plan text inlined, told the reviewer ran the drift check (no drift) and that the missing `.agents/` folder is expected, e2e runs under `CI=1` to avoid silently reusing a foreign dev server on port 4173.
- Action: reported to operator; re-dispatched. No plan amendment — the plan was never the problem.

## Checkpoint 3 — 2026-07-14 10:28 — ON TRACK

6eb6f97 (branch `worktree-agent-a89aec2b882ee21f8`, worktree `.claude/worktrees/agent-a89aec2b882ee21f8`) · full review of the completed run — verdict: APPROVE

- Executor (Opus 4.8) reported COMPLETE after two interruptions (API session limit mid-Step-5; a stalled background e2e it killed and re-ran synchronously). Report survived a claim-by-claim audit.
- Scope: `git diff --stat f557765...HEAD` shows exactly the 10 in-scope files (637 insertions), tree clean, two conventional commits (`e0b42ce` steps 1–5, `6eb6f97` step 6).
- Done criteria reproduced by guard, not trusted: `pnpm run check` 0 errors (4 pre-existing warnings on untouched lines); `pnpm test` 315/315; `CI=1 pnpm run test:e2e` 350 passed / 5 skipped / exit 0; `trunk check` no issues; greps — `getBlockSums()` ×5 in component, `if (INTERNAL_DEBUG) updateDebugTailDistance` present, `as unknown as` count 0 in perf-budget test.
- Red evidence verified: Step-1 tests failed pre-fix with 99,761 / 90,000 / 180,001 reads vs the 5,000 budget (verbatim in executor report); budgets unchanged at 5,000 in the final file — criterion not gamed.
- Diff read in full. Binary search invariants checked by hand (smallest block with cumSum > scrollTop; worst-case walk ≤ blockSize + partial). Manager invalidation fires exactly when the published average moves. Component wiring minimal, all five sites.
- Documented deviation 1 (upheld): equivalence testing exposed a LATENT PRE-EXISTING BUG in `getScrollOffsetForIndex`'s fast path — a block-aligned index at/past the last stored sum read `undefined` and collapsed the offset to 0. Executor fixed the accelerated path (`effBlock` clamp, virtualList.ts) rather than loosening the assertion; guard re-derived the arithmetic and confirms correctness. This brushes the plan's divergence STOP clause, but the clause's intent (no assertion-loosening, no silent divergence) was honored: documented prominently, regression pinned by the `targetIndex: 9999` equivalence case whose `itemBottom` reads offset at index 10,000 = TOTAL. Judged on merit: correct, in scope, serves "Why this matters".
- Documented deviation 2 (upheld): fixture flake on WebKit-family engines was clock quantization (`headMs=0`), not signal. Executor floored both medians at 2ms and KEPT the stricter 3× threshold rather than taking the plan's sanctioned 4× raise; raw medians still displayed. A real O(n) regression (tail in tens of ms) still fails at 10×+. Two consecutive clean 5/5 runs, reproduced by guard in the full-suite rerun.
- Bonus finding for the maintainer: `pnpm run test:only -- <filter>` does not actually filter (script ends `vitest run --`, so args land after a second `--`); worth a future package.json cleanup, out of scope here.
- Action: index updated (001 → DONE), work stays on the worktree branch unmerged pending operator; dispatching plan 002 next.

## Checkpoint 4 — 2026-07-14 12:07 — ON TRACK (final close-out, PASS)

6eb6f97 · `guard final` — snapshot unchanged since checkpoint 3 (verified: same HEAD, clean tree)

- Fast gates re-reproduced at final: `pnpm run check` 0 errors; `pnpm test` 315/315; `trunk check` clean; wiring greps pass (`getBlockSums()` ×5, casts 0). Full e2e stands on checkpoint 3's reproduction (same SHA, `350 passed / 5 skipped`).
- Operator's browser question about the red backdrop answered with measurement: blank viewport lasts exactly ~2 frames after any long jump, at every depth (10%–99% identical), zero blank px during buffer-sized scrolling — pre-existing, inherent, and depth-independence is this plan's win. Recorded in the report's residual-risk section.
- Close-out report written: `001-block-sum-offset-acceleration.guard-report.md` — **PASS**.
- Integrated: branch published as `perf/block-sum-offset-acceleration`, PR <https://github.com/humanspeak/svelte-virtual-list/pull/423> opened via the `pr` skill (body sanity-checked). Merge is the operator's.
- Action: report + log committed; awaiting operator merge decision.
