import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"

import { auth } from "@/lib/auth"

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    return auth.api.getSession({
      headers: getRequestHeaders(),
    })
  }
)

export const ensureSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getSession()

    if (!session) {
      throw new Error("Unauthorized")
    }

    return session
  }
)
