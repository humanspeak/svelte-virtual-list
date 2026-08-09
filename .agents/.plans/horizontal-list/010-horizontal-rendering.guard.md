# Guard log — 010 horizontal-rendering

## 2026-08-09 16:19 EDT — snapshot `3ca7ac4`, integrated as `0cd162a`

- Visually inspected the pre-implementation red screenshot. It loudly showed vertical
  failure, 2,100,000px vertical overflow, no horizontal overflow, and all required
  diagnostics before production code changed.
- Visually inspected the green screenshot. It showed horizontal geometry, 1,251,765px
  scroll width, no vertical overflow, and only 17 of 10,000 items rendered.
- Rejected the initial resize test because it changed an item after the asserted anchor
  and checked only rendered indexes. The strengthened test exposed a real 24px anchor
  compensation bug.
- Required a second correction because signed target-left assertions could accept a
  large negative error. Final assertions use absolute pixel bounds.
- Independently reproduced 50 focused cases across five Playwright projects, all 58
  vertical Chromium cases, 341 unit tests, zero type errors, and clean Trunk checks.
