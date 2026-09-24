"use client"

import dynamic from "next/dynamic"

// Leaflet reads browser globals during import, so load the map screen only in the browser.
const TripDetail = dynamic(
  () => import("./trip-detail").then((module) => module.TripDetail),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-6 text-sm text-muted-foreground">
        Loading trip map...
      </p>
    ),
  }
)

export function TripDetailClient({ tripId }: { tripId: string }) {
  return <TripDetail tripId={tripId} />
}
