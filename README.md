# Collaborative Trip Planner

A collaborative trip planning web app with real-time editing, map planning, calendar planning, activity tickets, labels, comments, attachments, and trip timeline visualization.

The project is designed as a zero-budget MVP using free tiers and open/free services where possible.

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

- A map
- A calendar/timeline
- Eventually, additional list/board views

---

## Main Views

### Map View

The map view shows activities as markers.

Planned map features:

- Add activity by clicking on the map
- Edit activity from marker/popup/sidebar
- Show all trip activities
- Filter by day or label
- Show numbered markers
- Show a timeline layer
- Connect activities by calendar order
- Open locations in third-party map apps

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
- Convex
- shadcn/ui
- Tailwind CSS
- shadcn-map / React Leaflet
- Zustand
- Vercel

Possible supporting tools:

- Leaflet
- date-fns
- Zod or Valibot
- Convex Auth/Auth.js
- Convex file storage or another free-tier upload provider

---

## Why This Stack?

### TanStack Start

Used for the React application foundation, routing, server/client integration, and modern TypeScript-first development.

### Convex

Used as the backend and real-time source of truth.

Convex is responsible for:

- Database
- Realtime queries
- Mutations
- Permissions
- Comments
- Activity history
- Collaboration
- Possibly file storage

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

Server data should live in Convex, not Zustand.

---

## Zero-Budget Goal

The project should be possible to run as a small MVP with no paid services.

This affects several product decisions.

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

File storage is not truly unlimited for free.

The MVP should start with one of these approaches:

1. External attachment links only
2. Convex file storage with strict limits
3. Another free-tier upload provider with strict limits

Recommended limits for MVP:

- Max file size
- Max files per activity
- Max total storage per trip/user
- Allowed MIME types

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
├── convex/
│   ├── schema.ts
│   ├── trips.ts
│   ├── activities.ts
│   ├── comments.ts
│   ├── labels.ts
│   ├── attachments.ts
│   └── history.ts
├── public/
├── AGENTS.md
└── README.md
```

---

## Planned Features

### Phase 1: Core MVP

- User authentication
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
- Basic permissions

### Phase 2: Collaboration

- Realtime activity updates
- Comments
- Threaded comments
- Activity history
- Optimistic UI
- Basic presence indicators
- User editing indicators

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
- Image upload
- Document upload
- Attachment previews
- File size limits
- Storage limits

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

- Convex realtime queries for live updates
- Field-level mutations
- Optimistic UI where useful
- Last-write-wins for simple conflicts
- Activity history for accountability
- Presence later

The MVP should not attempt full Figma-style CRDT editing unless it becomes necessary.

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

This can be adjusted as the product evolves.

---

## Development

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Start Convex locally or connect to Convex dev:

```bash
pnpm convex dev
```

Build the app:

```bash
pnpm build
```

Run checks:

```bash
pnpm lint
pnpm typecheck
```

These commands may need to be adjusted depending on the final package scripts.

---

## Environment Variables

The exact environment variables depend on the selected auth and deployment setup.

Expected categories:

```text
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
AUTH_SECRET=
AUTH_URL=
```

Additional variables may be needed for:

- Auth provider
- Upload provider
- Geocoding provider
- Map tile provider

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

---

## Known Constraints

- Free map tiles may have usage limits.
- Free geocoding may have rate limits.
- File storage is limited on free tiers.
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
5. Edit activities collaboratively.
6. Add labels and comments.
7. Show a map timeline connecting the ordered activities.
8. Export trip data in open formats.

Once the MVP works, the project can expand into stronger collaboration, better map search, richer attachments, and more export options.

---

## License

License not decided yet.
