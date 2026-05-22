import { SpacetimeDBProvider, useSpacetimeDB } from "spacetimedb/react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"

import type { DbConnection } from "@/module_bindings"
import { createSpacetimeConnectionBuilder } from "@/lib/spacetime"

interface SpacetimeProviderProps {
  children: ReactNode
  user: {
    id: string
    name?: string | null
    email: string
    image?: string | null
  }
}

export function SpacetimeProvider({ children, user }: SpacetimeProviderProps) {
  const [mounted, setMounted] = useState(false)
  const connectionBuilder = useMemo(
    () => createSpacetimeConnectionBuilder({ user }),
    [user]
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Connecting to trip data...
      </div>
    )
  }

  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <SpacetimeProfileSync user={user}>{children}</SpacetimeProfileSync>
    </SpacetimeDBProvider>
  )
}

function SpacetimeProfileSync({ children, user }: SpacetimeProviderProps) {
  const spacetime = useSpacetimeDB()
  const conn = spacetime.getConnection() as DbConnection | null
  const lastSyncedKey = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!spacetime.isActive || !spacetime.identity || !conn) {
      return
    }

    const syncKey = [
      spacetime.identity.toHexString(),
      user.id,
      user.name ?? "",
      user.email,
      user.image ?? "",
    ].join(":")

    if (lastSyncedKey.current === syncKey) {
      return
    }

    lastSyncedKey.current = syncKey

    void conn.reducers
      .ensureUserProfile({
        authUserId: user.id,
        displayName: user.name || user.email,
        email: user.email,
        imageUrl: user.image ?? undefined,
      })
      .catch((error) => {
        lastSyncedKey.current = undefined
        console.error("Failed to sync SpacetimeDB user profile", error)
      })
  }, [
    conn,
    spacetime.identity,
    spacetime.isActive,
    user.email,
    user.id,
    user.image,
    user.name,
  ])

  return children
}
