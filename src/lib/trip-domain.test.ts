import { describe, expect, test } from "vitest"

import {
  activityInputSchema,
  canTripRole,
  labelInputSchema,
  sortActivitiesForTimeline,
  tripInputSchema,
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

  test("same-day mix: exact times sort before unordered none, using only some with clock time", () => {
    const activities = [
      {
        activityId: 3n,
        name: "No time slot",
        date: "2026-05-21",
        timeType: "none",
        createdAt: 30,
      },
      {
        activityId: 2n,
        name: "Afternoon",
        date: "2026-05-21",
        timeType: "exact",
        time: "15:00",
        createdAt: 20,
      },
      {
        activityId: 1n,
        name: "Morning meeting",
        date: "2026-05-21",
        timeType: "exact",
        time: "09:00",
        createdAt: 10,
      },
    ]

    expect(sortActivitiesForTimeline(activities).map((a) => a.name)).toEqual([
      "Morning meeting",
      "Afternoon",
      "No time slot",
    ])
  })

  test("same day: ordered activities sort by manual order among themselves after exact blocks", () => {
    const activities = [
      {
        activityId: 4n,
        name: "Ordered late",
        date: "2026-05-22",
        timeType: "ordered",
        order: 5,
        createdAt: 40,
      },
      {
        activityId: 1n,
        name: "Exact only",
        date: "2026-05-22",
        timeType: "exact",
        time: "12:00",
        createdAt: 10,
      },
      {
        activityId: 3n,
        name: "Ordered early",
        date: "2026-05-22",
        timeType: "ordered",
        order: 1,
        createdAt: 30,
      },
      {
        activityId: 2n,
        name: "No time",
        date: "2026-05-22",
        timeType: "none",
        createdAt: 20,
      },
    ]

    expect(sortActivitiesForTimeline(activities).map((a) => a.name)).toEqual([
      "Exact only",
      "Ordered early",
      "Ordered late",
      "No time",
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

  test("accepts Geoapify locations with provider metadata", () => {
    const result = activityInputSchema.safeParse({
      name: "Tower visit",
      timeType: "none",
      locationName: "Eiffel Tower",
      address: "Eiffel Tower, Paris, France",
      lat: 48.8584,
      lng: 2.2945,
      locationProvider: "geoapify",
      providerPlaceId: "geoapify-place-id",
      externalUrl:
        "https://www.openstreetmap.org/?mlat=48.8584&mlon=2.2945#map=16/48.8584/2.2945",
    })

    expect(result.success).toBe(true)
  })

  test("requires order when time type is ordered", () => {
    expect(
      activityInputSchema.safeParse({
        name: "Block",
        timeType: "ordered",
      }).success
    ).toBe(false)

    expect(
      activityInputSchema.safeParse({
        name: "Block",
        timeType: "ordered",
        order: 0,
      }).success
    ).toBe(true)
  })

  test("rejects latitude and longitude outside valid ranges", () => {
    expect(
      activityInputSchema.safeParse({
        name: "Bad lat",
        timeType: "none",
        lat: 91,
        lng: 0,
      }).success
    ).toBe(false)

    expect(
      activityInputSchema.safeParse({
        name: "Bad lng",
        timeType: "none",
        lat: 0,
        lng: 181,
      }).success
    ).toBe(false)

    expect(
      activityInputSchema.safeParse({
        name: "Poles",
        timeType: "none",
        lat: -90,
        lng: 180,
      }).success
    ).toBe(true)
  })
})

describe("tripInputSchema", () => {
  test("rejects empty or whitespace-only titles", () => {
    expect(tripInputSchema.safeParse({ title: "" }).success).toBe(false)
    expect(tripInputSchema.safeParse({ title: "   " }).success).toBe(false)
  })

  test("rejects titles over 120 characters", () => {
    expect(tripInputSchema.safeParse({ title: "x".repeat(121) }).success).toBe(
      false
    )
    expect(tripInputSchema.safeParse({ title: "x".repeat(120) }).success).toBe(
      true
    )
  })

  test("allows description up to 2000 characters and rejects longer", () => {
    expect(
      tripInputSchema.safeParse({
        title: "Trip",
        description: "y".repeat(2000),
      }).success
    ).toBe(true)

    expect(
      tripInputSchema.safeParse({
        title: "Trip",
        description: "y".repeat(2001),
      }).success
    ).toBe(false)
  })
})

describe("labelInputSchema", () => {
  test("requires non-empty trimmed name and color", () => {
    expect(
      labelInputSchema.safeParse({ name: "", color: "blue" }).success
    ).toBe(false)
    expect(
      labelInputSchema.safeParse({ name: "Food", color: "" }).success
    ).toBe(false)
    expect(
      labelInputSchema.safeParse({ name: "Food", color: "blue" }).success
    ).toBe(true)
  })

  test("enforces max lengths for name and color", () => {
    expect(
      labelInputSchema.safeParse({
        name: "a".repeat(41),
        color: "blue",
      }).success
    ).toBe(false)
    expect(
      labelInputSchema.safeParse({
        name: "a".repeat(40),
        color: "blue",
      }).success
    ).toBe(true)

    expect(
      labelInputSchema.safeParse({
        name: "L",
        color: "c".repeat(33),
      }).success
    ).toBe(false)
    expect(
      labelInputSchema.safeParse({
        name: "L",
        color: "c".repeat(32),
      }).success
    ).toBe(true)
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
