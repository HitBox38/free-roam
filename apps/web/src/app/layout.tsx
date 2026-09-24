import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ThemeClassSync } from "@/components/theme-class-sync"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { APP_NAME, APP_TAGLINE } from "@/lib/app-brand"
import "@/styles.css"

export const metadata: Metadata = { title: APP_NAME, description: APP_TAGLINE }

const themeScript = `
(() => {
  const storageKey = "free-roam-theme"
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  let preference = "system"

  try {
    const storedValue = window.localStorage.getItem(storageKey)
    const persisted = storedValue ? JSON.parse(storedValue) : null
    const storedPreference = persisted?.state?.preference

    if (
      storedPreference === "light" ||
      storedPreference === "dark" ||
      storedPreference === "system"
    ) {
      preference = storedPreference
    }
  } catch {
    preference = "system"
  }

  document.documentElement.classList.toggle(
    "dark",
    preference === "dark" || (preference === "system" && prefersDark)
  )
})()
`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeClassSync />
        <div className="fixed top-4 right-4 z-50">
          <ThemeSwitcher />
        </div>
        {children}
      </body>
    </html>
  )
}
