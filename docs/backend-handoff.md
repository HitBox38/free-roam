# Backend transition handoff

## Implemented in this change

- Existing React screens moved to `apps/web` and routed with Next.js App Router.
- Sign-in and protected trip pages use server-side Better Auth session checks.
- Auth, geocoding, and existing SpacetimeDB configuration endpoints moved to Next.js route handlers.
- Leaflet's trip screen loads only in the browser; realtime behavior and pointer throttling are retained.
- Independent uv metadata created in `apps/api`; AWS workspace reserved in `infra`.

## Remaining backend work

The target backend is self-developed Python on AWS. The frontend currently still imports the SpacetimeDB client SDK, generated row types, subscriptions, and reducers. This is a transition boundary, not a completed backend replacement.

Agree on the HTTP/API and realtime contracts before replacing those callers. Decide auth/session ownership, user identity mapping, permissions, IDs, date/time formats, error responses, pagination, reconnect behavior, presence expiry, and event delivery. Do not treat browser-supplied identity as authentication.

Key integration locations under `apps/web/src`:

| Area | Current files |
| --- | --- |
| Session handling | `lib/auth.ts`, `lib/auth-client.ts`, `lib/auth-functions.ts`, `db/`, `app/api/auth/` |
| Connection and profile sync | `components/spacetime-provider.tsx`, `lib/spacetime.ts` |
| Trip and activity UI | `components/trips-overview.tsx`, `components/trip-detail.tsx` |
| Comments and history | `components/activity-comments.tsx`, `components/activity-history.tsx` |
| Presence and typing | `lib/use-map-presence.ts`, `lib/map-presence.ts`, `components/map-presence-layer.tsx`, `components/typing-indicator.ts` |
| Existing data contract | `module_bindings/` and root `spacetimedb/spacetimedb/src/` |
| Location search proxy | `app/api/geocoding/search/route.ts` |

Preserve trip membership and role checks on the backend, activity history, live updates, soft deletion, and provider-independent locations. Keep client pointer updates gated by focus and motion and bounded to at most roughly two sends/second. The presence requirements remain even though SpacetimeDB-specific billing will go away.

Keep IDs stable or provide an explicit migration strategy. Current IDs are bigint/u64 values; JSON APIs should agree on string serialization. Do not move collaborative data into Zustand; it remains for local UI state.

Uploads are roadmap work, not an implemented UploadThing integration. If introduced, enforce small file limits, MIME allowlists, and per-trip caps. Backend framework, AWS services, data migration, realtime transport, and upload storage remain decisions for the backend owner.

Remove the SpacetimeDB SDK, generated bindings, old module, configuration route, maintenance scripts, and compatibility tests only after the new backend supports the existing screens. Coordinate any changes to Better Auth and geocoding instead of duplicating their responsibilities silently.
