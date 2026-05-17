# Collaborative Trip Planner

A collaborative trip planning web app with real-time editing, map planning, calendar planning, activity tickets, labels, comments, attachments, and trip timeline visualization.

A **core experience** is **Figma-like live presence and cursors on the map**, so collaborators can see where others are looking and pointing in real time—implemented on top of a persistent WebSocket datastore with aggressive client-side throttling to stay within free-tier limits.

The project is designed as a **zero-budget MVP** using free tiers and open/free services where possible.

---

## What Is This?

This app helps groups plan trips together.

Users can create a trip, invite collaborators, and add activities such as restaurants, attractions, flights, hotels, hikes, museums, meetings, or anything else that belongs in the itinerary.

Each activity acts like a rich planning card or ticket, similar to cards in Monday, Jira, ClickUp, Asana, or Trello.

Activities can include:

- Name
- Location
- Date
- Optional time
- Manual order within a day
- Description
- Images
- Attached documents
- Labels/tags
- Comments and threads
- Edit history

The trip can be viewed as:

- A map (with **live multiplayer cursors/presence**)
- A calendar/timeline
- Eventually, additional list/board views

---

## Main Views

### Map View

The map view shows activities as markers and supports **live collaborative cursors** (presence tied to map coordinates), throttled to protect infrastructure budgets.

Planned map features:

- Add activity by clicking on the map
- Edit activity from marker/popup/sidebar
- Show all trip activities
- Filter by day or label
- Show numbered markers
- Show a timeline layer
- Connect activities by calendar order
- Open locations in third-party map apps
- **Live presence**: other collaborators’ pointers/focus on the map surface

The timeline layer connects activities using the order defined in the calendar view.

---

### Calendar / Timeline View

The calendar view shows the trip itinerary by date.

Activities can have:

1. No time
2. Exact time, such as `14:30`
3. Manual order within the day

The calendar order is important because it also determines the order of the timeline path on the map.

---

## Tech Stack

This project uses:

- TypeScript
- React
- TanStack Start
- TanStack Router
- TanStack Form
- TanStack Hotkeys
- **SpacetimeDB** (TypeScript server module: tables + reducers)
- **Better Auth** (hosted in TanStack Start server API routes)
- **UploadThing** (direct uploads; SpacetimeDB stores attachment metadata after success)
- shadcn/ui
- Tailwind CSS
- shadcn-map / React Leaflet
- Zustand (local UI state only)
- Vercel

Possible supporting tools:

- Leaflet
- date-fns
- Zod or Valibot
- A small **free-tier serverless database** for Better Auth sessions/tables

---

## Why This Stack?

### TanStack Start

Used for the React application foundation, routing, server/client integration, and **standard server API routes** for authentication and upload brokering.

### SpacetimeDB

Used as the **realtime engine and source of truth** for:

- Durable trip data (trips, members, activities, labels, comments, history, attachment records)
- Ephemeral collaboration data (map presence/cursors, lightweight typing indicators)

SpacetimeDB is a strong fit here because of its **persistent WebSocket connection**, **local caching**, and **very fast incremental updates**—ideal for **high-frequency** state like map pointers **when the client is strict about throttling**.

**Important free-tier constraint (MainCloud):** plan around on the order of **~3,000,000 reducer (function) calls per month** on the free tier (confirm against current vendor documentation).

**This means the browser must not spam reducers.** For map cursors, treat **~2 calls/second per user** as a hard upper bound and prefer less; only send while **moving** and while the map surface is **focused**. Never wire raw `mousemove` to reducers without distance thresholds and throttling—it's a budget foot-gun.

### Better Auth

Authentication runs **outside** SpacetimeDB via TanStack Start routes, backed by a basic serverless database for sessions.

SpacetimeDB reducers are **not** a general HTTP runtime: they **cannot** do arbitrary network fetches, so OAuth/session persistence belongs in the web server layer. The app then connects to SpacetimeDB with an identity linked to the authenticated user.

### UploadThing

Uploads happen **outside** SpacetimeDB: the browser uploads directly to UploadThing, then calls a reducer to persist attachment metadata (URL, size, MIME, etc.).

Enforce **strict** MVP limits, for example:

- **Max ~5 MB per file**
- **Hard cap on files per trip** (and per activity if needed)
- MIME allowlists and clear UI errors when limits are hit

### shadcn/ui

Used for consistent UI primitives and styling.

### React Leaflet / shadcn-map

Used for the map UI while avoiding paid map SDKs.

### Zustand

Used only for local UI state, such as:

