import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { SpacetimeProvider } from "@/components/spacetime-provider"
import { getSession } from "@/lib/auth-functions"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await getSession()

    if (!session) {
      throw redirect({
        to: "/sign-in",
      })
    }

    return { session }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { session } = Route.useRouteContext()

  return (
    <SpacetimeProvider user={session.user}>
      <Outlet />
    </SpacetimeProvider>
  )
}
