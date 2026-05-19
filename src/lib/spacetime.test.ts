import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const builderCtx = vi.hoisted(() => {
  type Chain = {
    withUri: ReturnType<typeof vi.fn>
    withDatabaseName: ReturnType<typeof vi.fn>
    withToken: ReturnType<typeof vi.fn>
    onConnect: ReturnType<typeof vi.fn>
    onConnectError: ReturnType<typeof vi.fn>
  }

  let lastChain: Chain | undefined

  function createChain(): Chain {
    const chain: Chain = {
      withUri: vi.fn(() => chain),
      withDatabaseName: vi.fn(() => chain),
      withToken: vi.fn(() => chain),
      onConnect: vi.fn(() => chain),
      onConnectError: vi.fn(() => chain),
    }
    lastChain = chain
    return chain
  }

  return {
    createChain,
    getLastChain: () => lastChain,
  }
})

vi.mock("@/module_bindings", () => ({
  DbConnection: {
    builder: vi.fn(() => builderCtx.createChain()),
  },
}))

// eslint-disable-next-line import/first -- Vitest requires `vi.mock` before importing the module under test
import {
  SPACETIME_DATABASE_NAME,
  SPACETIME_SERVER_URL,
  SPACETIME_TOKEN_KEY,
  createSpacetimeConnectionBuilder,
  readStoredSpacetimeAuthToken,
  writeStoredSpacetimeAuthToken,
} from "./spacetime"

describe("Spacetime config constants", () => {
  test("SPACETIME_TOKEN_KEY is derived from server URL, database name, and suffix", () => {
    expect(SPACETIME_TOKEN_KEY).toBe(
      `${SPACETIME_SERVER_URL}/${SPACETIME_DATABASE_NAME}/auth_token`
    )
    expect(SPACETIME_TOKEN_KEY.endsWith("/auth_token")).toBe(true)
  })

  test("defaults match the repo spacetime scripts when env is unset", () => {
    expect(SPACETIME_DATABASE_NAME).toBe("free-roam-97kss")
    expect(SPACETIME_SERVER_URL).toBe("https://maincloud.spacetimedb.com")
  })
})

describe("readStoredSpacetimeAuthToken", () => {
  test("returns undefined when storage is missing", () => {
    expect(readStoredSpacetimeAuthToken(undefined, "k")).toBeUndefined()
    expect(readStoredSpacetimeAuthToken(null, "k")).toBeUndefined()
  })

  test("returns undefined when the key is absent", () => {
    const storage = { getItem: () => null as string | null }
    expect(readStoredSpacetimeAuthToken(storage, "missing")).toBeUndefined()
  })

  test("returns the stored string when present", () => {
    const storage = {
      getItem: (key: string) => (key === "auth" ? "token-value" : null),
    }
    expect(readStoredSpacetimeAuthToken(storage, "auth")).toBe("token-value")
  })
})

describe("writeStoredSpacetimeAuthToken", () => {
  test("writes through to storage", () => {
    const setItem = vi.fn()
    const storage = { setItem }
    writeStoredSpacetimeAuthToken(storage, "k", "v")
    expect(setItem).toHaveBeenCalledWith("k", "v")
  })
})

describe("createSpacetimeConnectionBuilder", () => {
  const user = { id: "user-1", email: "a@b.com", name: "A" }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("passes undefined token when window is unavailable", () => {
    createSpacetimeConnectionBuilder({ user })
    expect(builderCtx.getLastChain()?.withToken).toHaveBeenCalledWith(undefined)
  })

  test("reads the persisted token using SPACETIME_TOKEN_KEY", () => {
    const getItem = vi.fn((key: string) =>
      key === SPACETIME_TOKEN_KEY ? "persisted" : null
    )
    vi.stubGlobal("window", {
      localStorage: { getItem, setItem: vi.fn() },
    })

    createSpacetimeConnectionBuilder({ user })
    expect(getItem).toHaveBeenCalledWith(SPACETIME_TOKEN_KEY)
    expect(builderCtx.getLastChain()?.withToken).toHaveBeenCalledWith("persisted")
  })
})
