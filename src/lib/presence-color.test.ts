import { describe, expect, test } from "vitest"

import { PRESENCE_PALETTE, colorForUser } from "@/lib/presence-color"

describe("colorForUser", () => {
  test("returns deterministic colors for the same identity", () => {
    const identity = "0xfeedbeef00112233445566778899aabbccddeeff"

    expect(colorForUser(identity)).toBe(colorForUser(identity))
  })

  test("always returns a color from the shared palette", () => {
    for (let index = 0; index < 50; index += 1) {
      const color = colorForUser(`0xidentity${index.toString(16)}`)
      expect(PRESENCE_PALETTE).toContain(color)
    }
  })

  test("spreads users across the available palette", () => {
    const colors = new Set(
      Array.from({ length: 128 }, (_, index) =>
        colorForUser(`0x${index.toString(16).padStart(6, "0")}`)
      )
    )

    expect(colors.size).toBeGreaterThanOrEqual(6)
    expect(colors.size).toBeLessThanOrEqual(PRESENCE_PALETTE.length)
  })
})
