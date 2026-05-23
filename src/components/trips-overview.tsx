import { useForm } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { useSpacetimeDB, useTable } from "spacetimedb/react"
import type { Identity } from "spacetimedb"

import type { DbConnection } from "@/module_bindings"
import { APP_NAME } from "@/lib/app-brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { tables } from "@/module_bindings"

export function TripsOverview() {
  const spacetime = useSpacetimeDB()
  const conn = spacetime.getConnection() as DbConnection | null
  const [trips, tripsLoading] = useTable(tables.trips)
  const [memberships, membershipsLoading] = useTable(tables.tripMembers)
  const [users, usersLoading] = useTable(tables.users)
  const identity = spacetime.identity
  const [createError, setCreateError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasUserProfile = useMemo(
    () =>
      identity ? users.some((user) => user.identity.equals(identity)) : false,
    [identity, users]
  )

  const canCreateTrip = Boolean(
    conn &&
    spacetime.isActive &&
    identity &&
    hasUserProfile &&
    !isSubmitting
  )

  const createTripDebugState = useMemo(() => {
    const blockers: Array<string> = []

    if (!conn) {
      blockers.push("missing_connection")
    }
    if (!spacetime.isActive) {
      blockers.push("spacetime_inactive")
    }
    if (!identity) {
      blockers.push("missing_identity")
    }
    if (!hasUserProfile) {
      blockers.push("missing_user_profile")
    }
    if (isSubmitting) {
      blockers.push("submitting")
    }

    return {
      canCreateTrip,
      blockers,
      connectionPresent: Boolean(conn),
      hasCreateTripReducer: Boolean(conn?.reducers.createTrip),
      spacetimeActive: spacetime.isActive,
      identity: formatIdentity(identity),
      loading: {
        trips: tripsLoading,
        memberships: membershipsLoading,
        users: usersLoading,
      },
      rowCounts: {
        trips: trips.length,
        memberships: memberships.length,
        users: users.length,
      },
      hasUserProfile,
      userProfileIdentities: users.map((user) => user.identity.toHexString()),
      isSubmitting,
    }
  }, [
    canCreateTrip,
    conn,
    hasUserProfile,
    identity,
    isSubmitting,
    memberships.length,
    membershipsLoading,
    spacetime.isActive,
    trips.length,
    tripsLoading,
    users,
    usersLoading,
  ])

  useEffect(() => {
    console.info("[TripsOverview] create trip state", createTripDebugState)
  }, [createTripDebugState])

  const visibleTrips = useMemo(() => {
    if (!identity) {
      return []
    }

    const tripIds = new Set(
      memberships
        .filter((member) => member.identity.equals(identity))
        .map((member) => member.tripId)
    )

    return trips
      .filter((trip) => !trip.deletedAt && tripIds.has(trip.tripId))
      .sort((left, right) => left.title.localeCompare(right.title))
  }, [identity, memberships, trips])

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
    },
    onSubmit: async ({ value, formApi }) => {
      console.info("[TripsOverview] create trip submit", {
        titleLength: value.title.length,
        hasDescription: Boolean(value.description),
        state: createTripDebugState,
      })

      if (!conn || !canCreateTrip) {
        console.warn("[TripsOverview] create trip blocked", createTripDebugState)
        setCreateError("Trip data is still connecting. Try again in a moment.")
        return
      }

      setIsSubmitting(true)
      setCreateError(undefined)

      try {
        console.info("[TripsOverview] calling createTrip reducer", {
          titleLength: value.title.length,
          hasDescription: Boolean(value.description),
        })
        await conn.reducers.createTrip({
          title: value.title,
          description: value.description || undefined,
        })
        console.info("[TripsOverview] createTrip reducer resolved")
        formApi.reset()
      } catch (error) {
        console.error("[TripsOverview] createTrip reducer failed", {
          error,
          state: createTripDebugState,
        })
        setCreateError(formatCreateTripError(error))
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-tight">{APP_NAME}</p>
        <p className="text-sm text-muted-foreground">
          Your SpacetimeDB identity: {formatIdentity(identity)}
        </p>
        <h1 className="text-3xl font-semibold">Trips</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Create a shared trip, invite collaborators by SpacetimeDB identity,
          and start adding activities to the itinerary.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <div className="flex flex-col gap-3">
          {visibleTrips.length === 0 ? (
            <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
              No trips yet. Create your first trip to begin planning.
            </div>
          ) : (
            visibleTrips.map((trip) => (
              <Link
                key={trip.tripId.toString()}
                to="/trips/$tripId"
                params={{ tripId: trip.tripId.toString() }}
                className="rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-muted"
              >
                <div className="flex flex-col gap-1">
                  <h2 className="font-medium">{trip.title}</h2>
                  {trip.description && (
                    <p className="text-sm text-muted-foreground">
                      {trip.description}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        <form
          className="flex flex-col gap-3 rounded-xl border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <h2 className="font-medium">Create trip</h2>
          <form.Field
            name="title"
            children={(field) => (
              <label className="flex flex-col gap-1 text-sm">
                Title
                <Input
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                />
              </label>
            )}
          />
          <form.Field
            name="description"
            children={(field) => (
              <label className="flex flex-col gap-1 text-sm">
                Description
                <Textarea
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          />
          <Button type="submit" disabled={!canCreateTrip}>
            {isSubmitting ? "Creating..." : "Create trip"}
          </Button>
          {createError && (
            <p className="text-sm text-destructive" role="alert">
              {createError}
            </p>
          )}
        </form>
      </section>
    </div>
  )
}

function formatCreateTripError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Could not create the trip. Please try again."
}

function formatIdentity(identity: Identity | undefined): string {
  return identity ? identity.toHexString() : "connecting"
}
