import { describe, expect, test } from "vitest"

import { getAuthDbCredentials } from "./config"

describe("getAuthDbCredentials", () => {
  test("rejects local SQLite auth storage on Vercel", () => {
    expect(() =>
      getAuthDbCredentials({
        TURSO_DATABASE_URL: "file:local.db",
        TURSO_AUTH_TOKEN: "production-token",
        VERCEL: "1",
        VERCEL_ENV: "production",
      })
    ).toThrow(/persistent Turso\/libSQL database/)
  })

  test("rejects the local development auth token on Vercel", () => {
    expect(() =>
      getAuthDbCredentials({
        TURSO_DATABASE_URL: "libsql://free-roam.turso.io",
        TURSO_AUTH_TOKEN: "local-dev-token",
        VERCEL: "1",
        VERCEL_ENV: "production",
      })
    ).toThrow(/TURSO_AUTH_TOKEN/)
  })

  test("keeps the local SQLite database available outside Vercel", () => {
    expect(
      getAuthDbCredentials({
        TURSO_DATABASE_URL: "file:local.db",
        TURSO_AUTH_TOKEN: "local-dev-token",
      })
    ).toEqual({
      url: "file:local.db",
      authToken: "local-dev-token",
    })
  })
})
