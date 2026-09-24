import { redirect } from "next/navigation"
import { AuthPanel } from "@/components/auth-panel"
import { getSession } from "@/lib/auth-functions"

export default async function SignInPage() {
  if (await getSession()) redirect("/trips")
  return <AuthPanel />
}
