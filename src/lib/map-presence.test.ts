import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { throttleMapPresence } from "@/lib/map-presence"

describe("throttleMapPresence", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test("caps updates at <=2 reducer calls per second during sustained motion", () => {
    const emittedAt: Array<number> = []
    const throttler = throttleMapPresence({
      emit: () => {
        emittedAt.push(Date.now())
      },
      minIntervalMs: 500,
      distanceThresholdPx: 4,
    })
    throttler.setConnectionReady(true)
    throttler.setFocused(true)

    for (let tick = 0; tick < 40; tick += 1) {
      throttler.queue({
        lat: 43 + tick * 0.001,
        lng: -79 - tick * 0.001,
        screenX: tick * 8,
        screenY: 10,
      })
      vi.advanceTimersByTime(50)
    }

    const callsWithinTwoSeconds = emittedAt.filter((value) => value <= 2000)
    expect(callsWithinTwoSeconds.length).toBeLessThanOrEqual(4)

    for (let index = 1; index < emittedAt.length; index += 1) {
      expect(emittedAt[index] - emittedAt[index - 1]).toBeGreaterThanOrEqual(
        500
      )
    }
  })

  test("suppresses jitter below the distance threshold", () => {
    const calls: Array<number> = []
    const throttler = throttleMapPresence({
      emit: () => calls.push(Date.now()),
      minIntervalMs: 500,
      distanceThresholdPx: 4,
    })
    throttler.setConnectionReady(true)
    throttler.setFocused(true)

    throttler.queue({ lat: 1, lng: 1, screenX: 100, screenY: 100 })
    vi.advanceTimersByTime(20)

    throttler.queue({ lat: 1.0001, lng: 1.0001, screenX: 102, screenY: 101 })
    vi.advanceTimersByTime(1000)

    expect(calls).toHaveLength(1)
  })

  test("gates updates when map is unfocused or connection is unavailable", () => {
    const calls: Array<number> = []
    const throttler = throttleMapPresence({
      emit: () => calls.push(Date.now()),
      minIntervalMs: 500,
      distanceThresholdPx: 4,
    })

    throttler.setConnectionReady(true)
    throttler.setFocused(false)
    throttler.queue({ lat: 1, lng: 1, screenX: 10, screenY: 10 })
    vi.advanceTimersByTime(1000)

    throttler.setFocused(true)
    throttler.setConnectionReady(false)
    throttler.queue({ lat: 2, lng: 2, screenX: 30, screenY: 30 })
    vi.advanceTimersByTime(1000)

    expect(calls).toHaveLength(0)
  })

  test("flushes a trailing call when motion stops", () => {
    const calls: Array<number> = []
    const throttler = throttleMapPresence({
      emit: () => calls.push(Date.now()),
      minIntervalMs: 500,
      distanceThresholdPx: 4,
    })
    throttler.setConnectionReady(true)
    throttler.setFocused(true)

    throttler.queue({ lat: 1, lng: 1, screenX: 10, screenY: 10 })
    vi.advanceTimersByTime(20)

    throttler.queue({ lat: 2, lng: 2, screenX: 30, screenY: 30 })
    vi.advanceTimersByTime(100)
    throttler.flush()

    expect(calls).toHaveLength(2)
  })

  test("does not emit periodic updates while idle", () => {
    const calls: Array<number> = []
    const throttler = throttleMapPresence({
      emit: () => calls.push(Date.now()),
      minIntervalMs: 500,
      distanceThresholdPx: 4,
    })
    throttler.setConnectionReady(true)
    throttler.setFocused(true)

    throttler.queue({ lat: 1, lng: 1, screenX: 10, screenY: 10 })
    vi.advanceTimersByTime(20)
    vi.advanceTimersByTime(5000)

    expect(calls).toHaveLength(1)
  })
})
