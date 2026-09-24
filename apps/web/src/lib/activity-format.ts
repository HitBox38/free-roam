import type { Activities } from "@/module_bindings/types"

export function formatActivityTime(
  activity: Pick<Activities, "timeType" | "time" | "order">
): string {
  switch (activity.timeType) {
    case "exact":
      return activity.time ? `At ${activity.time}` : "Exact time"
    case "ordered":
      return `Order ${activity.order ?? 0}`
    case "none":
      return "No time"
    default:
      return "No time"
  }
}

export function activityPayload(activity: Activities) {
  return {
    activityId: activity.activityId,
    name: activity.name,
    description: activity.description,
    date: activity.date,
    timeType: activity.timeType,
    time: activity.time,
    order: activity.order,
    locationName: activity.locationName,
    address: activity.address,
    lat: activity.lat,
    lng: activity.lng,
    locationProvider: activity.locationProvider,
    providerPlaceId: activity.providerPlaceId,
    externalUrl: activity.externalUrl,
  }
}