- Selected activity
- Open panels
- Map layer toggles
- Local filters
- Modal state
- Local coalescing/throttle timers for pointer updates

Collaborative/durable data should live in **SpacetimeDB subscriptions**, not Zustand.

---

## Zero-Budget Goal

The project should be possible to run as a small MVP with no paid services.

This affects several product decisions.

### SpacetimeDB reducer budget

Even “small” apps can accidentally exhaust free tiers if the client emits too many mutations.

Rules of thumb:

- Throttle **all** high-frequency reducers, especially **map pointer** updates.
- Prefer batching for bursty edits where reasonable.
- Keep ephemeral rows small; clean up on disconnect.

### Maps

The app should avoid paid Google Maps APIs by default.

Preferred MVP approach:

- Leaflet
- OpenStreetMap-compatible tiles
- Manual map pin placement first
- Optional free/free-tier geocoding later

### Geocoding

Location search can be added through a free or free-tier geocoder, but rate limits must be respected.

Possible options:

- Nominatim/OpenStreetMap
- Photon
- Geoapify free tier
- MapTiler free tier
- Other free-tier providers

Manual pin placement should work even without geocoding.

### Google Maps Links

The app can generate Google Maps links without using the paid Google Maps Platform.

Example:

```text
https://www.google.com/maps/search/?api=1&query=48.8584,2.2945
```

Or:

```text
https://www.google.com/maps/search/?api=1&query=Eiffel%20Tower
```

Direct export into a user's Google Maps saved list is not guaranteed and should not be promised unless an official supported API is implemented.

### Attachments

Use **UploadThing** with explicit guardrails:

- **~5 MB max per file** (adjust only with intention and documented tier impact)
- **Limited files per trip**
- Recommended MIME allowlists
- Clear empty states explaining limits

---

## Core Data Concepts

### Trip

A trip is the top-level collaborative workspace.

A trip has:

- Title
- Description
- Owner
- Members
- Activities
- Labels
- Settings

### Activity

An activity is a single planned item in the trip.

Examples:

- Hotel check-in
- Dinner
- Museum visit
- Flight
- Hike
- Beach day
- Train ride
- Meeting point

An activity can contain:

- Name
- Location
- Date
- Time/order
- Description
- Labels
- Attachments
- Comments
- History

### Label

Labels help organize activities.

Examples:

- Food
- Hotel
- Transport
- Must-see
- Optional
- Paid
- Booked
- Family
- Outdoors

### Comment

Comments allow collaborators to discuss an activity.

Threaded replies are planned.

### Activity History

Activity history records important changes, such as:

- Activity created
- Name changed
- Location changed
- Date changed
- Time changed
- Label added/removed
- Attachment added/removed
- Activity deleted
- Activity restored

### Live map presence (ephemeral)

Presence records are short-lived collaboration state (e.g., cursor lat/lng keyed by `connectionId`) stored in SpacetimeDB for realtime sync, not meant to be long-term archival data.

---

## Suggested Activity Time Model

Activities support flexible scheduling.

```ts
type ActivityTime =
  | {
      type: "none";
    }
  | {
      type: "exact";
      time: string;
    }
  | {
      type: "ordered";
      order: number;
    };
```

Storage recommendation:

- Dates as `YYYY-MM-DD`
- Exact times as `HH:mm`
- Manual order as a number

---

## Suggested Location Model

Locations should be provider-agnostic.

```ts
type ActivityLocation = {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  provider?: "manual" | "osm" | "google" | "apple" | "waze" | "other";
  providerPlaceId?: string;
  externalUrl?: string;
};
```

The app should be able to generate third-party links from either coordinates or a location name.

---

## Suggested Project Structure

Exact structure may change as the app evolves.

```text
.
├── app/
│   ├── components/
│   │   ├── activities/
│   │   ├── calendar/
│   │   ├── map/
│   │   ├── trips/
│   │   └── ui/
│   ├── routes/
│   ├── stores/
│   ├── utils/
│   └── styles/
├── spacetime/                 # SpacetimeDB TypeScript server module (name may vary)
│   ├── src/
│   │   ├── tables.ts          # table definitions (conceptual)
│   │   ├── reducers/          # domain mutations + authz checks
│   │   └── lib/
│   └── ...
├── public/
├── AGENTS.md
└── README.md
```

---

## Planned Features

### Phase 1: Core MVP

- User authentication (Better Auth)
- Create trip
- Edit trip
- Invite collaborators
- Create activity
- Edit activity
- Delete activity
- Add name and description
- Add date
- Add optional exact time
- Add manual order within a day
- Add manual map location
- Show activities on map
- Show activities in calendar/list view
- Add labels
- Basic permissions (server-enforced in reducers)

