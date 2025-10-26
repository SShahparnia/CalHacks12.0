"use client"

import { Search, Loader2 } from "lucide-react"

interface HeroSectionProps {
  topic: string
  setTopic: (topic: string) => void
  loading: boolean
  error: string | null
  generate: () => void
  goToDigest: () => void
}

export default function HeroSection({ topic, setTopic, loading, error, generate, goToDigest }: HeroSectionProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-background px-6 py-16">
      <div className="text-center space-y-8 max-w-2xl w-full">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-balance tracking-tight">Kensa</h1>
          <p className="text-lg text-muted-foreground text-balance">AI-powered research paper digests from arXiv</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-card/40">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              className="w-full bg-transparent focus:outline-none text-base"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. multimodal large language models"
              onKeyDown={(e) => e.key === "Enter" && generate()}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={generate}
              disabled={loading || !topic.trim()}
              className="h-12 px-8 bg-secondary text-secondary-foreground border border-border rounded-xl font-medium hover:bg-muted transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Browse"
              )}
            </button>

            <button
              onClick={goToDigest}
              disabled={loading || !topic.trim()}
              className="h-12 px-8 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Digest
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
