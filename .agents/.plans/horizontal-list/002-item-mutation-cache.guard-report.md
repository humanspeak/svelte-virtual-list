# Guard report — 002 item-mutation-cache

**Recommendation:** PASS

**Reviewed at:** `11c3eb6`, integrated as `289331b`, 2026-08-09 15:06 EDT

**Planned at:** `3a90029`

## Done-criteria review

| Criterion                      | Result | Evidence                                                                                                      |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| Red manager shrink test        | PASS   | Removed indexes 5 and 7 remained before implementation.                                                       |
| Mutation regressions           | PASS   | Replacement, reorder/prepend identity, and duplicate-key tests all failed before implementation and pass now. |
| Stable-key measurement mapping | PASS   | `itemKey` remaps surviving cached measurements and keys rendered DOM identity.                                |
| Unkeyed safety and fast paths  | PASS   | Ambiguous mutations reset; append and stable-prefix suffix removal retain valid measurements.                 |
| Type contract                  | PASS   | Generic inference test proves typed item/index inputs and primitive keys.                                     |
| Focused and full tests         | PASS   | 91 focused tests and 330 full unit tests passed independently.                                                |
| Typecheck and lint             | PASS   | Zero type errors, four existing warnings, and clean Trunk checks.                                             |
| Scope                          | PASS   | Exactly the six source/test files named by the plan changed.                                                  |

## Intent and implementation quality

The component now has explicit identity semantics instead of silently binding cached
geometry to array positions. Manager aggregates remain consistent on shrink and key
remapping. The implementation retains cheap append behavior, which avoids turning the
correctness fix into a routine infinite-scroll penalty.

## Residual risk

Medium-low. Consumers using mutable objects without `itemKey` cannot expose arbitrary
in-place semantic mutation to the component; stable identity should be supplied for
those cases. Browser anchoring remains part of the horizontal E2E plans.
