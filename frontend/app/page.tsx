"use client"
import { ReactNode, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createDigest, getLatest, listPapers } from "../lib/fetch"
import { PaperCard, DigestPaper } from "../components/paper-card"
import { Search, Loader2, FileText, Github, RefreshCw } from "lucide-react"

const SAMPLE_PAPERS = [
  {
    title: "Attention Is All You Need",
    authors: "Vaswani et al.",
    published: "2017-06-12",
    url: "https://arxiv.org/abs/1706.03762",
    arxivId: "1706.03762",
    cluster: "Transformer Architecture",
    summary:
      "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.",
  },
  {
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: "Devlin et al.",
    published: "2018-10-11",
    url: "https://arxiv.org/abs/1810.04805",
    arxivId: "1810.04805",
    cluster: "Language Models",
    summary:
      "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
  },
  {
    title: "Denoising Diffusion Probabilistic Models",
    authors: "Ho et al.",
    published: "2020-06-19",
    url: "https://arxiv.org/abs/2006.11239",
    arxivId: "2006.11239",
    cluster: "Generative Models",
    summary:
      "We present high quality image synthesis results using diffusion probabilistic models, a class of latent variable models inspired by considerations from nonequilibrium thermodynamics. Our best results are obtained by training on a weighted variational bound designed according to a novel connection between diffusion probabilistic models and denoising score matching with Langevin dynamics.",
  },
]

const WEEKLY_DAYS = 7
const MONTHLY_DAYS = 30
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

function AppNav({ active }: { active: "browse" | "digest" }) {
  const baseClasses =
    "px-3 py-1.5 text-sm font-medium rounded-full border border-transparent transition-colors hover:bg-muted"
  const activeClasses = "text-primary bg-primary/10 border-primary/30"
  const inactiveClasses = "text-foreground hover:text-primary"

  return (
    <nav className="fixed top-6 right-6 z-50">
      <div className="flex items-center gap-1 px-3 py-2 bg-secondary/80 backdrop-blur-lg border border-border rounded-full shadow-lg">
        <Link href="/?view=browse" className={`${baseClasses} ${active === "browse" ? activeClasses : inactiveClasses}`}>
          Browse
        </Link>
        <Link href="/?view=digest" className={`${baseClasses} ${active === "digest" ? activeClasses : inactiveClasses}`}>
          Digest
        </Link>
        <div className="w-px h-4 bg-border" />
        <a
          href="https://github.com/rohankhatri7/CalHacks12.0"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-full hover:bg-muted"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
      </div>
    </nav>
  )
}

