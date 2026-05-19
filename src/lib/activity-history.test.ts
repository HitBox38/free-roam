import { describe, expect, test } from "vitest"

import { formatHistoryEntry } from "@/lib/activity-history"

describe("formatHistoryEntry", () => {
  test("maps known actions to human-readable labels", () => {
    expect(formatHistoryEntry({ action: "updated_location" })).toBe(
      "Changed location"
    )
    expect(formatHistoryEntry({ action: "added_label" })).toBe("Added label")
    expect(formatHistoryEntry({ action: "deleted" })).toBe(
      "Deleted activity"
    )
  })

  test("formats unknown actions safely", () => {
    expect(formatHistoryEntry({ action: "weird_custom_action" })).toBe(
      "Updated weird custom action"
    )
  })
})
