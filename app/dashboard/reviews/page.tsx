"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { logout as logoutAction, selectBusinessId } from "@/lib/store/slices/authSlice"
import { logout as storageLogout } from "@/lib/storage"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Star, MessageSquareReply, Trash2, ChevronLeft, ChevronRight,
  RefreshCw, MessageSquare, CheckCircle2, Clock,
  Pencil, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatDistanceToNow, format } from "date-fns"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewComment {
  id: number
  body: string
  author_name: string
  author_role: "guest" | "business"
  author_type?: string | null
  author_id?: number | null
  author_avatar_url?: string | null
  parent_id?: number | null
  created_at?: string
  updated_at?: string
  deletable?: boolean
  editable?: boolean
  likes_count?: number
  dislikes_count?: number
  user_vote?: 1 | -1 | null
}

interface ReviewAccount {
  id: number
  first_name: string
  last_name: string       // already formatted "D." by backend
  display_name: string    // "Festus D."
}

interface Review {
  id: number
  rating: number
  content: string
  reviewer_name: string
  verified: boolean
  created_at: string
  date: string
  admin_reply: string | null
  admin_reply_by: string | null
  admin_replied_at: string | null
  comments?: ReviewComment[]
  account: ReviewAccount | null
}

interface Summary {
  total: number
  average_rating: number
  replied: number
  pending_reply: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StarRating = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={size}
        className={s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
      />
    ))}
  </div>
)

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

function reviewThread(review: Review): ReviewComment[] {
  if (review.comments?.length) return review.comments
  if (review.admin_reply) {
    return [{
      id: -1,
      body: review.admin_reply,
      author_name: review.admin_reply_by || "",
      author_role: "business",
      parent_id: null,
      created_at: review.admin_replied_at || undefined,
    }]
  }
  return []
}

const NEST_INDENT_PX = 28
const ROOT_AVATAR = 40
const NESTED_AVATAR = 32
const AVATAR_GAP = 12

function normalizeParentId(parentId: number | string | null | undefined): number | null {
  if (parentId == null || parentId === "") return null
  const n = Number(parentId)
  return Number.isFinite(n) && n > 0 ? n : null
}

function normalizeCommentId(id: number | string): number {
  return Number(id)
}

function displayAuthorName(name: string): string {
  const trimmed = name.trim()
  return trimmed || "Guest"
}

function reviewCollapseKey(reviewId: number): number {
  return -Math.abs(reviewId)
}

function countReplyTree(comments: ReviewComment[], parentId: number): number {
  let count = 0
  const walk = (pid: number) => {
    for (const child of childComments(comments, pid)) {
      count += 1
      walk(normalizeCommentId(child.id))
    }
  }
  walk(parentId)
  return count
}

function plainCommentBody(text: string): string {
  if (!text) return ""
  return text.replace(/<[^>]+>/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim()
}

function commentBodyDisplay(text: string, replyToName: string | null): string {
  const plain = plainCommentBody(text)
  if (!replyToName) return plain
  const handle = replyToName.trim().split(/\s+/)[0]
  if (!handle) return plain
  const stripped = plain.replace(new RegExp(`^@${handle}\\S*\\s*`, "i"), "").trim()
  return stripped || plain
}

function commentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "G"
  return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2)
}

function visibleReviewComments(comments: ReviewComment[]): ReviewComment[] {
  const ids = new Set(comments.map((c) => normalizeCommentId(c.id)))
  return comments.filter((comment) => {
    let parentId = normalizeParentId(comment.parent_id)
    while (parentId) {
      if (!ids.has(parentId)) return false
      const parent = comments.find((c) => normalizeCommentId(c.id) === parentId)
      parentId = parent ? normalizeParentId(parent.parent_id) : null
    }
    return true
  })
}

function childComments(comments: ReviewComment[], parentId: number | null): ReviewComment[] {
  const visible = visibleReviewComments(comments)
  const normalizedParent = parentId != null && parentId > 0 ? parentId : null
  return visible
    .filter((c) => normalizeParentId(c.parent_id) === normalizedParent)
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      return aTime - bTime
    })
}

