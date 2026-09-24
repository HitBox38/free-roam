# FreeRoam

Collaborative trip planning with maps, calendar ordering, rich activity cards, comments, and live map presence.

## Repository layout

```text
apps/
  web/          Next.js App Router frontend (TypeScript, React, Bun)
  api/          Python 3.14.7 / uv backend scaffold
infra/          Reserved for the backend team's AWS infrastructure
spacetimedb/    Existing backend retained during the transition
docs/          Architecture handoff and historical reference
```

The target stack is Next.js plus a self-developed Python backend on AWS. This change migrates the existing frontend and establishes the monorepo. The Python API, AWS integration, and data migration are not implemented yet.

The frontend still uses Better Auth + Drizzle/libSQL for sessions, SpacetimeDB for trip data and realtime subscriptions, TanStack Form, Zustand for local UI state, Tailwind CSS, shadcn/ui, and Leaflet. These existing integrations keep the screens usable while the backend is developed. TanStack Start and TanStack Router have been replaced by Next.js. Vite remains only as Vitest's test tooling.

## Frontend development

Use Bun 1.4.2 and Node.js 22+ (Next.js requires Node.js 20.9 or newer).

```sh
bun install
```

Copy `apps/web/.env.example` to `apps/web/.env.local`, supply a random Better Auth secret, and configure any optional services there. Next.js reads environment files from `apps/web`, not the repository root. Existing root `.env.local` values were copied locally during the restructure; root environment files are no longer the app configuration. Public settings use `NEXT_PUBLIC_`, replacing `VITE_`.

```sh
bun run db:migrate
bun run dev
```

Open http://localhost:3000. Existing routes remain `/`, `/sign-in`, `/trips`, and `/trips/:tripId`. Leaflet loads in the browser; session checks run on the server.

| Command from repo root | Purpose |
| --- | --- |
| `bun run dev` | Next.js development server on port 3000 |
| `bun run build` | Production frontend build |
| `bun run start` | Serve the production build on port 3000 |
| `bun run typecheck` | Generate Next.js route types and check TypeScript |
| `bun run lint` | Next.js ESLint checks |
| `bun run test` | Existing Vitest suite |
| `bun run format` | Format frontend source |
| `bun run db:migrate` | Apply existing Better Auth database migrations |
| `bun run api:sync` | Create the Python environment using uv |
| `bun run api:check` | Check the scaffold's Python interpreter |

Frontend-specific commands can also run with `bun run --cwd apps/web <script>`. Bun workspaces manage JavaScript dependencies; uv independently manages `apps/api`. A shared build orchestrator is unnecessary for one frontend and a backend scaffold.

## Backend and AWS handoff

See [backend setup](apps/api/README.md), [infrastructure ownership](infra/README.md), and [migration handoff](docs/backend-handoff.md). Install [uv](https://docs.astral.sh/uv/getting-started/installation/) before running the Python commands.

There is no Python web server yet. Backend framework, persistence, authentication integration, realtime protocol, hosting, and AWS infrastructure choices belong to the backend owner. No AWS resources have been provisioned.

## Transitional services

Trip operations still require the existing SpacetimeDB service. Legacy maintenance commands (`spacetime:dev`, `spacetime:build`, `spacetime:generate`) remain available; generated bindings now go to `apps/web/src/module_bindings`. Do not publish or change the hosted database as part of frontend setup.

The Next.js route handlers preserve `/api/auth/*`, `/api/geocoding/search`, and `/api/spacetime/token`. Geocoding requires `GEOAPIFY_API_KEY`. Local auth uses `apps/web/local.db`; deployed auth requires a persistent database. The root `local.db`, when present before restructuring, was copied locally and is not committed.

For Vercel frontend deployment, set the project Root Directory to `apps/web`, use the Next.js preset, and configure the environment variables there. Keep the repository root Bun lockfile. Python/AWS deployment is separate and deferred.

The previous architecture document is archived in [docs/legacy-stack.md](docs/legacy-stack.md) for reference only.
