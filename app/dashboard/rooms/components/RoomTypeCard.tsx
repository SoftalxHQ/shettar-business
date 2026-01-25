"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash, Settings, Hotel, CheckCircle, Check } from "lucide-react"
import type { RoomType } from "@/lib/room-types"
import { getEnabledAmenities, formatAmenityName, countEnabledAmenities } from "@/lib/room-types"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"

interface RoomTypeCardProps {
  roomType: RoomType
  onEdit: (roomType: RoomType) => void
  onDelete: (id: number) => void
  onManageRooms: (id: number) => void
}

export function RoomTypeCard({ roomType, onEdit, onDelete, onManageRooms }: RoomTypeCardProps) {
  const { user } = useAuth()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const enabledAmenities = getEnabledAmenities(roomType)
  const amenitiesCount = countEnabledAmenities(roomType)
  const displayAmenities = enabledAmenities.slice(0, 3)
  const hasImages = roomType.images_url && roomType.images_url.length > 0

  const nextImage = () => {
    if (hasImages && roomType.images_url) {
      setCurrentImageIndex((prev) => (prev + 1) % roomType.images_url!.length)
    }
  }

  const prevImage = () => {
    if (hasImages && roomType.images_url) {
      setCurrentImageIndex(
        (prev) => (prev - 1 + roomType.images_url!.length) % roomType.images_url!.length
      )
    }
  }

  const discountPercent = roomType.old_price
    ? Math.round(((roomType.old_price - roomType.price) / roomType.old_price) * 100)
    : 0

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Image Carousel */}
        <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-blue-200">
          {hasImages ? (
            <>
              <img
                src={roomType.images_url![currentImageIndex]}
                alt={`${roomType.name} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
              {roomType.images_url!.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    ←
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    →
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {roomType.images_url!.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? "bg-white" : "bg-white/50"
                          }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Hotel className="w-16 h-16 text-blue-300" />
            </div>
          )}

          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-semibold">
              {discountPercent}% OFF
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title and Price */}
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{roomType.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {roomType.description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-blue-600">
                ${Number(roomType.price).toFixed(0)}
              </div>
              {roomType.old_price && (
                <div className="text-sm text-muted-foreground line-through">
                  ${Number(roomType.old_price).toFixed(0)}
                </div>
              )}
              <div className="text-xs text-muted-foreground">per night</div>
            </div>
          </div>

          {/* Amenities Preview */}
          {amenitiesCount > 0 ? (
            <div className="flex flex-wrap gap-2">
              {displayAmenities.map((amenity) => (
                <Badge key={amenity} variant="secondary" className="text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  {formatAmenityName(amenity)}
                </Badge>
              ))}
              {amenitiesCount > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{amenitiesCount - 3} more
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No amenities configured</p>
          )}

          {/* Room Count */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <Hotel className="w-4 h-4" />
              {roomType.rooms_count || 0} rooms
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              {roomType.available_rooms || 0} available
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {(user?.role === 'admin' || user?.permissions?.rooms?.edit) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(roomType)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            {(user?.role === 'admin' || user?.permissions?.rooms?.edit) && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onManageRooms(roomType.id)}
                className="flex-1"
              >
                <Settings className="w-4 h-4 mr-1" />
                Rooms
              </Button>
            )}
            {(user?.role === 'admin' || user?.permissions?.rooms?.delete) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(roomType.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
