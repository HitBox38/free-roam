import { describe, expect, test } from "vitest"

import { cn } from "./utils"

describe("cn", () => {
  test("merges class lists with tailwind-aware conflict resolution (later wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2")
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  test("ignores falsy conditional inputs", () => {
    expect(cn("a", undefined, "c")).toBe("a c")
    expect(cn("x", undefined, "y")).toBe("x y")
    expect(cn("one", null, "two")).toBe("one two")
  })

  test("drops class fragments when a boolean guard is false", () => {
    const includeB: boolean = JSON.parse("false") as boolean
    expect(cn("a", includeB && "b", "c")).toBe("a c")
  })

  test("handles object/class-variance-style maps from clsx", () => {
    expect(
      cn("base", {
        hidden: false,
        flex: true,
      })
    ).toBe("base flex")
  })

  test("flattens arrays from clsx", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz")
  })

  test("later utility wins across argument positions", () => {
    expect(cn("m-0 p-4", "m-4 p-0")).toBe("m-4 p-0")
  })

  test("dedupes identical utilities", () => {
    expect(cn("px-2", "px-2")).toBe("px-2")
  })
})
