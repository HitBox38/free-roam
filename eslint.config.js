//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  {
    ignores: [
      ".output/**",
      ".nitro/**",
      ".tanstack/**",
      "dist/**",
      "src/module_bindings/**",
      "src/routeTree.gen.ts",
    ],
  },
  ...tanstackConfig,
]
