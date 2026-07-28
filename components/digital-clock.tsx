"use client"

import { useEffect, useState } from "react"
import localFont from "next/font/local"
import { cn } from "@/lib/utils"

/** Digital-7 by Style-7 — https://www.fontspace.com/digital-7-font-f7087 */
const digital7 = localFont({
  src: "../public/fonts/digital-7/digital-7-mono.ttf",
  display: "swap",
  variable: "--font-digital-7",
})

type DigitalClockProps = {
  className?: string
}

export function DigitalClock({ className }: DigitalClockProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const time = now
    ? now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--"

  const date = now
    ? now.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "\u00a0"

  return (
    <div
      className={cn("flex flex-col items-center justify-center text-center", className)}
      aria-live="polite"
      aria-atomic="true"
    >
      <p
        className={cn(
          digital7.className,
          "text-5xl sm:text-6xl lg:text-7xl tabular-nums tracking-wider text-slate-900 leading-none",
        )}
      >
        {time}
      </p>
      <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        {date}
      </p>
    </div>
  )
}
