"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type DigestFrequency = "daily" | "weekly" | "monthly"

interface DigestFrequencySelectProps {
  value: DigestFrequency
  onChange: (value: DigestFrequency) => void
  disabled?: boolean
}

const frequencies: { value: DigestFrequency; label: string; days: number }[] = [
  { value: "daily", label: "Daily Digest", days: 1 },
  { value: "weekly", label: "Weekly Digest", days: 7 },
  { value: "monthly", label: "Monthly Digest", days: 30 },
]

export function DigestFrequencySelect({
  value,
  onChange,
  disabled = false,
}: DigestFrequencySelectProps) {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 })

  const selectedFrequency = frequencies.find((f) => f.value === value) || frequencies[1]

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }, [open])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleScroll = () => {
      if (open && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        })
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("scroll", handleScroll, true)
    window.addEventListener("resize", handleScroll)
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("scroll", handleScroll, true)
      window.removeEventListener("resize", handleScroll)
    }
  }, [open])

  const handleSelect = (frequency: DigestFrequency) => {
    onChange(frequency)
    setOpen(false)
  }

  const dropdownContent = open && mounted ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '180px',
        zIndex: 9999,
        animation: 'slideDown 0.2s ease-out',
      }}
      className="rounded-xl border bg-gray-950 overflow-hidden"
    >
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div className="p-1.5">
        {frequencies.map((frequency, index) => (
          <button
            key={frequency.value}
            onClick={() => handleSelect(frequency.value)}
            style={{
              animationDelay: `${index * 30}ms`,
            }}
            className={cn(
              "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all duration-200",
              "text-gray-200 hover:text-white",
              value === frequency.value 
                ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border" 
                : "hover:bg-white/5 border border-transparent"
            )}
          >
            <span className="flex-1 text-left font-medium">{frequency.label}</span>
            {value === frequency.value && (
              <Check className="h-4 w-4 text-blue-400 animate-in zoom-in-50" />
            )}
          </button>
        ))}
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        ref={buttonRef}
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

      {mounted && typeof document !== 'undefined' && dropdownContent && 
        createPortal(dropdownContent, document.body)
      }
    </>
  )
}

export { frequencies }
export type { DigestFrequency }