import { describe, expect, test } from "vitest"

import {
  buildAppleMapsUrl,
  buildExternalMapLinks,
  buildGoogleMapsSearchUrl,
  buildOpenStreetMapUrl,
  buildWazeUrl,
} from "@/lib/map-links"

describe("external map links", () => {
  test("builds provider links from coordinates", () => {
    const location = { name: "Eiffel Tower", lat: 48.8584, lng: 2.2945 }

    expect(buildGoogleMapsSearchUrl(location)).toBe(
      "https://www.google.com/maps/search/?api=1&query=48.8584%2C2.2945"
    )
    expect(buildAppleMapsUrl(location)).toBe(
      "https://maps.apple.com/?q=48.8584%2C2.2945&ll=48.8584%2C2.2945"
    )
    expect(buildWazeUrl(location)).toBe(
      "https://www.waze.com/ul?ll=48.8584%2C2.2945&navigate=yes"
    )
    expect(buildOpenStreetMapUrl(location)).toBe(
      "https://www.openstreetmap.org/?mlat=48.8584&mlon=2.2945#map=16/48.8584/2.2945"
    )
  })

  test("falls back to address search without coordinates", () => {
    const location = { address: "Eiffel Tower, Paris" }

    expect(buildExternalMapLinks(location).map((link) => link.provider)).toEqual([
      "google",
      "apple",
      "waze",
      "osm",
    ])
    expect(buildWazeUrl(location)).toBe(
      "https://www.waze.com/ul?q=Eiffel+Tower%2C+Paris"
    )
    expect(buildOpenStreetMapUrl(location)).toBe(
      "https://www.openstreetmap.org/search?query=Eiffel+Tower%2C+Paris"
    )
  })

  test("returns no links when no location text or coordinates exist", () => {
    expect(buildExternalMapLinks({})).toEqual([])
  })
})
