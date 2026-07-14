# Guard report — 002 public-range-change-callback

**Recommendation: PASS** — the range/edge state every comparison library exposes is now a first-class prop, implemented exactly to the plan's specified shape, with genuine dedupe coverage; all criteria reproduced green by guard on the final snapshot including the operator-requested loudness revision.
**Reviewed at** `3394efc` (branch `worktree-agent-a0c81ae1f02cfbbfb`) · 2026-07-14 12:34 · **Plan planned at** `b5da256` (drift check satisfied by source-tree equivalence with base `f557765`; verified empty diff on in-scope paths)
**Integrated** — PR <https://github.com/humanspeak/svelte-virtual-list/pull/424> opened via the `pr` skill, published as branch `feat/on-range-change-callback`; updated with the CodeRabbit fix (`d2633bd..3394efc` pushed). Merging is the operator's call.
**External review** — CodeRabbit (operator-requested) reviewed all 7 files: **1 finding, fixed** — the verdict-spec waits matched any digit (incl. the failing `finalPass=0` state); now they wait for the pass tokens directly (`3394efc`, spec-only, re-verified 10/10 across 5 engines by guard). No other findings.

## Done criteria

| Criterion                                                  | Result | Evidence                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run check` exits 0                                   | met    | reproduced 2026-07-14 12:05 on `d2633bd`: `COMPLETED 695 FILES 0 ERRORS 4 WARNINGS` (warnings pre-existing)                                                                                                          |
| `pnpm test` exits 0; 4 new unit tests exist and pass       | met    | reproduced: `17 passed (17)` files, `312 passed (312)` (308 baseline + 4 new); assertions audited — initial payload values pinned, dedupe via real rerender, exact key-set check per call, absent-prop console spies |
| Full e2e exits 0 incl. range-callback spec                 | met    | reproduced by guard on `d2633bd`: `355 passed, 5 skipped`, exit 0 (5 projects; includes the 2 spec tests × 5)                                                                                                        |
| `grep SvelteVirtualListRangeInfo src/lib/index.ts` matches | met    | reproduced: 2 matches (import + re-export)                                                                                                                                                                           |
| `grep onRangeChange README.md` matches                     | met    | reproduced: 3 matches (props row + usage section)                                                                                                                                                                    |
| `debugFunction` behavior unchanged                         | met    | reproduced: 4 call sites, same as pre-change; diff shows the debug channel untouched                                                                                                                                 |
| No files outside in-scope list                             | met    | `git diff --stat f557765...HEAD` = exactly the 7 in-scope files; tree clean after revision commit                                                                                                                    |

## Spirit

Delivered. The plan's point was that consumers needed the visible-range/edge state without abusing debug mode — the diff promotes exactly the trimmed `{start, end, atTop, atBottom}` payload through a deduped `$effect` whose edge math mirrors `createDebugInfo`, so the public and debug channels can never disagree. The dedupe is real and observable (guard's browser checklist: `calls` ticks only on genuine window shifts and goes silent at rest). One revision round, operator-requested: the fixture page was below the house "loud and diagnostic" bar (no fail state, neutral backdrop); the executor added self-judging red/green verdict rows that resolve on every terminal path — including callback-never-fired and viewport-never-rendered — plus the warning-red backdrop, and extended the spec to assert the page's own verdicts.

## Scope & conduct

- In-scope only? **Yes** — 7/7 files across both commits (`9e403fc` feature, `d2633bd` fixture loudness); the revision touched only the two permitted files.
- STOP conditions respected? **Yes, none hit** — no effect loop (dedupe held), no `state_unsafe_mutation`, `ReactiveListManager` untouched.
- Plan amendments during execution: **none.** The revision round was reviewer feedback under the plan's existing scope, not a goalpost move.

## Residual risk / follow-ups

- `start`/`end` are buffer-inclusive by documented choice; if consumers ask for visible-only indices, that's a deliberate follow-up, not a bug.
- A future `isScrolling`/`onScrollEnd` API should reuse this payload/dedupe channel (maintenance note in the plan) — also the natural home for placeholder-during-fling rendering raised during 001's review.
- The callback must keep living in `$effect` so SSR never invokes it; a refactor away from effects would silently break that.
- Merge-order note: this branch and PR #423 (plan 001) both fork from `f557765` and edit different regions of `SvelteVirtualList.svelte` — whichever merges second needs a trivial rebase; no logical conflict.
