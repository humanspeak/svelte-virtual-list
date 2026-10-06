# Guard report — 001 header/footer snippets

**Recommendation: PASS** — measured non-item content works on both axes; the reproduced composed end-anchor defect is corrected and all required gates exited zero.

**Reviewed at** `851513520cdf6e41d3ff16eb4d674b4350f51be9` · 2026-10-05 10:47 · **Plan planned at** `c1d0389f044938ea99428dda9c49b644759623a0`.

**Publication:** local commits only. Dispatch batch-close instructions leave PR creation as the user's next decision.

## Done criteria

| Criterion                                                                                                                                         | Result | Evidence                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Public `header?: Snippet` and `footer?: Snippet` compile through ComponentProps.                                                                  | met    | `types.ts:66`, component export assertions; focused units 102/102 and typecheck exit 0.                                 |
| New geometry/unit tests and all ten browser scenarios exist and pass.                                                                             | met    | Geometry tests plus 13 scenarios per axis; complete E2E passed all 130 new cases across five projects.                  |
| Typecheck, all units, complete E2E with zero retries, both builds, Trunk and whitespace gates exit zero; existing warnings are separately listed. | met    | Guard commands below all exit 0; E2E 670 passed, 5 unchanged conditional docs skips, zero failures.                     |
| Row count/indices/averages exclude snippets; DOM and reported total include them.                                                                 | met    | Empty/short DOM geometry assertions; `virtualListDebug.test.ts` row metrics; component keeps sizes outside row manager. |
| No source files outside Scope were changed (`git diff --name-only`).                                                                              | met    | Full contribution `1ed9523...8515135` and planned-source diff audited: 15 allowed paths; guard artifacts separate.      |
| Execution notes include baseline SHA, exact commands and results.                                                                                 | met    | Plan execution notes record baseline, failing snapshot, correction snapshot and reproduced final commands.              |
| Batch README status is updated truthfully.                                                                                                        | met    | Guard marks DONE and CLOSED with explicit conditional-skip limitations.                                                 |

## Reproduced verification

Guard ran, rather than relying on executor claims:

- `pnpm run check`: 0 errors, 11 existing warnings, exit 0.
- `pnpm test`: 20 files / 381 tests passed, exit 0.
- `pnpm exec vitest run src/lib/utils/contentGeometry.test.ts src/lib/utils/scrollCalculation.test.ts src/lib/component-types.test.ts`: 3 files / 102 tests passed, exit 0.
- `CI=1 pnpm exec playwright test --retries=0 --reporter=line`: 670 passed / 5 skipped / 0 failed, exit 0, 20.8 minutes. Includes all 235 focused cases on the final snapshot.
- `pnpm build`: exit 0, publint “All good”.
- `pnpm --filter docs build`: exit 0, favicon verification succeeded.
- `trunk check` all 15 changed source/test/docs files: exit 0, no issues.
- `git diff --check`: exit 0; no uncommitted source changes after verification.

Logs: `/tmp/hf-guard-{check,units,focused-units,trunk,e2e,library-build,docs-build}.log`.
Executor formatting and both snapshot pre-commit gates also passed.

## Spirit

Consumers can place persistent introductions, loaders and end markers inside
scrollable content without fake rows. Header/row/footer coordinates are separated
from row measurements, counts and indices. DOM tests verify content extent, deep
alignment, reading/start/end stability, snippet-only viewports, runtime removal,
orientation, keyed mutations, loading, smooth scrolling, SSR and cleanup. Review
caught a real composed end-anchor race: guard reproduced a 200px end gap at
`33a64ab`; a separate Sol round corrected pending intent and stale-target handling.
Both prepend/removal and row-growth/removal now pass all five projects with the
same 2px assertion. This is general list content, with no chat policy integration.

## Scope & conduct

- In-scope only: yes, 15 source/test/documentation paths. No manager internals,
  dependencies, lockfile, exports, CI/release, state or sibling-chat changes.
- STOP conditions respected: yes. Reproduced composed failure was snapshotted,
  logged and corrected by a separate executor round; no scope widening or weakened
  assertions. Guard authored no implementation. Executors authored no plan/logs.
- Plan amendments: none. Pre-flight found no source drift from planned baseline.
- Source snapshots: `33a64ab` implementation (NO-PASS), `8515135` correction (PASS).
- Guard owns DONE/index/evidence updates and retirement of the batch.

## Residual risk / follow-ups

- The unchanged external-docs smoke test conditionally skipped in all five projects.
  Built docs homepage returns HTTP 200 but lacks the old `Top to bottom` label and
  `top-to-bottom-viewport` selector; this test's coverage is not claimed green.
- An extra docs dev attempt failed on missing generated
  `docs/static/docs/api/events.md`. Required production build/preview succeeded;
  no out-of-scope dev-server repair was attempted.
- Existing typecheck warnings remain: 10 initial-value capture warnings and one
  noninteractive-tabindex warning in the component/manager test fixture. No new
  warning count increase. Build also reports existing Vite native-config warnings.
- Geometry is a substantial change; future changes must retain the row/content
  conversion boundary and transient pending-anchor lifecycle. No dedicated snippet
  benchmark, chat consolidation or chat follow policy was added.

The branch is ready for PR review when requested; merging remains the user's call.
