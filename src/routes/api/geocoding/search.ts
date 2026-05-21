import { createFileRoute } from "@tanstack/react-router"

import { auth } from "@/lib/auth"
import {
  buildGeoapifyAutocompleteUrl,
  normalizeGeoapifyFeatureCollection,
} from "@/lib/geocoding/geoapify"

const defaultLimit = 5
const maxLimit = 8

export const Route = createFileRoute("/api/geocoding/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session) {
          return Response.json({ message: "Unauthorized" }, { status: 401 })
        }

        const apiKey = process.env.GEOAPIFY_API_KEY
        if (!apiKey) {
          return Response.json(
            { message: "Geoapify API key is not configured" },
            { status: 503 }
          )
        }

        const requestUrl = new URL(request.url)
        const text = requestUrl.searchParams.get("text")?.trim()

        if (!text) {
          return Response.json({ places: [] })
        }

        const geoapifyUrl = buildGeoapifyAutocompleteUrl({
          apiKey,
          text,
          lang: cleanParam(requestUrl.searchParams.get("lang")),
          limit: clampLimit(requestUrl.searchParams.get("limit")),
          filter: cleanParam(requestUrl.searchParams.get("filter")),
          bias: cleanParam(requestUrl.searchParams.get("bias")),
          type: cleanParam(requestUrl.searchParams.get("type")),
        })
        const response = await fetch(geoapifyUrl)

        if (!response.ok) {
          return Response.json(
            { message: "Geoapify search failed" },
            { status: 502 }
          )
        }

        const data = await response.json()

        return Response.json({
          places: normalizeGeoapifyFeatureCollection(data),
        })
      },
    },
  },
})

function cleanParam(value: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function clampLimit(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    return defaultLimit
  }

  return Math.min(Math.max(parsed, 1), maxLimit)
}
