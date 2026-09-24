import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    // TanStack Form uses function-valued children props as its render-prop API.
    rules: { "react/no-children-prop": ["error", { allowFunctions: true }] },
  },
  {
    // Preserve the existing imperative Leaflet/presence integrations during the
    // framework migration. Keep compiler diagnostics visible as follow-up warnings.
    files: [
      "src/components/activity-comments.tsx",
      "src/components/spacetime-provider.tsx",
      "src/components/trip-detail.tsx",
      "src/components/ui/map.tsx",
      "src/components/ui/place-autocomplete.tsx",
      "src/lib/use-map-presence.ts",
    ],
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "next-env.d.ts", "src/module_bindings/**"]),
])
