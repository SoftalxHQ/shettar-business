"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { createAdCampaign, fetchBusinessLocations, type AdGeoTarget, type BusinessLocation } from "@/lib/ads-api"
import { toast } from "sonner"

const PLACEMENTS = [
  { id: "homepage_featured", label: "Homepage featured", help: "Carousel on the app home screen before a user searches." },
  { id: "search_results", label: "Search results", help: "Blended into hotel search results when travelers search a destination." },
  { id: "category_page", label: "Category page", help: "Shown on category browsing pages." },
]

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>
}

export default function NewAdCampaignPage() {
  const router = useRouter()
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<BusinessLocation[]>([])
  const [form, setForm] = useState({
    name: "",
    daily_budget: "",
    total_budget: "",
    max_bid: "",
    placements: ["homepage_featured"] as string[],
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

  if (!canManage) {
    return (
      <DashboardLayout activeTab="ads">
        <p className="text-muted-foreground">You do not have permission to create campaigns.</p>
      </DashboardLayout>
    )
  }

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
    if (!businessId) return
    setLoading(true)
    try {
      const campaign = await createAdCampaign(businessId, {
        name: form.name,
        billing_model: "cpm",
        daily_budget: form.daily_budget ? parseFloat(form.daily_budget) : undefined,
        total_budget: form.total_budget ? parseFloat(form.total_budget) : undefined,
        max_bid: form.max_bid ? parseFloat(form.max_bid) : undefined,
        placements: form.placements,
        target_geo: buildTargetGeo(),
        starts_at: new Date().toISOString(),
      })
      toast.success("Campaign created")
      router.push(`/dashboard/ads/campaigns/detail?id=${campaign.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout activeTab="ads">
      <div className="max-w-xl space-y-4">
        <Button asChild variant="ghost" className="gap-2 px-0">
          <Link href="/dashboard/ads/campaigns">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create campaign</CardTitle>
            <CardDescription>
              Ads are shown based on where customers want to stay — their search destination or past
              bookings — not necessarily where their phone is located.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name">Campaign name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <FieldHelp>Internal label for your reports and campaign list.</FieldHelp>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="daily_budget">Daily budget (₦)</Label>
                  <Input
                    id="daily_budget"
                    type="number"
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
                    value={form.total_budget}
                    onChange={(e) => setForm({ ...form, total_budget: e.target.value })}
                  />
                  <FieldHelp>Total lifetime cap for this campaign.</FieldHelp>
                </div>
              </div>

              <div>
                <Label htmlFor="max_bid">Max CPM bid (₦ per 1,000 impressions)</Label>
                <Input
                  id="max_bid"
                  type="number"
                  value={form.max_bid}
                  onChange={(e) => setForm({ ...form, max_bid: e.target.value })}
                />
                <FieldHelp>Higher bids win more ad slots when competing for the same audience.</FieldHelp>
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
                <FieldHelp>
                  {PLACEMENTS.filter((p) => form.placements.includes(p.id))
                    .map((p) => p.help)
                    .join(" ")}
                </FieldHelp>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <Label>Geo targeting</Label>
                  <FieldHelp>
                    Nationwide shows your ad to travelers interested anywhere in Nigeria. Specific area
                    narrows delivery to a state or city.
                  </FieldHelp>
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
                      <FieldHelp>Optional. Leave empty to target the entire state.</FieldHelp>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating…" : "Create campaign"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
