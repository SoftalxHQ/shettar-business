"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { selectUser, selectIsLoading } from "@/lib/store/slices/authSlice"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

/** Avoid indefinite spinner if redux-persist rehydrate stalls on WebView. */
const LOADING_FALLBACK_MS = 2500

export default function Home() {
  const router = useRouter()
  const user = useAppSelector(selectUser)
  const isLoading = useAppSelector(selectIsLoading)
  const [forceReady, setForceReady] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setForceReady(true), LOADING_FALLBACK_MS)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!isLoading || forceReady) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, forceReady, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <LoadingSpinner size={40} />
    </div>
  )
}
