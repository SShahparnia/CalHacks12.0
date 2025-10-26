"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type DigestFrequency = "daily" | "weekly" | "monthly" | "yearly"

interface DigestFrequencySelectProps {
  value: DigestFrequency
  onChange: (value: DigestFrequency) => void
  disabled?: boolean
}

const frequencies: { value: DigestFrequency; label: string; days: number }[] = [
  { value: "daily", label: "Daily Digest", days: 1 },
  { value: "weekly", label: "Weekly Digest", days: 7 },
  { value: "monthly", label: "Monthly Digest", days: 30 },
  { value: "yearly", label: "Yearly Digest", days: 365 },
]

export function DigestFrequencySelect({
  value,
  onChange,
  disabled = false,
}: DigestFrequencySelectProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const selectedFrequency = frequencies.find((f) => f.value === value) || frequencies[1]

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (frequency: DigestFrequency) => {
    onChange(frequency)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors",
          "hover:bg-muted focus:outline-none",
          disabled && "opacity-50 cursor-not-allowed hover:bg-background",
        )}
      >
        <span>{selectedFrequency.label}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 min-w-[160px] rounded-lg border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-1">
            {frequencies.map((frequency) => (
              <button
                key={frequency.value}
                onClick={() => handleSelect(frequency.value)}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-xs outline-none transition-colors",
                  "hover:bg-muted focus:bg-muted",
                  value === frequency.value && "bg-muted"
                )}
              >
                <span className="flex-1 text-left">{frequency.label}</span>
                {value === frequency.value && (
                  <Check className="h-3 w-3 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { frequencies }
export type { DigestFrequency }
