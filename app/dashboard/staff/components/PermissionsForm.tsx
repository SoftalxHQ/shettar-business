"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { PERMISSION_LABELS, type Permissions } from "@/lib/staff-types"

interface PermissionsFormProps {
  permissions: Permissions
  onChange: (permissions: Permissions) => void
}

export function PermissionsForm({ permissions, onChange }: PermissionsFormProps) {
  const handleToggle = (category: string, permission: string, checked: boolean) => {
    onChange({
      ...permissions,
      [category]: {
        ...permissions[category as keyof Permissions],
        [permission]: checked,
      },
    })
  }

  return (
    <div className="space-y-6">
      {Object.entries(PERMISSION_LABELS).map(([category, config]) => {
        const categoryPermissions = permissions[category as keyof Permissions] || {}

        return (
          <div key={category} className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {config.title}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(config.permissions).map(([permKey, permLabel]) => {
                const isChecked = categoryPermissions[permKey as keyof typeof categoryPermissions] === true

                return (
                  <div key={permKey} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${category}-${permKey}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleToggle(category, permKey, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`${category}-${permKey}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {permLabel}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
