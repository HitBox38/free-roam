import { TripsOverview } from "@/components/trips-overview"
import { ensureSession } from "@/lib/auth-functions"

export default async function TripsPage() {
  await ensureSession()
  return <TripsOverview />
}
