import { z } from "zod"

export const tripRoles = ["owner", "editor", "viewer"] as const
export const tripActions = [
  "view_trip",
  "edit_trip",
  "manage_members",
  "create_activity",
  "edit_activity",
  "delete_activity",
  "manage_labels",
] as const

export const activityTimeTypes = ["none", "exact", "ordered"] as const
export const locationProviders = [
  "manual",
  "geoapify",
  "osm",
  "google",
  "apple",
  "waze",
  "other",
] as const

export type TripRole = (typeof tripRoles)[number]
export type TripAction = (typeof tripActions)[number]
export type ActivityTimeType = (typeof activityTimeTypes)[number]
export type LocationProvider = (typeof locationProviders)[number]

export interface TimelineActivity {
  activityId: bigint
  name: string
  date?: string
  timeType: string
  time?: string
  order?: number
  createdAt: number
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm")

export const tripInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2_000).optional(),
})

export const labelInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1).max(32),
})

export const activityInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(5_000).optional(),
    locationName: z.string().trim().max(160).optional(),
    address: z.string().trim().max(240).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    locationProvider: z.enum(locationProviders).optional(),
    providerPlaceId: z.string().trim().max(160).optional(),
    externalUrl: z.string().trim().url().max(1_000).optional(),
    date: dateSchema.optional(),
    timeType: z.enum(activityTimeTypes),
    time: timeSchema.optional(),
    order: z.number().int().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.timeType === "exact" && !value.time) {
      ctx.addIssue({
        code: "custom",
        path: ["time"],
        message: "Exact time is required when time type is exact",
      })
    }

    if (value.timeType === "ordered" && value.order === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["order"],
        message: "Manual order is required when time type is ordered",
      })
    }
  })

export type TripInput = z.infer<typeof tripInputSchema>
export type ActivityInput = z.infer<typeof activityInputSchema>
export type LabelInput = z.infer<typeof labelInputSchema>

const rolePermissions: Record<TripRole, ReadonlySet<TripAction>> = {
  owner: new Set(tripActions),
  editor: new Set([
    "view_trip",
    "edit_trip",
    "create_activity",
    "edit_activity",
    "delete_activity",
    "manage_labels",
  ]),
  viewer: new Set(["view_trip"]),
}

export function canTripRole(role: TripRole, action: TripAction): boolean {
  return rolePermissions[role].has(action)
}

export function sortActivitiesForTimeline<T extends TimelineActivity>(
  activities: ReadonlyArray<T>
): Array<T> {
  return [...activities].sort(compareTimelineActivities)
}

function compareTimelineActivities(
  left: TimelineActivity,
  right: TimelineActivity
): number {
  return (
    compareOptionalText(left.date, right.date, true) ||
    compareActivityTime(left, right) ||
    left.createdAt - right.createdAt ||
    compareBigInt(left.activityId, right.activityId)
  )
}

function compareActivityTime(
  left: TimelineActivity,
  right: TimelineActivity
): number {
  const leftRank = getTimeTypeRank(left)
  const rightRank = getTimeTypeRank(right)

  if (leftRank !== rightRank) {
    return leftRank - rightRank
  }

  if (left.timeType === "exact" && right.timeType === "exact") {
    return compareOptionalText(left.time, right.time, false)
  }

  if (left.timeType === "ordered" && right.timeType === "ordered") {
    return (left.order ?? Number.MAX_SAFE_INTEGER) -
      (right.order ?? Number.MAX_SAFE_INTEGER)
  }

  return 0
}

function getTimeTypeRank(activity: TimelineActivity): number {
  switch (activity.timeType) {
    case "exact":
      return 0
    case "ordered":
      return 1
    case "none":
      return 2
    default:
      return 2
  }
}

function compareOptionalText(
  left: string | undefined,
  right: string | undefined,
  missingLast: boolean
): number {
  if (left === right) {
    return 0
  }

  if (!left) {
    return missingLast ? 1 : -1
  }

  if (!right) {
    return missingLast ? -1 : 1
  }

  return left.localeCompare(right)
}

function compareBigInt(left: bigint, right: bigint): number {
  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}
