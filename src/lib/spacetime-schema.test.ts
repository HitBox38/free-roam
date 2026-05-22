import { readFileSync } from "node:fs"

import { describe, expect, test } from "vitest"

describe("SpacetimeDB user schema", () => {
  test("allows one Better Auth user to reconnect with a new SpacetimeDB identity", () => {
    const bindingsSource = readFileSync(
      new URL("../module_bindings/index.ts", import.meta.url),
      "utf8"
    )
    const usersTable = bindingsSource.match(
      /users: __table\(\{[\s\S]*?\}, UsersRow\)/
    )?.[0]

    expect(usersTable).toBeDefined()
    expect(usersTable).not.toContain("users_auth_user_id_key")
    expect(usersTable).not.toMatch(
      /constraint: 'unique', columns: \['authUserId'\]/
    )
  })
})
