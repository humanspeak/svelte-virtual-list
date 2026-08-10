# Guard report — 010 horizontal-rendering

**Recommendation:** PASS

**Reviewed at:** `3ca7ac4`, integrated as `0cd162a`, 2026-08-09 16:19 EDT

**Planned at:** `93d35fb`

## Done-criteria review

| Criterion                         | Result | Evidence                                                                                                                                            |
| --------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Red-first browser fixture         | PASS   | Before source edits, orientation was `vertical/unsupported`; screenshot visibly reported RED.                                                       |
| Loud measurable page              | PASS   | On-page metrics include both-axis geometry, DOM bounds, rendered indices, transform, anchor errors, compensation, active operation, and load calls. |
| 10k bounded virtualization        | PASS   | Green screenshot renders 17 items with horizontal scroll width over 1.25 million pixels.                                                            |
| Manual and programmatic scrolling | PASS   | Native deep, raw offset, smooth index, start/end/nearest/center, and end loading are browser-tested.                                                |
| Dynamic width correction          | PASS   | Growing predecessor 4320 by 24px keeps target 4321 at 0px and adjusts `scrollLeft` by exactly 24px.                                                 |
| Cross-browser static LTR          | PASS   | 50/50 cases passed across Chromium, Firefox, WebKit, mobile Chrome, and mobile Safari.                                                              |
| Vertical compatibility            | PASS   | Existing Chromium suite passed 58/58 independently.                                                                                                 |
| Unit/type/lint gates              | PASS   | 341 unit tests, zero type errors, and clean Trunk checks.                                                                                           |
| Scope                             | PASS   | Eleven in-scope source, unit, fixture, and E2E files changed.                                                                                       |

## Intent and implementation quality

Static LTR horizontal mode uses the shared axis adapter, stable internal attributes,
axis-aware pitch measurement, scalar scroll math, and the same synchronous correction
path as vertical lists. Public neutral size and semantic alignment APIs retain legacy
vertical aliases.

The guard correction improved production behavior: post-layout anchor capture now
prefers the established first item starting at the viewport edge instead of a newly
intruding predecessor, preventing a measured predecessor width change from shifting
the visible target.

## Residual risk

Medium. Orientation is intentionally captured at construction in this phase, producing
temporary Svelte static-reference warnings. Plan 011 owns reactive axis switching,
warning cleanup, keyboard behavior, docs, and repeated-toggle browser coverage. RTL is
explicitly deferred.
