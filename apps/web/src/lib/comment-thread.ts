interface ThreadableComment {
  commentId: bigint
  parentCommentId?: bigint | null
  createdAt?: unknown
  deletedAt?: unknown
}

export interface CommentReply<TComment extends ThreadableComment> {
  comment: TComment
  deleted: boolean
  nestedReply: boolean
}

export interface CommentThread<TComment extends ThreadableComment> {
  comment: TComment
  deleted: boolean
  replies: Array<CommentReply<TComment>>
}

function extractCreatedAtValue(comment: ThreadableComment): number {
  if (typeof comment.createdAt === "number") {
    return comment.createdAt
  }

  if (comment.createdAt instanceof Date) {
    return comment.createdAt.getTime()
  }

  if (
    typeof comment.createdAt === "object" &&
    comment.createdAt !== null &&
    "toMillis" in comment.createdAt &&
    typeof comment.createdAt.toMillis === "function"
  ) {
    return Number(comment.createdAt.toMillis())
  }

  return 0
}

function isDeleted(comment: ThreadableComment): boolean {
  return Boolean(comment.deletedAt)
}

function sortByCreatedAt<TComment extends ThreadableComment>(
  comments: ReadonlyArray<TComment>
): Array<TComment> {
  return [...comments].sort((left, right) => {
    const createdAtDiff = extractCreatedAtValue(left) - extractCreatedAtValue(right)
    if (createdAtDiff !== 0) {
      return createdAtDiff
    }

    if (left.commentId === right.commentId) {
      return 0
    }

    return left.commentId < right.commentId ? -1 : 1
  })
}

function findRootParent<TComment extends ThreadableComment>(
  comment: TComment,
  byId: Map<bigint, TComment>
): {
  rootComment: TComment
  nestedReply: boolean
} {
  let current: TComment = comment
  let nestedReply = false

  while (current.parentCommentId) {
    const parent = byId.get(current.parentCommentId)
    if (!parent) {
      break
    }

    nestedReply = nestedReply || Boolean(parent.parentCommentId)
    current = parent
  }

  return { rootComment: current, nestedReply }
}

export function buildCommentThread<TComment extends ThreadableComment>(
  comments: ReadonlyArray<TComment>
): Array<CommentThread<TComment>> {
  const sortedComments = sortByCreatedAt(comments)
  const byId = new Map(sortedComments.map((comment) => [comment.commentId, comment]))
  const threadsByTopLevelId = new Map<bigint, CommentThread<TComment>>()

  for (const comment of sortedComments) {
    if (!comment.parentCommentId) {
      threadsByTopLevelId.set(comment.commentId, {
        comment,
        deleted: isDeleted(comment),
        replies: [],
      })
    }
  }

  for (const comment of sortedComments) {
    if (!comment.parentCommentId) {
      continue
    }

    const { rootComment, nestedReply } = findRootParent(comment, byId)
    const thread = threadsByTopLevelId.get(rootComment.commentId)
    if (!thread) {
      threadsByTopLevelId.set(comment.commentId, {
        comment,
        deleted: isDeleted(comment),
        replies: [],
      })
      continue
    }

    thread.replies.push({
      comment,
      deleted: isDeleted(comment),
      nestedReply,
    })
  }

  return sortByCreatedAt(Array.from(threadsByTopLevelId.values()).map((thread) => thread.comment)).map(
    (topLevelComment) => threadsByTopLevelId.get(topLevelComment.commentId)!
  )
}
