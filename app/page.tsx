"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { selectUser, selectIsLoading } from "@/lib/store/slices/authSlice"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function Home() {
  const router = useRouter()
  const user = useAppSelector(selectUser)
  const isLoading = useAppSelector(selectIsLoading)

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size={40} />
    </div>
  )
}
