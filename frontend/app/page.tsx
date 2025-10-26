"use client"
import { ReactNode, useEffect, useMemo, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createDigest, listPapers } from "../lib/fetch"
import { PaperCard, DigestPaper } from "../components/paper-card"
import { Search, Loader2 } from "lucide-react"
import HeroSection from "../components/HeroSection"
import { DigestFrequencySelect, type DigestFrequency, frequencies } from "../components/digest-frequency-select"
import { BrowseSearchBox } from "../components/browse-search-box"
import HighlightToSpeech from "../components/HighlightToSpeech"
import { NavBar } from "../components/NavBar"
import { IBM_Plex_Mono } from "next/font/google"

const ibmPlexMono = IBM_Plex_Mono({ 
  weight: ['400', '500', '700'],
  subsets: ["latin"]
})

const DEFAULT_TOP_K = 5

type Cluster = {
  label?: string
  bullets?: string[]
  topPapers?: DigestPaper[]
}

type DigestResponse = {
  digestId?: string
  summary?: string
  clusters?: Cluster[]
  audioUrl?: string | null
  days?: number
  period?: "weekly" | "monthly"
  topK?: number
}

function HomeView() {
  const [topic, setTopic] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function generate() {
    const query = topic.trim()
    if (!query) return
    const params = new URLSearchParams({
      view: "browse",
      topic: query,
    })
    router.push(`/?${params.toString()}`)
  }

  function goToDigest() {
    const query = topic.trim()
    if (!query) return
    const params = new URLSearchParams({
      view: "digest",
      topic: query,
      period: "weekly",
      days: "7",
    })
    router.push(`/?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-background">
      <NavBar active="home" />
      <HeroSection
        topic={topic}
        setTopic={setTopic}
        loading={loading}
        error={error}
        generate={generate}
        goToDigest={goToDigest}
      />
    </main>
  )
}

function BrowseView() {
  const searchParams = useSearchParams()
  const initialTopic = searchParams.get("topic") ?? ""
  const [topic, setTopic] = useState(initialTopic)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [papers, setPapers] = useState<DigestPaper[]>([])
  const router = useRouter()

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic)
      void generate(initialTopic)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopic])

  async function generate(queryTopic?: string) {
    const query = (queryTopic ?? topic).trim()
    if (!query) return
    setLoading(true)
    setError(null)
    setPapers([])
    try {
      const results = await listPapers(query, 7, 10)
      setPapers(results)
      if (results.length === 0) {
        setError("No papers found")
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch papers")
    } finally {
      setLoading(false)
    }
  }

  function goToDigest() {
    const query = topic.trim()
    if (!query) return
    const params = new URLSearchParams({
      view: "digest",
      topic: query,
      period: "weekly",
      days: "7",
    })
    router.push(`/?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <NavBar active="browse" />

      <div className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-3xl px-6">
          <div className="text-center mb-12">
            <h1 className={`text-6xl font-semibold mb-3 ${ibmPlexMono.className}`}>PaperLink</h1>
            <p className="text-lg text-muted-foreground">Find the latest arXiv papers in seconds.</p>
          </div>

          <div className="space-y-4">
            <BrowseSearchBox
              topic={topic}
              setTopic={setTopic}
              loading={loading}
              onSearch={generate}
              onGoToDigest={goToDigest}
              disabled={loading}
            />

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {papers.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pb-16">
          <div className="space-y-6">
            {papers.map((paper, idx) => (
              <PaperCard
                key={paper.arxivId ?? paper.id ?? idx}
                paper={paper}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

function escapeKey(i: number) {
  return `mk-${i}-${Math.random().toString(36).slice(2, 7)}`
}

// Render [text](url), **bold**, *italic*, and bare http(s):// links

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let rest = text
  let key = 0


  // One pass for links, bold, italics, and bare URLs
  // Order matters: link -> bold -> italic -> url
  const patterns: { type: "link" | "bold" | "italic" | "url"; re: RegExp }[] = [
    { type: "link",  re: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/ },
    { type: "bold",  re: /\*\*([^*]+)\*\*/ },
    { type: "italic",re: /\*([^*]+)\*/ },
    { type: "url",   re: /(https?:\/\/[^\s)]+)(?!\))/ },
  ]

  // Greedy incremental parse
  while (rest.length) {
    let earliestIdx = -1
    let earliestMatch: RegExpMatchArray | null = null
    let earliestType: typeof patterns[number]["type"] | null = null

    for (const { type, re } of patterns) {
      const m = rest.match(re)
      if (!m) continue
      const idx = m.index ?? -1
      if (idx >= 0 && (earliestIdx < 0 || idx < earliestIdx)) {
        earliestIdx = idx
        earliestMatch = m
        earliestType = type
      }
    }

    if (!earliestMatch || earliestType == null) {
      // No more patterns → push remainder and break
      nodes.push(rest)
      break
    }

    // Push plain text before the match
    if (earliestIdx > 0) nodes.push(rest.slice(0, earliestIdx))

    const k = escapeKey(key++)
    const [full, g1, g2] = earliestMatch

    switch (earliestType) {
      case "link":
        nodes.push(
          <a
            key={k}
            href={g2}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-muted-foreground hover:decoration-current underline-offset-2"
          >
            {g1}
          </a>
        )
        break
      case "bold":
        nodes.push(<strong key={k}>{g1}</strong>)
        break
      case "italic":
        nodes.push(<em key={k}>{g1}</em>)
        break
      case "url":
        nodes.push(
          <a
            key={k}
            href={g1}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-muted-foreground hover:decoration-current underline-offset-2"
          >
            {g1}
          </a>
        )
        break
    }

    // Advance the cursor
    rest = rest.slice((earliestMatch.index ?? 0) + full.length)
  }

  return nodes
}

function buildDigestSummaryNodes(summary: string): ReactNode[] {
  const lines = summary.split("\n")
  const nodes: ReactNode[] = []
  let list: string[] = []
  let listType: "ordered" | "unordered" | null = null
  let key = 0

  const flushList = () => {

    if (list.length === 0) return
    const listKey = key++
    if (listType === "ordered") {
      nodes.push(
        <ol
          key={`list-${listKey}`}
          className="list-decimal list-inside space-y-1 text-muted-foreground"
        >
          {list.map((item, idx) => (
            <li key={`li-${listKey}-${idx}`} className="leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      )
    } else {
      nodes.push(
        <ul
          key={`list-${listKey}`}
          className="list-disc list-inside space-y-1 text-muted-foreground"
        >
          {list.map((item, idx) => (

            <li key={`li-${listKey}-${idx}`} className="leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>

      )
    }
    list = []
    listType = null
  }

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (!trimmed) {
      flushList()
      continue
    }


    // Ordered list line: "1. foo"
    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType && listType !== "ordered") flushList()
      listType = "ordered"
      list.push(trimmed.replace(/^\d+\.\s+/, ""))
      continue
    }

    // Unordered list line: "- foo" or "* foo"
    if (/^[-*]\s+/.test(trimmed)) {
      if (listType && listType !== "unordered") flushList()
      listType = "unordered"
      list.push(trimmed.replace(/^[-*]\s+/, ""))
      continue
    }

    flushList()

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h4 key={`h4-${key++}`} className="text-base font-semibold text-foreground mt-2">
          {renderInlineMarkdown(trimmed.replace(/^###\s+/, ""))}
        </h4>
      )
    } else if (trimmed.startsWith("## ")) {
      nodes.push(
        <h3 key={`h3-${key++}`} className="text-lg font-semibold text-foreground mt-2">
          {renderInlineMarkdown(trimmed.replace(/^##\s+/, ""))}
        </h3>
      )
    } else if (trimmed.startsWith("# ")) {
      nodes.push(
        <h2 key={`h2-${key++}`} className="text-2xl font-semibold text-foreground mt-2">
          {renderInlineMarkdown(trimmed.replace(/^#\s+/, ""))}
        </h2>
      )
    } else {
      nodes.push(
        <p key={`p-${key++}`} className="text-muted-foreground leading-relaxed">
          {renderInlineMarkdown(trimmed)}
        </p>
      )
    }
  }

  flushList()
  return nodes
}

function DigestSummary({ text }: { text: string }) {
  const content = useMemo(() => buildDigestSummaryNodes(text), [text])
  return <div className="space-y-4">{content}</div>
}

function DigestView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTopic = searchParams.get("topic") ?? ""

  const [topic, setTopic] = useState(initialTopic)
  const [frequency, setFrequency] = useState<DigestFrequency>("weekly")
  const [digest, setDigest] = useState<DigestResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentTopics, setRecentTopics] = useState<string[]>([])
  const [showRecentTopics, setShowRecentTopics] = useState(false)

  // Load recent topics from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("paperlink-recent-topics")
    if (stored) {
      try {
        setRecentTopics(JSON.parse(stored))
      } catch {
        // Ignore parse errors
      }
    }
    
    // Keyboard shortcut for recent topics
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowRecentTopics(true)
      }
    }
    
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Save topic to recent topics
  const saveToRecent = useCallback((newTopic: string) => {
    if (!newTopic.trim()) return
    setRecentTopics((prev) => {
      const updated = [newTopic, ...prev.filter((t) => t !== newTopic)].slice(0, 10)
      localStorage.setItem("paperlink-recent-topics", JSON.stringify(updated))
      return updated
    })
  }, [])

  // Main generate digest function
  async function generateDigest() {
    const query = topic.trim()
    if (!query) return
    
    const selectedFreq = frequencies.find((f) => f.value === frequency)
    const days = selectedFreq?.days || 7

    setLoading(true)
    setError(null)
    
    try {
      // Map frequency to period type that backend expects
      let period: "weekly" | "monthly" = "weekly"
      if (frequency === "monthly" || frequency === "yearly") {
        period = "monthly"
      }
      
      const data = await createDigest(query, { 
        days, 
        topK: DEFAULT_TOP_K, 
        period 
      })
      setDigest(data as DigestResponse)
      saveToRecent(query)
      
      // Update URL
      const params = new URLSearchParams({
        view: "digest",
        topic: query,
        period: frequency,
        days: String(days),
      })
      router.replace(`/?${params.toString()}`)
    } catch (e: any) {
      setDigest(null)
      setError(e?.message || "Failed to generate digest")
    } finally {
      setLoading(false)
    }
  }

  // Check if we have digest data to display
  const digestSummary = typeof digest?.summary === "string" ? digest.summary : ""
  const digestClusters = Array.isArray(digest?.clusters) ? (digest?.clusters as Cluster[]) : []
  const hasDigest = digestClusters.length > 0 || digestSummary.trim().length > 0

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <NavBar active="digest" />

      {/* Recent Topics Modal */}
      {showRecentTopics && recentTopics.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[20vh] animate-in fade-in"
          onClick={() => setShowRecentTopics(false)}
        >
          <div 
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Recent Topics</h3>
              <button
                onClick={() => setShowRecentTopics(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {recentTopics.map((recentTopic, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTopic(recentTopic)
                    setShowRecentTopics(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3 border-b border-border last:border-b-0"
                >
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1">{recentTopic}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-3xl px-6">
          <div className="text-center mb-12">
            <h1 className={`text-6xl font-semibold mb-3 ${ibmPlexMono.className}`}>PaperLink</h1>
            <p className="text-lg text-muted-foreground">Analyze any topic and generate concise digests.</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <div className="flex flex-col border-2 border-border rounded-2xl bg-card hover:border-primary/50 focus-within:border-primary transition-colors overflow-hidden">
                <div className="relative flex items-start gap-3 p-4">
                  <div className="flex-1">
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          if (topic.trim() && !loading) {
                            generateDigest()
                          }
                        }
                      }}
                      placeholder="Search topics or paste a query…"
                      className="w-full min-h-[60px] bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground"
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <DigestFrequencySelect
                      value={frequency}
                      onChange={(newFreq) => {
                        setFrequency(newFreq)
                        if (topic.trim() && !loading) {
                          const selected = frequencies.find((f) => f.value === newFreq)
                          const days = selected?.days || 7
                          let period: "weekly" | "monthly" = "weekly"
                          if (newFreq === "monthly" || newFreq === "yearly") {
                            period = "monthly"
                          }

                          void (async () => {
                            setLoading(true)
                            setError(null)
                            try {
                              const data = await createDigest(topic.trim(), {
                                days,
                                topK: DEFAULT_TOP_K,
                                period,
                              })
                              setDigest(data)
                              const params = new URLSearchParams({
                                view: "digest",
                                topic,
                                period: newFreq,
                                days: String(days),
                              })
                              router.replace(`/?${params.toString()}`)
                            } catch (e: any) {
                              setDigest(null)
                              setError(e?.message || "Failed to generate digest")
                            } finally {
                              setLoading(false)
                            }
                          })()
                        }
                      }}
                      disabled={loading}
                    />

                    {recentTopics.length > 0 && (
                      <button
                        onClick={() => setShowRecentTopics(true)}
                        className="h-8 px-3 rounded-lg hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                        title="Recent topics (⌘K)"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recent
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={generateDigest}
                      disabled={loading || !topic.trim()}
                      className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      title="Generate Digest (Enter)"
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

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {hasDigest && (
        <div className="mx-auto max-w-4xl px-6 pb-16 space-y-12">
          <section className="border rounded-lg p-6 space-y-4 bg-card/30">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-foreground">
                {frequency.charAt(0).toUpperCase() + frequency.slice(1)} Digest
              </h2>
              {digest?.digestId && <span className="text-xs text-muted-foreground">#{digest.digestId}</span>}
            </div>
            {digestSummary ? <DigestSummary text={digestSummary} /> : <p className="text-muted-foreground">No summary available.</p>}
            {digest?.audioUrl && (
              <audio controls className="w-full mt-2">
                <source src={digest.audioUrl} />
                Your browser does not support the audio element.
              </audio>
            )}
          </section>

          {digestClusters.map((cluster, clusterIdx) => {
            const clusterLabel = cluster.label || `Cluster ${clusterIdx + 1}`
            const topPapers = Array.isArray(cluster.topPapers) ? cluster.topPapers : []

            return (
              <section
                key={`digest-cluster-${clusterIdx}-${clusterLabel}`}
                className="border rounded-lg p-5 space-y-5"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-xl font-semibold text-foreground">{clusterLabel}</h3>
                    {topPapers.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {topPapers.length} featured paper{topPapers.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {Array.isArray(cluster.bullets) && cluster.bullets.length > 0 && (
                    <ul className="space-y-2 text-muted-foreground">
                      {cluster.bullets.map((bullet, bulletIdx) => (
                        <li
                          key={`digest-cluster-${clusterIdx}-bullet-${bulletIdx}`}
                          className="flex gap-2 items-start"
                        >
                          <span className="text-primary mt-1">•</span>
                          <span className="leading-relaxed">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {topPapers.length > 0 ? (
                  <div className="space-y-5">
                    {topPapers.map((paper, paperIdx) => (
                      <PaperCard
                        key={`digest-cluster-${clusterIdx}-paper-${paper.arxivId ?? paper.id ?? paperIdx}`}
                        paper={paper}
                        clusterLabel={clusterLabel}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No highlighted papers were returned for this cluster.
                  </p>
                )}
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}

export default function Page() {
  const searchParams = useSearchParams()
  const view = searchParams.get("view")

  if (!view) {
    return (
      <>
        <HomeView />
        <HighlightToSpeech />
      </>
    )
  }

  return (
    <>
      {view === "digest" ? <DigestView /> : <BrowseView />}
      <HighlightToSpeech />
    </>
  )
}
