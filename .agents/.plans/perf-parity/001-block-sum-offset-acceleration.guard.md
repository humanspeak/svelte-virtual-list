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
