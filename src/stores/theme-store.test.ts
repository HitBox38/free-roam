import { describe, expect, test } from "vitest"

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
})
