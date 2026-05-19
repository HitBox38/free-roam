// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest"

import {
  THEME_STORAGE_KEY,
  getStoredThemePreference,
  resolveThemePreference,
} from "./theme-store"

describe("resolveThemePreference", () => {
  test("uses the explicit light preference", () => {
    expect(resolveThemePreference("light", true)).toBe("light")
  })

  test("uses the explicit dark preference", () => {
    expect(resolveThemePreference("dark", false)).toBe("dark")
  })

  test("uses the system preference when requested", () => {
    expect(resolveThemePreference("system", true)).toBe("dark")
    expect(resolveThemePreference("system", false)).toBe("light")
  })

  test("system branch maps prefers-color-scheme dark to dark", () => {
    expect(resolveThemePreference("system", true)).toBe("dark")
  })

  test("system branch maps prefers-color-scheme light to light", () => {
    expect(resolveThemePreference("system", false)).toBe("light")
  })
})

describe("getStoredThemePreference", () => {
  test("reads the preference from Zustand persisted state", () => {
    const storage = {
      getItem: (key: string) =>
        key === THEME_STORAGE_KEY
          ? JSON.stringify({ state: { preference: "dark" } })
          : null,
    }

    expect(getStoredThemePreference(storage)).toBe("dark")
  })

  test("falls back to system for missing or invalid persisted state", () => {
    expect(getStoredThemePreference({ getItem: () => null })).toBe("system")
    expect(getStoredThemePreference({ getItem: () => "not-json" })).toBe(
      "system"
    )
    expect(
      getStoredThemePreference({
        getItem: () =>
          JSON.stringify({ state: { preference: "sepia" } }),
      })
    ).toBe("system")
  })

  test("falls back when JSON parses but shape is wrong", () => {
    expect(
      getStoredThemePreference({
        getItem: () => JSON.stringify(null),
      })
    ).toBe("system")
    expect(
      getStoredThemePreference({
        getItem: () => JSON.stringify({}),
      })
    ).toBe("system")
    expect(
      getStoredThemePreference({
        getItem: () => JSON.stringify({ state: {} }),
      })
    ).toBe("system")
    expect(
      getStoredThemePreference({
        getItem: () => JSON.stringify({ state: { other: "x" } }),
      })
    ).toBe("system")
  })

  test("accepts light and system when stored in valid persisted shape", () => {
    expect(
      getStoredThemePreference({
        getItem: () =>
          JSON.stringify({ state: { preference: "light" } }),
      })
    ).toBe("light")
    expect(
      getStoredThemePreference({
        getItem: () =>
          JSON.stringify({ state: { preference: "system" } }),
      })
    ).toBe("system")
  })

  beforeEach(() => {
    localStorage.clear()
  })

  test("uses window.localStorage when no storage is passed", () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { preference: "dark" } })
    )
    expect(getStoredThemePreference()).toBe("dark")
  })
})
