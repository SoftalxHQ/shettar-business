"use client"

import { useEffect, useState } from "react"
import {
  DesktopDownloadPromoCard,
  dismissDesktopPromo,
  isDesktopPromoDismissed,
} from "@/components/desktop-download-promo-card"
import { DesktopDownloadModal } from "@/components/desktop-download-modal"
import { isTauri } from "@/lib/tauri"

/** Floating desktop download promo for browser login/signup. */
export function DesktopDownloadPromoHost() {
  const [dismissed, setDismissed] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (isTauri()) {
      setDismissed(true)
      return
    }
    setDismissed(isDesktopPromoDismissed())
  }, [])

  if (isTauri()) return null

  return (
    <>
      <DesktopDownloadPromoCard
        dismissed={dismissed}
        onDismiss={() => {
          dismissDesktopPromo()
          setDismissed(true)
        }}
        onDownload={() => setModalOpen(true)}
      />
      <DesktopDownloadModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
