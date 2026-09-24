import { useCallback, useEffect, useRef } from "react"

import type { DbConnection } from "@/module_bindings"

const UPSERT_INTERVAL_MS = 2_000
const CLEAR_AFTER_IDLE_MS = 4_000
export const ACTIVE_TYPING_WINDOW_MS = 6_000

interface UseTypingIndicatorOptions {
  conn: DbConnection | null
  tripId: bigint
  targetType: string
  targetId: string
  enabled?: boolean
}

export function useTypingIndicator({
  conn,
  tripId,
  targetType,
  targetId,
  enabled = true,
}: UseTypingIndicatorOptions) {
  const lastUpsertAtRef = useRef<number>(Number.NEGATIVE_INFINITY)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasActiveRef = useRef(false)

  const clearTyping = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current)
      clearTimerRef.current = null
    }

    if (!conn || !enabled || !wasActiveRef.current) {
      return
    }

    conn.reducers.clearTypingIndicator({
      tripId,
      targetType,
      targetId,
    })
    wasActiveRef.current = false
  }, [conn, enabled, targetId, targetType, tripId])

  const notifyTyping = useCallback(() => {
    if (!conn || !enabled) {
      return
    }

    const now = Date.now()
    if (now - lastUpsertAtRef.current >= UPSERT_INTERVAL_MS) {
      conn.reducers.upsertTypingIndicator({
        tripId,
        targetType,
        targetId,
      })
      lastUpsertAtRef.current = now
      wasActiveRef.current = true
    }

    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current)
    }

    clearTimerRef.current = setTimeout(() => {
      clearTyping()
    }, CLEAR_AFTER_IDLE_MS)
  }, [clearTyping, conn, enabled, targetId, targetType, tripId])

  useEffect(
    () => () => {
      clearTyping()
    },
    [clearTyping]
  )

  return {
    notifyTyping,
    clearTyping,
  }
}
