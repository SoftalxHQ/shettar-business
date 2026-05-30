"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ArrowLeft } from "lucide-react"
import {
  fetchAdCampaign,
  fetchBusinessLocations,
  updateAdCampaign,
  type AdCampaign,
  type AdGeoTarget,
  type BusinessLocation,
} from "@/lib/ads-api"
import { toast } from "sonner"

const PLACEMENTS = [
  { id: "homepage_featured", label: "Homepage featured", help: "Carousel on the app home screen before a user searches." },
  { id: "search_results", label: "Search results", help: "Up to 2 sponsored listings at the top of search when your hotel has availability for the guest's dates." },
  { id: "category_page", label: "Category page", help: "Shown on category browsing pages." },
]

const EDITABLE_STATUSES = new Set(["active", "paused", "pending_review", "draft"])

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>
}

function geoToForm(targetGeo?: AdGeoTarget[]) {
  if (!targetGeo?.length) {
    return { targetingMode: "nationwide" as const, state: "", city: "" }
  }
  const first = targetGeo[0]
  return {
    targetingMode: "specific" as const,
    state: first.state || "",
    city: first.city || "",
  }
}

function AdCampaignEditContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("id") || ""
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const [campaign, setCampaign] = useState<AdCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locations, setLocations] = useState<BusinessLocation[]>([])
  const [form, setForm] = useState({
    name: "",
    daily_budget: "",
    total_budget: "",
    max_bid: "",
    placements: [] as string[],
    targetingMode: "nationwide" as "nationwide" | "specific",
    state: "",
    city: "",
  })

  const canManage = user?.role === "admin" || user?.permissions?.ads?.manage

  useEffect(() => {
    fetchBusinessLocations()
      .then(setLocations)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!businessId || !campaignId) return
    setLoading(true)
    fetchAdCampaign(businessId, campaignId)
      .then((c) => {
        setCampaign(c)
        const geo = geoToForm(c.target_geo)
        setForm({
          name: c.name,
          daily_budget: c.daily_budget != null ? String(c.daily_budget) : "",
          total_budget: c.total_budget != null ? String(c.total_budget) : "",
          max_bid: c.max_bid ? String(c.max_bid) : "",
          placements: c.placements?.length ? [...c.placements] : ["homepage_featured"],
          targetingMode: geo.targetingMode,
          state: geo.state,
          city: geo.city,
        })
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [businessId, campaignId])

  const states = useMemo(
    () => Array.from(new Set(locations.map((l) => l.state))).sort(),
    [locations]
  )

  const cities = useMemo(
    () =>
      locations
        .filter((l) => !form.state || l.state === form.state)
        .map((l) => l.city)
        .sort(),
    [locations, form.state]
  )

  const minTotalBudget = campaign?.spent_amount ?? 0

  const togglePlacement = (id: string) => {
    setForm((f) => ({
      ...f,
      placements: f.placements.includes(id)
        ? f.placements.filter((p) => p !== id)
        : [...f.placements, id],
    }))
  }

  const buildTargetGeo = (): AdGeoTarget[] => {
    if (form.targetingMode === "nationwide") return []
    const entry: AdGeoTarget = { country: "Nigeria" }
    if (form.state) entry.state = form.state
    if (form.city) entry.city = form.city
    return [entry]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !campaignId) return

    const totalBudget = form.total_budget ? parseFloat(form.total_budget) : undefined
    if (totalBudget != null && totalBudget < minTotalBudget) {
      toast.error(`Total budget must be at least ₦${minTotalBudget.toLocaleString()} (already spent)`)
      return
    }

    setSaving(true)
    try {
      const updated = await updateAdCampaign(businessId, campaignId, {
        name: form.name,
        daily_budget: form.daily_budget ? parseFloat(form.daily_budget) : null,
        total_budget: totalBudget ?? null,
        max_bid: form.max_bid ? parseFloat(form.max_bid) : 0,
        placements: form.placements,
        target_geo: buildTargetGeo(),
      })
      toast.success("Campaign updated")
      router.push(`/dashboard/ads/campaigns/detail?id=${updated.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update campaign")
    } finally {
      setSaving(false)
    }
  }

  if (!canManage) {
    return (
      <DashboardLayout activeTab="ads">
        <p className="text-muted-foreground">You do not have permission to edit campaigns.</p>
      </DashboardLayout>
    )
  }

  if (!campaignId) {
    return (
      <DashboardLayout activeTab="ads">
        <p className="text-muted-foreground">Campaign not found.</p>
      </DashboardLayout>
    )
  }

  if (loading || !campaign) {
    return (
      <DashboardLayout activeTab="ads">
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return (
      <DashboardLayout activeTab="ads">
        <div className="space-y-4 max-w-xl">
          <Button asChild variant="ghost" className="gap-2 px-0">
            <Link href={`/dashboard/ads/campaigns/detail?id=${campaignId}`}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <p className="text-muted-foreground">
            This campaign cannot be edited while it is {campaign.status.replace(/_/g, " ")}.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="ads">
      <div className="max-w-xl space-y-4">
        <Button asChild variant="ghost" className="gap-2 px-0">
          <Link href={`/dashboard/ads/campaigns/detail?id=${campaignId}`}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit campaign</CardTitle>
            <CardDescription>
              Adjust budgets, bidding, placements, or geo targeting. Status:{" "}
              <span className="capitalize">{campaign.status.replace(/_/g, " ")}</span>
              {" · "}Spent ₦{campaign.spent_amount.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(campaign.status === "paused" || campaign.status === "active") && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                {campaign.status === "paused" ? (
                  <>
                    Campaign is paused. Increase total or daily budget if limits were reached, then activate
                    again from the detail page.
                  </>
                ) : (
                  <>
                    Daily budget caps stop delivery for the rest of the day without pausing the campaign.
                    Increase daily budget to resume serving today.
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name">Campaign name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="daily_budget">Daily budget (₦)</Label>
                  <Input
                    id="daily_budget"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.daily_budget}
                    onChange={(e) => setForm({ ...form, daily_budget: e.target.value })}
                  />
                  <FieldHelp>Maximum spend per day. Leave empty for no daily cap.</FieldHelp>
                </div>
                <div>
                  <Label htmlFor="total_budget">Total budget (₦)</Label>
                  <Input
                    id="total_budget"
                    type="number"
                    min={minTotalBudget}
                    step="0.01"
                    value={form.total_budget}
                    onChange={(e) => setForm({ ...form, total_budget: e.target.value })}
                  />
                  <FieldHelp>
                    Minimum ₦{minTotalBudget.toLocaleString()} based on spend so far. Leave empty for no
                    lifetime cap.
                  </FieldHelp>
                </div>
              </div>

              <div>
                <Label htmlFor="max_bid">Max CPM bid (₦ per 1,000 impressions)</Label>
                <Input
                  id="max_bid"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_bid}
                  onChange={(e) => setForm({ ...form, max_bid: e.target.value })}
                />
              </div>

              <div>
                <Label>Placements</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PLACEMENTS.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      size="sm"
                      variant={form.placements.includes(p.id) ? "default" : "outline"}
                      onClick={() => togglePlacement(p.id)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <Label>Geo targeting</Label>
                  <FieldHelp>Nationwide or a specific state/city in Nigeria.</FieldHelp>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={form.targetingMode === "nationwide" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, targetingMode: "nationwide", state: "", city: "" })}
                  >
                    Nationwide
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={form.targetingMode === "specific" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, targetingMode: "specific" })}
                  >
                    Specific area
                  </Button>
                </div>
                {form.targetingMode === "specific" && (
                  <div className="grid gap-3">
                    <div>
                      <Label>Country</Label>
                      <Input value="Nigeria" readOnly disabled />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <select
                        id="state"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value, city: "" })}
                      >
                        <option value="">All states</option>
                        {states.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="city">City / town</Label>
                      <select
                        id="city"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={form.city}
                        disabled={!form.state}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      >
                        <option value="">All cities in state</option>
                        {cities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={saving || form.placements.length === 0} className="w-full">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default function EditAdCampaignPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout activeTab="ads">
          <div className="flex justify-center py-12">
            <LoadingSpinner size={32} />
          </div>
        </DashboardLayout>
      }
    >
      <AdCampaignEditContent />
    </Suspense>
  )
}
