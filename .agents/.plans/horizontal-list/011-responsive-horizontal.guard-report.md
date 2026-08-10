# Guard report — 011 responsive-horizontal

**Recommendation:** PASS

**Reviewed at:** `3f65124`, integrated as `67352d8`, 2026-08-09 17:29 EDT

**Planned at:** `0a92d0a`

## Done-criteria review

| Criterion                   | Result | Evidence                                                                                                                                                                       |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime axis switching      | PASS   | A pre-layout capture plus generation-guarded transition preserves the exact stable item and inset.                                                                             |
| Loud red/green proof        | PASS   | Corrected baseline visibly reports RED (`4385 → -1`); final page reports GREEN (`4394 → 4394`, inset `3 → 3`, 22 nodes).                                                       |
| Cache and stale-work safety | PASS   | Axis changes reset measurements and abort stale scroll/transition generations before restoration.                                                                              |
| Rapid toggles               | PASS   | Browser coverage proves the latest requested generation wins without stale-axis state.                                                                                         |
| Keyboard and descendants    | PASS   | Left/Right and semantic navigation are unit/browser tested; interactive children retain native keys.                                                                           |
| Public docs and examples    | PASS   | README and the horizontal guide document responsive use, sizing precedence, alignment, loading, keyboard policy, migration, and LTR scope.                                     |
| Comparisons                 | PASS   | `/compare/svelte-virtuallists` was added and issue-mentioned alternative claims were refreshed with source links.                                                              |
| Discoverability             | PASS   | `/` links to `Issue 427 — Horizontal list`; an E2E test clicks through and verifies the destination heading.                                                                   |
| Full verification           | PASS   | Executor: 341 units, 445 E2E passed/5 skipped, library build/publint, docs build/check/unit/E2E, and Trunk. Guard: 109 focused units, 14 Chromium cases, docs checks/unit/E2E. |

## Intent and implementation quality

The implementation completes the issue's desktop-vertical/mobile-horizontal workflow
without forking the component. Axis changes preserve stable identity and pixel inset,
discard incompatible measurements, and prevent stale asynchronous work from winning.
The large issue fixture remains deterministic and exposes both-axis geometry, active
orientation, anchor identity, transforms, range, and verdict directly on the page.

The public documentation includes both static and responsive examples, a live
breakpoint demo, API semantics, LTR limitations, and updated competitive comparisons.
The test page is linked from the library demo root for manual inspection.

## Residual risk

Medium-low. LTR horizontal and responsive switching are thoroughly covered across the
five configured browser projects. RTL, item-level focus management, scroll snap, and
carousel controls remain explicitly outside this plan. Existing Svelte static-capture
and accessibility warnings remain warnings rather than new type errors.
