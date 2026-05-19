export interface GeocodedPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  locationProvider: "geoapify"
  providerPlaceId: string
}

export interface GeoapifyAutocompleteOptions {
  apiKey: string
  text: string
  lang?: string
  limit?: number
  filter?: string
  bias?: string
  type?: string
}

type JsonRecord = Record<string, unknown>

export function buildGeoapifyAutocompleteUrl({
  apiKey,
  text,
  lang,
  limit,
  filter,
  bias,
  type,
}: GeoapifyAutocompleteOptions): string {
  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete")
  url.searchParams.set("apiKey", apiKey)
  url.searchParams.set("text", text)

  if (lang) {
    url.searchParams.set("lang", lang)
  }

  if (limit !== undefined) {
    url.searchParams.set("limit", String(limit))
  }

  if (filter) {
    url.searchParams.set("filter", filter)
  }

  if (bias) {
    url.searchParams.set("bias", bias)
  }

  if (type) {
    url.searchParams.set("type", type)
  }

  return String(url)
}

export function normalizeGeoapifyFeatureCollection(
  input: unknown
): Array<GeocodedPlace> {
  const collection = asRecord(input)
  const features = Array.isArray(collection?.features) ? collection.features : []
  const places: Array<GeocodedPlace> = []
  const seenIds = new Set<string>()

  for (const feature of features) {
    const place = normalizeGeoapifyFeature(feature)
    if (!place || seenIds.has(place.providerPlaceId)) {
      continue
    }

    seenIds.add(place.providerPlaceId)
    places.push(place)
  }

  return places
}

function normalizeGeoapifyFeature(input: unknown): GeocodedPlace | null {
  const feature = asRecord(input)
  const properties = asRecord(feature?.properties)
  const geometry = asRecord(feature?.geometry)
  const coordinates = Array.isArray(geometry?.coordinates)
    ? geometry.coordinates
    : []
  const lat = toFiniteNumber(properties?.lat) ?? toFiniteNumber(coordinates[1])
  const lng = toFiniteNumber(properties?.lon) ?? toFiniteNumber(coordinates[0])

  if (lat === undefined || lng === undefined) {
    return null
  }

  const providerPlaceId =
    readString(properties?.place_id) ??
    `${lat.toFixed(6)},${lng.toFixed(6)}:${readString(properties?.formatted) ?? ""}`
  const address = buildAddress(properties)
  const name =
    readString(properties?.name) ??
    readString(properties?.address_line1) ??
    address ??
    "Unnamed place"

  return {
    id: providerPlaceId,
    name,
    address: address ?? name,
    lat,
    lng,
    locationProvider: "geoapify",
    providerPlaceId,
  }
}

function buildAddress(properties: JsonRecord | undefined): string | undefined {
  if (!properties) {
    return undefined
  }

  const formatted = readString(properties.formatted)
  if (formatted) {
    return formatted
  }

  return [
    readString(properties.address_line1),
    readString(properties.address_line2),
  ]
    .filter(Boolean)
    .join(", ") || undefined
}

function asRecord(value: unknown): JsonRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  return value as JsonRecord
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function toFiniteNumber(value: unknown): number | undefined {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN

  return Number.isFinite(numberValue) ? numberValue : undefined
}
