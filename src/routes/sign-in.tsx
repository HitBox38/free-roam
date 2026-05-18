import { createFileRoute, redirect } from "@tanstack/react-router"

import { AuthPanel } from "@/components/auth-panel"
import { getSession } from "@/lib/auth-functions"

export const Route = createFileRoute("/sign-in")({
  beforeLoad: async () => {
    const session = await getSession()

    if (session) {
      throw redirect({ to: "/trips" })
    }
  },
  component: AuthPanel,
})
