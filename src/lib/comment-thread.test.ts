import { describe, expect, test } from "vitest"

import { buildCommentThread } from "@/lib/comment-thread"

interface TestComment {
  commentId: bigint
  parentCommentId?: bigint
  body: string
  createdAt: number
  deletedAt?: number
}

describe("buildCommentThread", () => {
  test("groups top-level comments with one nested reply level", () => {
    const comments: Array<TestComment> = [
      { commentId: 1n, body: "Top", createdAt: 1 },
      { commentId: 2n, parentCommentId: 1n, body: "Reply", createdAt: 2 },
      {
        commentId: 3n,
        parentCommentId: 2n,
        body: "Reply to reply",
        createdAt: 3,
      },
    ]

    const threads = buildCommentThread(comments)

    expect(threads).toHaveLength(1)
    expect(threads[0].comment.commentId).toBe(1n)
    expect(threads[0].replies.map((reply) => reply.comment.commentId)).toEqual([
      2n,
      3n,
    ])
    expect(threads[0].replies.map((reply) => reply.nestedReply)).toEqual([
      false,
      true,
    ])
  })

  test("preserves deleted comments in threads", () => {
    const comments: Array<TestComment> = [
      { commentId: 1n, body: "Deleted top", createdAt: 1, deletedAt: 10 },
      {
        commentId: 2n,
        parentCommentId: 1n,
        body: "Reply still visible",
        createdAt: 2,
      },
      {
        commentId: 3n,
        parentCommentId: 1n,
        body: "Deleted reply",
        createdAt: 3,
        deletedAt: 11,
      },
    ]

    const [thread] = buildCommentThread(comments)

    expect(thread.deleted).toBe(true)
    expect(thread.replies[0].deleted).toBe(false)
    expect(thread.replies[1].deleted).toBe(true)
  })
})
