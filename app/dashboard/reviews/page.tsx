"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  RefreshCw, MessageSquare, CheckCircle2, Clock, BarChart3,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatDistanceToNow, format } from "date-fns"

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Review Card ─────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  onReplySubmit,
  onReplyDelete,
}: {
  review: Review
  onReplySubmit: (id: number, text: string) => Promise<void>
  onReplyDelete: (id: number) => void
}) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [replyText, setReplyText] = useState(review.admin_reply || "")
  const [submitting, setSubmitting] = useState(false)
  const isEditing = !!review.admin_reply

  const handleSubmit = async () => {
    if (!replyText.trim()) { toast.error("Reply cannot be blank"); return }
    setSubmitting(true)
    await onReplySubmit(review.id, replyText.trim())
    setSubmitting(false)
    setShowReplyBox(false)
  }

  const displayName = review.account?.display_name || review.reviewer_name || "Guest"
  const avatarInitials = initials(displayName)

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-4">
        {/* ── Guest row ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">
                {avatarInitials}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 text-sm">{displayName}</p>
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
          <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold
            ${review.rating >= 4 ? "bg-emerald-100 text-emerald-700"
              : review.rating === 3 ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"}`}>
            {review.rating}
          </div>
        </div>

        {/* Review content */}
        <p className="text-sm text-slate-600 leading-relaxed">{review.content}</p>

        {/* Existing admin reply */}
        {review.admin_reply && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-700">
                  {review.admin_reply_by || "Management"}
                </span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-indigo-200 text-indigo-600 bg-indigo-50">
                  Admin
                </Badge>
              </div>
              {review.admin_replied_at && (
                <span className="text-[10px] text-indigo-400 ml-auto">
                  {formatDistanceToNow(new Date(review.admin_replied_at), { addSuffix: true })}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{review.admin_reply}</p>
          </div>
        )}

        {/* Reply textarea (shown when toggled) */}
        {showReplyBox && (
          <div className="space-y-2 pt-1">
            <Textarea
              rows={3}
              className="resize-none text-sm"
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
                onClick={() => { setShowReplyBox(false); setReplyText(review.admin_reply || "") }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !replyText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {submitting ? <LoadingSpinner size={14} /> : (isEditing ? "Update Reply" : "Post Reply")}
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showReplyBox && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1.5 h-8 text-xs"
              onClick={() => { setReplyText(review.admin_reply || ""); setShowReplyBox(true) }}
            >
              <MessageSquareReply className="w-3.5 h-3.5" />
              {review.admin_reply ? "Edit Reply" : "Reply"}
            </Button>

            {review.admin_reply && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 h-8 text-xs ml-auto"
                onClick={() => onReplyDelete(review.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Reply
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
  const [deleteReplyId, setDeleteReplyId] = useState<number | null>(null)

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

      if (res.status === 401) { logout(true); return }

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

  const handleReplySubmit = async (reviewId: number, text: string) => {
    const res = await fetch(
      `${API_URL}/api/v1/user_businesses/${businessId}/reviews/${reviewId}/reply`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reply: text }),
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

  // ── Delete reply ───────────────────────────────────────────────────────────

  const handleDeleteReply = async () => {
    if (!deleteReplyId) return
    const res = await fetch(
      `${API_URL}/api/v1/user_businesses/${businessId}/reviews/${deleteReplyId}/reply`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } }
    )
    if (res.ok) {
      const data = await res.json()
      setReviews(prev => prev.map(r => r.id === deleteReplyId ? data.review : r))
      setSummary(prev => prev ? { ...prev, replied: prev.replied - 1, pending_reply: prev.pending_reply + 1 } : prev)
      toast.success("Reply removed")
    } else {
      toast.error("Failed to remove reply")
    }
    setDeleteReplyId(null)
  }

  // ── Client-side filter (reply status) ────────────────────────────────────

  const filtered = reviews.filter(r => {
    if (replyFilter === "pending") return !r.admin_reply
    if (replyFilter === "replied") return !!r.admin_reply
    return true
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout activeTab="reviews">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
              Guest Reviews
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Read and respond to reviews from your guests
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReviews(page, true)}
            disabled={refreshing}
            className="h-9 gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Reviews", value: summary.total,
                icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-50",
              },
              {
                label: "Avg. Rating",
                value: (
                  <span className="flex items-center gap-1">
                    {summary.average_rating}
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </span>
                ),
                icon: BarChart3, color: "text-amber-600", bg: "bg-amber-50",
              },
              {
                label: "Replied", value: summary.replied,
                icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50",
              },
              {
                label: "Awaiting Reply", value: summary.pending_reply,
                icon: Clock, color: "text-orange-600", bg: "bg-orange-50",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select defaultValue="all" onValueChange={(v) => { setRatingFilter(v); setPage(1) }}>
            <SelectTrigger className="w-38 h-9 text-sm">
              <SelectValue placeholder="All ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
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
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Reply status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviews</SelectItem>
              <SelectItem value="pending">Awaiting Reply</SelectItem>
              <SelectItem value="replied">Already Replied</SelectItem>
            </SelectContent>
          </Select>

          {pagination && (
            <span className="text-sm text-slate-400 ml-auto">
              {pagination.count} review{pagination.count !== 1 ? "s" : ""} total
            </span>
          )}
        </div>

        {/* Reviews list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner size={36} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No reviews yet</h3>
            <p className="text-sm text-slate-500">Reviews from guests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                onReplySubmit={handleReplySubmit}
                onReplyDelete={(id) => setDeleteReplyId(id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.last > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              variant="outline" size="sm"
              onClick={() => fetchReviews(page - 1)}
              disabled={page <= 1 || loading}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-800">{page}</span> of{" "}
              <span className="font-semibold text-slate-800">{pagination.last}</span>
            </span>
            <Button
              variant="outline" size="sm"
              onClick={() => fetchReviews(page + 1)}
              disabled={page >= pagination.last || loading}
              className="gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete reply confirm */}
      <ConfirmDialog
        open={!!deleteReplyId}
        onOpenChange={(open) => !open && setDeleteReplyId(null)}
        title="Remove Reply"
        description="Are you sure you want to remove the admin reply to this review?"
        confirmText="Remove Reply"
        onConfirm={handleDeleteReply}
      />
    </DashboardLayout>
  )
}
