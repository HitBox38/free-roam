import { useMemo, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { useSpacetimeDB, useTable } from "spacetimedb/react"

import { ACTIVE_TYPING_WINDOW_MS, useTypingIndicator } from "./typing-indicator"

import type { DbConnection } from "@/module_bindings"
import type { ActivityComments as ActivityCommentRow } from "@/module_bindings/types"
import { tables } from "@/module_bindings"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { buildCommentThread } from "@/lib/comment-thread"

interface ActivityCommentsProps {
  activityId: bigint
  conn: DbConnection | null
  tripId: bigint
  isOwner: boolean
}

function formatIdentity(identityHex: string): string {
  return `${identityHex.slice(0, 8)}…${identityHex.slice(-6)}`
}

function formatTimestamp(comment: ActivityCommentRow): string {
  const timestamp = comment.updatedAt ?? comment.createdAt
  return new Date(Number(timestamp.toMillis())).toLocaleString()
}

function CommentComposer({
  conn,
  tripId,
  targetId,
  submitLabel,
  placeholder,
  onSubmit,
  remoteTypingNames,
  onCancel,
}: {
  conn: DbConnection | null
  tripId: bigint
  targetId: string
  submitLabel: string
  placeholder: string
  onSubmit: (body: string) => void
  remoteTypingNames: ReadonlyArray<string>
  onCancel?: () => void
}) {
  const typing = useTypingIndicator({
    conn,
    tripId,
    targetType: "comment",
    targetId,
  })
  const form = useForm({
    defaultValues: { body: "" },
    onSubmit: ({ value, formApi }) => {
      const body = value.body.trim()
      if (!body) {
        return
      }

      onSubmit(body)
      typing.clearTyping()
      formApi.reset()
    },
  })

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field
        name="body"
        children={(field) => (
          <Textarea
            value={field.state.value}
            onBlur={() => {
              field.handleBlur()
              typing.clearTyping()
            }}
            onChange={(event) => {
              field.handleChange(event.target.value)
              typing.notifyTyping()
            }}
            placeholder={placeholder}
          />
        )}
      />
      {remoteTypingNames.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {remoteTypingNames.join(", ")} {remoteTypingNames.length > 1 ? "are" : "is"}{" "}
          typing...
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!conn}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

export function ActivityComments({
  activityId,
  conn,
  tripId,
  isOwner,
}: ActivityCommentsProps) {
  const spacetime = useSpacetimeDB()
  const [comments] = useTable(tables.activityComments)
  const [users] = useTable(tables.users)
  const [typingIndicators] = useTable(tables.typingIndicators)
  const identity = spacetime.identity

  const [editingCommentId, setEditingCommentId] = useState<bigint | null>(null)
  const [editingBody, setEditingBody] = useState("")
  const [activeReplyParentId, setActiveReplyParentId] = useState<bigint | null>(null)

  const commentsForActivity = useMemo(
    () => comments.filter((comment) => comment.activityId === activityId),
    [activityId, comments]
  )
  const threads = useMemo(
    () => buildCommentThread(commentsForActivity),
    [commentsForActivity]
  )
  const usersByIdentity = useMemo(
    () =>
      new Map(users.map((user) => [user.identity.toHexString(), user.displayName])),
    [users]
  )
  const myIdentityHex = identity?.toHexString()

  const namesTypingForTarget = (targetId: string): Array<string> => {
    const now = Date.now()

    return Array.from(
      new Set(
        typingIndicators
          .filter((row) => row.tripId === tripId)
          .filter((row) => row.targetType === "comment")
          .filter((row) => row.targetId === targetId)
          .filter(
            (row) =>
              now - Number(row.updatedAt.toMillis()) <= ACTIVE_TYPING_WINDOW_MS
          )
          .filter((row) => row.userIdentity.toHexString() !== myIdentityHex)
          .map((row) => {
            const identityHex = row.userIdentity.toHexString()
            return usersByIdentity.get(identityHex) ?? formatIdentity(identityHex)
          })
      )
    )
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">Comments</h3>
      <CommentComposer
        conn={conn}
        tripId={tripId}
        targetId={activityId.toString()}
        submitLabel="Comment"
        placeholder="Write a comment..."
        remoteTypingNames={namesTypingForTarget(activityId.toString())}
        onSubmit={(body) => {
          conn?.reducers.addComment({
            activityId,
            parentCommentId: undefined,
            body,
          })
        }}
      />

      <div className="mt-4 space-y-3">
        {threads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          threads.map((thread) => {
            const topLevel = thread.comment
            const topIdentityHex = topLevel.userIdentity.toHexString()
            const topLevelAuthor =
              usersByIdentity.get(topIdentityHex) ?? formatIdentity(topIdentityHex)
            const canEditTopLevel = Boolean(
              identity && topLevel.userIdentity.equals(identity)
            )
            const canDeleteTopLevel = isOwner || canEditTopLevel

            return (
              <article
                key={topLevel.commentId.toString()}
                className="space-y-2 rounded-lg border bg-background p-3"
              >
                <header className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{topLevelAuthor}</span>
                  <span>{formatTimestamp(topLevel)}</span>
                </header>

                {editingCommentId === topLevel.commentId ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingBody}
                      onChange={(event) => setEditingBody(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const trimmed = editingBody.trim()
                          if (!trimmed) {
                            return
                          }
                          conn?.reducers.editComment({
                            commentId: topLevel.commentId,
                            body: trimmed,
                          })
                          setEditingCommentId(null)
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCommentId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">
                    {thread.deleted ? (
                      <span className="italic text-muted-foreground">
                        This comment was deleted.
                      </span>
                    ) : (
                      topLevel.body
                    )}
                  </p>
                )}

                <div className="flex gap-2 text-xs">
                  {!thread.deleted && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setActiveReplyParentId((value) =>
                          value === topLevel.commentId ? null : topLevel.commentId
                        )
                      }
                    >
                      Reply
                    </Button>
                  )}
                  {!thread.deleted && canEditTopLevel && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCommentId(topLevel.commentId)
                        setEditingBody(topLevel.body)
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  {canDeleteTopLevel && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        conn?.reducers.softDeleteComment({
                          commentId: topLevel.commentId,
                        })
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>

                {thread.replies.length > 0 && (
                  <div className="space-y-2 border-l pl-3">
                    {thread.replies.map((reply) => {
                      const replyIdentityHex = reply.comment.userIdentity.toHexString()
                      const replyAuthor =
                        usersByIdentity.get(replyIdentityHex) ??
                        formatIdentity(replyIdentityHex)
                      const canEditReply = Boolean(
                        identity && reply.comment.userIdentity.equals(identity)
                      )
                      const canDeleteReply = isOwner || canEditReply

                      return (
                        <div
                          key={reply.comment.commentId.toString()}
                          className="rounded-md border bg-card p-2 text-sm"
                        >
                          <p className="text-xs text-muted-foreground">
                            {replyAuthor}
                            {reply.nestedReply ? " · reply in thread" : ""}
                          </p>
                          {editingCommentId === reply.comment.commentId ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingBody}
                                onChange={(event) =>
                                  setEditingBody(event.target.value)
                                }
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const trimmed = editingBody.trim()
                                    if (!trimmed) {
                                      return
                                    }
                                    conn?.reducers.editComment({
                                      commentId: reply.comment.commentId,
                                      body: trimmed,
                                    })
                                    setEditingCommentId(null)
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingCommentId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p>
                              {reply.deleted ? (
                                <span className="italic text-muted-foreground">
                                  This reply was deleted.
                                </span>
                              ) : (
                                reply.comment.body
                              )}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(reply.comment)}
                          </p>
                          {!reply.deleted && (
                            <div className="mt-1 flex gap-2">
                              {canEditReply && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingCommentId(reply.comment.commentId)
                                    setEditingBody(reply.comment.body)
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                              {canDeleteReply && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    conn?.reducers.softDeleteComment({
                                      commentId: reply.comment.commentId,
                                    })
                                  }}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {activeReplyParentId === topLevel.commentId && (
                  <div className="border-l pl-3">
                    <CommentComposer
                      conn={conn}
                      tripId={tripId}
                      targetId={topLevel.commentId.toString()}
                      submitLabel="Reply"
                      placeholder="Write a reply..."
                      remoteTypingNames={namesTypingForTarget(
                        topLevel.commentId.toString()
                      )}
                      onCancel={() => setActiveReplyParentId(null)}
                      onSubmit={(body) => {
                        conn?.reducers.addComment({
                          activityId,
                          parentCommentId: topLevel.commentId,
                          body,
                        })
                        setActiveReplyParentId(null)
                      }}
                    />
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
