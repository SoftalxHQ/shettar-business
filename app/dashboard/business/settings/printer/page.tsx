"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { usePrinter } from "@/lib/hooks/usePrinter"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Printer,
  RefreshCw,
  Banknote,
  FileText,
  Monitor,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function PrinterSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [networkHost, setNetworkHost] = useState("")
  const {
    available,
    printers,
    selected,
    width,
    printing,
    scanning,
    error,
    discover,
    selectPrinter,
    setWidth,
    clearPrinter,
    addNetworkPrinter,
    testPrint,
    openCashDrawer,
  } = usePrinter()

  useEffect(() => {
    if (user && user.role !== "admin" && !user.permissions?.settings?.view) {
      router.push("/dashboard")
    }
  }, [user, router])

  useEffect(() => {
    if (available) {
      void discover()
    }
  }, [available, discover])

  return (
    <DashboardLayout activeTab="printer">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          <Link
            href="/dashboard/business/settings"
            className="mb-1 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Settings
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Printer</h1>
          <p className="text-xs text-slate-500">
            Thermal receipt printer for bookings and restaurant orders
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-3 lg:grid-cols-2">
            {!available && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3 lg:col-span-2">
                <div className="mb-1 flex items-center gap-2">
                  <Monitor className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-900">Desktop app required</p>
                </div>
                <p className="text-xs text-slate-500">
                  USB and network thermal printing is available in the Shettar Business desktop app.
                  In the browser, receipts continue to use the system print dialog.
                </p>
              </div>
            )}

            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:row-span-2">
              <div className="shrink-0 border-b border-slate-100 px-3.5 py-2.5">
                <h2 className="text-sm font-semibold text-slate-900">Connected printers</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Scan for USB/serial printers. Windows spooler-only devices need a network address
                  (usually <code className="text-[10px]">IP:9100</code>).
                </p>
              </div>
              <div className="space-y-3 p-3.5">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-slate-200 text-xs"
                    onClick={() => void discover()}
                    disabled={!available || scanning}
                  >
                    {scanning ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Scan for printers
                  </Button>
                  {selected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-slate-600"
                      onClick={clearPrinter}
                    >
                      Use system print dialog
                    </Button>
                  )}
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}

                {printers.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No USB/serial printers found yet. Connect a printer and scan again, or add a
                    network printer.
                  </p>
                ) : (
                  <div className="max-h-64 space-y-1.5 overflow-y-auto">
                    {printers.map((printer) => {
                      const isSelected = selected?.port === printer.port
                      return (
                        <button
                          key={printer.port}
                          type="button"
                          onClick={() => selectPrinter(printer)}
                          className={cn(
                            "w-full rounded-lg border p-2.5 text-left transition-colors",
                            isSelected
                              ? "border-indigo-300 bg-indigo-50/60"
                              : "border-slate-200 hover:bg-slate-50",
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 rounded-md border border-slate-100 bg-white p-1.5">
                              <Printer className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-semibold text-slate-900">{printer.name}</p>
                                {isSelected && (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                                )}
                              </div>
                              <p className="truncate text-[11px] text-slate-400">{printer.port}</p>
                              <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                {printer.printer_type}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-3.5 py-2.5">
                <h2 className="text-sm font-semibold text-slate-900">Network printer</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Enter the printer IP. Port 9100 is used if omitted.
                </p>
              </div>
              <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="network-host" className="text-xs text-slate-600">IP address</Label>
                  <Input
                    id="network-host"
                    placeholder="192.168.1.100 or 192.168.1.100:9100"
                    value={networkHost}
                    onChange={(e) => setNetworkHost(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addNetworkPrinter(networkHost)
                        setNetworkHost("")
                      }
                    }}
                    disabled={!available}
                    className="h-9 rounded-lg border-slate-200"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 rounded-lg bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
                  onClick={() => {
                    addNetworkPrinter(networkHost)
                    setNetworkHost("")
                  }}
                  disabled={!available || !networkHost.trim()}
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-3.5 py-2.5">
                <h2 className="text-sm font-semibold text-slate-900">Paper width</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Most portable printers use 58mm; counter printers often use 80mm.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 p-3.5">
                <button
                  type="button"
                  onClick={() => setWidth(32)}
                  className={cn(
                    "h-8 rounded-lg border px-3 text-xs font-medium transition-colors",
                    width === 32
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  58mm (32 chars)
                </button>
                <button
                  type="button"
                  onClick={() => setWidth(48)}
                  className={cn(
                    "h-8 rounded-lg border px-3 text-xs font-medium transition-colors",
                    width === 48
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  80mm (48 chars)
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
              <div className="border-b border-slate-100 px-3.5 py-2.5">
                <h2 className="text-sm font-semibold text-slate-900">Actions</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {selected
                    ? `Selected: ${selected.name}`
                    : "Select a printer above to enable test print and cash drawer."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 p-3.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-lg bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
                  onClick={() => void testPrint()}
                  disabled={!available || !selected || printing}
                >
                  {printing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Test print
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-slate-200 text-xs"
                  onClick={() => void openCashDrawer()}
                  disabled={!available || !selected || printing}
                >
                  <Banknote className="mr-1.5 h-3.5 w-3.5" />
                  Open cash drawer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
