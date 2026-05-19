import { useCallback, useEffect, useRef } from "react"
import { useMap, useMapEvents } from "react-leaflet"

import type { DbConnection } from "@/module_bindings"
import { throttleMapPresence } from "@/lib/map-presence"
import { useCursorStore } from "@/stores/cursor-store"

interface UseMapPresenceOptions {
  conn: DbConnection | null
  tripId: bigint
  color: string
}

export function useMapPresence({ conn, tripId, color }: UseMapPresenceOptions) {
  const map = useMap()
  const setPointerActive = useCursorStore((state) => state.setPointerActive)

  const connRef = useRef(conn)
  const tripIdRef = useRef(tripId)
  const colorRef = useRef(color)
  const pointerInsideRef = useRef(false)
  const hasPresenceRef = useRef(false)
  const throttlerRef = useRef(
    throttleMapPresence({
      emit: (sample) => {
        if (!connRef.current) {
          return
        }

        connRef.current.reducers.upsertMapPresence({
          tripId: tripIdRef.current,
          lat: sample.lat,
          lng: sample.lng,
          color: colorRef.current,
        })
      },
    })
  )

  const clearPresence = useCallback(() => {
    throttlerRef.current.clearPending()
    setPointerActive(false)

    if (!connRef.current || !hasPresenceRef.current) {
      return
    }

    connRef.current.reducers.clearMapPresence({ tripId: tripIdRef.current })
    hasPresenceRef.current = false
  }, [setPointerActive])

  const syncFocusState = useCallback(() => {
    if (typeof document === "undefined") {
      throttlerRef.current.setFocused(pointerInsideRef.current)
      return
    }

    throttlerRef.current.setFocused(
      pointerInsideRef.current && !document.hidden && document.hasFocus()
    )
  }, [])

  useEffect(() => {
    connRef.current = conn
    tripIdRef.current = tripId
    colorRef.current = color
    throttlerRef.current.setConnectionReady(Boolean(conn))
  }, [color, conn, tripId])

  useMapEvents({
    mousemove: (event) => {
      if (!connRef.current) {
        return
      }

      pointerInsideRef.current = true
      syncFocusState()
      setPointerActive(true)

      throttlerRef.current.queue({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        screenX: event.containerPoint.x,
        screenY: event.containerPoint.y,
      })
      hasPresenceRef.current = true
    },
    mouseout: () => {
      pointerInsideRef.current = false
      syncFocusState()
      clearPresence()
    },
  })

  useEffect(() => {
    const container = map.getContainer()
    container.tabIndex = container.tabIndex >= 0 ? container.tabIndex : 0

    const handlePointerEnter = () => {
      pointerInsideRef.current = true
      syncFocusState()
    }

    const handlePointerLeave = () => {
      pointerInsideRef.current = false
      syncFocusState()
      clearPresence()
    }

    const handleWindowBlur = () => {
      syncFocusState()
      clearPresence()
    }

    const handleWindowFocus = () => {
      syncFocusState()
    }

    const handleVisibility = () => {
      if (document.hidden) {
        clearPresence()
      }
      syncFocusState()
    }

    container.addEventListener("pointerenter", handlePointerEnter)
    container.addEventListener("pointerleave", handlePointerLeave)
    window.addEventListener("blur", handleWindowBlur)
    window.addEventListener("focus", handleWindowFocus)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      container.removeEventListener("pointerenter", handlePointerEnter)
      container.removeEventListener("pointerleave", handlePointerLeave)
      window.removeEventListener("blur", handleWindowBlur)
      window.removeEventListener("focus", handleWindowFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
      clearPresence()
      throttlerRef.current.cancel()
    }
  }, [clearPresence, map, syncFocusState])

  return {
    clearPresence,
  }
}
