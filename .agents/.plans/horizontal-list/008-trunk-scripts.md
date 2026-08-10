# Plan 008: Route conventional lint scripts through Trunk

> **Executor instructions**: Preserve familiar script names as compatibility wrappers.
> Update the sibling README when complete.
>
> **Drift check (run first)**:
> `git diff --stat 0e343e5..HEAD -- package.json docs/package.json README.md CLAUDE.md .trunk/trunk.yaml`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `0e343e5`, 2026-08-09

## Why this matters

The repository declares Trunk authoritative, but conventional package scripts invoke
Prettier and ESLint directly. Contributors and automation using `pnpm lint` therefore
run only a subset of the versions/checks enforced by hooks and CI.

## Current state

- Root `package.json:61-63` directly invokes Prettier/ESLint.
- `docs/package.json` repeats the direct scripts.
- `.trunk/trunk.yaml` enables formatting, lint, security, workflow, shell, and config
  checks beyond those two tools.
- `CLAUDE.md` already instructs contributors to use `trunk fmt` and `trunk check`.

## Scope

In scope: root/docs package scripts and command documentation. Out of scope: changing
enabled linters, tool versions, resolving unrelated existing findings, or removing
Trunk.

## Steps

1. Inventory CI, hooks, and docs references to `pnpm lint`, `lint:fix`, and `format`.
   **Verify**: `git grep -nE 'pnpm (run )?(lint|format)|lint:fix'` reviewed.
2. Make root conventional scripts thin wrappers around `trunk check` and `trunk fmt`.
   Avoid recursive package execution. For docs, either delegate to root Trunk with a
   path filter supported by the pinned CLI or remove duplicates only after proving no
   caller relies on them.
   **Verify**: `pnpm lint` invokes Trunk and exits with the same status as `trunk check`;
   use check/dry-run behavior for verification so no unintended format changes remain.
3. Update any contradictory command documentation without duplicating policy.
4. Run `trunk fmt package.json docs/package.json README.md CLAUDE.md`, `pnpm lint`,
   `trunk check`, and `git diff --check`.

## Test plan and done criteria

No runtime red test applies; this is command wiring.

- [ ] Conventional scripts invoke the authoritative Trunk toolchain.
- [ ] No script recursively calls itself or unexpectedly formats during lint.
- [ ] Existing automation references remain valid.
- [ ] Trunk and whitespace checks pass.

## STOP conditions

- The pinned Trunk CLI cannot scope docs-package wrappers safely.
- Existing CI relies on direct ESLint output semantics.
- The repository currently has unrelated Trunk failures; report them without fixing
  outside scope.

## Git workflow and maintenance

Use branch `chore/trunk-script-wrappers`, commit
`chore(tooling): route lint scripts through trunk`. Keep `.trunk/trunk.yaml` as the
single tool/version authority.
