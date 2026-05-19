<!-- orchestrate handoff
task: phase1-vitest-coverage
branch: orch/phase2-tests/phase1-vitest-coverage
agentId: bc-e77039ae-cda4-4cb8-be01-405687fb210e
runId: run-b47b0d99-80dc-4e6d-89c1-a8d00257b280
resultStatus: finished
finishedAt: 2026-05-19T10:56:35.590Z
-->

## Status
success

## Branch
`orch/phase2-tests/phase1-vitest-coverage`

## What I did
- Added **`vitest.config.ts`** with `vite-tsconfig-paths`, default **`environment: "node"`**, and **`pool: "forks"`** so the runner exits cleanly; **`src/stores/theme-store.test.ts`** uses **`// @vitest-environment jsdom`** for real `localStorage` on the default-parameter path.
- **`src/lib/utils.test.ts`**: tests for **`cn`** (tailwind-merge later-wins, conditionals, clsx object/array behavior).
- **`src/lib/spacetime.ts`**: exported **`readStoredSpacetimeAuthToken`** / **`writeStoredSpacetimeAuthToken`**; **`src/lib/spacetime.test.ts`** covers helpers, constants, and **`createSpacetimeConnectionBuilder`** with **`vi.mock("@/module_bindings")`** + optional **`window`** stub.
- **`src/lib/trip-domain.test.ts`**: more **`sortActivitiesForTimeline`** cases (partial exact times, ordered vs none), **`activityInputSchema`** (ordered + lat/lng bounds), **`tripInputSchema`**, **`labelInputSchema`** boundaries; existing tests kept.
- **`src/stores/theme-store.test.ts`**: jsdom directive, expanded **`resolveThemePreference`** / **`getStoredThemePreference`** cases (bad JSON, missing shape, valid keys, default storage).
- **`src/lib/activity-format.ts`** + **`activity-format.test.ts`**: **`formatActivityTime`** and **`activityPayload`**; **`src/components/trip-detail.tsx`** only adds the import and removes the inlined helpers.

Draft PR: https://github.com/HitBox38/free-roam/pull/3

## Measurements
- **total vitest tests:** 11 → 46
- **new vitest tests:** +35
- **`bun run test`:** exit 0 → exit 0
- **`bun run typecheck`:** exit 0 → exit 0
- **`bun run lint`:** exit 0 → exit 0
- **`src/components/trip-detail.tsx` diff:** import addition + removal of local `activityPayload` / `formatActivityTime` only (no behavioral edits)

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Default Vitest run previously logged a 10s **“close timed out”** warning; **`pool: "forks"`** in **`vitest.config.ts`** avoids that in this environment.
- **`createSpacetimeConnectionBuilder`** is only covered for **`withToken`** / **`readStoredSpacetimeAuthToken`** integration; **`onConnect`** / reducers are not exercised (would need heavier mocking).
- **`resolveThemePreference`** “system branches” are covered twice (original **`describe`** cases plus two explicit tests); low cost, slightly redundant.

## Suggested follow-ups
- Consider a thin **`src/test/setup.ts`** only if shared mocks/fixtures grow; currently not required.
- If CI runs Vitest without Bun, confirm **`pool: "forks"`** is acceptable on the CI OS (or make it conditional).