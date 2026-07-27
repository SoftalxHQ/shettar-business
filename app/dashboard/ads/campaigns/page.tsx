"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchAdCampaigns, formatGeoTargets, type AdCampaign } from "@/lib/ads-api"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

export default function AdsCampaignsPage() {
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [loading, setLoading] = useState(true)

  const canView = user?.role === "admin" || user?.permissions?.ads?.view || user?.permissions?.ads?.manage
  const canManage = user?.role === "admin" || user?.permissions?.ads?.manage

  useEffect(() => {
    if (!businessId || !canView) return
    fetchAdCampaigns(businessId)
      .then(setCampaigns)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [businessId, canView])

  if (loading) {
    return (
      <DashboardLayout activeTab="ads">
        <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="ads">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 mb-1 gap-1.5 px-2 text-xs text-slate-500">
              <Link href="/dashboard/ads">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Link>
            </Button>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Campaigns</h1>
            <p className="text-xs text-slate-500">{campaigns.length} total</p>
          </div>
          {canManage && (
            <Button asChild size="sm" className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs">
              <Link href="/dashboard/ads/campaigns/new">New campaign</Link>
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          {campaigns.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-xs text-slate-500">No campaigns yet.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50 [&_tr]:border-slate-200">
                  <TableRow className="hover:bg-slate-50">
                    <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Campaign</TableHead>
                    <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
                    <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Spent</TableHead>
                    <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Geo</TableHead>
                    <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Placements</TableHead>
                    <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/60">
                      <TableCell className="px-3 py-2.5 text-sm font-medium text-slate-900">{c.name}</TableCell>
                      <TableCell className="px-3 py-2.5 text-xs text-slate-600 capitalize">{c.status.replace("_", " ")}</TableCell>
                      <TableCell className="px-3 py-2.5 text-xs tabular-nums text-slate-700">₦{c.spent_amount.toLocaleString()}</TableCell>
                      <TableCell className="px-3 py-2.5 text-xs text-slate-600">{formatGeoTargets(c.target_geo)}</TableCell>
                      <TableCell className="px-3 py-2.5 text-xs text-slate-600">{c.placements.join(", ")}</TableCell>
                      <TableCell className="px-3 py-2.5 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                          <Link href={`/dashboard/ads/campaigns/detail?id=${c.id}`}>Details</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
