## Project Overview

This project is a collaborative trip planning web app.

The goal is to let users plan trips together in real time, with a workflow that feels inspired by tools like Figma, Monday, Jira, ClickUp, Asana, and calendar/map planning apps.

A **core product pillar** is **Figma-like live presence and cursors on the map**: collaborators should see each other’s attention on the map surface (pointers, focus, lightweight “who is where” signals), not only static data updates.

Users can create trips, invite collaborators, and add activities/events to a shared trip board. Each activity behaves like a rich ticket/card and can contain location data, dates, optional time, labels, descriptions, comments, attachments, and history.

The app has two primary planning views:

1. **Map View**
   - Shows trip activities as markers.
   - Supports selecting and editing activities.
   - Supports a timeline layer that connects activities in trip order.
   - Uses Leaflet via a shadcn-like map component.
   - Supports **live multiplayer cursors and presence** tied to map coordinates.

2. **Calendar / Timeline View**
   - Shows activities grouped by date.
   - Supports exact times or manual ordering within a day.
   - Defines the ordering used by the map timeline layer.

The project is intended to work as a **zero-budget MVP** using free tiers and open/free services wherever possible.

---

## Core Product Concept

A trip contains many activities.

Each activity should support:

- Name
- Location
  - Manually selected point on our map
  - Coordinates from a search/geocoding provider
  - Optional third-party map links such as Google Maps, Apple Maps, Waze, etc.
- Date
- Optional time
  - No time
  - Exact time
  - Manual order within the day
- Description
- Images
- Attached documents
- Labels/tags
- Comments
- Comment threads
- Edit/delete actions
- Activity history/audit log

Users should be able to collaboratively edit the trip in real time, with **low-latency map presence** suitable for high-frequency pointer motion when throttled responsibly (see free-tier constraints below).

---

## Important Product Constraints

This project should be designed around a **zero-dollar budget**.

That means:

- Avoid paid APIs by default.
- Avoid requiring Google Maps Platform billing.
- Prefer OpenStreetMap/Leaflet-based maps.
- Prefer free-tier services.
- Keep storage usage limited.
- Design uploads with **strict** limits (size, count per trip, MIME allowlists).
- Prefer generated third-party map links over direct paid integrations.
- Avoid promising direct export into Google Maps saved lists unless supported by an official free API.
- **Respect SpacetimeDB MainCloud free-tier reducer budgets** (see below). A careless cursor loop can burn the monthly allowance in hours.

Direct Google Maps Platform usage should not be introduced unless explicitly requested and documented.

---

## Tech Stack

Primary stack:

- TypeScript
- React
- TanStack Start
- TanStack Router
- TanStack Form
- TanStack Hotkeys
- **SpacetimeDB** (TypeScript server module for schema, tables, and reducers)
- **Better Auth** (session-based auth via TanStack Start server API routes)
- **UploadThing** (hosted uploads; metadata recorded in SpacetimeDB after success)
- shadcn/ui
- Tailwind CSS
- shadcn-map / React Leaflet
- Zustand (local UI state only)
- Vercel

Supporting / adjacent:

- Leaflet
- date-fns or similar date utilities
- Zod or Valibot for validation
- A **small free-tier serverless database** for Better Auth session/account tables (outside SpacetimeDB)

---

## Architecture Principles

### 1. SpacetimeDB is the source of truth (durable + ephemeral)

**SpacetimeDB** holds:

- **Durable domain data**: trips, membership, activities, labels, comments/threads, attachment metadata, activity history, permissions-sensitive reads/writes enforced in reducers.
- **Ephemeral collaboration state**: live map presence, cursor positions, lightweight typing/editing indicators, connection-scoped rows that can expire or be replaced frequently.

**Why SpacetimeDB (especially for the map):**

- Persistent **WebSocket** connection and **local caching** make the UI feel instant for collaborative planning.
- The engine is a strong fit for **high-frequency** state—**when the client is disciplined**—such as map pointer tracking and presence updates.

Client-side state managers like Zustand should only be used for **local UI state**, such as:

- Active panel
- Selected activity ID
- Open modals
- Map layer toggles
- Temporary draft state
- Local filters/sorting
- Unsaved UI preferences
- **Client-side throttle/coalescing state for pointer updates** (the server must still receive bounded traffic)

Do not duplicate SpacetimeDB-owned state in Zustand unless there is a clear reason (e.g., purely local gesture state).

