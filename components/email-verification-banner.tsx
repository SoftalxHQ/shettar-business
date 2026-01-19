"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle2, AlertCircle, X } from "lucide-react"
import { getAuthToken } from "@/lib/storage"

export function EmailVerificationBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null)

  useEffect(() => {
    checkConfirmationStatus()
  }, [])

  const checkConfirmationStatus = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const response = await fetch(`${API_URL}/users/confirmation_status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setIsConfirmed(data.data.confirmed)
        setUserEmail(data.data.email)
        setIsVisible(!data.data.confirmed)
      }
    } catch (error) {
      console.error("Failed to check confirmation status:", error)
    }
  }

  const handleResendEmail = async () => {
    setIsSending(true)
    setMessage("")
    setMessageType(null)

    try {
      const token = getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

      const response = await fetch(`${API_URL}/users/resend_confirmation`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.status.message)
        setMessageType("success")
      } else {
        setMessage(data.status?.message || "Failed to send email")
        setMessageType("error")
      }
    } catch (error) {
      setMessage("Unable to send verification email. Please try again.")
      setMessageType("error")
    } finally {
      setIsSending(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  if (!isVisible || isConfirmed) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <Mail className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                Please verify your email address
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                We sent a verification email to <strong>{userEmail}</strong>. Please check your inbox and click the verification link.
              </p>

              {message && (
                <div className="mt-2">
                  {messageType === "success" ? (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{message}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      <span>{message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendEmail}
              disabled={isSending}
              className="bg-white hover:bg-amber-50 border-amber-300 text-amber-900 cursor-pointer"
            >
              {isSending ? "Sending..." : "Resend Email"}
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-amber-100 rounded cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-amber-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
