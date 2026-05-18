import { useForm } from "@tanstack/react-form"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

type AuthMode = "sign-in" | "sign-up"

export function AuthPanel() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>("sign-in")
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)

      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({
              email: value.email,
              password: value.password,
              callbackURL: "/trips",
            })
          : await authClient.signUp.email({
              name: value.name || value.email,
              email: value.email,
              password: value.password,
              callbackURL: "/trips",
            })

      if (result.error) {
        setError(result.error.message ?? "Authentication failed")
        return
      }

      await navigate({ to: "/trips" })
    },
  })

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">
            {mode === "sign-in" ? "Sign in" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Plan trips with shared activities, maps, labels, and dates.
          </p>
        </div>

        {mode === "sign-up" && (
          <form.Field
            name="name"
            children={(field) => (
              <label className="flex flex-col gap-1 text-sm">
                Name
                <Input
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Jane Traveler"
                />
              </label>
            )}
          />
        )}

        <form.Field
          name="email"
          children={(field) => (
            <label className="flex flex-col gap-1 text-sm">
              Email
              <Input
                name={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
          )}
        />

        <form.Field
          name="password"
          children={(field) => (
            <label className="flex flex-col gap-1 text-sm">
              Password
              <Input
                name={field.name}
                type="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                minLength={8}
                required
              />
            </label>
          )}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit">
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            setMode((current) =>
              current === "sign-in" ? "sign-up" : "sign-in"
            )
          }
        >
          {mode === "sign-in"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </Button>
      </form>
    </main>
  )
}
