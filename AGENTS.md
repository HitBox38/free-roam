## Project Overview

This project is a collaborative trip planning web app.

The goal is to let users plan trips together in real time, with a workflow that feels inspired by tools like Figma, Monday, Jira, ClickUp, Asana, and calendar/map planning apps.

Users can create trips, invite collaborators, and add activities/events to a shared trip board. Each activity behaves like a rich ticket/card and can contain location data, dates, optional time, labels, descriptions, comments, attachments, and history.

The app has two primary planning views:

1. **Map View**
   - Shows trip activities as markers.
   - Supports selecting and editing activities.
   - Supports a timeline layer that connects activities in trip order.
   - Uses Leaflet via a shadcn-like map component.

2. **Calendar / Timeline View**
   - Shows activities grouped by date.
   - Supports exact times or manual ordering within a day.
   - Defines the ordering used by the map timeline layer.

The project is intended to work as a zero-budget MVP using free tiers and open/free services wherever possible.

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

Users should be able to collaboratively edit the trip in real time.

---

## Important Product Constraints

This project should be designed around a zero-dollar budget.

That means:

- Avoid paid APIs by default.
- Avoid requiring Google Maps Platform billing.
- Prefer OpenStreetMap/Leaflet-based maps.
- Prefer free-tier services.
- Keep storage usage limited.
- Design uploads with strict limits.
- Prefer generated third-party map links over direct paid integrations.
- Avoid promising direct export into Google Maps saved lists unless supported by an official free API.

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
- Convex
- shadcn/ui
- Tailwind CSS
- shadcn-map / React Leaflet
- Zustand
- Vercel

Likely supporting libraries:

- Leaflet
- date-fns or similar date utilities
- Zod or Valibot for validation
- Auth provider compatible with Convex
- Convex file storage or a free-tier upload provider

---

## Architecture Principles

### 1. Convex is the source of truth

Use Convex for:

- Trips
- Trip members
- Activities
- Comments
- Threads
- Labels
- Attachments metadata
- History/audit log
- Real-time collaboration
- Permissions checks

Client-side state managers like Zustand should only be used for local UI state, such as:

- Active panel
- Selected activity ID
- Open modals
- Map layer toggles
- Temporary draft state
- Local filters/sorting
- Unsaved UI preferences

Do not duplicate server-owned Convex state in Zustand unless there is a clear reason.

---

### 2. Real-time collaboration should be practical, not over-engineered

The MVP does not need full Figma-style CRDT editing.

Acceptable MVP behavior:

- Field-level updates.
- Optimistic UI where reasonable.
- Last-write-wins for simple conflicts.
- Activity history records all changes.
- Presence indicators can be added later.

Avoid implementing complex CRDT/OT systems unless specifically requested.

---

### 3. Activities are ticket-like objects

Activities should be treated as rich editable records, similar to tickets/cards in tools like Jira, Monday, ClickUp, or Asana.

When editing activities:

- Keep mutations small and focused.
- Record important changes in the activity history.
- Prefer soft delete where useful.
- Validate permissions on the server.
- Validate input both client-side and server-side.

---

### 4. Location handling should be provider-agnostic

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

### 5. Calendar order powers the map timeline

The map timeline layer should connect activities based on the order defined in the calendar/timeline view.

Suggested ordering logic:

1. Date
2. Exact time, if provided
3. Manual order within the date
4. Creation time or fallback order

Activities without coordinates should be skipped in the map polyline but should still appear in calendar/list views.

---

## Suggested Data Model

These are conceptual models. Adapt them to Convex schema syntax as the app evolves.

### trips

```ts
{
  title: string;
  description?: string;
  ownerId: Id<"users">;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
```

### tripMembers

```ts
{
  tripId: Id<"trips">;
  userId: Id<"users">;
  role: "owner" | "editor" | "viewer";
  createdAt: number;
}
```

### activities

```ts
{
  tripId: Id<"trips">;

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

  labelIds?: Id<"labels">[];

  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
```

### labels

```ts
{
  tripId: Id<"trips">;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}
```

### activityComments