function BrowseView() {
  const [topic, setTopic] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [papers, setPapers] = useState<DigestPaper[]>([])
  const [showSamples, setShowSamples] = useState(true)
  const router = useRouter()

  async function generate() {
    const query = topic.trim()
    if (!query) return
    setLoading(true)
    setError(null)
    setShowSamples(false)
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

  const displayPapers: DigestPaper[] = showSamples ? SAMPLE_PAPERS : papers

  return (
    <main className="min-h-screen bg-background">
      <AppNav active="browse" />

      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 text-balance tracking-tight">Kensa</h1>
            <p className="text-lg text-muted-foreground text-balance">AI-powered research paper digests from arXiv</p>
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

      {displayPapers.length > 0 ? (
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="space-y-6">
            {displayPapers.map((paper, idx) => (
              <PaperCard
                key={paper.arxivId ?? paper.id ?? idx}
                paper={paper}
                clusterLabel={showSamples ? paper.cluster : undefined}
              />
            ))}
          </div>

          {showSamples && (
            <div className="mt-8 p-4 bg-muted/50 border border-border rounded-xl text-center">
              <p className="text-sm text-muted-foreground">
                Showing sample papers. Enter a topic above to fetch the latest results.
              </p>
            </div>
          )}
        </div>
      ) : (
        !loading && (
          <div className="mx-auto max-w-5xl px-6 py-24 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No papers found</h2>
            <p className="text-muted-foreground">Try another topic or adjust your search keywords.</p>
          </div>
        )
      )}
    </main>
  )
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
        <ol key={`list-${listKey}`} className="space-y-2 text-muted-foreground list-decimal list-inside">
          {list.map((item, idx) => (
            <li key={`list-${listKey}-${idx}`} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ol>,
      )
    } else {
      nodes.push(
        <ul key={`list-${listKey}`} className="space-y-2 text-muted-foreground">
          {list.map((item, idx) => (
            <li key={`list-${listKey}-${idx}`} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>,
      )
    }
    list = []
    listType = null
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
      continue
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType && listType !== "ordered") {
        flushList()
      }
      listType = "ordered"
      list.push(trimmed.replace(/^\d+\.\s+/, ""))
      continue
    }
    if (/^[-*]\s+/.test(trimmed)) {
      if (listType && listType !== "unordered") {
        flushList()
      }
      listType = "unordered"
      list.push(trimmed.replace(/^[-*]\s+/, ""))
      continue
    }
    flushList()
    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h4 key={`h4-${key++}`} className="text-base font-semibold text-foreground">
          {trimmed.replace(/^###\s+/, "")}
        </h4>,
      )
    } else if (trimmed.startsWith("## ")) {
      nodes.push(
        <h3 key={`h3-${key++}`} className="text-lg font-semibold text-foreground">
          {trimmed.replace(/^##\s+/, "")}
        </h3>,
      )
    } else if (trimmed.startsWith("# ")) {
      nodes.push(
        <h2 key={`h2-${key++}`} className="text-2xl font-semibold text-foreground">
          {trimmed.replace(/^#\s+/, "")}
        </h2>,
      )
    } else {
      nodes.push(
        <p key={`p-${key++}`} className="text-muted-foreground leading-relaxed">
          {trimmed}
        </p>,
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
  const initialPeriodParam = searchParams.get("period") === "monthly" ? "monthly" : "weekly"
  const rawDays = Number.parseInt(searchParams.get("days") ?? "", 10)
  const initialDays = Number.isNaN(rawDays) ? (initialPeriodParam === "monthly" ? MONTHLY_DAYS : WEEKLY_DAYS) : rawDays

  const [topic, setTopic] = useState(initialTopic)
  const [weeklyDigest, setWeeklyDigest] = useState<DigestResponse | null>(null)
  const [monthlyDigest, setMonthlyDigest] = useState<DigestResponse | null>(null)
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [weeklyError, setWeeklyError] = useState<string | null>(null)
  const [monthlyError, setMonthlyError] = useState<string | null>(null)

  function updateRoute(params: Record<string, string>) {
    const search = new URLSearchParams({ view: "digest", ...params })
    router.replace(`/?${search.toString()}`)
  }

  async function loadLatestWeekly(requestTopic?: string, days = WEEKLY_DAYS, skipRouting = false) {
    const query = (requestTopic ?? topic).trim()
    if (!query) return
    const range = days > 0 ? days : WEEKLY_DAYS
    setWeeklyLoading(true)
    setWeeklyError(null)
    try {
      const data = await getLatest(query, { days: range })
      setWeeklyDigest(data as DigestResponse)
      setTopic(query)
      if (!skipRouting) {
        updateRoute({ topic: query, period: "weekly", days: String(range) })
      }
    } catch (e: any) {
      setWeeklyDigest(null)
      setWeeklyError(e?.message || "No cached digest found for this topic")
    } finally {
      setWeeklyLoading(false)
    }
  }

  async function generateWeeklyDigest() {
    const query = topic.trim()
    if (!query) return
    setWeeklyLoading(true)
    setWeeklyError(null)
    try {
      const data = await createDigest(query, { days: WEEKLY_DAYS, topK: DEFAULT_TOP_K, period: "weekly" })
      setWeeklyDigest(data as DigestResponse)
      updateRoute({ topic: query, period: "weekly", days: String(WEEKLY_DAYS) })
    } catch (e: any) {
      setWeeklyDigest(null)
      setWeeklyError(e?.message || "Failed to generate digest")
    } finally {
      setWeeklyLoading(false)
    }
  }

  async function loadLatestMonthly(requestTopic?: string, days = MONTHLY_DAYS, skipRouting = false) {
    const query = (requestTopic ?? topic).trim()
    if (!query) return
    const range = days > 0 ? days : MONTHLY_DAYS
    setMonthlyLoading(true)
    setMonthlyError(null)
    try {
      const data = await getLatest(query, { days: range })
      setMonthlyDigest(data as DigestResponse)
      setTopic(query)
      if (!skipRouting) {
        updateRoute({ topic: query, period: "monthly", days: String(range) })
      }
    } catch (e: any) {
      setMonthlyDigest(null)
      setMonthlyError(e?.message || "No cached monthly digest found for this topic")
    } finally {
      setMonthlyLoading(false)
    }
  }

  async function generateMonthlyDigest() {
    const query = topic.trim()
    if (!query) return
    setMonthlyLoading(true)
    setMonthlyError(null)
    try {
      const data = await createDigest(query, { days: MONTHLY_DAYS, topK: DEFAULT_TOP_K, period: "monthly" })
      setMonthlyDigest(data as DigestResponse)
      updateRoute({ topic: query, period: "monthly", days: String(MONTHLY_DAYS) })
    } catch (e: any) {
      setMonthlyDigest(null)
      setMonthlyError(e?.message || "Failed to generate monthly digest")
    } finally {
      setMonthlyLoading(false)
    }
  }

  useEffect(() => {
    setTopic(initialTopic)
    if (!initialTopic) {
      setWeeklyDigest(null)
      setMonthlyDigest(null)
      return
    }
    if (initialPeriodParam === "monthly") {
      void loadLatestMonthly(initialTopic, initialDays, true)
    } else {
      void loadLatestWeekly(initialTopic, initialDays, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopic, initialPeriodParam, initialDays])

  const weeklySummary = typeof weeklyDigest?.summary === "string" ? weeklyDigest.summary : ""
  const monthlySummary = typeof monthlyDigest?.summary === "string" ? monthlyDigest.summary : ""
  const weeklyClusters = Array.isArray(weeklyDigest?.clusters) ? (weeklyDigest?.clusters as Cluster[]) : []
  const monthlyClusters = Array.isArray(monthlyDigest?.clusters) ? (monthlyDigest?.clusters as Cluster[]) : []
  const hasWeeklyDigest = weeklyClusters.length > 0 || weeklySummary.trim().length > 0
  const hasMonthlyDigest = monthlyClusters.length > 0 || monthlySummary.trim().length > 0
  const busy = weeklyLoading || monthlyLoading

  return (
    <main className="min-h-screen bg-background">
      <AppNav active="digest" />

      <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
        <header className="space-y-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Digest Explorer</h1>
          <p className="text-sm text-muted-foreground">
            Generate or reload concise weekly and monthly summaries for any research topic.
          </p>
        </header>

        <div className="space-y-4">
          <div className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-card/40">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              className="w-full bg-transparent focus:outline-none text-base"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. multimodal large language models"
              onKeyDown={(e) => e.key === "Enter" && loadLatestWeekly()}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => loadLatestWeekly()}
              disabled={busy || !topic.trim()}
            >
              {weeklyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Load Weekly Digest
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={generateWeeklyDigest}
              disabled={busy || !topic.trim()}
            >
              {weeklyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Generate Weekly Digest
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => loadLatestMonthly()}
              disabled={busy || !topic.trim()}
            >
              {monthlyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Load Monthly Digest
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={generateMonthlyDigest}
              disabled={busy || !topic.trim()}
            >
              {monthlyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Generate Monthly Digest
            </button>
          </div>

          {(weeklyError || monthlyError) && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {weeklyError && (
                <p>
                  <span className="font-medium">Weekly:</span> {weeklyError}
                </p>
              )}
              {monthlyError && (
                <p>
                  <span className="font-medium">Monthly:</span> {monthlyError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {(hasWeeklyDigest || hasMonthlyDigest) ? (
        <div className="mx-auto max-w-4xl px-6 pb-16 space-y-12">
          {hasWeeklyDigest && (
            <>
              <section className="border rounded-lg p-6 space-y-4 bg-card/30">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-semibold text-foreground">Weekly Digest</h2>
                  {weeklyDigest?.digestId && <span className="text-xs text-muted-foreground">#{weeklyDigest.digestId}</span>}
                </div>
                {weeklySummary ? <DigestSummary text={weeklySummary} /> : <p className="text-muted-foreground">No summary available.</p>}
                {weeklyDigest?.audioUrl && (
                  <audio controls className="w-full mt-2">
                    <source src={weeklyDigest.audioUrl} />
                    Your browser does not support the audio element.
                  </audio>
                )}
              </section>

              {weeklyClusters.map((cluster, clusterIdx) => {
                const clusterLabel = cluster.label || `Cluster ${clusterIdx + 1}`
                const topPapers = Array.isArray(cluster.topPapers) ? cluster.topPapers : []

                return (
                  <section
                    key={`weekly-cluster-${clusterIdx}-${clusterLabel}`}
                    className="border rounded-lg p-5 space-y-5"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="text-xl font-semibold text-foreground">{clusterLabel}</h3>
                        {topPapers.length > 0 && (
                          <span className="text-xs text-muted-foreground/80">
                            {topPapers.length} featured paper{topPapers.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {Array.isArray(cluster.bullets) && cluster.bullets.length > 0 && (
                        <ul className="space-y-2 text-muted-foreground">
                          {cluster.bullets.map((bullet, bulletIdx) => (
                            <li key={`weekly-cluster-${clusterIdx}-bullet-${bulletIdx}`} className="flex gap-2 items-start">
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
                            key={`weekly-cluster-${clusterIdx}-paper-${paper.arxivId ?? paper.id ?? paperIdx}`}
                            paper={paper}
                            clusterLabel={clusterLabel}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/80">No highlighted papers were returned for this cluster.</p>
                    )}
                  </section>
                )
              })}
            </>
          )}

          {hasMonthlyDigest && (
            <div className="space-y-6 border-t border-border pt-10">
              <section className="border rounded-lg p-6 space-y-4 bg-card/30">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-semibold text-foreground">Top Papers of the Month</h2>
                  {monthlyDigest?.digestId && <span className="text-xs text-muted-foreground">#{monthlyDigest.digestId}</span>}
                </div>
                {monthlySummary ? <DigestSummary text={monthlySummary} /> : <p className="text-muted-foreground">No summary available.</p>}
                {monthlyDigest?.audioUrl && (
                  <audio controls className="w-full mt-2">
                    <source src={monthlyDigest.audioUrl} />
                    Your browser does not support the audio element.
                  </audio>
                )}
              </section>

              {monthlyClusters.map((cluster, clusterIdx) => {
                const clusterLabel = cluster.label || `Cluster ${clusterIdx + 1}`
                const topPapers = Array.isArray(cluster.topPapers) ? cluster.topPapers : []

                return (
                  <section
                    key={`monthly-cluster-${clusterIdx}-${clusterLabel}`}
                    className="border rounded-lg p-5 space-y-5"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="text-xl font-semibold text-foreground">{clusterLabel}</h3>
                        {topPapers.length > 0 && (
                          <span className="text-xs text-muted-foreground/80">
                            {topPapers.length} featured paper{topPapers.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {Array.isArray(cluster.bullets) && cluster.bullets.length > 0 && (
                        <ul className="space-y-2 text-muted-foreground">
                          {cluster.bullets.map((bullet, bulletIdx) => (
                            <li key={`monthly-cluster-${clusterIdx}-bullet-${bulletIdx}`} className="flex gap-2 items-start">
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
                            key={`monthly-cluster-${clusterIdx}-paper-${paper.arxivId ?? paper.id ?? paperIdx}`}
                            paper={paper}
                            clusterLabel={clusterLabel}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/80">No highlighted papers were returned for this cluster.</p>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        !busy && (
          <div className="mx-auto max-w-5xl px-6 py-24 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No digest loaded</h2>
            <p className="text-muted-foreground">
              Enter a topic above to load a cached digest or generate a fresh weekly or monthly summary.
            </p>
          </div>
        )
      )}
    </main>
  )
}

export default function Page() {
  const searchParams = useSearchParams()
  const view = searchParams.get("view") === "digest" ? "digest" : "browse"
  return view === "digest" ? <DigestView /> : <BrowseView />
}