---

### 2. Better Auth lives outside SpacetimeDB (identity → database session)

**Better Auth** runs in **TanStack Start’s standard server API routes**, backed by a **basic free-tier serverless database** for sessions (and any auth tables Better Auth requires).

Flow (conceptual):

1. User authenticates via Better Auth on the web server.
2. The app establishes authorized access to SpacetimeDB using an identity derived from that session (token exchange, signed connection parameters, or equivalent—implementation detail), so reducers can attribute actions to the correct user.

SpacetimeDB **reducers are pure with respect to the outside world**: they **cannot** perform arbitrary network fetches (no calling OAuth providers, no HTTP to UploadThing, etc.). That is why **auth verification and session persistence live outside** the database module.

---

### 3. UploadThing lives outside SpacetimeDB (upload → reducer logs metadata)

**UploadThing** handles **direct browser-to-storage uploads**.

Flow (conceptual):

1. Client obtains upload authorization from the TanStack Start server route (or UploadThing’s client flow, as configured).
2. File bytes go **directly** to UploadThing (not through SpacetimeDB).
3. On success, the client calls a **SpacetimeDB reducer** with the resulting URL/metadata to create/update `activityAttachments` (or similar) under trip permission checks.

Hard product constraints (MVP defaults):

- **Max ~5 MB per file** (tune down if needed; never silently raise without revisiting free tier).
- **Hard cap on files per trip** (and per activity if needed).
- Strict MIME allowlists and virus/abuse considerations as the product matures.

---

### 4. Free-tier safety: reducer budget and pointer spam

**SpacetimeDB MainCloud (free tier) is billed in practice by work done—think in terms of reducer invocations.** A published guideline for planning is on the order of **~3,000,000 reducer calls per month** on the free tier (verify against current vendor docs during implementation).

**Strong warnings (non-negotiable for agents and contributors):**

- **The client MUST aggressively throttle map pointer / presence updates.**
- Treat **~2 reducer calls per second per active user** as an upper bound for pointer motion, and prefer **less**.
- Send updates **only while the map is focused** and the user is **actually moving** the pointer (suppress idle hover noise; use distance thresholds; coalesce bursts).
- Never tie `mousemove` events 1:1 to reducers without throttling—this can exhaust the monthly budget quickly at scale.
- Presence rows should be small; prefer periodic heartbeat at low frequency separate from pointer updates if needed.

Also throttle non-pointer reducers where reasonable (typing indicators, batched activity edits).

---

### 5. Real-time collaboration should be practical, not over-engineered

The MVP does not need full Figma-style CRDT editing for every field.

Acceptable MVP behavior:

- Field-level updates via reducers.
- Optimistic UI where reasonable.
- Last-write-wins for simple conflicts.
- Activity history records important changes.
- **Live map presence/cursors** as a first-class feature, implemented with strict client throttling.

Avoid implementing complex CRDT/OT systems unless specifically requested.

---

### 6. Activities are ticket-like objects

Activities should be treated as rich editable records, similar to tickets/cards in tools like Jira, Monday, ClickUp, or Asana.

When editing activities:

- Keep reducers small and focused.
- Record important changes in the activity history.
- Prefer soft delete where useful.
- Validate permissions **inside reducers** (and validate input server-side there).
- Validate input client-side too for UX.

---

### 7. Location handling should be provider-agnostic

Do not tightly couple activities to Google Maps.

An activity location should be stored in a generic form:

- Display name
- Optional address
- Latitude
- Longitude
- Optional provider
- Optional provider place ID
- Optional external URL
- Optional raw provider metadata if needed

The app should be able to generate third-party map links from stored coordinates or text.

Example Google Maps search link:

```text
https://www.google.com/maps/search/?api=1&query=48.8584,2.2945
```

Example search link by name:

```text
https://www.google.com/maps/search/?api=1&query=Eiffel%20Tower
```

---

### 8. Calendar order powers the map timeline

The map timeline layer should connect activities based on the order defined in the calendar/timeline view.

Suggested ordering logic:

1. Date
2. Exact time, if provided
3. Manual order within the date
4. Creation time or fallback order

Activities without coordinates should be skipped in the map polyline but should still appear in calendar/list views.

---

## SpacetimeDB Data Model (Conceptual)

These are **conceptual** SpacetimeDB tables and reducer responsibilities. Adapt to exact SpacetimeDB TypeScript module APIs as the app evolves.

