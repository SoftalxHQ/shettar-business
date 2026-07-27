"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/business/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Printer</h1>
            <p className="text-sm text-muted-foreground">
              Configure a thermal receipt printer for bookings and restaurant orders.
            </p>
          </div>
        </div>

        {!available && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-4 w-4" />
                Desktop app required
              </CardTitle>
              <CardDescription>
                USB and network thermal printing is available in the Shettar Business desktop app.
                In the browser, receipts continue to use the system print dialog.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected printers</CardTitle>
            <CardDescription>
              Scan for USB/serial printers. Windows printers that only appear in the system spooler
              (no COM port) need a network address instead — usually{" "}
              <code className="text-xs">IP:9100</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void discover()}
                disabled={!available || scanning}
              >
                {scanning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Scan for printers
              </Button>
              {selected && (
                <Button type="button" variant="ghost" onClick={clearPrinter}>
                  Use system print dialog
                </Button>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {printers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No USB/serial printers found yet. Connect a printer and scan again, or add a
                network printer below.
              </p>
            ) : (
              <div className="space-y-2">
                {printers.map((printer) => {
                  const isSelected = selected?.port === printer.port
                  return (
                    <button
                      key={printer.port}
                      type="button"
                      onClick={() => selectPrinter(printer)}
                      className={cn(
                        "w-full text-left rounded-xl border p-4 transition-colors",
                        isSelected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-white border p-2">
                          <Printer className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{printer.name}</p>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{printer.port}</p>
                          <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                            {printer.printer_type}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Network printer</CardTitle>
            <CardDescription>
              Enter the printer IP. Port 9100 is used if you omit it (Epson / Xprinter / HOIN
              raw TCP).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="network-host">IP address</Label>
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
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => {
                  addNetworkPrinter(networkHost)
                  setNetworkHost("")
                }}
                disabled={!available || !networkHost.trim()}
              >
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paper width</CardTitle>
            <CardDescription>
              Most portable receipt printers use 58mm. Larger counter printers often use 80mm.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="paper-width"
                checked={width === 32}
                onChange={() => setWidth(32)}
              />
              58mm (32 characters)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="paper-width"
                checked={width === 48}
                onChange={() => setWidth(48)}
              />
              80mm (48 characters)
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
            <CardDescription>
              {selected
                ? `Selected: ${selected.name}`
                : "Select a printer above to enable test print and cash drawer."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void testPrint()}
              disabled={!available || !selected || printing}
            >
              {printing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Test print
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void openCashDrawer()}
              disabled={!available || !selected || printing}
            >
              <Banknote className="h-4 w-4 mr-2" />
              Open cash drawer
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
