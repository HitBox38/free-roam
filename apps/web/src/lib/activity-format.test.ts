import { describe, expect, test } from "vitest"

import { activityPayload, formatActivityTime } from "./activity-format"
import type { Activities } from "@/module_bindings/types"

describe("formatActivityTime", () => {
  test("exact with time shows At prefix", () => {
    expect(
      formatActivityTime({ timeType: "exact", time: "14:30", order: undefined })
    ).toBe("At 14:30")
  })

  test("exact without time shows placeholder label", () => {
    expect(formatActivityTime({ timeType: "exact", time: undefined, order: 0 })).toBe(
      "Exact time"
    )
  })

  test("ordered shows zero-based order fallback", () => {
    expect(
      formatActivityTime({ timeType: "ordered", time: undefined, order: undefined })
    ).toBe("Order 0")
    expect(formatActivityTime({ timeType: "ordered", time: undefined, order: 2 })).toBe(
      "Order 2"
    )
  })

  test("none and unknown time types read as no time", () => {
    expect(formatActivityTime({ timeType: "none", time: undefined, order: 0 })).toBe(
      "No time"
    )
    const odd: Pick<Activities, "timeType" | "time" | "order"> = {
      timeType: "unexpected",
      time: undefined,
      order: 0,
    }
    expect(formatActivityTime(odd)).toBe("No time")
  })
})

describe("activityPayload", () => {
  test("copies activity fields used for reducer updates", () => {
    const activity = {
      activityId: 99n,
      name: "Walk",
      description: "Park",
      date: "2026-06-01",
      timeType: "exact",
      time: "18:00",
      order: 4,
      locationName: "River",
      address: "1 Water St",
      lat: 12.34,
      lng: 56.78,
      locationProvider: "manual",
      providerPlaceId: "place-1",
      externalUrl: "https://example.com/place",
    } as unknown as Activities

    expect(activityPayload(activity)).toEqual({
      activityId: 99n,
      name: "Walk",
      description: "Park",
      date: "2026-06-01",
      timeType: "exact",
      time: "18:00",
      order: 4,
      locationName: "River",
      address: "1 Water St",
      lat: 12.34,
      lng: 56.78,
      locationProvider: "manual",
      providerPlaceId: "place-1",
      externalUrl: "https://example.com/place",
    })
  })

  test("preserves undefined optional fields from the record", () => {
    const activity = {
      activityId: 1n,
      name: "Bare",
      description: undefined,
      date: undefined,
      timeType: "none",
      time: undefined,
      order: undefined,
      locationName: undefined,
      address: undefined,
      lat: undefined,
      lng: undefined,
      locationProvider: undefined,
      providerPlaceId: undefined,
      externalUrl: undefined,
    } as unknown as Activities

    expect(activityPayload(activity)).toEqual({
      activityId: 1n,
      name: "Bare",
      description: undefined,
      date: undefined,
      timeType: "none",
      time: undefined,
      order: undefined,
      locationName: undefined,
      address: undefined,
      lat: undefined,
      lng: undefined,
      locationProvider: undefined,
      providerPlaceId: undefined,
      externalUrl: undefined,
    })
  })
})
