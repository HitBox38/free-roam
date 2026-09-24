# FreeRoam contributor instructions

## Current direction

FreeRoam is a collaborative trip planning app. The agreed target stack is Next.js (App Router, TypeScript, React) for the frontend and a self-developed Python backend on AWS. The repo is a monorepo:

- `apps/web`: frontend and transitional Next.js server route handlers. Frontend ownership: Tomer.
- `apps/api`: uv-managed Python 3.14.7 scaffold. Backend implementation belongs to the backend collaborator.
- `infra`: reserved for that collaborator's AWS configuration.
- `spacetimedb`: existing backend retained temporarily so current screens keep working.

The frontend migration does not authorize implementing the Python backend or AWS infrastructure. See `docs/backend-handoff.md` for remaining integration work. `docs/legacy-stack.md` describes the old architecture and is historical reference, not the target stack.

## Tooling

- Use Bun for JavaScript dependency installation and scripts. Install from the root with `bun install`; keep one root `bun.lock` for active JavaScript workspaces.
- Root `dev`, `build`, `start`, `lint`, `typecheck`, and `test` scripts delegate to `apps/web`.
- Use uv in `apps/api` for Python; do not introduce pip/Poetry workflows.
- Put frontend local environment variables in `apps/web/.env.local`. Browser settings use `NEXT_PUBLIC_`. Never expose secrets under that prefix.
- Frontend local auth migrations: `bun run db:migrate`; local SQLite lives under `apps/web`. Production must use persistent storage.
- Next.js route types: `bun run typecheck`. Tests use Vitest. Vite is not the app framework.

## Product and architecture rules

- Preserve the zero-budget MVP goal. Do not introduce paid services or provision AWS resources without explicit agreement.
- Keep map/calendar ordering and activity models aligned. Activities are rich tickets with labels, comments, history, locations, date, optional exact time, and manual ordering.
- Live map presence and cursors remain a core feature. Gate pointer sends by map focus and actual motion, coalesce updates, suppress idle noise, and keep at most about two sends/second per active user. Retain cleanup and expiry behavior.
- Collaborative domain data belongs to the backend. Zustand is for local UI state, not duplicate durable data.
- Enforce permissions and validate input in the backend; client checks are only UX. Preserve meaningful activity history and soft deletion. Confirm destructive user-facing actions.
- Keep locations provider-independent. Prefer Leaflet/OpenStreetMap-compatible services, preserve attribution, and avoid paid Google Maps APIs.
- Uploads, if implemented later, require strict size/count/MIME limits (approximately 5 MB per file maximum). Do not claim direct Google Maps saved-list export.
- Ask before making major product or architecture changes beyond the agreed target above.

## Frontend conventions

- TypeScript throughout; avoid `any`. Use small components, shared types, TanStack Form where appropriate, Tailwind, and existing shadcn/ui primitives.
- Use Next.js App Router, `next/link`, and `next/navigation`. Keep server-only auth/configuration out of client bundles. Await route params and request headers.
- Mark interactive entry points as client components. Load Leaflet through a browser-only dynamic boundary because it accesses browser globals during import.
- Preserve loading, error, empty, authentication, and realtime states. Keep secrets in server route handlers.
- Validate work with typecheck, lint, relevant tests, and a production build. Verify affected flows in a browser when possible.

## Transitional integration

Until the Python backend is ready, `apps/web` still uses Better Auth + Drizzle/libSQL, the SpacetimeDB SDK, and generated bindings. Existing reducers remain authoritative for their permissions and data. Do not publish modules or alter hosted data as part of routine frontend work.

Legacy `spacetime:*` scripts target `spacetimedb/spacetimedb`; bindings are generated into `apps/web/src/module_bindings`. Follow the local SpacetimeDB instructions if modifying that module. Reducers cannot perform external network I/O.

Do not remove the transitional integration or replace it with fake successful writes. Coordinate the new API contract and migrate callers when the backend owner supplies the implementation.
