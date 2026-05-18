import { DbConnection } from "@/module_bindings"

export const SPACETIME_DATABASE_NAME =
  import.meta.env.VITE_SPACETIME_DATABASE_NAME ?? "free-roam-97kss"

export const SPACETIME_SERVER_URL =
  import.meta.env.VITE_SPACETIME_SERVER_URL ??
  "https://maincloud.spacetimedb.com"

export const SPACETIME_TOKEN_KEY = `${SPACETIME_SERVER_URL}/${SPACETIME_DATABASE_NAME}/auth_token`

export function createSpacetimeConnectionBuilder({
  user,
}: {
  user: {
    id: string
    name?: string | null
    email: string
    image?: string | null
  }
}) {
  const storedToken =
    typeof window === "undefined"
      ? undefined
      : (window.localStorage.getItem(SPACETIME_TOKEN_KEY) ?? undefined)

  return DbConnection.builder()
    .withUri(SPACETIME_SERVER_URL)
    .withDatabaseName(SPACETIME_DATABASE_NAME)
    .withToken(storedToken)
    .onConnect((conn, _identity, token) => {
      window.localStorage.setItem(SPACETIME_TOKEN_KEY, token)
      conn.reducers.ensureUserProfile({
        authUserId: user.id,
        displayName: user.name || user.email,
        email: user.email,
        imageUrl: user.image ?? undefined,
      })
    })
    .onConnectError((_ctx, error) => {
      console.error("SpacetimeDB connection failed", error)
    })
}
