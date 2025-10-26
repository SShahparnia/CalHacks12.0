import { Search, Loader2, FileText } from "lucide-react"

interface HeroSectionProps {
  topic: string
  setTopic: (value: string) => void
  loading: boolean
  error: string | null
  generate: () => void
  goToDigest: () => void
}

export default function HeroSection({
  topic,
  setTopic,
  loading,
  error,
  generate,
  goToDigest,
}: HeroSectionProps) {
  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 text-balance tracking-tight">Kensa</h1>
          <p className="text-lg text-muted-foreground text-balance">
            AI-powered research paper digests from arXiv
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              className="w-full h-16 pl-14 pr-5 bg-background border-2 border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all text-lg"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Search research topics..."
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
          </div>

          <div className="flex gap-3 justify-center">
            <button
              className="h-12 px-8 bg-secondary text-foreground border border-border rounded-xl font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              onClick={goToDigest}
              disabled={loading || !topic.trim()}
            >
              <FileText className="h-4 w-4" />
              View Digest
            </button>
            <button
              className="h-12 px-8 bg-foreground text-background rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              onClick={generate}
              disabled={loading || !topic.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Fetching" : "Generate"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
