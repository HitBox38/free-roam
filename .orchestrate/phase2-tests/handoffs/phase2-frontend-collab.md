<!-- orchestrate handoff
task: phase2-frontend-collab
branch: orch/phase2-tests/phase2-frontend-collab
agentId: bc-9c863d12-f6d1-4a95-ac3c-f24c30cfaa18
runId: run-14cd9d86-9e67-43db-b389-54888fc71890
resultStatus: finished
finishedAt: 2026-05-19T11:49:40.500Z
-->

## Status
partial

## Branch
`orch/phase2-tests/phase2-frontend-collab`

## What I did
- Wired Phase 2 collaboration UI into the trip detail experience:
  - Updated `src/components/trip-detail.tsx` to mount:
    - presence summary row above calendar
    - `ActivityComments` under selected activity
    - `ActivityHistory` collapsible section under comments
    - `MapPresenceLayer` inside the existing `<Map>` in `TripMap`
  - Added activity-editor typing-indicator wiring (low-frequency upsert + clear-on-blur/inactivity behavior).
- Added new collaboration components:
  - `src/components/activity-comments.tsx`:
    - subscribes to `tables.activityComments`
    - renders top-level + one nested reply level via `buildCommentThread`
    - supports add/reply/edit/soft-delete controls
    - author can edit own comments; owner-or-author can soft-delete
    - deleted placeholders are preserved in thread rendering
    - typing indicator upsert/clear wired for composers
  - `src/components/activity-history.tsx`:
    - subscribes to `tables.activityHistory`
    - reverse-chronological list with actor name join against `tables.users`
    - fallback to truncated identity
  - `src/components/map-presence-layer.tsx`:
    - subscribes to `tables.mapPresence` + `tables.users`
    - excludes local identity
    - projects remote cursor lat/lng to map container coordinates and renders triangle cursor + name chip
    - uses local cursor color from deterministic helper/store
  - `src/components/typing-indicator.ts` reusable typing emitter utility (2s upsert gate, 4s idle clear, cleanup on unmount).
- Added pure logic helpers + Vitest coverage:
  - `src/lib/map-presence.ts` + `src/lib/map-presence.test.ts` (`throttleMapPresence`)
  - `src/lib/presence-color.ts` + `src/lib/presence-color.test.ts`
  - `src/lib/activity-history.ts` + `src/lib/activity-history.test.ts`
  - `src/lib/comment-thread.ts` + `src/lib/comment-thread.test.ts`
  - `src/lib/use-map-presence.ts` hook for focus-gated map presence updates + cleanup
- Added transient cursor UI store + tests:
  - `src/stores/cursor-store.ts`
  - `src/stores/cursor-store.test.ts`
- Committed, pushed, and opened/updated draft PR for this branch.

## Measurements
- `presence reducer calls/sec under continuous motion (map-presence.test): <= 2`
- `presence throttle cap in 2s window (map-presence.test): <= 4 calls`
- `bun run typecheck: exit 0 == exit 0`
- `bun run lint: exit 0 == exit 0`
- `bun run test: 36 passing == 36 passing`
- `git diff vs orch/phase2-tests/phase2-backend: 16 files changed, 1760 insertions(+), 12 deletions(-)`

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Automated verification is fully green (`typecheck`, `lint`, `test`).
- Manual trip-detail UI verification was blocked by runtime environment/backend state:
  - MainCloud logs show repeated `ensure_user_profile` panics for duplicate unique key and subsequent `create_trip: Sign in before using trips`.
  - Because trip creation failed, I could not reliably reach a working trip-detail page to live-verify comments/history/presence interactions end-to-end in browser.
- I attempted multiple remediations:
  1. fixed `BETTER_AUTH_URL` format for local dev URL
  2. started `spacetime dev` with publish-target-compatible flags and completed publish prompts
  3. retried browser flows and session paths, but backend auth/profile reducer state still blocked trip creation
- Blocker screenshots captured during remediation:
  - `/tmp/computer-use/1fe37.webp`
  - `/tmp/computer-use/cf203.webp`

## Suggested follow-ups
- Fix backend `ensure_user_profile` idempotency/upsert behavior so reconnect/login does not panic on existing auth user IDs.
- After backend fix, rerun manual verification on trip-detail page to confirm:
  - comments/replies CRUD UX
  - activity history rendering
  - live map presence cursor overlay behavior
  - typing indicator visibility with two concurrent users.