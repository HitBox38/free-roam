import { SpacetimeDBProvider } from "spacetimedb/react"
import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

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
      {children}
    </SpacetimeDBProvider>
  )
}
