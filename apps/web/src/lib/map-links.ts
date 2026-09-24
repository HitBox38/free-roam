export type ExternalMapProvider = "google" | "apple" | "waze" | "osm"

export interface MapLinkLocation {
  name?: string
  address?: string
  lat?: number
  lng?: number
}

export interface ExternalMapLink {
  provider: ExternalMapProvider
  label: string
  url: string
}

export function buildExternalMapLinks(
  location: MapLinkLocation
): Array<ExternalMapLink> {
  const query = buildLocationQuery(location)
  if (!query) {
    return []
  }

  return [
    {
      provider: "google",
      label: "Google",
      url: buildGoogleMapsSearchUrl(location),
    },
    {
      provider: "apple",
      label: "Apple",
      url: buildAppleMapsUrl(location),
    },
    {
      provider: "waze",
      label: "Waze",
      url: buildWazeUrl(location),
    },
    {
      provider: "osm",
      label: "OSM",
      url: buildOpenStreetMapUrl(location),
    },
  ]
}

export function buildGoogleMapsSearchUrl(location: MapLinkLocation): string {
  const url = new URL("https://www.google.com/maps/search/")
  url.searchParams.set("api", "1")
  url.searchParams.set("query", buildLocationQuery(location) ?? "")
  return String(url)
}

export function buildAppleMapsUrl(location: MapLinkLocation): string {
  const url = new URL("https://maps.apple.com/")
  const query = buildLocationQuery(location)

  if (query) {
    url.searchParams.set("q", query)
  }

  if (hasCoordinates(location)) {
    url.searchParams.set("ll", `${location.lat},${location.lng}`)
  }

  return String(url)
}

export function buildWazeUrl(location: MapLinkLocation): string {
  const url = new URL("https://www.waze.com/ul")

  if (hasCoordinates(location)) {
    url.searchParams.set("ll", `${location.lat},${location.lng}`)
    url.searchParams.set("navigate", "yes")
  } else {
    url.searchParams.set("q", buildLocationQuery(location) ?? "")
  }

  return String(url)
}

export function buildOpenStreetMapUrl(location: MapLinkLocation): string {
  if (hasCoordinates(location)) {
    return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
      String(location.lat)
    )}&mlon=${encodeURIComponent(String(location.lng))}#map=16/${encodeURIComponent(
      String(location.lat)
    )}/${encodeURIComponent(String(location.lng))}`
  }

  const url = new URL("https://www.openstreetmap.org/search")
  url.searchParams.set("query", buildLocationQuery(location) ?? "")
  return String(url)
}

function buildLocationQuery(location: MapLinkLocation): string | undefined {
  if (hasCoordinates(location)) {
    return `${location.lat},${location.lng}`
  }

  return location.address?.trim() || location.name?.trim() || undefined
}

function hasCoordinates(
  location: MapLinkLocation
): location is MapLinkLocation & { lat: number; lng: number } {
  return (
    typeof location.lat === "number" &&
    Number.isFinite(location.lat) &&
    typeof location.lng === "number" &&
    Number.isFinite(location.lng)
  )
}