```ts
{
  activityId: Id<"activities">;
  parentCommentId?: Id<"activityComments">;
  userId: Id<"users">;
  body: string;
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;
}
```

### activityAttachments

```ts
{
  activityId: Id<"activities">;
  type: "image" | "document" | "link";
  name: string;
  url?: string;
  storageId?: string;
  size?: number;
  mimeType?: string;
  createdBy: Id<"users">;
  createdAt: number;
  deletedAt?: number;
}
```

### activityHistory

```ts
{
  activityId: Id<"activities">;
  userId: Id<"users">;
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

  before?: unknown;
  after?: unknown;
  createdAt: number;
}
```

---

## Feature Roadmap

### Phase 1: Core MVP

Build the foundation:

- Authentication
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
- Basic permissions

---

### Phase 2: Collaboration

Add collaborative features:

- Real-time Convex updates
- Optimistic edits
- Comments
- Threaded replies
- Activity history/audit log
- Basic presence indicators
- "User is editing" indicators

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
- Image uploads with strict size limits
- Document uploads with strict size limits
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
- Keep shared types in dedicated files when reused across app/Convex boundaries.

### React

- Prefer small focused components.
- Keep server data in Convex hooks.
- Keep local UI-only state in Zustand or component state.
- Avoid deeply nested prop chains when a local store or route context is clearer.
- Use controlled forms with TanStack Form where appropriate.

### Styling

- Use Tailwind CSS and shadcn/ui conventions.
- Prefer composable UI primitives.
- Keep styling consistent with shadcn patterns.
- Do not introduce unrelated component libraries unless necessary.

### Convex

- Validate authorization in every query/mutation that accesses user-owned or trip-owned data.
- Do not rely only on client-side permission checks.
- Add useful indexes for tripId, activityId, userId, and date-based queries.
- Keep mutations focused.
- Record activity history for meaningful edits.
- Soft delete important user content where appropriate.

### Maps

- Use React Leaflet/shadcn-map patterns.
- Keep map components isolated from business logic where possible.
- Avoid hard dependencies on paid map providers.
- Make external map providers pluggable.
- Always consider attribution requirements for tile/geocoding providers.

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
- Activity history should be understandable by non-technical users.
- Empty states should guide the user.
- Avoid destructive actions without confirmation.
- Make collaboration feel alive but not chaotic.

---

## Zero-Budget Service Guidance

Preferred choices for MVP:

- Hosting: Vercel free tier
- Backend/database/realtime: Convex free tier
- Maps: Leaflet + OpenStreetMap-compatible tiles
- Geocoding: manual pin first, free/free-tier geocoder later
- Files: external links first, uploads later
- Auth: Convex Auth/Auth.js/free-tier auth provider

Avoid:

- Paid Google Maps APIs
- Large file uploads
- Heavy tile usage
- Expensive background processing
- Vendor lock-in around one map provider

---

## Things To Be Careful About

- Google Maps APIs often require billing.
- OpenStreetMap public tile servers have usage policies.
- Free geocoding APIs have rate limits.
- File storage can become expensive.
- Real-time collaboration can cause conflicts.
- Permission bugs can expose private trips.
- Direct export to Google Maps lists may not be officially supported.
- Attachments need size and type validation.

---

## Definition of Done

For any meaningful feature:

- It works in the UI.
- It is typed.
- It validates user input.
- It checks permissions server-side.
- It handles loading and error states.
- It works with real-time updates where applicable.
- It does not introduce paid dependencies by default.
- It follows existing UI patterns.
- It is documented if it adds architectural complexity.

---

## Agent Instructions

When working on this project:

1. Preserve the zero-budget MVP goal.
2. Prefer simple, maintainable solutions.
3. Do not introduce paid services without clearly explaining why.
4. Do not hard-code Google Maps as the only map provider.
5. Keep Convex as the source of truth.
6. Use Zustand only for local UI state.
7. Keep map, calendar, and activity data models aligned.
8. Add activity history for meaningful activity changes.
9. Design for collaboration, but avoid unnecessary CRDT complexity.
10. Ask for clarification before making major product or architecture changes.
