import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  // Better Auth uses the current origin when no URL is supplied, including SSR.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
})