### Design notes

- Prefer explicit foreign keys as IDs (`u64`/`bigint` style) or stable string IDs—pick one scheme and stay consistent.
- **Ephemeral tables** should be safe to prune by time or disconnect handlers (implement cleanup reducers scheduled or triggered on session end as supported).
- **Reducers** implement all domain mutations and authorization checks.
- **Subscriptions/queries** power realtime UI; client SDK handles caching/reconnect.

### Durable tables (examples)

**`users`** (Spacetime-side profile linked to Better Auth user id)

```ts
// Conceptual columns
{
  userId: string; // stable id from Better Auth / your auth subject
  displayName: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}
```

**`trips`**

```ts
{
  tripId: bigint;
  title: string;
  description?: string;
  ownerUserId: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
```

**`tripMembers`**

```ts
{
  tripId: bigint;
  userId: string;
  role: "owner" | "editor" | "viewer";
  createdAt: number;
}
```

**`activities`**

```ts
{
  activityId: bigint;
  tripId: bigint;

  name: string;
  description?: string;

  locationName?: string;
  address?: string;
  lat?: number;
  lng?: number;
  locationProvider?: "manual" | "osm" | "google" | "apple" | "waze" | "other";
  providerPlaceId?: string;
  externalUrl?: string;

  date?: string; // YYYY-MM-DD
  timeType: "none" | "exact" | "ordered";
  time?: string; // HH:mm
  order?: number;

  createdBy: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
```

**`labels`**

```ts
{
  labelId: bigint;
  tripId: bigint;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}
```

**`activityLabels`** (join)

```ts
{
  activityId: bigint;
  labelId: bigint;
}
```

**`activityComments`**

```ts
{
  commentId: bigint;
  activityId: bigint;
  parentCommentId?: bigint;
  userId: string;
  body: string;
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;
}
```

**`activityAttachments`**

```ts
{
  attachmentId: bigint;
  activityId: bigint;
  type: "image" | "document" | "link";
  name: string;
  url?: string; // UploadThing URL after successful upload
  size?: number;
  mimeType?: string;
  createdBy: string;
  createdAt: number;
  deletedAt?: number;
}
```

**`activityHistory`**

```ts
{
  historyId: bigint;
  activityId: bigint;
  userId: string;
  action:
    | "created"
    | "updated"
    | "updated_name"
    | "updated_description"
    | "updated_location"
    | "updated_date"
    | "updated_time"
    | "updated_order"
    | "added_label"
    | "removed_label"
    | "added_attachment"
    | "removed_attachment"
    | "commented"
    | "deleted"
    | "restored";
  beforeJson?: string;
  afterJson?: string;
  createdAt: number;
}
```

### Ephemeral tables (examples)

**`mapPresence`** (per live connection / per trip)

```ts
{
  connectionId: string; // unique per websocket/session connection
  tripId: bigint;
  userId: string;
  lat: number;
  lng: number;
  updatedAt: number;
  // optional: cursorUiState, color, viewport bounds, etc. (keep tiny)
}
```

**`typingIndicators`** (optional; keep very low frequency)

```ts
{
  connectionId: string;
  tripId: bigint;
  userId: string;
  targetType: "activity" | "trip" | "comment";
  targetId: string;
  updatedAt: number;
}
```

### Reducers (examples)

Implement as focused operations, e.g.:

- `create_trip`, `invite_member`, `revoke_member`
- `create_activity`, `update_activity_fields`, `soft_delete_activity`, `restore_activity`
- `reorder_activity_within_day`
- `add_comment`, `edit_comment`, `soft_delete_comment`
- `add_label`, `remove_label`
- `register_uploaded_attachment` (**called only after UploadThing success**)
- `upsert_map_presence` (**throttled heavily on the client**)
- `clear_map_presence_on_disconnect` (as appropriate)

**Reminder:** reducers cannot call external HTTP services; any OAuth, webhooks, or upload broker logic stays in TanStack Start routes.

---

## Feature Roadmap

### Phase 1: Core MVP

Build the foundation:

- Authentication (Better Auth)
- Create trips
- View trips
- Invite/manage collaborators
- Create activities
- Edit activities
- Delete activities
- Add name, description, date, and optional time/order
- Add manual map location
- Map view with markers
- Calendar/list view
- Labels/tags
- Basic permissions (enforced in reducers)

