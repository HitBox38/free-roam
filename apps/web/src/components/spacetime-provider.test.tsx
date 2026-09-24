// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { SpacetimeProvider } from "./spacetime-provider"
import type { ReactNode } from "react"

const spacetimeMock = vi.hoisted(() => {
  const ensureUserProfile = vi.fn(() => Promise.resolve())
  const identity = {
    toHexString: () => "identity-1",
  }
  const state = {
    isActive: true,
    identity,
    conn: {
      reducers: {
        ensureUserProfile,
      },
    },
  }

  return {
    ensureUserProfile,
    state,
  }
})

vi.mock("@/lib/spacetime", () => ({
  createSpacetimeConnectionBuilder: vi.fn(() => ({})),
}))

vi.mock("spacetimedb/react", () => ({
  SpacetimeDBProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useSpacetimeDB: () => ({
    isActive: spacetimeMock.state.isActive,
    identity: spacetimeMock.state.identity,
    getConnection: () => spacetimeMock.state.conn,
  }),
}))

describe("SpacetimeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test("syncs the authenticated user profile when SpacetimeDB becomes active", async () => {
    render(
      <SpacetimeProvider
        user={{
          id: "auth-user-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          image: "https://example.com/ada.png",
        }}
      >
        <span>Trip data ready</span>
      </SpacetimeProvider>
    )

    await screen.findByText("Trip data ready")

    await waitFor(() => {
      expect(spacetimeMock.ensureUserProfile).toHaveBeenCalledWith({
        authUserId: "auth-user-1",
        displayName: "Ada Lovelace",
        email: "ada@example.com",
        imageUrl: "https://example.com/ada.png",
      })
    })
  })
})
