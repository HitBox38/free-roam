import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useMap, useMapEvents } from "react-leaflet"
import { useSpacetimeDB, useTable } from "spacetimedb/react"

import type { DbConnection } from "@/module_bindings"
import { tables } from "@/module_bindings"
import { colorForUser } from "@/lib/presence-color"
import { useMapPresence } from "@/lib/use-map-presence"
import { useCursorStore } from "@/stores/cursor-store"

interface MapPresenceLayerProps {
  conn: DbConnection | null
  tripId: bigint
}

function initialsForName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")
}

function resolveDisplayName(name: string | undefined, identityHex: string): string {
  if (name) {
    return name
  }

  return `${identityHex.slice(0, 8)}…`
}

export function MapPresenceLayer({ conn, tripId }: MapPresenceLayerProps) {
  const map = useMap()
  const [users] = useTable(tables.users)
  const [presenceRows] = useTable(tables.mapPresence)
  const spacetime = useSpacetimeDB()
  const identity = spacetime.identity
  const [projectionVersion, setProjectionVersion] = useState(0)
  const cursorColor = useCursorStore((state) => state.cursorColor)
  const setCursorColor = useCursorStore((state) => state.setCursorColor)

  const localIdentityHex = identity?.toHexString()
  const localPresenceColor =
    cursorColor ?? (localIdentityHex ? colorForUser(localIdentityHex) : "#3B82F6")

  useEffect(() => {
    if (!localIdentityHex || cursorColor) {
      return
    }

    setCursorColor(colorForUser(localIdentityHex))
  }, [cursorColor, localIdentityHex, setCursorColor])

  useMapPresence({
    conn,
    tripId,
    color: localPresenceColor,
  })

  useMapEvents({
    move: () => setProjectionVersion((value) => value + 1),
    zoom: () => setProjectionVersion((value) => value + 1),
    resize: () => setProjectionVersion((value) => value + 1),
  })

  const userByIdentity = useMemo(
    () =>
      new Map(users.map((user) => [user.identity.toHexString(), user.displayName])),
    [users]
  )

  const remotePresences = useMemo(() => {
    const latestByIdentity = new Map<
      string,
      {
        identityHex: string
        lat: number
        lng: number
        color: string
        updatedAtMs: number
      }
    >()

    for (const row of presenceRows) {
      if (row.tripId !== tripId) {
        continue
      }

      if (identity && row.userIdentity.equals(identity)) {
        continue
      }

      const identityHex = row.userIdentity.toHexString()
      const updatedAtMs = Number(row.updatedAt.toMillis())
      const previous = latestByIdentity.get(identityHex)
      if (previous && previous.updatedAtMs >= updatedAtMs) {
        continue
      }

      latestByIdentity.set(identityHex, {
        identityHex,
        lat: row.lat,
        lng: row.lng,
        color: row.color || colorForUser(identityHex),
        updatedAtMs,
      })
    }

    return Array.from(latestByIdentity.values())
  }, [identity, presenceRows, tripId])

  const projected = useMemo(
    () =>
      remotePresences.map((presence) => {
        const point = map.latLngToContainerPoint([presence.lat, presence.lng])
        const displayName = resolveDisplayName(
          userByIdentity.get(presence.identityHex),
          presence.identityHex
        )

        return {
          ...presence,
          x: point.x,
          y: point.y,
          displayName,
          initials: initialsForName(displayName),
        }
      }),
    [map, projectionVersion, remotePresences, userByIdentity]
  )

  if (projected.length === 0) {
    return null
  }

  return createPortal(
    <div className="pointer-events-none absolute inset-0 z-[900]">
      {projected.map((presence) => (
        <div
          key={presence.identityHex}
          className="absolute"
          style={{
            transform: `translate(${presence.x}px, ${presence.y}px)`,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M2 2L14 8L7 9.5L9 16L7.5 16.5L5.5 10L2 2Z"
              fill={presence.color}
              stroke="white"
              strokeWidth="0.8"
            />
          </svg>
          <div className="-mt-1 ml-3 flex items-center gap-1 rounded-full border bg-background/95 px-2 py-0.5 text-[11px] shadow-sm">
            <span
              className="inline-flex size-4 items-center justify-center rounded-full text-[9px] font-semibold text-white"
              style={{ backgroundColor: presence.color }}
            >
              {presence.initials || "?"}
            </span>
            <span className="max-w-32 truncate">{presence.displayName}</span>
          </div>
        </div>
      ))}
    </div>,
    map.getContainer()
  )
}
