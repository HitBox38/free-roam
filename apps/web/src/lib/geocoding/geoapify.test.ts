import { describe, expect, test } from "vitest"

import {
  buildGeoapifyAutocompleteUrl,
  normalizeGeoapifyFeatureCollection,
} from "@/lib/geocoding/geoapify"

describe("buildGeoapifyAutocompleteUrl", () => {
  test("builds the Geoapify autocomplete request with optional filters", () => {
    const url = new URL(
      buildGeoapifyAutocompleteUrl({
        apiKey: "secret",
        text: "Eiffel Tower",
        lang: "en",
        limit: 3,
        filter: "rect:1,2,3,4",
        bias: "proximity:2.2945,48.8584",
        type: "amenity",
      })
    )

    expect(url.origin + url.pathname).toBe(
      "https://api.geoapify.com/v1/geocode/autocomplete"
    )
    expect(url.searchParams.get("apiKey")).toBe("secret")
    expect(url.searchParams.get("text")).toBe("Eiffel Tower")
    expect(url.searchParams.get("lang")).toBe("en")
    expect(url.searchParams.get("limit")).toBe("3")
    expect(url.searchParams.get("filter")).toBe("rect:1,2,3,4")
    expect(url.searchParams.get("bias")).toBe("proximity:2.2945,48.8584")
    expect(url.searchParams.get("type")).toBe("amenity")
  })
})

describe("normalizeGeoapifyFeatureCollection", () => {
  test("normalizes Geoapify GeoJSON features into activity location fields", () => {
    const places = normalizeGeoapifyFeatureCollection({
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [2.2945, 48.8584] },
          properties: {
            place_id: "abc123",
            name: "Eiffel Tower",
            formatted: "Eiffel Tower, 5 Avenue Anatole France, Paris, France",
            lat: 48.8584,
            lon: 2.2945,
          },
        },
      ],
    })

    expect(places).toEqual([
      {
        id: "abc123",
        name: "Eiffel Tower",
        address: "Eiffel Tower, 5 Avenue Anatole France, Paris, France",
        lat: 48.8584,
        lng: 2.2945,
        locationProvider: "geoapify",
        providerPlaceId: "abc123",
      },
    ])
  })

  test("deduplicates results and falls back to geometry coordinates", () => {
    const places = normalizeGeoapifyFeatureCollection({
      features: [
        {
          geometry: { coordinates: [-79.3832, 43.6532] },
          properties: {
            place_id: "toronto",
            address_line1: "Toronto",
            address_line2: "Ontario, Canada",
          },
        },
        {
          geometry: { coordinates: [-79.3832, 43.6532] },
          properties: {
            place_id: "toronto",
            formatted: "Duplicate",
          },
        },
      ],
    })

    expect(places).toHaveLength(1)
    expect(places[0]?.address).toBe("Toronto, Ontario, Canada")
    expect(places[0]?.lat).toBe(43.6532)
    expect(places[0]?.lng).toBe(-79.3832)
  })
})
