# Guard report — 001 reset-measurements

**Recommendation:** PASS

**Reviewed at:** `cd280a1`, 2026-08-09 14:43 EDT

**Planned at:** `0e343e5`

## Done-criteria review

| Criterion                | Result | Evidence                                                                                                           |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------ |
| Red regression test      | PASS   | Executor recorded the new test failing with retained entries `{0: 80, 1: 120}` before implementation.              |
| Complete reset and reuse | PASS   | Test asserts empty cache, zero aggregates, estimated totals, then correct positive aggregates after remeasurement. |
| Focused manager suite    | PASS   | 57 tests passed.                                                                                                   |
| Full unit suite          | PASS   | 18 files and 325 tests passed.                                                                                     |
| Typecheck                | PASS   | `svelte-check` reported 0 errors and 4 existing warnings.                                                          |
| Lint and formatting      | PASS   | Pre-commit formatting/check hooks and independent `trunk check` passed.                                            |
| Scope                    | PASS   | Snapshot changes only the two files named by the plan.                                                             |

## Intent and implementation quality

The implementation restores a single internally consistent unmeasured state without
altering item length, estimated size, DOM references, scroll position, initialization,
or scheduler behavior. Replacing the cache object also prevents stale indexed sizes
from contaminating future axis resets.

## Residual risk

Low. The reset contract is now aligned with its documented meaning. Existing warnings
are outside this plan and were present before the snapshot.
