"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import type { RoomType } from "@/lib/room-types"

interface BulkCreateRoomsDialogProps {
  roomType: RoomType
  onSuccess: () => void
  onCancel: () => void
}

export function BulkCreateRoomsDialog({ roomType, onSuccess, onCancel }: BulkCreateRoomsDialogProps) {
  const { businessId, logout } = useAuth()
  const [startingNumber, setStartingNumber] = useState(101)
  const [quantity, setQuantity] = useState(10)
  const [isCreating, setIsCreating] = useState(false)

  const roomNumbers = useMemo(() => {
    if (quantity <= 0 || quantity > 100) return []
    return Array.from({ length: quantity }, (_, i) => startingNumber + i)
  }, [startingNumber, quantity])

  const handleCreate = async () => {
    // Validation
    if (quantity <= 0) {
      toast.error("Number of rooms must be greater than 0")
      return
    }
    if (quantity > 100) {
      toast.error("Cannot create more than 100 rooms at once")
      return
    }
    if (startingNumber < 1) {
      toast.error("Starting room number must be at least 1")
      return
    }

    setIsCreating(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomType.id}/rooms`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room: {
              starting_number: startingNumber,
              number: quantity,
            },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || `${quantity} rooms created successfully!`)
        onSuccess()
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.errors?.[0]?.id === 'expiration' || errorData.message === 'Signature has expired') {
            logout(true)
            return
          }
        }
        const error = await response.json().catch(() => ({}))
        toast.error(error.message || "Failed to create rooms")
      }
    } catch (error) {
      console.error("Error creating rooms:", error)
      toast.error("Unable to create rooms")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Rooms to {roomType.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="startingNumber">Starting Room Number *</Label>
            <Input
              id="startingNumber"
              type="number"
              value={startingNumber}
              onChange={(e) => setStartingNumber(Number(e.target.value))}
              min={1}
              placeholder="101"
            />
            <p className="text-xs text-muted-foreground">
              Room numbering will start from this number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Number of Rooms *</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
              max={100}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              How many rooms to create (max 100 at once)
            </p>
          </div>

          {roomNumbers.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Preview</p>
              <p className="text-sm text-blue-700">
                <span className="font-semibold">{roomNumbers.length} rooms</span> will be created:
              </p>
              <p className="text-xs text-blue-600 mt-1 font-mono">
                {roomNumbers.length <= 20
                  ? roomNumbers.join(', ')
                  : `${roomNumbers.slice(0, 20).join(', ')}... and ${roomNumbers.length - 20} more`
                }
              </p>
            </div>
          )}

          {roomNumbers.length === 0 && quantity > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Please enter a valid quantity (1-100)
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || roomNumbers.length === 0}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>Create {quantity} Room{quantity !== 1 ? 's' : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
