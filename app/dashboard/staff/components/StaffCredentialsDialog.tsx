"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, Mail, Key, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface StaffCredentialsDialogProps {
  email: string
  password: string
  userName: string
  onClose: () => void
}

export function StaffCredentialsDialog({ email, password, userName, onClose }: StaffCredentialsDialogProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyAllCredentials = () => {
    const credentials = `Email: ${email}\nPassword: ${password}`
    navigator.clipboard.writeText(credentials)
    toast.success("Credentials copied to clipboard")
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-green-600" />
            Staff Credentials Created
          </DialogTitle>
          <DialogDescription>
            {userName} has been added successfully
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 text-sm">Important!</h4>
                <p className="text-yellow-800 text-sm mt-1">
                  An email with these credentials has been sent. However, <strong>save these details</strong> in case the email doesn't arrive.
                </p>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Email Address
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => copyToClipboard(email, "Email")}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <p className="font-mono text-sm font-semibold text-gray-900">{email}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-green-700 uppercase tracking-wide flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  Temporary Password
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-green-700 hover:text-green-800 hover:bg-green-100"
                  onClick={() => copyToClipboard(password, "Password")}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <p className="font-mono text-lg font-bold text-green-900 tracking-wide">{password}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={copyAllCredentials}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Both
            </Button>
            <Button
              className="flex-1"
              onClick={onClose}
            >
              Done
            </Button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-medium mb-1">📧 Email Sent To:</p>
            <p>{email}</p>
            <p className="mt-2 text-blue-700">
              The staff member should check their inbox (and spam folder) for the invitation email.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
