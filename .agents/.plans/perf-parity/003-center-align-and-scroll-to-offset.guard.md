# Guard log — 003 center-align-and-scroll-to-offset

## Checkpoint 1 — 2026-07-14 13:37 — PLAN AMENDED

899ba3e · pre-flight for external-model execution (Codex / GPT-5.6 "Sol" via the codex-rescue runtime), operator-directed

- Drift check against the original `Planned at` (`b5da256`) showed all four in-scope files moved: plans 001 (PR #423) and 002 (PR #424) both merged to main (`899ba3e` = v0.5.10 + both features). A stale plan would have STOPped the executor at step zero.
- PLAN AMENDED (operator mandate: "be the guard to a gpt5.6 sol agent executing 003" — execution requires a current plan; amendment is the reconcile flow, not a goalpost move for any executor's benefit; no executor work exists yet):
    - Re-baselined `Planned at` → `899ba3e` with a dated revision note under the executor instructions.
    - Refreshed every line anchor/excerpt: types.ts align union 109→129; `calculateTopToBottomScrollTarget` 292–327→298–343; `ScrollTargetParams` now documents the post-001 `blockSums` param (204/284) that the new `maxScrollTop` composes with; component `scroll()` 826–956→858–988 with the tail extraction re-anchored 953–987; `currentMaxScrollTop` 333→335; deprecated `scrollToIndex` region 786–799→818–831.
    - Baked in toolchain corrections learned during 001/002: 5 Playwright projects, `CI=1` on e2e, `test:only` filter quirk.
    - Dependency block updated: no dependencies remain (001+002 on main).
- Verified no stale references survive (`grep b5da256` → only the two intentional historical notes).
- Executor being dispatched by guard per operator instruction: `codex:codex-rescue` subagent (Codex CLI 0.144.3 present) in an isolated worktree, full amended plan text inlined (worktrees lack the `.agents/` folder — lesson from 001's first dispatch). Guard remains read-only on source; the same checkpoint/final regime as plans 001/002 applies, with extra scrutiny appropriate to a first run of a non-Claude executor: every report claim re-verified, tests read for gamed assertions, scope audited against the 9-file list.
- Action: plan amendment recorded here and committed; dispatching.

## Checkpoint 2 — 2026-07-14 13:55 — BLOCKED (runtime provisioning, resolved by re-dispatch)

899ba3e · first Codex dispatch failed pre-work; no code to judge

- First Codex run (task-mrkxuftx-ipdlqi) STOPped at its first action: the Agent-tool ephemeral worktree was auto-reaped the moment the wrapper agent completed, but the Codex task runs asynchronously in its own daemon — by the time GPT-5.6 started (~1 min later) its assigned cwd no longer existed. Executor conduct was clean: zero files touched, no substitute directory used, no retry improvised; the main checkout verified unaffected.
- Root cause is the sync-worktree/async-executor lifecycle mismatch, not the plan or the model. Guard remediation (infrastructure, not source): provisioned a PERSISTENT worktree at `.claude/worktrees/plan-003-codex` on branch `feat/165-center-align-scroll-to-offset` pinned to `899ba3e` (exactly the amended plan's baseline), staged the amended plan into the worktree root as untracked `PLAN-003.md` (executor forbidden to commit/modify it), and re-dispatched with the wrapper required to poll the Codex task to a terminal state before replying.
- Action: reported to operator; re-dispatched. No plan amendment — the plan was never reached.

## Checkpoint 3 — 2026-07-14 14:12 — BLOCKED (sandbox network, resolved by re-dispatch)

899ba3e · second Codex attempt: worktree fix held, new blocker one layer down

- The persistent worktree worked (install exited 0, drift check empty, Step-1 red test written to `scrollCalculation.test.ts`), but the first `pnpm run test:only` invocation died: pnpm's pinned-version signature verification (`packageManager: pnpm@11.5.0`) needs a registry fetch on invocation, and the Codex sandbox denies network — `fetch failed` → pnpm refused to run with a tampered-lockfile warning. Guard assessment: false alarm; sandbox network restriction, not supply-chain. Executor honored the STOP (Step-1 didn't produce the required "expected null to be 1820"), attempted no workaround, left one uncommitted in-scope edit.
- Re-dispatched with the wrapper instructed to relaunch with a network-permitting sandbox config (fallback: disable pnpm's version self-switch via env var only, verify 11.5.x, no config-file changes), and to have the executor verify-then-reuse the existing red-test edit rather than duplicate it.
- Action: reported to operator; awaiting third run. Executor conduct across both failures has been exactly right — clean STOPs, no improvisation.
