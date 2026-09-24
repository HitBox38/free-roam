import { useMemo } from "react"
import { useTable } from "spacetimedb/react"

import { tables } from "@/module_bindings"
import { formatHistoryEntry } from "@/lib/activity-history"

interface ActivityHistoryProps {
  activityId: bigint
}

function fallbackIdentity(identityHex: string): string {
  return `${identityHex.slice(0, 8)}…${identityHex.slice(-6)}`
}

export function ActivityHistory({ activityId }: ActivityHistoryProps) {
  const [historyRows] = useTable(tables.activityHistory)
  const [users] = useTable(tables.users)

  const usersByIdentity = useMemo(
    () =>
      new Map(users.map((user) => [user.identity.toHexString(), user.displayName])),
    [users]
  )

  const rows = useMemo(
    () =>
      historyRows
        .filter((row) => row.activityId === activityId)
        .sort(
          (left, right) =>
            Number(right.createdAt.toMillis()) - Number(left.createdAt.toMillis())
        ),
    [activityId, historyRows]
  )

  return (
    <details className="rounded-xl border bg-card" open>
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        Activity history
      </summary>
      <div className="max-h-56 space-y-2 overflow-auto px-4 pb-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history entries yet.</p>
        ) : (
          rows.map((entry) => {
            const identityHex = entry.userIdentity.toHexString()
            const actorName =
              usersByIdentity.get(identityHex) ?? fallbackIdentity(identityHex)

            return (
              <div
                key={entry.historyId.toString()}
                className="rounded-lg border bg-background px-3 py-2 text-xs"
              >
                <p className="font-medium">{formatHistoryEntry(entry)}</p>
                <p className="text-muted-foreground">
                  {actorName} ·{" "}
                  {new Date(Number(entry.createdAt.toMillis())).toLocaleString()}
                </p>
              </div>
            )
          })
        )}
      </div>
    </details>
  )
}
