type AuthDbEnv = Record<string, string | undefined>

interface AuthDbCredentials {
  url: string
  authToken: string
}

export function getAuthDbCredentials(env: AuthDbEnv = process.env): AuthDbCredentials {
  const url = requireEnv(env, "TURSO_DATABASE_URL")
  const authToken = requireEnv(env, "TURSO_AUTH_TOKEN")

  if (isVercelEnv(env)) {
    if (isFileDatabaseUrl(url)) {
      throw new Error(
        "TURSO_DATABASE_URL must point to a persistent Turso/libSQL database on Vercel; file: URLs are local-only."
      )
    }

    if (authToken === "local-dev-token") {
      throw new Error(
        "TURSO_AUTH_TOKEN must be a real production token on Vercel; local-dev-token is local-only."
      )
    }
  }

  return { url, authToken }
}

function requireEnv(env: AuthDbEnv, name: string): string {
  const value = env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function isVercelEnv(env: AuthDbEnv): boolean {
  return env.VERCEL === "1" || Boolean(env.VERCEL_ENV)
}

function isFileDatabaseUrl(url: string): boolean {
  return url.trim().toLowerCase().startsWith("file:")
}
