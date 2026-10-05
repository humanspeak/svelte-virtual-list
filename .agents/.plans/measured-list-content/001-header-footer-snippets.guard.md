# Guard log — 001 header/footer snippets

## Checkpoint 1 — 2026-10-05 10:17 — DRIFTING

33a64aba569165946b458434199ea1b6be2e0cb9 · implementation snapshot, composed end-anchor regression

- Scope: snapshot changes only the 15 permitted source/test/documentation paths; executor did not edit planning artifacts.
- Independently reproduced `CI=1 pnpm exec playwright test tests/other/header-footer.spec.ts --project=chromium -g 'composed pinned-end' --retries=0 --reporter=line`: exit 1, both axes fail with a 200px end gap against the unchanged 2px bound (test line 351). Evidence: `/tmp/header-footer-guard-composed.log`.
- Contract: removing a 200px header while prepending five 40px rows must retain physical end; current `restoreViewportAnchor` / `updateNonItemSizes` ordering loses pending end intent when the first DOM write clamps against stale extent.
- Verdict: NO-PASS at this snapshot. Remaining full gates deferred until the reproduced defect is corrected; no green claim based on executor reports.
- Action: conductor routes correction to a separate Sol executor round. Preserve end intent through the flush and supersede stale deferred targets, without changing loading-edge or programmatic-scroll exceptions, scope, or assertions.
