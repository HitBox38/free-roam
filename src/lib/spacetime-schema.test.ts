import { readFileSync } from "node:fs"

import { describe, expect, test } from "vitest"

describe("SpacetimeDB user schema", () => {
  test("allows one Better Auth user to reconnect with a new SpacetimeDB identity", () => {
    const moduleSource = readFileSync(
      new URL("../../spacetimedb/spacetimedb/src/index.ts", import.meta.url),
      "utf8"
    )
    const bindingsSource = readFileSync(
      new URL("../module_bindings/index.ts", import.meta.url),
      "utf8"
    )
    const usersTable = bindingsSource.match(
      /users: __table\(\{[\s\S]*?\}, UsersRow\)/
    )?.[0]

    expect(moduleSource).not.toMatch(/authUserId:\s*t\.string\(\)\.unique\(\)/)
    expect(usersTable).toBeDefined()
    expect(usersTable).not.toContain("users_auth_user_id_key")
    expect(usersTable).not.toMatch(
      /constraint: 'unique', columns: \['authUserId'\]/
    )
  })

  test("shows trip rows to every visible trip member", () => {
    const moduleSource = readFileSync(
      new URL("../../spacetimedb/spacetimedb/src/index.ts", import.meta.url),
      "utf8"
    )

    expect(moduleSource).toContain(
      "SELECT trips.* FROM trips JOIN trip_members ON trips.trip_id = trip_members.trip_id WHERE trip_members.identity = :sender"
    )
  })
})
