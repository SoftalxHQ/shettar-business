"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  printBookingReceiptToPreference,
  type BookingReceiptOptions,
} from "@/lib/booking-receipt"
import {
  printRestaurantOrderReceiptToPreference,
  type RestaurantOrderReceiptOptions,
} from "@/lib/restaurant-order-receipt"
import { isTauri } from "@/lib/tauri"
import {
  discoverPrinters,
  getSavedPrinterPreference,
  invokeOpenCashDrawer,
  invokeTestPrint,
  savePrinterPreference,
  type PrinterInfo,
  type PrinterPreference,
} from "@/lib/thermal-printer"

export type UsePrinterState = {
  available: boolean
  printers: PrinterInfo[]
  selected: PrinterInfo | null
  width: 32 | 48
  printing: boolean
  scanning: boolean
  error: string | null
  discover: () => Promise<void>
  selectPrinter: (printer: PrinterInfo | null) => void
  setWidth: (width: 32 | 48) => void
  clearPrinter: () => void
  addNetworkPrinter: (host: string) => void
  printBooking: (options: BookingReceiptOptions) => Promise<boolean>
  printRestaurantOrder: (options: RestaurantOrderReceiptOptions) => Promise<boolean>
  testPrint: () => Promise<boolean>
  openCashDrawer: () => Promise<boolean>
}

function preferenceFromState(
  selected: PrinterInfo | null,
  width: 32 | 48
): PrinterPreference | null {
  if (!selected) return null
  return { printer: selected, width }
}

export function usePrinter(): UsePrinterState {
  const available = isTauri()
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [selected, setSelected] = useState<PrinterInfo | null>(null)
  const [width, setWidthState] = useState<32 | 48>(32)
  const [printing, setPrinting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = getSavedPrinterPreference()
    if (saved) {
      setSelected(saved.printer)
      setWidthState(saved.width)
    }
  }, [])

  const persist = useCallback((printer: PrinterInfo | null, nextWidth: 32 | 48) => {
    savePrinterPreference(preferenceFromState(printer, nextWidth))
  }, [])

  const discover = useCallback(async () => {
    if (!available) {
      setError("Printer discovery is only available in the desktop app")
      return
    }
    setScanning(true)
    setError(null)
    try {
      const found = await discoverPrinters()
      setPrinters(found)
      if (found.length === 0) {
        toast.message("No USB/serial printers found", {
          description: "You can still add a network printer by IP address.",
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      toast.error("Could not scan for printers", { description: message })
    } finally {
      setScanning(false)
    }
  }, [available])

  const selectPrinter = useCallback(
    (printer: PrinterInfo | null) => {
      setSelected(printer)
      persist(printer, width)
      setError(null)
    },
    [persist, width]
  )

  const setWidth = useCallback(
    (next: 32 | 48) => {
      setWidthState(next)
      persist(selected, next)
    },
    [persist, selected]
  )

  const clearPrinter = useCallback(() => {
    setSelected(null)
    savePrinterPreference(null)
    setError(null)
    toast.success("Using system print dialog")
  }, [])

  const addNetworkPrinter = useCallback(
    (host: string) => {
      const trimmed = host.trim().replace(/^https?:\/\//, "")
      if (!trimmed) {
        toast.error("Enter a printer IP address")
        return
      }
      const port = trimmed.includes(":") ? trimmed : `${trimmed}:9100`
      const printer: PrinterInfo = {
        name: `Network Printer (${port})`,
        port,
        printer_type: "network",
      }
      setPrinters((prev) => {
        if (prev.some((p) => p.port === printer.port)) return prev
        return [...prev, printer]
      })
      setSelected(printer)
      persist(printer, width)
      toast.success("Network printer saved")
    },
    [persist, width]
  )

  const withPreference = useCallback(async (action: (pref: PrinterPreference) => Promise<void>) => {
    const pref = preferenceFromState(selected, width)
    if (!pref) {
      const message = "No printer selected"
      setError(message)
      toast.error(message, {
        description: "Open Printer in the menu to configure one.",
      })
      return false
    }
    setPrinting(true)
    setError(null)
    try {
      await action(pref)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      toast.error("Print failed", { description: message })
      return false
    } finally {
      setPrinting(false)
    }
  }, [selected, width])

  const printBooking = useCallback(
    async (options: BookingReceiptOptions) => {
      const ok = await withPreference(async (pref) => {
        await printBookingReceiptToPreference(pref, options)
      })
      if (ok) toast.success("Receipt printed")
      return ok
    },
    [withPreference]
  )

  const printRestaurantOrder = useCallback(
    async (options: RestaurantOrderReceiptOptions) => {
      const ok = await withPreference(async (pref) => {
        await printRestaurantOrderReceiptToPreference(pref, options)
      })
      if (ok) toast.success("Receipt printed")
      return ok
    },
    [withPreference]
  )

  const testPrint = useCallback(async () => {
    const ok = await withPreference(async (pref) => {
      await invokeTestPrint(pref)
    })
    if (ok) toast.success("Test print sent")
    return ok
  }, [withPreference])

  const openCashDrawer = useCallback(async () => {
    const ok = await withPreference(async (pref) => {
      await invokeOpenCashDrawer(pref)
    })
    if (ok) toast.success("Cash drawer opened")
    return ok
  }, [withPreference])

  return {
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
    printBooking,
    printRestaurantOrder,
    testPrint,
    openCashDrawer,
  }
}
