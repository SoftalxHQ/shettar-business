"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Building2, ImageIcon, Upload, X, Loader2, Save, MapPin, Clock, Check, CreditCard, ArrowRight, LocateFixed, UserPlus, UtensilsCrossed, Megaphone, Plus, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import Image from "next/image"
import { BusinessVerificationBadge } from "@/components/business-verification-badge"
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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (businessData) {
          setBusinessData({
            ...businessData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          })
          toast.success("Location captured successfully!")
        }
        setIsGettingLocation(false)
      },
      (error) => {
        console.error("Error getting location:", error)
        toast.error("Unable to retrieve your location. Please check your permissions.")
        setIsGettingLocation(false)
      }
    )
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
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  if (!businessData) {
    return (
      <DashboardLayout activeTab="settings">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Business data not found</p>
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">Business Settings</h1>
              {businessData.verification_display_status && (
                <BusinessVerificationBadge status={businessData.verification_display_status} />
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {editDetails
                ? "Manage your business information, branding, and amenities"
                : "Manage guest notices and hotel policies shown on your public listing"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Business ID:</span>
            <code className="px-2 py-1 bg-muted rounded font-mono text-xs">
              {businessData.business_unique_id}
            </code>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList
              className={cn(
                "grid w-full lg:w-[400px]",
                1 + (editBranding ? 1 : 0) + (editAmenities ? 1 : 0) === 3
                  ? "grid-cols-3"
                  : 1 + (editBranding ? 1 : 0) + (editAmenities ? 1 : 0) === 2
                    ? "grid-cols-2"
                    : "grid-cols-1"
              )}
            >
              <TabsTrigger value="general">General</TabsTrigger>
              {editBranding && <TabsTrigger value="branding">Branding</TabsTrigger>}
              {editAmenities && <TabsTrigger value="amenities">Amenities</TabsTrigger>}
            </TabsList>

            {/* General Information Tab */}
            <TabsContent value="general" className="space-y-6">
              {editDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Update your business name and description</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Business Name *</Label>
                      <Input
                        id="name"
                        value={businessData.name}
                        onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                        required
                        placeholder="Enter business name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value="Hotel"
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={businessData.description}
                      onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                      required
                      rows={4}
                      placeholder="Describe your business"
                    />
                  </div>
                </CardContent>
              </Card>
              )}

              {viewGuestPolicies && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5" />
                    Guest notices &amp; policies
                  </CardTitle>
                  <CardDescription>
                    Shown on your public hotel page. Multiple notices rotate in a slider for guests.
                    {editDetails
                      ? " Check-in and check-out times use the fields in the Location & hours section."
                      : " Check-in and check-out times are managed by admins with business details access."}
                    {guestPoliciesReadOnly && (
                      <span className="block mt-1 text-amber-600">You have view-only access. Ask an admin to grant create, edit, or delete permissions.</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Guest notices</Label>
                    {(businessData?.guest_notices || []).map((notice, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Textarea
                          value={notice}
                          rows={2}
                          disabled={!canEditGuest && !canCreateGuest}
                          placeholder="e.g. Please follow all health and safety guidelines during your stay."
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
                          className="shrink-0"
                          onClick={() => {
                            const next = (businessData?.guest_notices || []).filter((_, i) => i !== idx)
                            setBusinessData({ ...businessData!, guest_notices: next })
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        )}
                      </div>
                    ))}
                    {canCreateGuest && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setBusinessData({
                          ...businessData!,
                          guest_notices: [...(businessData?.guest_notices || []), ""],
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add notice
                    </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Policy highlights</Label>
                    <p className="text-xs text-muted-foreground">
                      Green = allowed / required. Red = not allowed.
                    </p>
                    {(businessData?.policy_highlights || []).map((row, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-2">
                        <Select
                          value={row.kind}
                          disabled={!canEditGuest}
                          onValueChange={(v: "allow" | "deny") => {
                            const next = [...(businessData?.policy_highlights || [])]
                            next[idx] = { ...next[idx], kind: v }
                            setBusinessData({ ...businessData!, policy_highlights: next })
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="allow">Allowed</SelectItem>
                            <SelectItem value="deny">Not allowed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          className="flex-1"
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
                          className="shrink-0"
                          onClick={() => {
                            const next = (businessData?.policy_highlights || []).filter((_, i) => i !== idx)
                            setBusinessData({ ...businessData!, policy_highlights: next })
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        )}
                      </div>
                    ))}
                    {canCreateGuest && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                      <Plus className="w-4 h-4 mr-1" />
                      Add highlight
                    </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Additional policy lines</Label>
                    {(businessData?.policy_bullets || []).map((bullet, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={bullet}
                          disabled={!canEditGuest}
                          placeholder="e.g. No pets"
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
                          className="shrink-0"
                          onClick={() => {
                            const next = (businessData?.policy_bullets || []).filter((_, i) => i !== idx)
                            setBusinessData({ ...businessData!, policy_bullets: next })
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        )}
                      </div>
                    ))}
                    {canCreateGuest && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setBusinessData({
                          ...businessData!,
                          policy_bullets: [...(businessData?.policy_bullets || []), ""],
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add policy line
                    </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="policy_footer">Footer disclaimer</Label>
                    <Textarea
                      id="policy_footer"
                      rows={2}
                      disabled={!canEditGuest}
                      value={businessData?.policy_footer || ""}
                      placeholder="The hotel reserves the right of admission..."
                      onChange={(e) =>
                        setBusinessData({ ...businessData!, policy_footer: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
              )}

              {editDetails && (
              <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5" />
                    Restaurant operations
                  </CardTitle>
                  <CardDescription>
                    Enable menu, order taking, and kitchen display for your on-site restaurant. This is separate from the
                    &quot;Restaurant&quot; amenity shown to guests when browsing hotels.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Enable restaurant &amp; kitchen module</p>
                    <p className="text-xs text-muted-foreground">
                      Staff with restaurant permissions can manage the menu and kitchen workflow.
                    </p>
                  </div>
                  <Switch
                    checked={!!businessData.restaurant_enabled}
                    onCheckedChange={(checked) =>
                      setBusinessData({ ...businessData, restaurant_enabled: checked })
                    }
                  />
                </CardContent>
              </Card>

              {canEnterReferrer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Marketer Referral
                    </CardTitle>
                    <CardDescription>
                      If a Shettar marketer referred you, enter their code within {REFERRER_WINDOW_DAYS} days of registration. This can only be set once.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Label htmlFor="referrer_code">Referrer code</Label>
                    <Input
                      id="referrer_code"
                      type="text"
                      placeholder="STRXXXXXX"
                      value={referrerCode}
                      onChange={(e) => setReferrerCode(e.target.value.toUpperCase())}
                      className="font-mono uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      Save settings to apply. Once linked, the referrer code cannot be changed.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Location
                  </CardTitle>
                  <CardDescription>Your business address details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      value={businessData.address}
                      onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                      required
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={businessData.city}
                        onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                        required
                        placeholder="City"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={businessData.state}
                        onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                        required
                        placeholder="State"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">ZIP Code *</Label>
                      <Input
                        id="zip_code"
                        value={businessData.zip_code}
                        onChange={(e) => setBusinessData({ ...businessData, zip_code: e.target.value })}
                        required
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input
                          id="latitude"
                          value={businessData.latitude || ""}
                          onChange={(e) => setBusinessData({ ...businessData, latitude: e.target.value })}
                          placeholder="6.5244"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input
                          id="longitude"
                          value={businessData.longitude || ""}
                          onChange={(e) => setBusinessData({ ...businessData, longitude: e.target.value })}
                          placeholder="3.3792"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                        className="w-full md:w-auto"
                      >
                        {isGettingLocation ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Getting Location...
                          </>
                        ) : (
                          <>
                            <LocateFixed className="w-4 h-4 mr-2" />
                            Use Current Location
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowMapModal(true)}
                        disabled={!businessData.latitude || !businessData.longitude}
                        className="w-full md:w-auto"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Preview on Map
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Operating Hours
                  </CardTitle>
                  <CardDescription>Check-in and check-out times</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="check_in">Check-in Time *</Label>
                      <Input
                        id="check_in"
                        type="time"
                        value={businessData.check_in}
                        onChange={(e) => setBusinessData({ ...businessData, check_in: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check_out">Check-out Time *</Label>
                      <Input
                        id="check_out"
                        type="time"
                        value={businessData.check_out}
                        onChange={(e) => setBusinessData({ ...businessData, check_out: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              </>
              )}
            </TabsContent>

            {/* Branding Tab */}
            {editBranding && (
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Business Logo
                  </CardTitle>
                  <CardDescription>
                    Upload your business logo. Recommended size: 512x512px, PNG or JPG format
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {logoPreview ? (
                    <div className="relative w-40 h-40 border-2 border-gray-200 rounded-lg overflow-hidden">
                      <Image src={logoPreview} alt="Logo preview" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={removeLogoPreview}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">No logo uploaded</p>
                      <p className="text-xs text-muted-foreground">Click below to upload</p>
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
                      <Button type="button" variant="outline" asChild>
                        <span className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          {logoPreview ? "Change Logo" : "Upload Logo"}
                        </span>
                      </Button>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Business Images
                  </CardTitle>
                  <CardDescription>
                    Upload images of your business. Recommended size: 1920x1080px, JPG or PNG format
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-video border-2 border-gray-200 rounded-lg overflow-hidden">
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
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                          >
                            <X className="w-4 h-4" />
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
                      <Button type="button" variant="outline" asChild>
                        <span className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          {imagePreviews.length > 0 ? "Add More Images" : "Upload Images"}
                        </span>
                      </Button>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            )}

            {/* Amenities Tab */}
            {editAmenities && (
            <TabsContent value="amenities" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Available Amenities
                  </CardTitle>
                  <CardDescription>Select all amenities available at your business</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                          className="text-sm font-normal cursor-pointer"
                        >
                          {amenity.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            )}
          </Tabs>

          {(editDetails || writeGuestPolicies || editBranding || editAmenities) && (
          <div className="sticky bottom-4 mt-6">
            <Card className="shadow-lg">
              <CardContent className="flex items-center justify-between p-4">
                <p className="text-sm text-muted-foreground">
                  {writeGuestPolicies && !editDetails
                    ? "Save guest notices and policies for your public hotel page"
                    : "Make sure all required fields are filled before saving"}
                </p>
                <Button type="submit" disabled={isSaving} className="min-w-[120px]">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
          )}
        </form>
      </div>

      {/* Map Modal */}
      {showMapModal && businessData && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { setShowMapModal(false); setMapLoading(true); }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{(businessData as any)?.name} - Location Preview</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {(businessData as any)?.address}, {(businessData as any)?.city}, {(businessData as any)?.state} {(businessData as any)?.zip_code}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowMapModal(false); setMapLoading(true); }}
                className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Latitude</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{(businessData as any)?.latitude}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Longitude</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{(businessData as any)?.longitude}</p>
                  </div>
                </div>

                <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative bg-slate-100 dark:bg-slate-800 shadow-inner">
                  {mapLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-10 transition-opacity duration-300">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900/30 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading interactive map...</p>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    asChild
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    <a
                      href={`https://www.google.com/maps?q=${(businessData as any)?.latitude},${(businessData as any)?.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Open in Google Maps
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <a
                      href={`https://maps.apple.com/?q=${(businessData as any)?.latitude},${(businessData as any)?.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4 text-slate-400" />
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
