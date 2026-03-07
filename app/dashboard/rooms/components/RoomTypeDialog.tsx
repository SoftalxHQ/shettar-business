"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import type { RoomType } from "@/lib/room-types"
import { AMENITY_CATEGORIES, AMENITY_KEYS, formatAmenityName } from "@/lib/room-types"
import Image from "next/image"

interface RoomTypeDialogProps {
  roomType: RoomType | null
  onSave: () => void
  onCancel: () => void
}

export function RoomTypeDialog({ roomType, onSave, onCancel }: RoomTypeDialogProps) {
  const { businessId, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState("basic")
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [name, setName] = useState(roomType?.name || "")
  const [description, setDescription] = useState(roomType?.description || "")
  const [price, setPrice] = useState(roomType?.price?.toString() || "")
  const [oldPrice, setOldPrice] = useState(roomType?.old_price?.toString() || "")

  // Am enities state
  const [amenities, setAmenities] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    AMENITY_KEYS.forEach(key => {
      initial[key] = roomType?.[key as keyof RoomType] as boolean || false
    })
    return initial
  })

  // Images state
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<{ id: number; url: string }[]>(roomType?.images || [])
  const [imagesToRemove, setImagesToRemove] = useState<number[]>([])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setImageFiles((prev) => [...prev, ...files])

      files.forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setNewImagePreviews((prev) => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeExistingImage = (id: number) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id))
    setImagesToRemove((prev) => [...prev, id])
  }

  const removeNewImage = (index: number) => {
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index))
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Room type name is required")
      setCurrentTab("basic")
      return
    }
    if (!description.trim()) {
      toast.error("Description is required")
      setCurrentTab("basic")
      return
    }
    if (!price || Number(price) <= 0) {
      toast.error("Valid price is required")
      setCurrentTab("basic")
      return
    }

    setIsSaving(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      const formData = new FormData()
      formData.append("room_type[name]", name)
      formData.append("room_type[description]", description)
      formData.append("room_type[price]", price)
      if (oldPrice) {
        formData.append("room_type[old_price]", oldPrice)
      }

      // Append all amenities
      AMENITY_KEYS.forEach(key => {
        formData.append(`room_type[${key}]`, String(amenities[key] || false))
      })

      // Append images
      imageFiles.forEach(file => {
        formData.append("room_type[images][]", file)
      })

      // Append images to remove
      if (imagesToRemove.length > 0) {
        formData.append("room_type[delete_image_ids]", JSON.stringify(imagesToRemove))
      }

      const url = roomType
        ? `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomType.id}`
        : `${API_URL}/api/v1/user_businesses/${businessId}/room_types`

      const method = roomType ? "PATCH" : "POST"

      // Debug logging
      console.log("Saving room type:", {
        url,
        method,
        businessId,
        hasToken: !!token,
        formData: {
          name,
          description,
          price,
          oldPrice,
          amenitiesCount: Object.values(amenities).filter(v => v).length,
          imagesCount: imageFiles.length
        }
      })

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Room type saved successfully!")
        onSave()
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (
            errorData.errors?.[0]?.id === 'expiration' ||
            errorData.errors?.[0]?.message === 'Token has expired' ||
            errorData.message === 'Signature has expired'
          ) {
            logout(true)
            return
          }
        }

        try {
          const error = await response.json()
          if (error.errors) {
            const errorMessages = Object.entries(error.errors)
              .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
              .join('\n')
            toast.error(`Validation errors:\n${errorMessages}`)
          } else {
            toast.error(error.message || error.status?.message || "Failed to save room type")
          }
        } catch (parseError) {
          console.error("Could not parse error response:", parseError)
          toast.error(`Failed to save room type (${response.status})`)
        }
      }
    } catch (error) {
      console.error("Network error saving room type:", error)
      toast.error("Unable to save room type - network error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {roomType ? "Edit Room Type" : "Create Room Type"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Tab 1: Basic Information */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="name">Room Type Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Deluxe Ocean View"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this room type..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (per night) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="25000"
                      className="pl-7"
                      step="1"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oldPrice">Old Price (optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <Input
                      id="oldPrice"
                      type="number"
                      value={oldPrice}
                      onChange={(e) => setOldPrice(e.target.value)}
                      placeholder="30000"
                      className="pl-7"
                      step="1"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Show a discount from original price
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Amenities */}
            <TabsContent value="amenities" className="space-y-6 mt-0">
              {Object.entries(AMENITY_CATEGORIES).map(([category, keys]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {keys.map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={amenities[key] || false}
                          onCheckedChange={(checked) =>
                            setAmenities({ ...amenities, [key]: checked as boolean })
                          }
                        />
                        <Label
                          htmlFor={key}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {formatAmenityName(key)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Tab 3: Images */}
            <TabsContent value="images" className="space-y-4 mt-0">
              <div>
                <Label>Room Type Images</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload images of this room type. Recommended: 1920x1080px, JPG or PNG
                </p>

                {existingImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {existingImages.map((image) => (
                      <div key={`existing-${image.id}`} className="relative aspect-video border-2 border-gray-200 rounded-lg overflow-hidden group">
                        <Image
                          src={image.url}
                          alt="Existing room image"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(image.id)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {newImagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {newImagePreviews.map((preview, index) => (
                      <div key={`new-${index}`} className="relative aspect-video border-2 border-green-200 rounded-lg overflow-hidden group">
                        <Image
                          src={preview}
                          alt="New room image"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop or click to upload
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <Label htmlFor="image-upload">
                    <Button type="button" variant="outline" asChild>
                      <span className="cursor-pointer">
                        Choose Files
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex justify-between border-t pt-4">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
          </div>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>Save Room Type</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
