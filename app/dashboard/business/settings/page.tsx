"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Building2, ImageIcon, Upload, X, Loader2, Save, MapPin, Clock, Check, ArrowRight, LocateFixed, UserPlus, UtensilsCrossed, Megaphone, Plus, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { BusinessVerificationBadge } from "@/components/business-verification-badge"
import { getDeviceLocation } from "@/lib/tauri"
import type { VerificationDisplayStatus } from "@/lib/business-verification"
import {
  canAccessBusinessSettings,
  canCreateGuestPolicies,
  canDeleteGuestPolicies,
  canEditAmenities,
  canEditBranding,
  canEditBusinessDetails,
  canEditGuestPolicies,
  canViewGuestPolicies,
  canWriteGuestPolicies,
} from "@/lib/guest-policies-access"

interface BusinessData {
  id: number
  name: string
  description: string
  address: string
  city: string
  state: string
  zip_code: string
  check_in: string
  check_out: string
  business_unique_id: string
  logo_url?: string
  images_url?: string[]
  images?: { id: number, url: string }[]
  // Amenities
  swimming_pool?: boolean
  gym?: boolean
  wifi?: boolean
  spa?: boolean
  restaurant?: boolean
  parking?: boolean
  breakfast?: boolean
  bar?: boolean
  laundry?: boolean
  pet_friendly?: boolean
  ac?: boolean
  heating?: boolean
  tv?: boolean
  minibar?: boolean
  garden?: boolean
  conference_facilities?: boolean
  business_center?: boolean
  fitness_center?: boolean
  airport_transportation?: boolean
  room_service?: boolean
  children_activities?: boolean
  beach_access?: boolean
  handicap_accessible?: boolean
  bicycle_rental?: boolean
  car_rental?: boolean
  shuttle_service?: boolean
  latitude?: string
  longitude?: string
  referrer_locked?: boolean
  marketer_referrer_code?: string | null
  created_at?: string
  verification_display_status?: VerificationDisplayStatus
  verification_status?: string
  verification_notes?: string | null
  can_request_verification?: boolean
  restaurant_enabled?: boolean
  guest_notices?: string[]
  policy_highlights?: { kind: "allow" | "deny"; text: string }[]
  policy_bullets?: string[]
  policy_footer?: string | null
}

type PolicyHighlight = { kind: "allow" | "deny"; text: string }

const REFERRER_WINDOW_DAYS = 7

function isWithinReferrerWindow(createdAt: string | undefined): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return false
  const deadline = new Date(created)
  deadline.setDate(deadline.getDate() + REFERRER_WINDOW_DAYS)
  return Date.now() <= deadline.getTime()
}

