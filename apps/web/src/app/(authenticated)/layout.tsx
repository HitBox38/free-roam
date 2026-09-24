import type { ReactNode } from "react"
import { SpacetimeProvider } from "@/components/spacetime-provider"
import { ensureSession } from "@/lib/auth-functions"

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode
}) {
  const { user } = await ensureSession()
  return (
    <SpacetimeProvider
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      }}
    >
      {children}
    </SpacetimeProvider>
  )
}
