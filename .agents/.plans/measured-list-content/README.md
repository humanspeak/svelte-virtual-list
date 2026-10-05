# Measured list content plans

Prepared with the improve skill on 2026-10-05 at `c1d0389`.
The user selected measured header/footer snippets from the feature-direction review.
Only planning files were written; source implementation has not begun.

## Execution order and status

| Plan                                 | Title                               | Priority | Effort | Risk     | Depends on | Status |
| ------------------------------------ | ----------------------------------- | -------- | ------ | -------- | ---------- | ------ |
| [001](001-header-footer-snippets.md) | Add measured header/footer snippets | P1       | L      | MED/HIGH | None       | TODO   |

## Dependency notes

Plan 001 stands alone. Known-size mode is not required. Within 001, establish the
baseline and geometry tests before changing component layout; integration and
resize/mutation tests precede documentation and the full verification gate.

## Findings and evidence

The list's public content API only exposes renderItem (`src/lib/types.ts:64`);
its content extent and transform are row-only (`SvelteVirtualList.svelte:903`,
`:909`). Chat's optional measured snippets show a reusable product capability,
but its bottom-gravity layout is not compatible code to transplant wholesale.
Capability confidence is HIGH; user-demand/priority confidence is MED. Effort is
multi-day and implementation risk is MED/HIGH because scroll geometry changes.

## Considered and deferred

- Immediate chat consolidation: separate scrolling policies and regression surface;
  characterization and architectural comparison are prerequisites to any merge.
- Bidirectional loading: chat already serves history use cases; list's intentional
  start-prepend behavior requires a separate public loading/anchor contract.
- Known-size mode: valid separate initiative, not selected for this batch.
- Sticky snippets: this plan offers scroll-with-content headers/footers, not sticky rows.

## Review scope and limitations

Focused planning covered list props, rendering, row/full-content geometry,
measurement, scroll targets, anchor rules, range callbacks, testing conventions,
Trunk configuration and sibling chat's snippet reference. No new runtime tests,
builds, performance benchmarks, dependency/security audit or implementation ran
in this planning pass. Prior focused tests/typecheck results are context, not a
claim that the complete current suite has been revalidated.
