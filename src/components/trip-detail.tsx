import { useForm } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useMapEvents } from "react-leaflet"
import { useSpacetimeDB, useTable } from "spacetimedb/react"
import type { LeafletMouseEvent } from "leaflet"

import type { DbConnection } from "@/module_bindings"
import type { Activities, Labels, TripMembers, Trips } from "@/module_bindings/types"
import {
  Map,
  MapMarker,
  MapPopup,
  MapTileLayer,
  MapZoomControl,
} from "@/components/ui/map"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { activityPayload, formatActivityTime } from "@/lib/activity-format"
import { sortActivitiesForTimeline } from "@/lib/trip-domain"
import { tables } from "@/module_bindings"

interface TripDetailProps {
  tripId: string
}

export function TripDetail({ tripId }: TripDetailProps) {
  const parsedTripId = BigInt(tripId)
  const spacetime = useSpacetimeDB()
  const conn = spacetime.getConnection() as DbConnection | null
  const identity = spacetime.identity
  const [trips] = useTable(tables.trips)
  const [members] = useTable(tables.tripMembers)
  const [activities] = useTable(tables.activities)
  const [labels] = useTable(tables.labels)
  const [activityLabels] = useTable(tables.activityLabels)
  const [selectedActivityId, setSelectedActivityId] = useState<bigint | null>(
    null
  )
  const [pinTargetId, setPinTargetId] = useState<bigint | null>(null)

  const trip = trips.find(
    (row) => row.tripId === parsedTripId && !row.deletedAt
  )
  const tripMembers = members.filter((member) => member.tripId === parsedTripId)
  const currentMember = identity
    ? tripMembers.find((member) => member.identity.equals(identity))
    : undefined
  const canEdit = currentMember?.role === "owner" || currentMember?.role === "editor"
  const tripActivities = useMemo(
    () => {
      const activeActivities = activities.filter(
        (activity) => activity.tripId === parsedTripId && !activity.deletedAt
      )
      const sortedIds = sortActivitiesForTimeline(
        activeActivities.map((activity) => ({
          activityId: activity.activityId,
          name: activity.name,
          date: activity.date,
          timeType: activity.timeType,
          time: activity.time,
          order: activity.order,
          createdAt: Number(activity.createdAt.toMillis()),
        }))
      ).map((activity) => activity.activityId)

      return [...activeActivities].sort(
        (left, right) =>
          sortedIds.indexOf(left.activityId) - sortedIds.indexOf(right.activityId)
      )
    },
    [activities, parsedTripId]
  )
  const tripLabels = labels.filter((label) => label.tripId === parsedTripId)
  const selectedActivity: Activities | undefined =
    tripActivities.find((activity) => activity.activityId === selectedActivityId) ??
    tripActivities.at(0)

  if (!trip) {
    return (
      <main className="flex min-h-svh flex-col gap-4 p-6">
        <Link to="/trips" className="text-sm text-muted-foreground">
          Back to trips
        </Link>
        <p className="text-sm text-muted-foreground">
          Trip not found or you are not a member yet.
        </p>
      </main>
    )
  }

  return (
    <div className="flex min-h-svh flex-col gap-4 p-4">
      <header className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Link to="/trips" className="text-sm text-muted-foreground">
              Back to trips
            </Link>
            <h1 className="text-2xl font-semibold">{trip.title}</h1>
            {trip.description && (
              <p className="text-sm text-muted-foreground">
                {trip.description}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            Role: {currentMember?.role ?? "none"}
          </div>
        </div>
        {canEdit && <TripSettingsForm conn={conn} trip={trip} />}
      </header>

      <section className="grid min-h-[42rem] gap-4 xl:grid-cols-[22rem_minmax(0,1fr)_24rem]">
        <aside className="flex flex-col gap-4">
          {canEdit && (
            <>
              <ActivityForm conn={conn} tripId={parsedTripId} />
              <LabelForm conn={conn} tripId={parsedTripId} />
              <InviteMemberForm conn={conn} tripId={parsedTripId} />
            </>
          )}
          <MembersList members={tripMembers} />
        </aside>

        <TripMap
          activities={tripActivities}
          canEdit={canEdit}
          conn={conn}
          pinTargetId={pinTargetId}
          selectedActivityId={selectedActivity?.activityId}
          onSelectActivity={setSelectedActivityId}
          onClearPinTarget={() => setPinTargetId(null)}
        />

        <aside className="flex min-h-0 flex-col gap-4">
          <CalendarList
            activities={tripActivities}
            labels={tripLabels}
            activityLabels={activityLabels}
            selectedActivityId={selectedActivity?.activityId}
            onSelectActivity={setSelectedActivityId}
          />
          {selectedActivity && canEdit && (
            <ActivityEditor
              activity={selectedActivity}
              conn={conn}
              labels={tripLabels}
              linkedLabelIds={activityLabels
                .filter(
                  (link) => link.activityId === selectedActivity.activityId
                )
                .map((link) => link.labelId)}
              onPickPin={() => setPinTargetId(selectedActivity.activityId)}
            />
          )}
        </aside>
      </section>
    </div>
  )
}

function TripSettingsForm({
  conn,
  trip,
}: {
  conn: DbConnection | null
  trip: Trips
}) {
  const form = useForm({
    defaultValues: {
      title: trip.title,
      description: trip.description ?? "",
    },
    onSubmit: ({ value }) => {
      conn?.reducers.updateTrip({
        tripId: trip.tripId,
        title: value.title,
        description: value.description || undefined,
      })
    },
  })

  return (
    <form
      className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field
        name="title"
        children={(field) => (
          <Input
            aria-label="Trip title"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      />
      <form.Field
        name="description"
        children={(field) => (
          <Input
            aria-label="Trip description"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      />
      <Button type="submit" disabled={!conn}>
        Save trip
      </Button>
    </form>
  )
}

function ActivityForm({
  conn,
  tripId,
}: {
  conn: DbConnection | null
  tripId: bigint
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      date: "",
      timeType: "none",
      time: "",
      order: 0,
    },
    onSubmit: ({ value, formApi }) => {
      conn?.reducers.createActivity({
        tripId,
        name: value.name,
        description: value.description || undefined,
        date: value.date || undefined,
        timeType: value.timeType,
        time: value.timeType === "exact" ? value.time : undefined,
        order: value.timeType === "ordered" ? value.order : undefined,
        locationName: undefined,
        address: undefined,
        lat: undefined,
        lng: undefined,
        locationProvider: undefined,
        providerPlaceId: undefined,
        externalUrl: undefined,
      })
      formApi.reset()
    },
  })

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <h2 className="font-medium">Add activity</h2>
      <form.Field
        name="name"
        children={(field) => (
          <Input
            aria-label="Activity name"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder="Museum visit"
            required
          />
        )}
      />
      <form.Field
        name="description"
        children={(field) => (
          <Textarea
            aria-label="Activity description"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder="Notes, booking info, or ideas"
          />
        )}
      />
      <div className="grid grid-cols-2 gap-2">
        <form.Field
          name="date"
          children={(field) => (
            <Input
              aria-label="Activity date"
              type="date"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        />
        <form.Field
          name="timeType"
          children={(field) => (
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            >
              <option value="none">No time</option>
              <option value="exact">Exact time</option>
              <option value="ordered">Manual order</option>
            </select>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <form.Field
          name="time"
          children={(field) => (
            <Input
              aria-label="Exact time"
              type="time"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        />
        <form.Field
          name="order"
          children={(field) => (
            <Input
              aria-label="Manual order"
              type="number"
              min={0}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) =>
                field.handleChange(event.target.valueAsNumber || 0)
              }
            />
          )}
        />
      </div>
      <Button type="submit" disabled={!conn}>
        Add activity
      </Button>
    </form>
  )
}

function LabelForm({
  conn,
  tripId,
}: {
  conn: DbConnection | null
  tripId: bigint
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      color: "blue",
    },
    onSubmit: ({ value, formApi }) => {
      conn?.reducers.createLabel({
        tripId,
        name: value.name,
        color: value.color,
      })
      formApi.reset()
    },
  })

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <h2 className="font-medium">Labels</h2>
      <form.Field
        name="name"
        children={(field) => (
          <Input
            aria-label="Label name"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder="Food"
            required
          />
        )}
      />
      <form.Field
        name="color"
        children={(field) => (
          <Input
            aria-label="Label color"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder="blue"
            required
          />
        )}
      />
      <Button type="submit" disabled={!conn}>
        Add label
      </Button>
    </form>
  )
}

function InviteMemberForm({
  conn,
  tripId,
}: {
  conn: DbConnection | null
  tripId: bigint
}) {
  const form = useForm({
    defaultValues: {
      memberIdentity: "",
      role: "editor",
    },
    onSubmit: ({ value, formApi }) => {
      conn?.reducers.inviteMember({
        tripId,
        memberIdentity: value.memberIdentity,
        role: value.role,
      })
      formApi.reset()
    },
  })

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <h2 className="font-medium">Invite collaborator</h2>
      <form.Field
        name="memberIdentity"
        children={(field) => (
          <Input
            aria-label="Member identity"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder="SpacetimeDB identity hex"
            required
          />
        )}
      />
      <form.Field
        name="role"
        children={(field) => (
          <select
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        )}
      />
      <Button type="submit" disabled={!conn}>
        Add member
      </Button>
    </form>
  )
}

function MembersList({ members }: { members: ReadonlyArray<TripMembers> }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <h2 className="font-medium">Members</h2>
      {members.map((member) => (
        <div
          key={member.membershipId.toString()}
          className="flex flex-col gap-1 rounded-lg bg-muted p-2 text-xs"
        >
          <span className="font-medium">{member.role}</span>
          <span className="break-all text-muted-foreground">
            {member.identity.toHexString()}
          </span>
        </div>
      ))}
    </section>
  )
}

function TripMap({
  activities,
  canEdit,
  conn,
  pinTargetId,
  selectedActivityId,
  onSelectActivity,
  onClearPinTarget,
}: {
  activities: ReadonlyArray<Activities>
  canEdit: boolean
  conn: DbConnection | null
  pinTargetId: bigint | null
  selectedActivityId: bigint | undefined
  onSelectActivity: (activityId: bigint) => void
  onClearPinTarget: () => void
}) {
  const locatedActivities = activities.filter(
    (activity) => activity.lat !== undefined && activity.lng !== undefined
  )
  const center =
    locatedActivities.length > 0
      ? ([locatedActivities[0].lat, locatedActivities[0].lng] as [
          number,
          number,
        ])
      : ([43.6532, -79.3832] as [number, number])

  return (
    <div className="relative min-h-[32rem] overflow-hidden rounded-xl border bg-card">
      <Map center={center} zoom={locatedActivities.length > 0 ? 12 : 4}>
        <MapTileLayer />
        <MapZoomControl />
        {canEdit && pinTargetId && conn && (
          <MapClickUpdater
            activity={activities.find(
              (activity) => activity.activityId === pinTargetId
            )}
            conn={conn}
            onUpdated={onClearPinTarget}
          />
        )}
        {locatedActivities.map((activity) => (
          <MapMarker
            key={activity.activityId.toString()}
            position={[activity.lat!, activity.lng!]}
            eventHandlers={{
              click: () => onSelectActivity(activity.activityId),
            }}
          >
            <MapPopup>
              <div className="flex flex-col gap-1 rounded-lg bg-popover p-3 text-sm text-popover-foreground">
                <strong>{activity.name}</strong>
                {activity.locationName && <span>{activity.locationName}</span>}
                {selectedActivityId === activity.activityId && (
                  <span className="text-muted-foreground">Selected</span>
                )}
              </div>
            </MapPopup>
          </MapMarker>
        ))}
      </Map>
      {pinTargetId && (
        <div className="absolute right-3 bottom-3 rounded-lg bg-popover px-3 py-2 text-sm shadow">
          Click the map to place the selected activity.
        </div>
      )}
    </div>
  )
}

function MapClickUpdater({
  activity,
  conn,
  onUpdated,
}: {
  activity: Activities | undefined
  conn: DbConnection
  onUpdated: () => void
}) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      if (!activity) {
        return
      }

      conn.reducers.updateActivity({
        ...activityPayload(activity),
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        locationProvider: "manual",
        locationName: activity.locationName ?? "Manual map pin",
      })
      onUpdated()
    },
  })

  return null
}

