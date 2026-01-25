"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, User, Mail, Phone, MapPin, Building2, Save, Lock, Eye, EyeOff, Camera } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { getAuthToken } from "@/lib/storage"
import { toast } from "sonner"
import Image from "next/image"

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    phone_number: user?.phone_number || "",
    address: user?.address || "",
    zip_code: user?.zip_code || "",
  })

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })

  // Update formData when user loads or changes
  useEffect(() => {
    if (user) {
      // Parse name if first_name/last_name not available
      const nameParts = user.name?.split(' ') || []
      const firstName = user.first_name || nameParts[0] || ""
      const lastName = user.last_name || nameParts.slice(1).join(' ') || ""

      setFormData({
        first_name: firstName,
        last_name: lastName,
        email: user.email || "",
        phone_number: user.phone_number || "",
        address: user.address || "",
        zip_code: user.zip_code || "",
      })
    }
  }, [user])

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }

    // Store file and create preview
    setSelectedAvatar(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      // Create FormData to send both profile data and avatar in one request
      const submitData = new FormData()
      submitData.append('user[first_name]', formData.first_name)
      submitData.append('user[last_name]', formData.last_name)
      submitData.append('user[phone_number]', formData.phone_number)
      submitData.append('user[address]', formData.address)
      submitData.append('user[zip_code]', formData.zip_code)

      // Add avatar if selected
      if (selectedAvatar) {
        submitData.append('avatar', selectedAvatar)
      }

      const response = await fetch(`${API_URL}/api/v1/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitData,
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.status?.message || "Profile updated successfully!")
        setIsEditing(false)
        setSelectedAvatar(null)
        setAvatarPreview(null)

        // Reload to get fresh data everywhere
        // Update user in context with new avatar
        updateUser({ profilePicture: data.user.avatar_url || user?.profilePicture })
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.errors?.[0]?.id === 'expiration' || errorData.message === 'Signature has expired') {
            toast.error("Session expired. Please login again.")
            logout()
            return
          }
        }
        const error = await response.json().catch(() => ({}))
        toast.error(error.status?.message || "Failed to update profile")
      }
    } catch (error) {
      console.error("Profile update error:", error)
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    // Validate passwords
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords don't match!")
      return
    }

    if (passwordData.new_password.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    setIsSaving(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const response = await fetch(`${API_URL}/api/v1/users/change_password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: {
            current_password: passwordData.current_password,
            password: passwordData.new_password,
            password_confirmation: passwordData.confirm_password,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.status?.message || "Password changed successfully!")
        setIsChangingPassword(false)
        setPasswordData({ current_password: "", new_password: "", confirm_password: "" })
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.errors?.[0]?.id === 'expiration' || errorData.message === 'Signature has expired') {
            toast.error("Session expired. Please login again.")
            logout()
            return
          }
        }
        const error = await response.json().catch(() => ({}))
        toast.error(error.status?.message || error.errors?.[0] || "Failed to change password")
      }
    } catch (error) {
      console.error("Password change error:", error)
      toast.error("Failed to change password. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout activeTab="profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>
        </div>

        {/* Profile Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Preview"
                      width={80}
                      height={80}
                      className="rounded-full object-cover"
                    />
                  ) : user?.profilePicture ? (
                    <Image
                      src={user.profilePicture}
                      alt={user.name}
                      width={80}
                      height={80}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-purple-100 text-purple-700 text-2xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Upload button - only in edit mode */}
                {isEditing && (
                  <>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer hover:bg-black/60 transition-colors"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{user?.name}</h2>
                <p className="text-muted-foreground capitalize">
                  {user?.role} • {user?.hotelName}
                </p>
                {avatarPreview && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ New photo selected - click Save to update
                  </p>
                )}
              </div>
              {!isEditing && !isChangingPassword && (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    disabled={!isEditing}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={!isEditing}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="pl-9 bg-muted"
                    title="Email cannot be changed"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+1 (555) 000-0000"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">Zip Code</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Enter zip code"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Enter your address"
                  className="pl-9"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false)
                    setSelectedAvatar(null)
                    setAvatarPreview(null)
                  }}
                  variant="outline"
                  className="flex-1 bg-transparent"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isChangingPassword ? (
              <Button onClick={() => setIsChangingPassword(true)} variant="outline">
                Change Password
              </Button>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="current_password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.current_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, current_password: e.target.value })
                      }
                      placeholder="Enter current password"
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new_password"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.new_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, new_password: e.target.value })
                      }
                      placeholder="Enter new password"
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w- 4 text-muted-foreground" />
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirm_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirm_password: e.target.value })
                      }
                      placeholder="Confirm new password"
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handlePasswordChange} className="flex-1" disabled={isSaving}>
                    {isSaving ? "Changing..." : "Change Password"}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsChangingPassword(false)
                      setPasswordData({ current_password: "", new_password: "", confirm_password: "" })
                    }}
                    variant="outline"
                    className="flex-1 bg-transparent"
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/*Work Information */}
        <Card>
          <CardHeader>
            <CardTitle>Work Information</CardTitle>
            <CardDescription>Your role and property details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={user?.role || ""} disabled className="capitalize bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Property</Label>
                <Input value={user?.hotelName || ""} disabled className="bg-muted" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Contact your administrator to update work-related information
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
