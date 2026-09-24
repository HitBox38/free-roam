import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth-functions"

export default async function HomePage() {
  const session = await getSession()
  redirect(session ? "/trips" : "/sign-in")
}
