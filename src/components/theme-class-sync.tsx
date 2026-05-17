"use client"

import { useLayoutEffect } from "react"

import { useResolvedTheme } from "@/stores/theme-store"

export function ThemeClassSync() {
    const resolvedTheme = useResolvedTheme()

    useLayoutEffect(() => {
        document.documentElement.classList.toggle(
            "dark",
            resolvedTheme === "dark"
        )
    }, [resolvedTheme])

    return null
}