---

### Phase 2: Collaboration

Add collaborative features:

- Realtime SpacetimeDB subscriptions for live data
- Optimistic edits where safe
- Comments
- Threaded replies
- Activity history/audit log
- **Live map presence and multiplayer cursors** (with strict throttling)
- Lightweight typing/editing indicators (low frequency)

---

### Phase 3: Map and Location Features

Improve location planning:

- Location search/geocoding using a free or free-tier provider
- Store coordinates and address metadata
- Generate external links to:
  - Google Maps
  - Apple Maps
  - Waze
  - OpenStreetMap
- Timeline map layer
- Connect activities by calendar order
- Numbered map markers
- Fit map to trip bounds
- Day-based map filtering

---

### Phase 4: Attachments

Add attachments carefully due to zero-budget constraints:

- External links first
- UploadThing uploads with **strict** caps (size, count, MIME)
- Attachment previews where reasonable
- Storage usage limits per trip/user

---

### Phase 5: Export

Add export features:

- JSON export
- CSV export
- GeoJSON export
- KML export
- GPX export
- Google Maps directions/search links

Do not claim direct export into Google Maps saved lists unless a reliable official API path is implemented.

---

## Coding Guidelines

### TypeScript

- Use TypeScript everywhere.
- Avoid `any` unless there is a clear reason.
- Prefer explicit types for exported functions and shared utilities.
- Keep shared types in dedicated files when reused across app/SpacetimeDB module boundaries.

### React

- Prefer small focused components.
- Keep collaborative/durable data in **SpacetimeDB client subscriptions**; keep local UI-only state in Zustand or component state.
- Avoid deeply nested prop chains when a local store or route context is clearer.
- Use controlled forms with TanStack Form where appropriate.

### Styling

- Use Tailwind CSS and shadcn/ui conventions.
- Prefer composable UI primitives.
- Keep styling consistent with shadcn patterns.
- Do not introduce unrelated component libraries unless necessary.

### SpacetimeDB module (server)

- Validate authorization in **every reducer** that mutates or exposes sensitive derived state.
- Do not rely only on client-side permission checks.
- Add useful indexes for `tripId`, `activityId`, `userId`, and date-based access patterns as supported.
- Keep reducers focused; avoid “god reducers.”
- Record activity history for meaningful edits.
- Soft delete important user content where appropriate.
- Remember: **no arbitrary network I/O** inside reducers.

### TanStack Start server routes

- Implement Better Auth routes with standard patterns for the stack.
- Keep secrets server-side.
- Broker any non-SpacetimeDB integration here (OAuth callbacks, upload session creation, etc.).

### Maps

- Use React Leaflet/shadcn-map patterns.
- Keep map components isolated from business logic where possible.
- Avoid hard dependencies on paid map providers.
- Make external map providers pluggable.
- Always consider attribution requirements for tile/geocoding providers.
- **Instrument and throttle** pointer-driven reducer traffic.

### Forms

- Use TanStack Form for complex forms.
- Validate with a shared schema where possible.
- Date format should preferably be stored as `YYYY-MM-DD`.
- Time format should preferably be stored as `HH:mm`.

---

## UX Principles

- Creating an activity should be fast.
- Editing should feel immediate.
- Users should understand whether an activity has:
  - No time
  - Exact time
  - Manual order
- Map and calendar should stay in sync.
- **Live cursors should feel helpful, not noisy**—only show meaningful motion and focus.
- Activity history should be understandable by non-technical users.
- Empty states should guide the user.
- Avoid destructive actions without confirmation.
- Make collaboration feel alive but not chaotic.

---

## Zero-Budget Service Guidance

Preferred choices for MVP:

- Hosting: Vercel free tier
- Realtime + durable collaborative state: **SpacetimeDB** (MainCloud free tier with strict reducer discipline)
- Maps: Leaflet + OpenStreetMap-compatible tiles
- Geocoding: manual pin first, free/free-tier geocoder later
- Files: **UploadThing** with aggressive limits
- Auth: **Better Auth** + free-tier serverless DB for sessions

Avoid:

- Paid Google Maps APIs
- Large file uploads
- Heavy tile usage
- Expensive background processing
- Vendor lock-in around one map provider
- Unbounded upload counts or sizes

---

## Things To Be Careful About

