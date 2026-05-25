"use client"

import { Label } from "@/components/ui/label"
import { PERMISSION_PRESETS } from "@/lib/staff-types"
import { Briefcase, ChefHat, Crown, Settings, Users, UtensilsCrossed } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface PermissionPresetSelectorProps {
  selected: keyof typeof PERMISSION_PRESETS
  onSelect: (preset: keyof typeof PERMISSION_PRESETS) => void
  presets?: (keyof typeof PERMISSION_PRESETS)[]
}

const PRESET_ICONS: Record<keyof typeof PERMISSION_PRESETS, LucideIcon> = {
  full_access: Crown,
  manager: Briefcase,
  kitchen: ChefHat,
  restaurant_staff: UtensilsCrossed,
  front_desk: Users,
  custom: Settings,
}

export function PermissionPresetSelector({ selected, onSelect, presets }: PermissionPresetSelectorProps) {
  const keys = presets ?? (Object.keys(PERMISSION_PRESETS) as (keyof typeof PERMISSION_PRESETS)[])

  return (
    <div className="grid gap-3">
      {keys.map((key) => {
        const preset = PERMISSION_PRESETS[key]
        const Icon = PRESET_ICONS[key as keyof typeof PERMISSION_PRESETS] ?? Settings
        const isSelected = selected === key

        return (
          <label
            key={String(key)}
            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
              }`}
          >
            <input
              type="radio"
              name="preset"
              value={key}
              checked={isSelected}
              onChange={() => onSelect(key as keyof typeof PERMISSION_PRESETS)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-5 h-5 ${isSelected ? "text-blue-600" : "text-muted-foreground"}`} />
                <span className={`font-semibold ${isSelected ? "text-blue-900" : ""}`}>
                  {preset.name}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{preset.description}</p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
