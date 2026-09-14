"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash, Settings, Hotel, CheckCircle, Check, ChevronLeft, ChevronRight } from "lucide-react"
import type { RoomType } from "@/lib/room-types"
import { getEnabledAmenities, formatAmenityName, countEnabledAmenities } from "@/lib/room-types"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { CachedRemoteImage } from "@/components/cached-menu-image"
import { cn } from "@/lib/utils"

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

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasImages && roomType.images_url) {
      setCurrentImageIndex((prev) => (prev + 1) % roomType.images_url!.length)
    }
  }

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
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
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 transition-colors flex flex-col min-w-0">
      <div className="relative h-40 bg-slate-100 shrink-0">
        {hasImages ? (
          <>
            <CachedRemoteImage
              src={roomType.images_url![currentImageIndex]}
              alt={`${roomType.name} - Image ${currentImageIndex + 1}`}
              className="absolute inset-0 h-full w-full object-cover"
              placeholderClassName="absolute inset-0 h-full w-full"
              showPlaceholderIcon
            />
            {roomType.images_url!.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-1.5 top-1/2 z-10 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center bg-black/50 text-white rounded-md hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center bg-black/50 text-white rounded-md hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-1.5 left-1/2 z-10 -translate-x-1/2 flex gap-1">
                  {roomType.images_url!.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        idx === currentImageIndex ? "bg-white" : "bg-white/50",
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Hotel className="w-8 h-8 text-slate-300" />
          </div>
        )}

        {discountPercent > 0 && (
          <div className="absolute top-1.5 right-1.5 bg-rose-600 text-white px-1.5 py-0.5 rounded-md text-[10px] font-semibold">
            {discountPercent}% OFF
          </div>
        )}
      </div>

      <div className="p-3 space-y-2.5 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-900 truncate">{roomType.name}</h3>
            {roomType.description && (
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{roomType.description}</p>
            )}
          </div>
          <div className="text-right shrink-0 max-w-[40%] min-w-0">
            <div className="text-sm font-semibold tabular-nums text-slate-900 truncate">
              ₦{Number(roomType.price).toLocaleString()}
            </div>
            {roomType.old_price && (
              <div className="text-[10px] text-slate-400 line-through tabular-nums truncate">
                ₦{Number(roomType.old_price).toLocaleString()}
              </div>
            )}
            <div className="text-[10px] text-slate-400">/ night</div>
          </div>
        </div>

        {amenitiesCount > 0 ? (
          <div className="flex flex-wrap gap-1">
            {displayAmenities.map((amenity) => (
              <Badge key={amenity} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium">
                <Check className="w-2.5 h-2.5 mr-0.5" />
                {formatAmenityName(amenity)}
              </Badge>
            ))}
            {amenitiesCount > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                +{amenitiesCount - 3}
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">No amenities</p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-auto">
          <span className="inline-flex items-center gap-1">
            <Hotel className="w-3 h-3" />
            {roomType.rooms_count || 0} rooms
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            {roomType.available_rooms || 0} free
          </span>
        </div>

        <div className="flex gap-1.5 min-w-0">
          {(user?.role === "admin" || user?.permissions?.rooms?.edit) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(roomType)}
              className="flex-1 h-8 text-xs rounded-lg min-w-0"
            >
              <Edit className="w-3.5 h-3.5 sm:mr-1 shrink-0" />
              <span className="truncate">Edit</span>
            </Button>
          )}
          {(user?.role === "admin" || user?.permissions?.rooms?.edit) && (
            <Button
              size="sm"
              onClick={() => onManageRooms(roomType.id)}
              className="flex-1 h-8 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 min-w-0"
            >
              <Settings className="w-3.5 h-3.5 sm:mr-1 shrink-0" />
              <span className="truncate">Rooms</span>
            </Button>
          )}
          {(user?.role === "admin" || user?.permissions?.rooms?.delete) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(roomType.id)}
              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
            >
              <Trash className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
