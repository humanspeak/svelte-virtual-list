# Guard log — 011 responsive-horizontal

## 2026-08-09 17:29 EDT — snapshot `3f65124`, integrated as `67352d8`

- Rejected the executor's first screenshot because it did not prove the static baseline
  was red. Required a detached Plan 010 baseline with fixture/test changes only; the
  corrected screenshot visibly showed the requested vertical axis with anchor
  `4385 → -1` and stale horizontal scroll state.
- Required exact logical-anchor preservation instead of accepting a nearby item. The
  root cause was capture after the parent had already reflowed content; moving capture
  to `$effect.pre` preserved the true old-axis anchor.
- Rejected a fixed 30-frame settling delay. The final transition uses generation-token
  cancellation and two bounded, early-exiting convergence loops.
- Required the issue fixture to be discoverable from `/` and independently verified
  the exact homepage link, click-through, URL, and issue-page heading.
- Reviewed the README, horizontal guide, responsive live example, docs navigation,
  `svelte-virtuallists` comparison, and refreshed alternative-library claims.
- Independently passed 109 focused unit tests, 14 Chromium issue tests, library and
  docs type checks with zero errors, docs unit/E2E tests, and clean focused lint checks.