- **SpacetimeDB free-tier reducer limits** and accidental “mousemove → reducer” loops.
- Google Maps APIs often require billing.
- OpenStreetMap public tile servers have usage policies.
- Free geocoding APIs have rate limits.
- File storage can become expensive—even on UploadThing, abuse or large objects are a risk.
- Real-time collaboration can cause conflicts.
- Permission bugs can expose private trips.
- Direct export to Google Maps lists may not be officially supported.
- Attachments need size, count, and type validation.

---

## Definition of Done

For any meaningful feature:

- It works in the UI.
- It is typed.
- It validates user input.
- It checks permissions **in SpacetimeDB reducers** (and uses Better Auth appropriately on the server for identity).
- It handles loading and error states.
- It works with realtime updates where applicable.
- It does not introduce paid dependencies by default.
- It follows existing UI patterns.
- It is documented if it adds architectural complexity.
- If it touches map presence, it includes **explicit throttling/focus gating** and does not risk blowing reducer budgets.

---

## Agent Instructions

When working on this project:

1. Preserve the zero-budget MVP goal.
2. Prefer simple, maintainable solutions.
3. Do not introduce paid services without clearly explaining why.
4. Do not hard-code Google Maps as the only map provider.
5. Keep **SpacetimeDB** as the source of truth for collaborative domain state and ephemeral presence **without** expecting reducers to call external networks.
6. Use Zustand only for local UI state.
7. Keep map, calendar, and activity data models aligned.
8. Add activity history for meaningful activity changes.
9. Treat **live map cursors/presence** as a core feature and a **budget-sensitive** subsystem.
10. Ask for clarification before making major product or architecture changes.
11. Use **Bun** for installs and scripts (`bun install`, `bun run dev`, `bun run lint`, etc.); do not assume pnpm or npm unless the repo explicitly documents otherwise.

---

## Cursor Cloud specific instructions

### Environment setup

- **Bun** is the package manager (`bun.lock` at root). Installed to `~/.bun/bin/bun`.
- **SpacetimeDB CLI** (`spacetime`) is installed at `~/.local/bin/spacetime`.
- Both are added to PATH via `~/.bashrc`. If you get "command not found", ensure PATH includes both:
  ```bash
  export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"
  ```
- The update script runs `bun install` for both the root and `spacetimedb/spacetimedb/`, and installs Bun/SpacetimeDB CLI if missing.

### Running the dev server

```bash
bun run dev
```

This starts the Vite/TanStack Start server on **port 3000**. The server uses `.env.local` for environment variables.

### Local auth database

Better Auth uses a local SQLite file (`file:local.db`) via `@libsql/client`. If the file doesn't exist, run:

```bash
bun run db:migrate
```

This creates and migrates `local.db` in the workspace root. The `.env.local` file should contain:

```
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=local-dev-token
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<any 32+ char hex string>
```

### SpacetimeDB (external)

SpacetimeDB is a hosted service (MainCloud). The app connects to `free-roam-97kss` on `maincloud.spacetimedb.com` via WebSocket. Trip/activity CRUD depends on SpacetimeDB reducers being published. Without `spacetime login`, the SpacetimeDB connection will fail — auth and the UI still work, but trip data cannot be persisted.

To publish the module (requires interactive browser OAuth):
```bash
spacetime login              # opens browser for OAuth — use --token <tok> if you have one
bun run spacetime:dev        # publishes module + generates client bindings
```

Alternatively, use `spacetime login --token <your-token>` to bypass the browser flow if you have a SpacetimeDB auth token.

### Key commands (see README for full list)

| Task | Command |
|------|---------|
| Dev server | `bun run dev` |
| Lint | `bun run lint` |
| Type-check | `bun run typecheck` |
| Tests | `bun run test` |
| Build | `bun run build` |
| DB migrations | `bun run db:migrate` |
| SpacetimeDB generate bindings | `bun run spacetime:generate` |

### Known gotchas

- **SSR hydration warning**: `auth-client.ts` references `window` at module scope, causing an SSR error that triggers client-side fallback. This is a known issue and does not affect functionality.
- **Vitest exit delay**: `bun run test` may print a "hanging-process" warning after tests pass. Tests still complete correctly; it's a Vite server cleanup timing issue.
- **SpacetimeDB console errors**: Expected in local dev without published modules. Auth and UI are fully functional independently.
- **`local.db` is gitignored**: The file is created by `bun run db:migrate` and should not be committed.