function CalendarList({
  activities,
  labels,
  activityLabels,
  selectedActivityId,
  onSelectActivity,
}: {
  activities: ReadonlyArray<Activities>
  labels: ReadonlyArray<Labels>
  activityLabels: ReadonlyArray<{ activityId: bigint; labelId: bigint }>
  selectedActivityId: bigint | undefined
  onSelectActivity: (activityId: bigint) => void
}) {
  return (
    <section className="flex min-h-0 flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="font-medium">Calendar</h2>
      <div className="flex min-h-0 flex-col gap-2 overflow-auto">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No activities yet. Add one to start building the itinerary.
          </p>
        ) : (
          activities.map((activity) => {
            const linkedLabels = labels.filter((label) =>
              activityLabels.some(
                (link) =>
                  link.activityId === activity.activityId &&
                  link.labelId === label.labelId
              )
            )

            return (
              <button
                key={activity.activityId.toString()}
                type="button"
                className="flex flex-col gap-2 rounded-lg border bg-background p-3 text-left text-sm transition-colors hover:bg-muted data-[selected=true]:bg-muted"
                data-selected={selectedActivityId === activity.activityId}
                onClick={() => onSelectActivity(activity.activityId)}
              >
                <span className="font-medium">{activity.name}</span>
                <span className="text-muted-foreground">
                  {activity.date ?? "No date"} · {formatActivityTime(activity)}
                </span>
                {linkedLabels.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {linkedLabels.map((label) => (
                      <span
                        key={label.labelId.toString()}
                        className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                      >
                        {label.name}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}

function ActivityEditor({
  activity,
  conn,
  labels,
  linkedLabelIds,
  onPickPin,
}: {
  activity: Activities
  conn: DbConnection | null
  labels: ReadonlyArray<Labels>
  linkedLabelIds: ReadonlyArray<bigint>
  onPickPin: () => void
}) {
  const form = useForm({
    defaultValues: {
      name: activity.name,
      description: activity.description ?? "",
      date: activity.date ?? "",
      timeType: activity.timeType,
      time: activity.time ?? "",
      order: activity.order ?? 0,
      locationName: activity.locationName ?? "",
      address: activity.address ?? "",
    },
    onSubmit: ({ value }) => {
      conn?.reducers.updateActivity({
        ...activityPayload(activity),
        name: value.name,
        description: value.description || undefined,
        date: value.date || undefined,
        timeType: value.timeType,
        time: value.timeType === "exact" ? value.time : undefined,
        order: value.timeType === "ordered" ? value.order : undefined,
        locationName: value.locationName || undefined,
        address: value.address || undefined,
      })
    },
  })

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">Edit activity</h2>
        <Button type="button" variant="outline" onClick={onPickPin}>
          Set map pin
        </Button>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.Field
          name="name"
          children={(field) => (
            <Input
              aria-label="Activity name"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        />
        <form.Field
          name="description"
          children={(field) => (
            <Textarea
              aria-label="Activity description"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        />
        <div className="grid grid-cols-2 gap-2">
          <form.Field
            name="date"
            children={(field) => (
              <Input
                aria-label="Activity date"
                type="date"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          />
          <form.Field
            name="timeType"
            children={(field) => (
              <select
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              >
                <option value="none">No time</option>
                <option value="exact">Exact time</option>
                <option value="ordered">Manual order</option>
              </select>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <form.Field
            name="time"
            children={(field) => (
              <Input
                aria-label="Exact time"
                type="time"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          />
          <form.Field
            name="order"
            children={(field) => (
              <Input
                aria-label="Manual order"
                type="number"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) =>
                  field.handleChange(event.target.valueAsNumber || 0)
                }
              />
            )}
          />
        </div>
        <form.Field
          name="locationName"
          children={(field) => (
            <Input
              aria-label="Location name"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Place name"
            />
          )}
        />
        <form.Field
          name="address"
          children={(field) => (
            <Input
              aria-label="Address"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Optional address"
            />
          )}
        />
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => {
            const linked = linkedLabelIds.includes(label.labelId)
            return (
              <Button
                key={label.labelId.toString()}
                type="button"
                variant={linked ? "secondary" : "outline"}
                onClick={() => {
                  if (linked) {
                    conn?.reducers.removeActivityLabel({
                      activityId: activity.activityId,
                      labelId: label.labelId,
                    })
                  } else {
                    conn?.reducers.addActivityLabel({
                      activityId: activity.activityId,
                      labelId: label.labelId,
                    })
                  }
                }}
              >
                {label.name}
              </Button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={!conn}>
            Save activity
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!conn}
            onClick={() =>
              conn?.reducers.softDeleteActivity({
                activityId: activity.activityId,
              })
            }
          >
            Delete
          </Button>
        </div>
      </form>
    </section>
  )
}

