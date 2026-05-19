import { useForm } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { useMemo } from "react"
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
  const [trips] = useTable(tables.trips)
  const [memberships] = useTable(tables.tripMembers)
  const identity = spacetime.identity

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
    onSubmit: ({ value, formApi }) => {
      conn?.reducers.createTrip({
        title: value.title,
        description: value.description || undefined,
      })
      formApi.reset()
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
          <Button type="submit" disabled={!conn}>
            Create trip
          </Button>
        </form>
      </section>
    </div>
  )
}

function formatIdentity(identity: Identity | undefined): string {
  return identity ? identity.toHexString() : "connecting"
}
