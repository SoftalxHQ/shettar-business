"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Building2, ImageIcon, Upload, X, Loader2, Save, MapPin, Clock, Check } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

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
}

export default function BusinessSettingsPage() {
  const { user, businessId, logout } = useAuth()
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

  // Check admin access
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  // Fetch business data
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!businessId) return

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const token = localStorage.getItem("abri_auth_token")

        const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          setBusinessData(data)
          if (data.logo_url) {
            setLogoPreview(data.logo_url)
          }
          if (data.images_url) {
            setImagePreviews(data.images_url)
          }
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
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      const formData = new FormData()

      // Append business data
      if (businessData) {
        formData.append("business[name]", businessData.name)
        formData.append("business[description]", businessData.description)
        formData.append("business[address]", businessData.address)
        formData.append("business[city]", businessData.city)
        formData.append("business[state]", businessData.state)
        formData.append("business[zip_code]", businessData.zip_code)
        formData.append("business[check_in]", businessData.check_in)
        formData.append("business[check_out]", businessData.check_out)

        // Amenities
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

      // Append logo
      if (logoFile) {
        formData.append("business[logo]", logoFile)
      } else if (removeLogo) {
        formData.append("business[remove_logo]", "true")
      }

      // Append images
      if (imageFiles.length > 0) {
        imageFiles.forEach((file) => {
          formData.append("business[images][]", file)
        })
      } else if (removeImages) {
        formData.append("business[remove_images]", "true")
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
        if (data.business.logo_url) {
          setLogoPreview(data.business.logo_url)
        }
        if (data.business.images_url) {
          setImagePreviews(data.business.images_url)
        }

        // Clear file inputs
        setLogoFile(null)
        setImageFiles([])
        setRemoveLogo(false)
        setRemoveImages(false)
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.errors?.[0]?.id === 'expiration' || errorData.message === 'Signature has expired') {
            logout(true)
            return
          }
        }
        toast.error("Failed to update business settings", {
          description: data.error?.message || "Please try again",
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

  if (user?.role !== "admin") {
    return null
  }

  if (isLoading) {
    return (
      <DashboardLayout activeTab="businessdashboard">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!businessData) {
    return (
      <DashboardLayout activeTab="businessdashboard">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Business data not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="businessdashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Business Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your business information, branding, and amenities
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
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
            </TabsList>

            {/* General Information Tab */}
            <TabsContent value="general" className="space-y-6">
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
            </TabsContent>

            {/* Branding Tab */}
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
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={removeLogoPreview}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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
                          <img src={preview} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImagePreview(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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

            {/* Amenities Tab */}
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
          </Tabs>

          {/* Save Button - Fixed at bottom */}
          <div className="sticky bottom-4 mt-6">
            <Card className="shadow-lg">
              <CardContent className="flex items-center justify-between p-4">
                <p className="text-sm text-muted-foreground">
                  Make sure all required fields are filled before saving
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
        </form>
      </div>
    </DashboardLayout>
  )
}
