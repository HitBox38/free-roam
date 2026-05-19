interface ActivityHistoryEntryLike {
  action: string
}

type KnownHistoryAction =
  | "created"
  | "updated"
  | "updated_name"
  | "updated_description"
  | "updated_location"
  | "updated_date"
  | "updated_time"
  | "updated_order"
  | "added_label"
  | "removed_label"
  | "added_attachment"
  | "removed_attachment"
  | "commented"
  | "deleted"
  | "restored"

function normalizeHistoryAction(action: string): KnownHistoryAction | null {
  const knownActions: Record<KnownHistoryAction, true> = {
    created: true,
    updated: true,
    updated_name: true,
    updated_description: true,
    updated_location: true,
    updated_date: true,
    updated_time: true,
    updated_order: true,
    added_label: true,
    removed_label: true,
    added_attachment: true,
    removed_attachment: true,
    commented: true,
    deleted: true,
    restored: true,
  }

  if (Object.hasOwn(knownActions, action)) {
    return action as KnownHistoryAction
  }

  return null
}

function humanizeUnknownAction(action: string): string {
  return `Updated ${action.replaceAll("_", " ")}`
}

export function formatHistoryEntry(entry: ActivityHistoryEntryLike): string {
  const normalized = normalizeHistoryAction(entry.action)

  if (!normalized) {
    return humanizeUnknownAction(entry.action)
  }

  switch (normalized) {
    case "created":
      return "Created activity"
    case "updated":
      return "Updated activity"
    case "updated_name":
      return "Renamed activity"
    case "updated_description":
      return "Changed description"
    case "updated_location":
      return "Changed location"
    case "updated_date":
      return "Changed date"
    case "updated_time":
      return "Changed time"
    case "updated_order":
      return "Changed order"
    case "added_label":
      return "Added label"
    case "removed_label":
      return "Removed label"
    case "added_attachment":
      return "Added attachment"
    case "removed_attachment":
      return "Removed attachment"
    case "commented":
      return "Added comment"
    case "deleted":
      return "Deleted activity"
    case "restored":
      return "Restored activity"
    default: {
      const exhaustiveCheck: never = normalized
      return exhaustiveCheck
    }
  }
}