### Phase 2: Collaboration

- Realtime updates via SpacetimeDB
- Comments
- Threaded comments
- Activity history
- Optimistic UI
- **Live map presence and multiplayer cursors** (throttled)
- User typing/editing indicators (low frequency)

### Phase 3: Map Improvements

- Location search/geocoding
- External map links
- Timeline layer
- Connected route line
- Numbered map markers
- Fit map to trip
- Filter map by day
- Filter map by label

### Phase 4: Attachments

- External attachment links
- UploadThing image/document upload
- Attachment previews
- **5 MB/file** and **per-trip file count** limits (MVP defaults)

### Phase 5: Export

- JSON export
- CSV export
- GeoJSON export
- KML export
- GPX export
- Google Maps search/direction links

---

## Export Goals

The app should support open export formats.

Recommended exports:

- JSON
- CSV
- GeoJSON
- KML
- GPX

These formats make it easier to move trip data into other tools.

Google Maps support should start with generated links and possibly KML/CSV export for import into compatible Google products.

---

## Collaboration Model

The MVP collaboration model should be simple and reliable.

Recommended approach:

- SpacetimeDB subscriptions for live reads
- Field-level reducers for writes
- Optimistic UI where useful
- Last-write-wins for simple conflicts
- Activity history for accountability
- **Live map cursors** with strict client-side throttling and focus gating

The MVP should not attempt full Figma-style CRDT editing for every field unless it becomes necessary.

---

## Permissions Model

Suggested trip roles:

- `owner`
- `editor`
- `viewer`

Possible permissions:

| Action          | Owner | Editor | Viewer |
| --------------- | ----- | ------ | ------ |
| View trip       | Yes   | Yes    | Yes    |
| Edit trip       | Yes   | Maybe  | No     |
| Delete trip     | Yes   | No     | No     |
| Invite members  | Yes   | Maybe  | No     |
| Create activity | Yes   | Yes    | No     |
| Edit activity   | Yes   | Yes    | No     |
| Delete activity | Yes   | Yes    | No     |
| Comment         | Yes   | Yes    | Maybe  |
| View history    | Yes   | Yes    | Yes    |

This can be adjusted as the product evolves. **Authoritative checks belong in SpacetimeDB reducers.**

---

## Development

This repository uses [Bun](https://bun.sh) as the package manager (`bun install`, `bun run <script>`).

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Run the SpacetimeDB module locally (exact command depends on final SpacetimeDB tooling in this repo), for example:

```bash
bun run spacetime dev
```

Build the app:

```bash
bun run build
```

Run checks:

```bash
bun run lint
bun run typecheck
```

These commands may need to be adjusted depending on the final package scripts.

---

## Environment Variables

The exact environment variables depend on auth, SpacetimeDB hosting, and UploadThing configuration.

Expected categories:

```text
# SpacetimeDB (example names — align with SDK/hosting)
SPACETIME_MODULE_NAME=
SPACETIME_SERVER_URL=

# Better Auth / TanStack Start server
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# UploadThing
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=
```

Additional variables may be needed for:

- Map tile provider
- Geocoding provider

Do not commit secrets to the repository.

---

## Design Principles

- Planning should feel fast.
- Editing should feel collaborative.
- Map and calendar should stay synchronized.
- Activities should feel like rich tickets.
- Location features should not depend on one paid provider.
- Users should understand the difference between exact time and manual order.
- Export should use open formats.
- The app should remain usable on a zero-dollar budget for small-scale MVP usage.
- **Live cursors must be implemented with extreme reducer thriftiness.**

---

## Known Constraints

- **SpacetimeDB MainCloud free tier reducer/monthly limits** (treat pointer updates as a scarce resource).
- Free map tiles may have usage limits.
- Free geocoding may have rate limits.
- UploadThing and any object storage still require strict product limits.
- Google Maps Platform usually requires billing.
- Direct Google Maps saved-list export may not be possible.
- Real-time collaboration can create edit conflicts.
- Public apps need abuse/spam protection.

---

## Current Product Direction

The first goal is to build a working collaborative MVP:

1. Create a trip.
2. Add activities.
3. See activities on a map.
4. See activities in calendar order.
5. Edit activities collaboratively via SpacetimeDB.
6. Add labels and comments.
7. Show a map timeline connecting the ordered activities.
8. Show **live map presence/cursors** without blowing free-tier reducer budgets.
9. Export trip data in open formats.

Once the MVP works, the project can expand into stronger collaboration, better map search, richer attachments, and more export options.

---

## License

License not decided yet.