function replyToAuthorName(comments: ReviewComment[], comment: ReviewComment): string | null {
  const parentId = normalizeParentId(comment.parent_id)
  if (!parentId) return null
  return visibleReviewComments(comments).find((c) => normalizeCommentId(c.id) === parentId)?.author_name ?? null
}


function CommentAvatar({
  name,
  avatarUrl,
  isBusiness,
  size,
}: {
  name: string
  avatarUrl?: string | null
  isBusiness: boolean
  size: number
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <Avatar className="flex-shrink-0" style={{ width: size, height: size }}>
      <AvatarFallback className={`text-xs font-semibold ${isBusiness ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
        {commentInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

function MentionPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 mr-1 text-[13px] font-semibold bg-slate-100 text-blue-600">
      @{displayAuthorName(name)}
    </span>
  )
}

function OwnerPill({ name }: { name: string }) {
  const label = displayAuthorName(name)
  if (!label) return null

  return (
    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
      {label}
      <CheckCircle2 className="w-3 h-3 opacity-80 text-slate-500" />
    </span>
  )
}

function commentReplyParentId(comment: ReviewComment): number | null {
  return comment.id > 0 ? comment.id : null
}

function reviewNeedsBusinessReply(review: Review): boolean {
  const comments = reviewThread(review)
  if (!comments.length) return true
  return comments[comments.length - 1]?.author_role === "guest"
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

function isCommentDeletable(comment: ReviewComment): boolean {
  if (typeof comment.deletable === "boolean") return comment.deletable
  if (!comment.created_at) return false
  return Date.now() - new Date(comment.created_at).getTime() < TWENTY_FOUR_HOURS_MS
}

function isCommentEditable(comment: ReviewComment): boolean {
  if (typeof comment.editable === "boolean") return comment.editable
  return isCommentDeletable(comment)
}

type CommentNodeProps = {
  comment: ReviewComment
  depth: number
  allComments: ReviewComment[]
  editingCommentId: number | null
  editDraft: string
  savingCommentId: number | null
  collapsedIds: Set<number>
  onToggleCollapse: (id: number) => void
  onReplyTo: (parentId: number | null) => void
  onEdit: (commentId: number, body: string) => void
  onCancelEdit: () => void
  onSaveEdit: (commentId: number) => void
  onDelete: (commentId: number) => void
  onEditDraftChange: (value: string) => void
}

function CommentBodyBlock({
  comment,
  isRoot,
  allComments,
  editingCommentId,
  editDraft,
  savingCommentId,
  onReplyTo,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditDraftChange,
}: {
  comment: ReviewComment
  isRoot: boolean
  allComments: ReviewComment[]
  editingCommentId: number | null
  editDraft: string
  savingCommentId: number | null
  onReplyTo: (parentId: number | null) => void
  onEdit: (commentId: number, body: string) => void
  onCancelEdit: () => void
  onSaveEdit: (commentId: number) => void
  onDelete: (commentId: number) => void
  onEditDraftChange: (value: string) => void
}) {
  const isBusiness = comment.author_role === "business"
  const isEditing = editingCommentId === comment.id
  const replyToName = replyToAuthorName(allComments, comment)
  const bodyText = commentBodyDisplay(comment.body, replyToName)
  const likesCount = comment.likes_count ?? 0
  const dislikesCount = comment.dislikes_count ?? 0

  return (
    <div className="flex-1 min-w-0 pb-1">
      <div className="flex items-center gap-1 flex-wrap mb-1">
        {isBusiness && displayAuthorName(comment.author_name) ? (
          <OwnerPill name={comment.author_name} />
        ) : (
          <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{displayAuthorName(comment.author_name)}</span>
        )}
        {comment.created_at && (
          <>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-400">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2 mb-2">
          <Textarea
            rows={2}
            className="resize-none text-sm"
            value={editDraft}
            onChange={(e) => onEditDraftChange(e.target.value)}
            disabled={savingCommentId === comment.id}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancelEdit} disabled={savingCommentId === comment.id}>Cancel</Button>
            <Button size="sm" onClick={() => onSaveEdit(comment.id)} disabled={savingCommentId === comment.id || !editDraft.trim()}>
              {savingCommentId === comment.id ? <LoadingSpinner size={14} /> : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-800 leading-relaxed mb-2 whitespace-pre-wrap break-words">
          {replyToName && !isRoot && <MentionPill name={replyToName} />}
          {bodyText}
        </p>
      )}

      {!isEditing && (
        <div className="flex items-center gap-0.5 mb-1">
          {likesCount > 0 && (
            <span className="inline-flex items-center gap-1 h-8 px-2 text-slate-500 text-xs font-semibold">
              <ThumbsUp className="w-4 h-4" />
              {likesCount}
            </span>
          )}
          {dislikesCount > 0 && (
            <span className="inline-flex items-center gap-1 h-8 px-2 text-slate-500 text-xs font-semibold">
              <ThumbsDown className="w-4 h-4" />
              {dislikesCount}
            </span>
          )}
          <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1" onClick={() => onReplyTo(commentReplyParentId(comment))}>
            Reply
          </button>
          {isBusiness && isCommentEditable(comment) && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800" onClick={() => onEdit(comment.id, comment.body)}>
              <Pencil className="w-3 h-3" />
            </Button>
          )}
          {isBusiness && isCommentDeletable(comment) && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => onDelete(comment.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function CommentNode({
  comment,
  depth,
  allComments,
  editingCommentId,
  editDraft,
  savingCommentId,
  collapsedIds,
  onToggleCollapse,
  onReplyTo,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditDraftChange,
}: CommentNodeProps) {
  const children = childComments(allComments, comment.id)
  const hasReplies = children.length > 0
  const collapsed = collapsedIds.has(comment.id)
  const replyCount = countReplyTree(allComments, comment.id)
  const isBusiness = comment.author_role === "business"
  const avatarSize = depth === 0 ? ROOT_AVATAR : NESTED_AVATAR
  const indent = Math.min(depth, 2) * NEST_INDENT_PX

  return (
    <div className="min-w-0 overflow-x-hidden" style={{ marginBottom: depth === 0 ? 16 : 10 }}>
      <div className="flex min-w-0 items-start" style={{ marginLeft: indent }}>
        <div className="flex-shrink-0" style={{ width: avatarSize, marginRight: AVATAR_GAP }}>
          <CommentAvatar name={comment.author_name} avatarUrl={comment.author_avatar_url} isBusiness={isBusiness} size={avatarSize} />
        </div>
        <CommentBodyBlock
          comment={comment}
          isRoot={depth === 0}
          allComments={allComments}
          editingCommentId={editingCommentId}
          editDraft={editDraft}
          savingCommentId={savingCommentId}
          onReplyTo={onReplyTo}
          onEdit={onEdit}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
          onDelete={onDelete}
          onEditDraftChange={onEditDraftChange}
        />
      </div>

      {hasReplies && !collapsed &&
        children.map((child) => (
          <CommentNode
            key={child.id}
            comment={child}
            depth={depth + 1}
            allComments={allComments}
            editingCommentId={editingCommentId}
            editDraft={editDraft}
            savingCommentId={savingCommentId}
            collapsedIds={collapsedIds}
            onToggleCollapse={onToggleCollapse}
            onReplyTo={onReplyTo}
            onEdit={onEdit}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onDelete={onDelete}
            onEditDraftChange={onEditDraftChange}
          />
        ))}

      {hasReplies && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 mt-1"
          style={{ marginLeft: indent + avatarSize + AVATAR_GAP }}
          onClick={() => onToggleCollapse(comment.id)}
        >
          {collapsed ? (
            <><ChevronDown className="w-4 h-4" />{replyCount} {replyCount === 1 ? "reply" : "replies"}</>
          ) : (
            <><ChevronUp className="w-4 h-4" />Hide replies</>
          )}
        </button>
      )}
    </div>
  )
}

// ─── Review Card ─────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  onReplySubmit,
  onCommentUpdate,
  onCommentDelete,
}: {
  review: Review
  onReplySubmit: (id: number, text: string, parentId?: number | null) => Promise<void>
  onCommentUpdate: (reviewId: number, commentId: number, body: string) => Promise<void>
  onCommentDelete: (reviewId: number, commentId: number) => void
}) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [activeReplyParentId, setActiveReplyParentId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [savingCommentId, setSavingCommentId] = useState<number | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() => {
    const comments = reviewThread(review)
    const count = comments.filter((c) => c.id > 0).length
    return count > 0 ? new Set([reviewCollapseKey(review.id)]) : new Set()
  })
  const allComments = reviewThread(review)
  const roots = childComments(allComments, null)
  const hasBusinessReply = allComments.some((c) => c.author_role === "business")
  const needsReply = reviewNeedsBusinessReply(review)
  const reviewCollapsed = collapsedIds.has(reviewCollapseKey(review.id))
  const totalReplies = allComments.filter((c) => c.id > 0).length

  const toggleCollapse = (id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandReviewThread = () => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      next.delete(reviewCollapseKey(review.id))
      return next
    })
  }

  const openReplyBox = (parentId: number | null = null) => {
    setReplyText("")
    setActiveReplyParentId(parentId)
    setShowReplyBox(true)
  }

  const handleSubmit = async () => {
    if (!replyText.trim()) { toast.error("Reply cannot be blank"); return }
    setSubmitting(true)
    await onReplySubmit(review.id, replyText.trim(), activeReplyParentId)
    setSubmitting(false)
    setShowReplyBox(false)
    setReplyText("")
    setActiveReplyParentId(null)
    expandReviewThread()
  }

  const handleSaveEdit = async (commentId: number) => {
    const body = editDraft.trim()
    if (!body) { toast.error("Reply cannot be blank"); return }
    setSavingCommentId(commentId)
    await onCommentUpdate(review.id, commentId, body)
    setSavingCommentId(null)
    setEditingCommentId(null)
  }

  const displayName = review.account?.display_name || review.reviewer_name || "Guest"
  const avatarInitials = initials(displayName)

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-3.5 space-y-3 sm:px-4">
        {/* ── Guest row ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* Avatar */}
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                {avatarInitials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="min-w-0 truncate font-semibold text-slate-900 text-sm">{displayName}</p>
                {review.verified && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-emerald-600 border-emerald-200 bg-emerald-50 gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={review.rating} />
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Rating badge */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
            ${review.rating >= 4 ? "bg-emerald-50 text-emerald-700"
              : review.rating === 3 ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"}`}>
            {review.rating}
          </div>
        </div>

        {/* Review content */}
        <p className="break-words text-sm text-slate-600 leading-relaxed">{review.content}</p>

        {/* Comment thread — collapsed under the guest review */}
        {roots.length > 0 && (
          <div className="min-w-0 overflow-x-hidden">
            {!needsReply && !showReplyBox && (
              <button
                type="button"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-1 py-1 mb-1"
                onClick={() => openReplyBox(null)}
              >
                Reply
              </button>
            )}

            {!reviewCollapsed &&
              roots.map((comment) => (
                <CommentNode
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  allComments={allComments}
                  editingCommentId={editingCommentId}
                  editDraft={editDraft}
                  savingCommentId={savingCommentId}
                  collapsedIds={collapsedIds}
                  onToggleCollapse={toggleCollapse}
                  onReplyTo={openReplyBox}
                  onEdit={(id, body) => { setEditingCommentId(id); setEditDraft(body) }}
                  onCancelEdit={() => setEditingCommentId(null)}
                  onSaveEdit={handleSaveEdit}
                  onDelete={(id) => onCommentDelete(review.id, id)}
                  onEditDraftChange={setEditDraft}
                />
              ))}

            {totalReplies > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 mt-1"
                onClick={() => toggleCollapse(reviewCollapseKey(review.id))}
              >
                {reviewCollapsed ? (
                  <><ChevronDown className="w-3.5 h-3.5" />{totalReplies} {totalReplies === 1 ? "reply" : "replies"}</>
                ) : (
                  <><ChevronUp className="w-3.5 h-3.5" />Hide replies</>
                )}
              </button>
            )}
          </div>
        )}

        {showReplyBox && (
          <div className="flex gap-3 pt-1 items-start">
            <div className="flex-shrink-0 rounded-full bg-slate-100" style={{ width: NESTED_AVATAR, height: NESTED_AVATAR }} />
            <div className="min-w-0 flex-1 space-y-2">
                <Textarea
                  rows={3}
                  className="resize-none text-sm rounded-lg border-slate-200"
                  placeholder="Write a professional response on behalf of your hotel..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={submitting}
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-slate-200 text-xs"
                    onClick={() => { setShowReplyBox(false); setReplyText(""); setActiveReplyParentId(null) }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitting || !replyText.trim()}
                    className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs"
                  >
                    {submitting ? <LoadingSpinner size={14} /> : "Post Reply"}
                  </Button>
                </div>
              </div>
            </div>
        )}

        {/* Action buttons */}
        {!showReplyBox && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 h-8 text-xs ${
                needsReply
                  ? "text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              onClick={() => openReplyBox(null)}
            >
              <MessageSquareReply className="w-3.5 h-3.5" />
              {needsReply
                ? hasBusinessReply
                  ? "Reply to Guest"
                  : "Reply"
                : hasBusinessReply
                  ? "Reply Again"
                  : "Reply"}
            </Button>
          </div>
        )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const dispatch = useAppDispatch()
  const businessId = useAppSelector(selectBusinessId)
  const router = useRouter()
  const logout = () => { dispatch(logoutAction()); storageLogout(); router.push("/login") }
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [ratingFilter, setRatingFilter] = useState("all")
  const [replyFilter, setReplyFilter] = useState("all")  // all | pending | replied
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<{ reviewId: number; commentId: number } | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  const token = () => localStorage.getItem("shettar_auth_token")

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchReviews = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (!businessId) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: "10" })
      if (ratingFilter !== "all") params.set("rating", ratingFilter)

      const res = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/reviews?${params}`,
        { headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" } }
      )

      if (res.status === 401) { logout(); return }

      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews || [])
        setSummary(data.summary || null)
        setPagination(data.pagination || null)
        setPage(pageNum)
      } else {
        toast.error("Failed to load reviews")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [businessId, ratingFilter])

  useEffect(() => { fetchReviews(1) }, [businessId, ratingFilter])

  // ── Reply ──────────────────────────────────────────────────────────────────

  const handleReplySubmit = async (reviewId: number, text: string, parentId?: number | null) => {
    const res = await fetch(
      `${API_URL}/api/v1/user_businesses/${businessId}/reviews/${reviewId}/reply`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reply: text, ...(parentId ? { parent_id: parentId } : {}) }),
      }
    )
    if (res.ok) {
      const data = await res.json()
      setReviews(prev => prev.map(r => r.id === reviewId ? data.review : r))
      if (data.review.admin_reply && !reviews.find(r => r.id === reviewId)?.admin_reply) {
        setSummary(prev => prev ? { ...prev, replied: prev.replied + 1, pending_reply: prev.pending_reply - 1 } : prev)
      }
      toast.success("Reply posted")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || "Failed to post reply")
    }
  }

  const handleCommentUpdate = async (reviewId: number, commentId: number, body: string) => {
    const res = await fetch(
      `${API_URL}/api/v1/user_businesses/${businessId}/reviews/${reviewId}/comments/${commentId}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      }
    )
    if (res.ok) {
      const data = await res.json()
      setReviews(prev => prev.map(r => r.id === reviewId ? data.review : r))
      toast.success("Reply updated")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || "Failed to update reply")
    }
  }

  const handleCommentDelete = async () => {
    if (!deleteCommentTarget) return
    const { reviewId, commentId } = deleteCommentTarget
    const res = await fetch(
      `${API_URL}/api/v1/user_businesses/${businessId}/reviews/${reviewId}/comments/${commentId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } }
    )
    if (res.ok) {
      const data = await res.json()
      setReviews(prev => prev.map(r => r.id === reviewId ? data.review : r))
      toast.success("Reply deleted")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || "Failed to delete reply")
    }
    setDeleteCommentTarget(null)
  }

  // ── Client-side filter (reply status) ────────────────────────────────────

  const filtered = reviews.filter(r => {
    if (replyFilter === "pending") return reviewNeedsBusinessReply(r)
    if (replyFilter === "replied") return !reviewNeedsBusinessReply(r) && reviewThread(r).some((c) => c.author_role === "business")
    return true
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout activeTab="reviews">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden overflow-hidden">
        <div className="flex shrink-0 flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Reviews</h1>
            <p className="text-xs text-slate-500">Read and respond to guest feedback</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReviews(page, true)}
            disabled={refreshing}
            className="h-8 w-full gap-1.5 rounded-lg border-slate-200 text-xs sm:w-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {summary && (
          <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total reviews", value: String(summary.total), icon: MessageSquare },
              { label: "Avg. rating", value: String(summary.average_rating), icon: Star },
              { label: "Replied", value: String(summary.replied), icon: CheckCircle2 },
              { label: "Awaiting reply", value: String(summary.pending_reply), icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/40 px-2.5 py-3 sm:px-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </div>
                <p className="truncate text-2xl font-semibold tabular-nums leading-none tracking-tight text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <Select defaultValue="all" onValueChange={(v) => { setRatingFilter(v); setPage(1) }}>
              <SelectTrigger className="h-8 w-full rounded-lg border-slate-200 text-xs sm:w-[140px]">
                <SelectValue placeholder="All ratings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                {[5, 4, 3, 2, 1].map(r => (
                  <SelectItem key={r} value={String(r)}>
                    <span className="flex items-center gap-1.5">
                      <StarRating rating={r} size={11} />
                      <span>{r} star{r !== 1 ? "s" : ""}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select defaultValue="all" onValueChange={setReplyFilter}>
              <SelectTrigger className="h-8 w-full rounded-lg border-slate-200 text-xs sm:w-[150px]">
                <SelectValue placeholder="Reply status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reviews</SelectItem>
                <SelectItem value="pending">Awaiting reply</SelectItem>
                <SelectItem value="replied">Already replied</SelectItem>
              </SelectContent>
            </Select>

            {pagination && (
              <span className="ml-auto text-xs text-slate-400">
                {pagination.count} review{pagination.count !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <LoadingSpinner size={28} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center text-slate-400">
                <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium text-slate-600">No reviews yet</p>
                <p className="mt-1 text-xs">Reviews from guests will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onReplySubmit={handleReplySubmit}
                    onCommentUpdate={handleCommentUpdate}
                    onCommentDelete={(reviewId, commentId) => setDeleteCommentTarget({ reviewId, commentId })}
                  />
                ))}
              </div>
            )}
          </div>

          {pagination && pagination.last > 1 && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchReviews(page - 1)}
                disabled={page <= 1 || loading}
                className="h-8 gap-1 rounded-lg border-slate-200 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <span className="text-xs text-slate-500">
                Page <span className="font-medium text-slate-800">{page}</span> of{" "}
                <span className="font-medium text-slate-800">{pagination.last}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchReviews(page + 1)}
                disabled={page >= pagination.last || loading}
                className="h-8 gap-1 rounded-lg border-slate-200 text-xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteCommentTarget}
        onOpenChange={(open) => !open && setDeleteCommentTarget(null)}
        title="Delete Reply"
        description="Are you sure you want to delete this reply? Replies can only be removed within 24 hours of posting."
        confirmText="Delete Reply"
        onConfirm={handleCommentDelete}
      />
    </DashboardLayout>
  )
}
