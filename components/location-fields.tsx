"use client"

import { useEffect, useMemo, useRef } from "react"
import { getCountries, getLgas, getStates, getTowns } from "@softalxhq/location-selector"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const COUNTRIES = getCountries()
const SUPPORTED_CODES = new Set(COUNTRIES.map((c) => c.code.toUpperCase()))

export type LocationValue = {
  country: string
  state: string
  lga: string
  city: string
}

type LocationFieldsProps = {
  value: LocationValue
  onChange: (next: LocationValue) => void
  /** When true, attempt IP-based country default once on mount. */
  detectCountry?: boolean
  className?: string
  selectClassName?: string
  labelClassName?: string
  required?: boolean
}

async function detectCountryCode(): Promise<string | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = (await res.json()) as { country_code?: string }
    const code = data.country_code?.toUpperCase()
    if (code && SUPPORTED_CODES.has(code)) return code
    return null
  } catch {
    return null
  }
}

export function LocationFields({
  value,
  onChange,
  detectCountry = false,
  className,
  selectClassName = "h-11",
  labelClassName,
  required = true,
}: LocationFieldsProps) {
  const userChangedCountry = useRef(false)
  const geoAttempted = useRef(false)

  const states = useMemo(
    () => (value.country ? getStates(value.country) : []),
    [value.country],
  )
  const lgas = useMemo(
    () => (value.country && value.state ? getLgas(value.country, value.state) : []),
    [value.country, value.state],
  )
  const towns = useMemo(
    () =>
      value.country && value.state && value.lga
        ? getTowns(value.country, value.state, value.lga)
        : [],
    [value.country, value.state, value.lga],
  )

  useEffect(() => {
    if (!detectCountry || geoAttempted.current) return
    geoAttempted.current = true

    let cancelled = false
    void detectCountryCode().then((code) => {
      if (cancelled || !code || userChangedCountry.current) return
      onChange({ country: code, state: "", lga: "", city: "" })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for IP default
  }, [detectCountry])

  const setCountry = (country: string) => {
    userChangedCountry.current = true
    onChange({ country, state: "", lga: "", city: "" })
  }

  const setState = (state: string) => {
    onChange({ ...value, state, lga: "", city: "" })
  }

  const setLga = (lga: string) => {
    onChange({ ...value, lga, city: "" })
  }

  const setCity = (city: string) => {
    onChange({ ...value, city })
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>
      <div className="w-full min-w-0 space-y-2">
        <Label className={labelClassName}>
          Country {required && <span className="text-red-500">*</span>}
        </Label>
        <Select value={value.country || undefined} onValueChange={setCountry}>
          <SelectTrigger className={cn("w-full", selectClassName)}>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-0 space-y-2">
        <Label className={labelClassName}>
          State {required && <span className="text-red-500">*</span>}
        </Label>
        <Select
          value={value.state || undefined}
          onValueChange={setState}
          disabled={!value.country}
        >
          <SelectTrigger className={cn("w-full", selectClassName)}>
            <SelectValue placeholder={value.country ? "Select state" : "Select country first"} />
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s.name} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-0 space-y-2">
        <Label className={labelClassName}>
          LGA / District {required && <span className="text-red-500">*</span>}
        </Label>
        <Select
          value={value.lga || undefined}
          onValueChange={setLga}
          disabled={!value.state}
        >
          <SelectTrigger className={cn("w-full", selectClassName)}>
            <SelectValue placeholder={value.state ? "Select LGA / district" : "Select state first"} />
          </SelectTrigger>
          <SelectContent>
            {lgas.map((lga) => (
              <SelectItem key={lga.name} value={lga.name}>
                {lga.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-0 space-y-2">
        <Label className={labelClassName}>
          City / Town {required && <span className="text-red-500">*</span>}
        </Label>
        <Select
          value={value.city || undefined}
          onValueChange={setCity}
          disabled={!value.lga}
        >
          <SelectTrigger className={cn("w-full", selectClassName)}>
            <SelectValue placeholder={value.lga ? "Select city / town" : "Select LGA first"} />
          </SelectTrigger>
          <SelectContent>
            {towns.map((town) => (
              <SelectItem key={town} value={town}>
                {town}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
