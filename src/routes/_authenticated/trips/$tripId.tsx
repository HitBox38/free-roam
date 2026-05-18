import { createFileRoute } from "@tanstack/react-router"

import { TripDetail } from "@/components/trip-detail"

export const Route = createFileRoute("/_authenticated/trips/$tripId")({
  component: TripRoute,
})

function TripRoute() {
  const { tripId } = Route.useParams()

  return <TripDetail tripId={tripId} />
}
