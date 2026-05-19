import { afterEach, describe, expect, test } from "vitest"

import { useCursorStore } from "@/stores/cursor-store"

describe("useCursorStore", () => {
  afterEach(() => {
    useCursorStore.setState({ cursorColor: null, pointerActive: false })
  })

  test("updates cursor color preference", () => {
    useCursorStore.getState().setCursorColor("#123456")

    expect(useCursorStore.getState().cursorColor).toBe("#123456")
  })

  test("tracks transient pointer activity", () => {
    useCursorStore.getState().setPointerActive(true)
    expect(useCursorStore.getState().pointerActive).toBe(true)

    useCursorStore.getState().setPointerActive(false)
    expect(useCursorStore.getState().pointerActive).toBe(false)
  })
})
