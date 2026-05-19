import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import appCss from "../styles.css?url"
import { ThemeClassSync } from "@/components/theme-class-sync"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { APP_NAME, APP_TAGLINE } from "@/lib/app-brand"

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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: APP_NAME,
      },
      {
        name: "description",
        content: APP_TAGLINE,
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script>{themeScript}</script>
      </head>
      <body>
        <ThemeClassSync />
        <div className="fixed top-4 right-4 z-50">
          <ThemeSwitcher />
        </div>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
