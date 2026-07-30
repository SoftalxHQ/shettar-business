"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Save,
  Lock,
  Eye,
  EyeOff,
  Camera,
} from "lucide-react"
import { getAuthToken, getStoredBusinessId } from "@/lib/storage"
import { toast } from "sonner"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { api, ApiError } from "@/lib/api-client"

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
  const [imgError, setImgError] = useState(false)

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

  useEffect(() => {
    if (user) {
      const nameParts = user.name?.split(" ") || []
      const firstName = user.first_name || nameParts[0] || ""
      const lastName = user.last_name || nameParts.slice(1).join(" ") || ""

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
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }

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

      const submitData = new FormData()
      submitData.append("user[first_name]", formData.first_name)
      submitData.append("user[last_name]", formData.last_name)
      submitData.append("user[phone_number]", formData.phone_number)
      submitData.append("user[address]", formData.address)
      submitData.append("user[zip_code]", formData.zip_code)

      if (selectedAvatar) {
        submitData.append("avatar", selectedAvatar)
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

        let profilePic = data.user.avatar_url || user?.profilePicture
        if (profilePic && profilePic.startsWith("/")) {
          profilePic = `${API_URL}${profilePic}`
        }
        updateUser({
          profilePicture: profilePic,
          first_name: formData.first_name,
          last_name: formData.last_name,
          name: `${formData.first_name} ${formData.last_name}`.trim(),
          phone_number: formData.phone_number,
          address: formData.address,
          zip_code: formData.zip_code,
        })
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (
            errorData.errors?.[0]?.id === "expiration" ||
            errorData.message === "Signature has expired"
          ) {
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
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords don't match!")
      return
    }

    if (passwordData.new_password.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    const businessId = user?.businessId || getStoredBusinessId()
    if (!businessId) {
      toast.error("Business ID is missing. Please sign in again.")
      return
    }

    setIsSaving(true)
    try {
      const data = await api.changeMembershipPassword(
        businessId,
        passwordData.current_password,
        passwordData.new_password,
        passwordData.confirm_password,
      )
      toast.success(data.status?.message || "Password changed successfully!")
      setIsChangingPassword(false)
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" })
    } catch (error) {
      console.error("Password change error:", error)
      if (error instanceof ApiError) {
        if (error.status === 401) {
          const errorData = error.data
          if (
            errorData.errors?.[0]?.id === "expiration" ||
            errorData.message === "Signature has expired"
          ) {
            toast.error("Session expired. Please login again.")
            logout()
            return
          }
        }
        toast.error(
          error.data?.status?.message ||
            error.data?.errors?.[0] ||
            error.message ||
            "Failed to change password",
        )
      } else {
        toast.error("Failed to change password. Please try again.")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setSelectedAvatar(null)
    setAvatarPreview(null)
    if (user) {
      const nameParts = user.name?.split(" ") || []
      setFormData({
        first_name: user.first_name || nameParts[0] || "",
        last_name: user.last_name || nameParts.slice(1).join(" ") || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
        address: user.address || "",
        zip_code: user.zip_code || "",
      })
    }
  }

  return (
    <DashboardLayout activeTab="profile">
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Dashboard
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Profile</h1>
            <p className="text-xs text-slate-500">Manage your account details and password</p>
          </div>

          {!isEditing && !isChangingPassword && (
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
              className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0"
            >
              Edit profile
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Main column */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Identity */}
              <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <Avatar className="h-16 w-16">
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt="Preview"
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                          unoptimized
                        />
                      ) : user?.profilePicture && !imgError ? (
                        <Image
                          src={user.profilePicture}
                          alt={user.name}
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                          onError={() => setImgError(true)}
                          unoptimized={user.profilePicture.startsWith("data:")}
                        />
                      ) : (
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-semibold">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    {isEditing && (
                      <>
                        <label
                          htmlFor="avatar-upload"
                          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer hover:bg-black/60 transition-colors"
                        >
                          <Camera className="w-5 h-5 text-white" />
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

                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-slate-900 truncate">{user?.name}</h2>
                    <p className="text-xs text-slate-500 capitalize truncate">
                      {user?.role} · {user?.hotelName}
                    </p>
                    {avatarPreview && (
                      <p className="text-[11px] text-emerald-600 mt-1">
                        New photo selected — save to apply
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Personal information */}
              <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900">Personal information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Name, contact, and address</p>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name" className="text-xs">
                        First name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          id="first_name"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          disabled={!isEditing}
                          className="h-9 pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-xs">
                        Last name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          id="last_name"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          disabled={!isEditing}
                          className="h-9 pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          disabled
                          className="h-9 pl-9 bg-slate-50"
                          title="Email cannot be changed"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">Email cannot be changed</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone_number" className="text-xs">
                        Phone
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          id="phone_number"
                          type="tel"
                          value={formData.phone_number}
                          onChange={(e) =>
                            setFormData({ ...formData, phone_number: e.target.value })
                          }
                          disabled={!isEditing}
                          placeholder="+234..."
                          className="h-9 pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="address" className="text-xs">
                        Address
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Street address"
                          className="h-9 pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="zip_code" className="text-xs">
                        Zip code
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          id="zip_code"
                          value={formData.zip_code}
                          onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Zip / postal"
                          className="h-9 pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                      >
                        {isSaving ? (
                          <LoadingSpinner size={16} className="text-white" />
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            Save changes
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={cancelEditing}
                        variant="outline"
                        className="h-9 rounded-xl"
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Side column */}
            <div className="lg:w-80 xl:w-96 shrink-0 space-y-3">
              {/* Work info */}
              <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900">Work information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Role and property</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Role</Label>
                    <Input
                      value={user?.role || ""}
                      disabled
                      className="h-9 capitalize bg-slate-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Property</Label>
                    <Input value={user?.hotelName || ""} disabled className="h-9 bg-slate-50" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Contact your administrator to update work details.
                  </p>
                </div>
              </section>

              {/* Password */}
              <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Password</h2>
                    <p className="text-xs text-slate-500">
                      Password for {user?.hotelName || "this business"} only
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {!isChangingPassword ? (
                    <Button
                      onClick={() => setIsChangingPassword(true)}
                      variant="outline"
                      className="w-full h-9 rounded-xl"
                    >
                      Change password
                    </Button>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="current_password" className="text-xs">
                          Current password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            id="current_password"
                            type={showCurrentPassword ? "text" : "password"}
                            value={passwordData.current_password}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                current_password: e.target.value,
                              })
                            }
                            placeholder="Current password"
                            className="h-9 pl-9 pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="new_password" className="text-xs">
                          New password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            id="new_password"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.new_password}
                            onChange={(e) =>
                              setPasswordData({ ...passwordData, new_password: e.target.value })
                            }
                            placeholder="At least 8 characters"
                            className="h-9 pl-9 pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="confirm_password" className="text-xs">
                          Confirm password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            id="confirm_password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirm_password}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                confirm_password: e.target.value,
                              })
                            }
                            placeholder="Confirm new password"
                            className="h-9 pl-9 pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={handlePasswordChange}
                          disabled={isSaving}
                          className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                        >
                          {isSaving ? (
                            <LoadingSpinner size={16} className="text-white" />
                          ) : (
                            "Update"
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setIsChangingPassword(false)
                            setPasswordData({
                              current_password: "",
                              new_password: "",
                              confirm_password: "",
                            })
                          }}
                          variant="outline"
                          className="h-9 rounded-xl"
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
