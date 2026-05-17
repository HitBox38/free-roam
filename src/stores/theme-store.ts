import { useSyncExternalStore } from "react"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export const THEME_STORAGE_KEY = "free-roam-theme"

export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = Exclude<ThemePreference, "system">

type ThemeStore = {
    preference: ThemePreference
    setPreference: (preference: ThemePreference) => void
}

type ThemeStorage = Pick<Storage, "getItem">

const themePreferences = new Set<ThemePreference>(["system", "light", "dark"])

function isThemePreference(value: unknown): value is ThemePreference {
    return typeof value === "string" && themePreferences.has(value as ThemePreference)
}

export function resolveThemePreference(
    preference: ThemePreference,
    systemPrefersDark: boolean
): ResolvedTheme {
    if (preference === "system") {
        return systemPrefersDark ? "dark" : "light"
    }

    return preference
}

export function getStoredThemePreference(
    storage: ThemeStorage = window.localStorage
): ThemePreference {
    try {
        const storedValue = storage.getItem(THEME_STORAGE_KEY)

        if (!storedValue) {
            return "system"
        }

        const persisted = JSON.parse(storedValue) as unknown

        if (
            persisted &&
            typeof persisted === "object" &&
            "state" in persisted &&
            persisted.state &&
            typeof persisted.state === "object" &&
            "preference" in persisted.state &&
            isThemePreference(persisted.state.preference)
        ) {
            return persisted.state.preference
        }
    } catch {
        return "system"
    }

    return "system"
}

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set) => ({
            preference: "system",
            setPreference: (preference) => set({ preference }),
        }),
        {
            name: THEME_STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ preference: state.preference }),
        }
    )
)

function getSystemPrefersDark(): boolean {
    if (typeof window === "undefined") {
        return false
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function subscribeToSystemTheme(callback: () => void): () => void {
    if (typeof window === "undefined") {
        return () => {}
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    mediaQuery.addEventListener("change", callback)

    return () => mediaQuery.removeEventListener("change", callback)
}

export function useResolvedTheme(): ResolvedTheme {
    const preference = useThemeStore((state) => state.preference)
    const systemPrefersDark = useSyncExternalStore(
        subscribeToSystemTheme,
        getSystemPrefersDark,
        () => false
    )

    return resolveThemePreference(preference, systemPrefersDark)
}