export default function BusinessSettingsPage() {
  const { user, businessId, logout, updateUser } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [businessData, setBusinessData] = useState<BusinessData | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [removeLogo, setRemoveLogo] = useState(false)
  const [removeImages, setRemoveImages] = useState(false)
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([])
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [referrerCode, setReferrerCode] = useState("")
  const [settingsTab, setSettingsTab] = useState("general")

  useEffect(() => {
    if (user && !canAccessBusinessSettings(user)) {
      router.push("/dashboard")
    }
  }, [user, router])

  // Fetch business data
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!businessId) return

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const token = localStorage.getItem("shettar_auth_token")

        const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          setBusinessData({
            ...data,
            guest_notices: Array.isArray(data.guest_notices) ? data.guest_notices : [],
            policy_highlights: Array.isArray(data.policy_highlights)
              ? data.policy_highlights.map((h: PolicyHighlight & { kind?: string }) => ({
                  kind: (h.kind === "deny" ? "deny" : "allow") as "allow" | "deny",
                  text: h.text || "",
                }))
              : [],
            policy_bullets: Array.isArray(data.policy_bullets) ? data.policy_bullets : [],
            policy_footer: data.policy_footer || "",
          })
          updateUser({ restaurantEnabled: !!data.restaurant_enabled })
          if (data.logo_url) {
            setLogoPreview(data.logo_url)
          }
          if (data.images_url) {
            setImagePreviews(data.images_url)
          }
          setDeletedImageIds([]) // Reset deleted IDs on load
        } else {
          if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}))
            if (errorData.errors?.[0]?.id === 'expiration' || errorData.message === 'Signature has expired') {
              logout(true)
              return
            }
          }
          toast.error("Failed to load business data")
        }
      } catch (error) {
        console.error("Error fetching business data:", error)
        toast.error("Unable to load business data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusinessData()
  }, [businessId])

  const getCurrentLocation = async () => {
    setIsGettingLocation(true)

    const result = await getDeviceLocation()

    if (result.ok) {
      if (businessData) {
        setBusinessData({
          ...businessData,
          latitude: result.latitude.toFixed(6),
          longitude: result.longitude.toFixed(6),
        })
      }
      toast.success("Location captured successfully!")
    } else {
      const message =
        result.reason === 'unsupported'
          ? "Geolocation is not supported on this device."
          : result.reason === 'denied'
            ? "Location access was denied. Allow location for Shettar Business in system settings, then try again."
            : result.reason === 'timeout'
              ? "Location request timed out. Please try again."
              : result.reason === 'unavailable'
                ? "Location is unavailable right now. Check that location services are enabled."
                : "Unable to retrieve your location. Please check your permissions."

      toast.error(message)
    }

    setIsGettingLocation(false)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setRemoveLogo(false)
    }
  }

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setImageFiles((prev) => [...prev, ...files])

      files.forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
      setRemoveImages(false)
    }
  }

  const removeLogoPreview = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(true)
  }

  const removeImagePreview = (index: number) => {
    const previewToRemove = imagePreviews[index]
    const isNewImage = previewToRemove.startsWith('data:') || previewToRemove.startsWith('blob:')

    if (isNewImage) {
      // Find the relative index in imageFiles
      const newImagesBefore = imagePreviews.slice(0, index).filter(p => p.startsWith('data:') || p.startsWith('blob:')).length
      setImageFiles((prev) => prev.filter((_, i) => i !== newImagesBefore))
    } else {
      // It's an existing image. Find its ID from the businessData
      const existingImage = businessData?.images?.find(img => img.url === previewToRemove)
      if (existingImage) {
        setDeletedImageIds(prev => [...prev, existingImage.id])
      }
    }

    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("shettar_auth_token")

      const formData = new FormData()
      const editDetails = canEditBusinessDetails(user)
      const writeGuestPolicies = canWriteGuestPolicies(user)
      const editBranding = canEditBranding(user)
      const editAmenities = canEditAmenities(user)

      if (!editDetails && !writeGuestPolicies && !editBranding && !editAmenities) {
        toast.error("You don't have permission to save changes")
        setIsSaving(false)
        return
      }

      if (businessData) {
        if (editDetails) {
          formData.append("business[name]", businessData.name)
          formData.append("business[description]", businessData.description)
          formData.append("business[address]", businessData.address)
          formData.append("business[city]", businessData.city)
          formData.append("business[state]", businessData.state)
          formData.append("business[zip_code]", businessData.zip_code)
          formData.append("business[check_in]", businessData.check_in)
          formData.append("business[check_out]", businessData.check_out)
          if (businessData.latitude) formData.append("business[latitude]", businessData.latitude)
          if (businessData.longitude) formData.append("business[longitude]", businessData.longitude)

          if (
            referrerCode.trim() &&
            !businessData.marketer_referrer_code &&
            isWithinReferrerWindow(businessData.created_at)
          ) {
            formData.append("business[referrer_code]", referrerCode.trim())
          }

          formData.append("business[restaurant_enabled]", String(!!businessData.restaurant_enabled))
        }

        if (editAmenities) {
          const amenities = [
            'swimming_pool', 'gym', 'wifi', 'spa', 'restaurant', 'parking', 'breakfast',
            'bar', 'laundry', 'pet_friendly', 'ac', 'heating', 'tv', 'minibar', 'garden',
            'conference_facilities', 'business_center', 'fitness_center',
            'airport_transportation', 'room_service', 'children_activities', 'beach_access',
            'handicap_accessible', 'bicycle_rental', 'car_rental', 'shuttle_service'
          ]

          amenities.forEach(amenity => {
            formData.append(`business[${amenity}]`, String(businessData[amenity as keyof BusinessData] || false))
          })
        }

        if (writeGuestPolicies) {
          ;(businessData.guest_notices || []).forEach((notice) => {
            if (notice.trim()) formData.append("business[guest_notices][]", notice.trim())
          })
          ;(businessData.policy_highlights || []).forEach((h) => {
            if (h.text.trim()) {
              formData.append("business[policy_highlights][][kind]", h.kind)
              formData.append("business[policy_highlights][][text]", h.text.trim())
            }
          })
          ;(businessData.policy_bullets || []).forEach((bullet) => {
            if (bullet.trim()) formData.append("business[policy_bullets][]", bullet.trim())
          })
          if (businessData.policy_footer?.trim()) {
            formData.append("business[policy_footer]", businessData.policy_footer.trim())
          }
        }
      }

      if (editBranding) {
        if (logoFile) {
          formData.append("business[logo]", logoFile)
        } else if (removeLogo) {
          formData.append("business[remove_logo]", "true")
        }

        if (imageFiles.length > 0) {
          imageFiles.forEach((file) => {
            formData.append("business[images][]", file)
          })
        }

        if (deletedImageIds.length > 0) {
          deletedImageIds.forEach(id => {
            formData.append("business[delete_image_ids][]", id.toString())
          })
        }

        if (removeImages) {
          formData.append("business[remove_images]", "true")
        }
      }

      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Business settings updated successfully!", {
          description: "Your changes have been saved.",
        })

        // Update local state with new data
        setBusinessData(data.business)
        updateUser({ restaurantEnabled: !!data.business.restaurant_enabled })
        if (data.business.logo_url) {
          setLogoPreview(data.business.logo_url)
        }
        if (data.business.images_url) {
          setImagePreviews(data.business.images_url)
        }

        // Clear file inputs and tracking
        setLogoFile(null)
        setImageFiles([])
        setDeletedImageIds([])
        setRemoveLogo(false)
        setRemoveImages(false)
        setReferrerCode("")
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.errors?.[0]?.id === 'expiration' || errorData.message === 'Signature has expired') {
            logout(true)
            return
          }
        }
        const errMsg = Array.isArray(data.error)
          ? data.error[0]?.message
          : (typeof data.error === "string" ? data.error : data.error?.message)
        toast.error("Failed to update business settings", {
          description: errMsg || "Please try again",
        })
      }
    } catch (error) {
      console.error("Error updating business:", error)
      toast.error("Unable to update business settings", {
        description: "Please check your connection and try again",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!user || !canAccessBusinessSettings(user)) {
    return null
  }

  const editDetails = canEditBusinessDetails(user)
  const editBranding = canEditBranding(user)
  const editAmenities = canEditAmenities(user)
  const viewGuestPolicies = canViewGuestPolicies(user)
  const writeGuestPolicies = canWriteGuestPolicies(user)
  const canCreateGuest = canCreateGuestPolicies(user)
  const canEditGuest = canEditGuestPolicies(user)
  const canDeleteGuest = canDeleteGuestPolicies(user)
  const guestPoliciesReadOnly = viewGuestPolicies && !writeGuestPolicies

  if (isLoading) {
    return (
      <DashboardLayout activeTab="settings">
        <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!businessData) {
    return (
      <DashboardLayout activeTab="settings">
        <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <p className="text-sm text-slate-500">Business data not found</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const hasReferrer = Boolean(businessData.marketer_referrer_code)
  const canEnterReferrer =
    !hasReferrer &&
    !businessData.referrer_locked &&
    isWithinReferrerWindow(businessData.created_at)

  return (
    <DashboardLayout activeTab="settings">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Business Settings</h1>
              {businessData.verification_display_status && (
                <BusinessVerificationBadge status={businessData.verification_display_status} />
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {editDetails
                ? "Manage your business information, branding, and amenities"
                : "Manage guest notices and hotel policies shown on your public listing"}
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Business ID</span>
            <code className="mt-0.5 block font-mono text-xs text-slate-700">
              {businessData.business_unique_id}
            </code>
          </div>
        </div>

        <form className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" onSubmit={handleSubmit}>
          <Tabs
            value={settingsTab}
            onValueChange={setSettingsTab}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
          >
            <TabsList
              className={cn(
                "h-8 w-fit shrink-0 rounded-xl border border-slate-200 bg-slate-50/40 p-0.5 grid",
                1 + (editBranding ? 1 : 0) + (editAmenities ? 1 : 0) === 3
                  ? "grid-cols-3"
                  : 1 + (editBranding ? 1 : 0) + (editAmenities ? 1 : 0) === 2
                    ? "grid-cols-2"
                    : "grid-cols-1"
              )}
            >
              <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
              {editBranding && <TabsTrigger value="branding" className="text-xs">Branding</TabsTrigger>}
              {editAmenities && <TabsTrigger value="amenities" className="text-xs">Amenities</TabsTrigger>}
            </TabsList>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {/* General Information Tab — plain panels (not TabsContent) to avoid default flex-1 stretch */}
            {settingsTab === "general" && (
            <div className="space-y-3">
              {editDetails && (
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Building2 className="h-4 w-4" />
                    Basic Information
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Update your business name and description</p>
                </div>
                <div className="space-y-3 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs text-slate-600">Business Name *</Label>
                      <Input
                        id="name"
                        value={businessData.name}
                        onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                        required
                        placeholder="Enter business name"
                        className="h-9 rounded-lg border-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="category" className="text-xs text-slate-600">Category</Label>
                      <Input
                        id="category"
                        value="Hotel"
                        disabled
                        className="h-9 rounded-lg border-slate-200 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-xs text-slate-600">Description *</Label>
                    <Textarea
                      id="description"
                      value={businessData.description}
                      onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                      required
                      rows={4}
                      placeholder="Describe your business"
                      className="rounded-lg border-slate-200"
                    />
                  </div>
                </div>
              </div>
              )}

              {viewGuestPolicies && (
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Megaphone className="h-4 w-4" />
                    Guest notices &amp; policies
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Shown on your public hotel page. Multiple notices rotate in a slider for guests.
                    {editDetails
                      ? " Check-in and check-out times use the fields in the Location & hours section."
                      : " Check-in and check-out times are managed by admins with business details access."}
                    {guestPoliciesReadOnly && (
                      <span className="mt-1 block text-amber-600">You have view-only access. Ask an admin to grant create, edit, or delete permissions.</span>
                    )}
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Guest notices</Label>
                    {(businessData?.guest_notices || []).map((notice, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Textarea
                          value={notice}
                          rows={2}
                          disabled={!canEditGuest && !canCreateGuest}
                          placeholder="e.g. Please follow all health and safety guidelines during your stay."
                          className="rounded-lg border-slate-200"
                          onChange={(e) => {
                            const next = [...(businessData?.guest_notices || [])]
                            next[idx] = e.target.value
                            setBusinessData({ ...businessData!, guest_notices: next })
                          }}
                        />
                        {canDeleteGuest && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-lg border-slate-200"
                          onClick={() => {
                            const next = (businessData?.guest_notices || []).filter((_, i) => i !== idx)
                            setBusinessData({ ...businessData!, guest_notices: next })
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                    ))}
                    {canCreateGuest && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg border-slate-200 text-xs"
                      onClick={() =>
                        setBusinessData({
                          ...businessData!,
                          guest_notices: [...(businessData?.guest_notices || []), ""],
                        })
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add notice
                    </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Policy highlights</Label>
                    <p className="text-[11px] text-slate-500">
                      Green = allowed / required. Red = not allowed.
                    </p>
                    {(businessData?.policy_highlights || []).map((row, idx) => (
                      <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                        <Select
                          value={row.kind}
                          disabled={!canEditGuest}
                          onValueChange={(v: "allow" | "deny") => {
                            const next = [...(businessData?.policy_highlights || [])]
                            next[idx] = { ...next[idx], kind: v }
                            setBusinessData({ ...businessData!, policy_highlights: next })
                          }}
                        >
                          <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 sm:w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="allow">Allowed</SelectItem>
                            <SelectItem value="deny">Not allowed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          className="h-9 flex-1 rounded-lg border-slate-200"
                          value={row.text}
                          disabled={!canEditGuest}
                          placeholder="Policy statement"
                          onChange={(e) => {
                            const next = [...(businessData?.policy_highlights || [])]
                            next[idx] = { ...next[idx], text: e.target.value }
                            setBusinessData({ ...businessData!, policy_highlights: next })
                          }}
                        />
                        {canDeleteGuest && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-lg border-slate-200"
                          onClick={() => {
                            const next = (businessData?.policy_highlights || []).filter((_, i) => i !== idx)
                            setBusinessData({ ...businessData!, policy_highlights: next })
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                    ))}
                    {canCreateGuest && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg border-slate-200 text-xs"
                      onClick={() =>
                        setBusinessData({
                          ...businessData!,
                          policy_highlights: [
                            ...(businessData?.policy_highlights || []),
                            { kind: "allow", text: "" },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add highlight
                    </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Additional policy lines</Label>
                    {(businessData?.policy_bullets || []).map((bullet, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={bullet}
                          disabled={!canEditGuest}
                          placeholder="e.g. No pets"
                          className="h-9 rounded-lg border-slate-200"
                          onChange={(e) => {
                            const next = [...(businessData?.policy_bullets || [])]
                            next[idx] = e.target.value
                            setBusinessData({ ...businessData!, policy_bullets: next })
                          }}
                        />
                        {canDeleteGuest && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-lg border-slate-200"
                          onClick={() => {
                            const next = (businessData?.policy_bullets || []).filter((_, i) => i !== idx)
                            setBusinessData({ ...businessData!, policy_bullets: next })
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                    ))}
                    {canCreateGuest && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg border-slate-200 text-xs"
                      onClick={() =>
                        setBusinessData({
                          ...businessData!,
                          policy_bullets: [...(businessData?.policy_bullets || []), ""],
                        })
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add policy line
                    </Button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="policy_footer" className="text-xs text-slate-600">Footer disclaimer</Label>
                    <Textarea
                      id="policy_footer"
                      rows={2}
                      disabled={!canEditGuest}
                      value={businessData?.policy_footer || ""}
                      placeholder="The hotel reserves the right of admission..."
                      className="rounded-lg border-slate-200"
                      onChange={(e) =>
                        setBusinessData({ ...businessData!, policy_footer: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              )}

              {editDetails && (
              <>
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <UtensilsCrossed className="h-4 w-4" />
                    Restaurant operations
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Enable menu, order taking, and kitchen display for your on-site restaurant. This is separate from the
                    &quot;Restaurant&quot; amenity shown to guests when browsing hotels.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 p-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-slate-900">Enable restaurant &amp; kitchen module</p>
                    <p className="text-[11px] text-slate-500">
                      Staff with restaurant permissions can manage the menu and kitchen workflow.
                    </p>
                  </div>
                  <Switch
                    checked={!!businessData.restaurant_enabled}
                    onCheckedChange={(checked) =>
                      setBusinessData({ ...businessData, restaurant_enabled: checked })
                    }
                  />
                </div>
              </div>

              {canEnterReferrer && (
                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <UserPlus className="h-4 w-4" />
                      Marketer Referral
                    </h2>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      If a Shettar marketer referred you, enter their code within {REFERRER_WINDOW_DAYS} days of registration. This can only be set once.
                    </p>
                  </div>
                  <div className="space-y-1.5 p-4">
                    <Label htmlFor="referrer_code" className="text-xs text-slate-600">Referrer code</Label>
                    <Input
                      id="referrer_code"
                      type="text"
                      placeholder="STRXXXXXX"
                      value={referrerCode}
                      onChange={(e) => setReferrerCode(e.target.value.toUpperCase())}
                      className="h-9 rounded-lg border-slate-200 font-mono uppercase"
                    />
                    <p className="text-[11px] text-slate-500">
                      Save settings to apply. Once linked, the referrer code cannot be changed.
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Your business address details</p>
                </div>
                <div className="space-y-3 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs text-slate-600">Street Address *</Label>
                    <Input
                      id="address"
                      value={businessData.address}
                      onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                      required
                      placeholder="123 Main Street"
                      className="h-9 rounded-lg border-slate-200"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs text-slate-600">City *</Label>
                      <Input
                        id="city"
                        value={businessData.city}
                        onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                        required
                        placeholder="City"
                        className="h-9 rounded-lg border-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="state" className="text-xs text-slate-600">State *</Label>
                      <Input
                        id="state"
                        value={businessData.state}
                        onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                        required
                        placeholder="State"
                        className="h-9 rounded-lg border-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="zip_code" className="text-xs text-slate-600">ZIP Code *</Label>
                      <Input
                        id="zip_code"
                        value={businessData.zip_code}
                        onChange={(e) => setBusinessData({ ...businessData, zip_code: e.target.value })}
                        required
                        placeholder="12345"
                        className="h-9 rounded-lg border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="latitude" className="text-xs text-slate-600">Latitude</Label>
                        <Input
                          id="latitude"
                          value={businessData.latitude || ""}
                          onChange={(e) => setBusinessData({ ...businessData, latitude: e.target.value })}
                          placeholder="6.5244"
                          className="h-9 rounded-lg border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="longitude" className="text-xs text-slate-600">Longitude</Label>
                        <Input
                          id="longitude"
                          value={businessData.longitude || ""}
                          onChange={(e) => setBusinessData({ ...businessData, longitude: e.target.value })}
                          placeholder="3.3792"
                          className="h-9 rounded-lg border-slate-200"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                        className="h-9 rounded-lg border-slate-200"
                      >
                        {isGettingLocation ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Getting Location...
                          </>
                        ) : (
                          <>
                            <LocateFixed className="mr-2 h-4 w-4" />
                            Use Current Location
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowMapModal(true)}
                        disabled={!businessData.latitude || !businessData.longitude}
                        className="h-9 rounded-lg"
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Preview on Map
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Clock className="h-4 w-4" />
                    Operating Hours
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Check-in and check-out times</p>
                </div>
                <div className="space-y-3 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="check_in" className="text-xs text-slate-600">Check-in Time *</Label>
                      <Input
                        id="check_in"
                        type="time"
                        value={businessData.check_in}
                        onChange={(e) => setBusinessData({ ...businessData, check_in: e.target.value })}
                        required
                        className="h-9 rounded-lg border-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="check_out" className="text-xs text-slate-600">Check-out Time *</Label>
                      <Input
                        id="check_out"
                        type="time"
                        value={businessData.check_out}
                        onChange={(e) => setBusinessData({ ...businessData, check_out: e.target.value })}
                        required
                        className="h-9 rounded-lg border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
            )}

            {/* Branding Tab */}
            {editBranding && settingsTab === "branding" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ImageIcon className="h-4 w-4" />
                    Business Logo
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Upload your business logo. Recommended size: 512x512px, PNG or JPG format
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  {logoPreview ? (
                    <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-slate-200">
                      <Image src={logoPreview} alt="Logo preview" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={removeLogoPreview}
                        className="absolute right-1.5 top-1.5 z-10 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                      <ImageIcon className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                      <p className="text-xs text-slate-500">No logo uploaded</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">Click below to upload</p>
                    </div>
                  )}
                  <div>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Label htmlFor="logo">
                      <Button type="button" variant="outline" asChild className="h-9 rounded-lg border-slate-200">
                        <span className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          {logoPreview ? "Change Logo" : "Upload Logo"}
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Upload className="h-4 w-4" />
                    Business Images
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Upload images of your business. Recommended size: 1920x1080px, JPG or PNG format
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-video overflow-hidden rounded-lg border border-slate-200">
                          <Image
                            src={preview}
                            alt={`Image ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImagePreview(index)}
                            className="absolute right-1.5 top-1.5 z-10 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <Input
                      id="images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImagesChange}
                      className="hidden"
                    />
                    <Label htmlFor="images">
                      <Button type="button" variant="outline" asChild className="h-9 rounded-lg border-slate-200">
                        <span className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          {imagePreviews.length > 0 ? "Add More Images" : "Upload Images"}
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Amenities Tab */}
            {editAmenities && settingsTab === "amenities" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Check className="h-4 w-4" />
                    Available Amenities
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Select all amenities available at your business</p>
                </div>
                <div className="p-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { key: 'swimming_pool', label: 'Swimming Pool' },
                      { key: 'gym', label: 'Gym' },
                      { key: 'wifi', label: 'WiFi' },
                      { key: 'spa', label: 'Spa' },
                      { key: 'restaurant', label: 'Restaurant' },
                      { key: 'parking', label: 'Parking' },
                      { key: 'breakfast', label: 'Breakfast' },
                      { key: 'bar', label: 'Bar' },
                      { key: 'laundry', label: 'Laundry Service' },
                      { key: 'pet_friendly', label: 'Pet Friendly' },
                      { key: 'ac', label: 'Air Conditioning' },
                      { key: 'heating', label: 'Heating' },
                      { key: 'tv', label: 'TV' },
                      { key: 'minibar', label: 'Minibar' },
                      { key: 'garden', label: 'Garden' },
                      { key: 'conference_facilities', label: 'Conference Facilities' },
                      { key: 'business_center', label: 'Business Center' },
                      { key: 'fitness_center', label: 'Fitness Center' },
                      { key: 'airport_transportation', label: 'Airport Transportation' },
                      { key: 'room_service', label: 'Room Service' },
                      { key: 'children_activities', label: 'Children Activities' },
                      { key: 'beach_access', label: 'Beach Access' },
                      { key: 'handicap_accessible', label: 'Handicap Accessible' },
                      { key: 'bicycle_rental', label: 'Bicycle Rental' },
                      { key: 'car_rental', label: 'Car Rental' },
                      { key: 'shuttle_service', label: 'Shuttle Service' },
                    ].map((amenity) => (
                      <div key={amenity.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={amenity.key}
                          checked={businessData[amenity.key as keyof BusinessData] as boolean || false}
                          onCheckedChange={(checked) =>
                            setBusinessData({ ...businessData, [amenity.key]: checked })
                          }
                        />
                        <Label
                          htmlFor={amenity.key}
                          className="cursor-pointer text-xs font-normal text-slate-600"
                        >
                          {amenity.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            )}
            </div>
          </Tabs>

          {(editDetails || writeGuestPolicies || editBranding || editAmenities) && (
          <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
            <p className="text-xs text-slate-500">
              {writeGuestPolicies && !editDetails
                ? "Save guest notices and policies for your public hotel page"
                : "Make sure all required fields are filled before saving"}
            </p>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 min-w-[120px] rounded-lg bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
          )}
        </form>
      </div>

      {/* Map Modal */}
      {showMapModal && businessData && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => { setShowMapModal(false); setMapLoading(true); }}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-slate-900">{(businessData as any)?.name} — Location Preview</h3>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {(businessData as any)?.address}, {(businessData as any)?.city}, {(businessData as any)?.state} {(businessData as any)?.zip_code}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowMapModal(false); setMapLoading(true); }}
                className="h-8 w-8 shrink-0 rounded-lg hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[calc(100vh-160px)] overflow-y-auto p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Latitude</p>
                    <p className="text-xs font-semibold text-slate-900">{(businessData as any)?.latitude}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Longitude</p>
                    <p className="text-xs font-semibold text-slate-900">{(businessData as any)?.longitude}</p>
                  </div>
                </div>

                <div className="relative h-[360px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {mapLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                        <p className="text-xs font-medium text-slate-500">Loading interactive map...</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${(businessData as any)?.latitude},${(businessData as any)?.longitude}&hl=en&z=15&output=embed`}
                    allowFullScreen
                    onLoad={() => setMapLoading(false)}
                    className={cn("transition-opacity duration-500", mapLoading ? "opacity-0" : "opacity-100")}
                  ></iframe>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    asChild
                    className="h-9 w-full rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <a
                      href={`https://www.google.com/maps?q=${(businessData as any)?.latitude},${(businessData as any)?.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      Open in Google Maps
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="h-9 w-full rounded-lg border-slate-200 hover:bg-slate-50"
                  >
                    <a
                      href={`https://maps.apple.com/?q=${(businessData as any)?.latitude},${(businessData as any)?.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      Open in Apple Maps
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
