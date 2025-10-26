"use client"

import { Search, Loader2 } from "lucide-react"

interface BrowseSearchBoxProps {
  topic: string
  setTopic: (topic: string) => void
  loading: boolean
  onSearch: () => void
  onGoToDigest: () => void
  disabled?: boolean
}

export function BrowseSearchBox({
  topic,
  setTopic,
  loading,
  onSearch,
  onGoToDigest,
  disabled = false,
}: BrowseSearchBoxProps) {
  return (
    <div className="relative">
      <div className="flex flex-col border-2 border-border rounded-2xl bg-card hover:border-primary/50 focus-within:border-primary transition-colors overflow-hidden">
        {/* Main text input area */}
        <div className="relative flex items-start gap-3 p-4">
          <div className="flex-1">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  if (topic.trim() && !disabled && !loading) {
                    onSearch()
                  }
                }
              }}
              placeholder="Search for research papers by topic..."
              className="w-full min-h-[60px] bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground"
              rows={3}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="h-8 px-3 rounded-lg text-xs text-muted-foreground flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search button */}
            <button
              onClick={onSearch}
              disabled={disabled || !topic.trim() || loading}
              className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Search Papers (Enter)"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
