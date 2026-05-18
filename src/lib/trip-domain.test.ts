import { describe, expect, test } from "vitest"

import {
  activityInputSchema,
  canTripRole,
  sortActivitiesForTimeline,
} from "@/lib/trip-domain"

describe("sortActivitiesForTimeline", () => {
  test("orders activities by date, exact time, manual order, then stable fallback", () => {
    const activities = [
      {
        activityId: 4n,
        name: "Fallback later",
        date: "2026-05-20",
        timeType: "none",
        createdAt: 40,
      },
      {
        activityId: 2n,
        name: "Manual first",
        date: "2026-05-20",
        timeType: "ordered",
        order: 1,
        createdAt: 20,
      },
      {
        activityId: 1n,
        name: "Morning",
        date: "2026-05-20",
        timeType: "exact",
        time: "09:30",
        createdAt: 10,
      },
      {
        activityId: 3n,
        name: "Manual second",
        date: "2026-05-20",
        timeType: "ordered",
        order: 2,
        createdAt: 30,
      },
      {
        activityId: 5n,
        name: "Earlier day",
        date: "2026-05-19",
        timeType: "none",
        createdAt: 50,
      },
    ]

    expect(sortActivitiesForTimeline(activities).map((a) => a.name)).toEqual([
      "Earlier day",
      "Morning",
      "Manual first",
      "Manual second",
      "Fallback later",
    ])
  })

  test("places undated activities after dated activities", () => {
    const activities = [
      {
        activityId: 1n,
        name: "Undated",
        timeType: "none",
        createdAt: 10,
      },
      {
        activityId: 2n,
        name: "Dated",
        date: "2026-05-19",
        timeType: "none",
        createdAt: 20,
      },
    ]

    expect(sortActivitiesForTimeline(activities).map((a) => a.name)).toEqual([
      "Dated",
      "Undated",
    ])
  })
})

describe("activityInputSchema", () => {
  test("requires a valid exact time when time type is exact", () => {
    expect(
      activityInputSchema.safeParse({
        name: "Museum",
        timeType: "exact",
      }).success
    ).toBe(false)

    expect(
      activityInputSchema.safeParse({
        name: "Museum",
        timeType: "exact",
        time: "14:30",
      }).success
    ).toBe(true)
  })

  test("accepts provider-agnostic manual locations", () => {
    const result = activityInputSchema.safeParse({
      name: "Dinner",
      timeType: "none",
      locationName: "Night market",
      lat: 43.65,
      lng: -79.38,
      locationProvider: "manual",
    })

    expect(result.success).toBe(true)
  })
})

describe("canTripRole", () => {
  test("allows editors to manage activities but not members", () => {
    expect(canTripRole("editor", "create_activity")).toBe(true)
    expect(canTripRole("editor", "manage_members")).toBe(false)
  })

  test("prevents viewers from mutating trips", () => {
    expect(canTripRole("viewer", "view_trip")).toBe(true)
    expect(canTripRole("viewer", "edit_trip")).toBe(false)
    expect(canTripRole("viewer", "create_activity")).toBe(false)
  })
})
