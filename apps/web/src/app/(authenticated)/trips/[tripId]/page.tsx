import { notFound } from "next/navigation"
import { TripDetailClient } from "@/components/trip-detail-client"
import { ensureSession } from "@/lib/auth-functions"

export default async function TripPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  await ensureSession()
  const { tripId } = await params
  if (!/^\d{1,20}$/.test(tripId) || BigInt(tripId) > 18446744073709551615n)
    notFound()
  return <TripDetailClient tripId={tripId} />
}
