// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TripsOverview } from "./trips-overview"
import type { AnchorHTMLAttributes, ReactNode } from "react"

type MockIdentity = {
  equals: (other: MockIdentity) => boolean
  toHexString: () => string
}

type MockConnection = {
  reducers: {
    createTrip: ReturnType<typeof vi.fn>
  }
}

const spacetimeMock = vi.hoisted(() => {
  const tables = {
    trips: { accessorName: "trips" },
    tripMembers: { accessorName: "tripMembers" },
    users: { accessorName: "users" },
  }

  const state: {
    conn: MockConnection | null
    identity: MockIdentity | undefined
    isActive: boolean
    rows: Record<string, ReadonlyArray<unknown>>
    loading: Record<string, boolean>
  } = {
    conn: null,
    identity: undefined,
    isActive: false,
    rows: {
      trips: [],
      tripMembers: [],
      users: [],
    },
    loading: {
      trips: false,
      tripMembers: false,
      users: false,
    },
  }

  return {
    tables,
    state,
    reset: () => {
      state.conn = null
      state.identity = undefined
      state.isActive = false
      state.rows = {
        trips: [],
        tripMembers: [],
        users: [],
      }
      state.loading = {
        trips: false,
        tripMembers: false,
        users: false,
      }
    },
  }
})

vi.mock("@/module_bindings", () => ({
  tables: spacetimeMock.tables,
}))

vi.mock("spacetimedb/react", () => ({
  useSpacetimeDB: () => ({
    getConnection: () => spacetimeMock.state.conn,
    identity: spacetimeMock.state.identity,
    isActive: spacetimeMock.state.isActive,
  }),
  useTable: (table: { accessorName: string }) => [
    spacetimeMock.state.rows[table.accessorName] ?? [],
    spacetimeMock.state.loading[table.accessorName] ?? false,
  ],
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    params?: { tripId?: string }
    children: ReactNode
  }) => (
    <a href={params?.tripId ? `/trips/${params.tripId}` : "#"} {...props}>
      {children}
    </a>
  ),
}))

function createIdentity(hex: string): MockIdentity {
  const identity: MockIdentity = {
    equals: (other) => other.toHexString() === hex,
    toHexString: () => hex,
  }
  return identity
}

describe("TripsOverview", () => {
  beforeEach(() => {
    spacetimeMock.reset()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test("disables trip creation until the connected identity has a user profile row", () => {
    const identity = createIdentity("abc123")
    spacetimeMock.state.conn = {
      reducers: {
        createTrip: vi.fn(),
      },
    }
    spacetimeMock.state.identity = identity
    spacetimeMock.state.isActive = true
    spacetimeMock.state.rows.users = []

    render(<TripsOverview />)

    const submit = screen.getByRole("button", { name: /create trip/i })
    expect((submit as HTMLButtonElement).disabled).toBe(true)
  })

  test("enables trip creation when the user profile is present even if table loading flags linger", () => {
    const identity = createIdentity("abc123")
    spacetimeMock.state.conn = {
      reducers: {
        createTrip: vi.fn(),
      },
    }
    spacetimeMock.state.identity = identity
    spacetimeMock.state.isActive = true
    spacetimeMock.state.rows.users = [{ identity }]
    spacetimeMock.state.loading = {
      trips: false,
      tripMembers: true,
      users: true,
    }

    render(<TripsOverview />)

    const submit = screen.getByRole("button", { name: /create trip/i })
    expect((submit as HTMLButtonElement).disabled).toBe(false)
  })

  test("keeps the draft until createTrip resolves successfully", async () => {
    const identity = createIdentity("abc123")
    let resolveCreateTrip: () => void = () => undefined
    const createTrip = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCreateTrip = resolve
        })
    )
    spacetimeMock.state.conn = {
      reducers: {
        createTrip,
      },
    }
    spacetimeMock.state.identity = identity
    spacetimeMock.state.isActive = true
    spacetimeMock.state.rows.users = [{ identity }]

    render(<TripsOverview />)

    const title = screen.getByLabelText("Title")
    if (!(title instanceof HTMLInputElement) || !title.form) {
      throw new Error("Expected the title field to be inside the create-trip form")
    }

    fireEvent.change(title, { target: { value: "Tokyo spring" } })
    fireEvent.submit(title.form)

    await waitFor(() => {
      expect(createTrip).toHaveBeenCalledWith({
        title: "Tokyo spring",
        description: undefined,
      })
    })
    expect(title.value).toBe("Tokyo spring")

    resolveCreateTrip()

    await waitFor(() => {
      expect(title.value).toBe("")
    })
  })

  test("lists trips where the current identity has a membership", () => {
    const identity = createIdentity("abc123")
    spacetimeMock.state.identity = identity
    spacetimeMock.state.rows.trips = [
      {
        tripId: 1n,
        title: "Lisbon",
        description: "Pastel de nata route",
        deletedAt: undefined,
      },
    ]
    spacetimeMock.state.rows.tripMembers = [
      {
        tripId: 1n,
        identity,
      },
    ]

    render(<TripsOverview />)

    expect(screen.getByRole("link", { name: /lisbon/i })).toBeDefined()
  })
})
