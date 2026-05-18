import { createFileRoute } from "@tanstack/react-router"

import { TripsOverview } from "@/components/trips-overview"

export const Route = createFileRoute("/_authenticated/trips")({
  component: TripsOverview,
})
