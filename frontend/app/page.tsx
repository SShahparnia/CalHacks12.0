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

type Cluster = {
  label?: string
  bullets?: string[]
  topPapers?: DigestPaper[]
}

function AppNav({ active }: { active: "browse" | "digest" }) {
  const baseClasses =
    "px-3 py-1.5 text-sm font-medium rounded-full border border-transparent transition-colors hover:bg-muted"
  const activeClasses = "text-primary bg-primary/10 border-primary/30"
  const inactiveClasses = "text-foreground hover:text-primary"

  return (
    <nav className="fixed top-6 right-6 z-50">
      <div className="flex items-center gap-1 px-3 py-2 bg-secondary/80 backdrop-blur-lg border border-border rounded-full shadow-lg">
        <Link href="/" className={`${baseClasses} ${active === "browse" ? activeClasses : inactiveClasses}`}>
          Browse
        </Link>
        <Link href="/digest" className={`${baseClasses} ${active === "digest" ? activeClasses : inactiveClasses}`}>
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
    router.push(`/digest?topic=${encodeURIComponent(query)}`)
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
  let key = 0

  const flushList = () => {
    if (list.length === 0) return
    const listKey = key++
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
    list = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
      continue
    }
    if (/^[-*]\s+/.test(trimmed)) {
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

  const [topic, setTopic] = useState(initialTopic)
  const [digest, setDigest] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTopic(initialTopic)
    if (initialTopic) {
      void loadLatest(initialTopic)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopic])

  async function loadLatest(requestTopic?: string) {
    const query = (requestTopic ?? topic).trim()
    if (!query) return
    setLoading(true)
    setError(null)
    try {
      const data = await getLatest(query)
      setDigest(data)
      setTopic(query)
      router.replace(`/digest?topic=${encodeURIComponent(query)}`)
    } catch (e: any) {
      setDigest(null)
      setError(e.message || "No cached digest found for this topic")
    } finally {
      setLoading(false)
    }
  }

  async function generateDigest() {
    const query = topic.trim()
    if (!query) return
    setLoading(true)
    setError(null)
    try {
      const data = await createDigest(query, 7)
      setDigest(data)
      router.replace(`/digest?topic=${encodeURIComponent(query)}`)
    } catch (e: any) {
      setDigest(null)
      setError(e.message || "Failed to generate digest")
    } finally {
      setLoading(false)
    }
  }

  const clusters: Cluster[] = Array.isArray(digest?.clusters) ? (digest?.clusters as Cluster[]) : []
  const hasDigest = clusters.length > 0

  return (
    <main className="min-h-screen bg-background">
      <AppNav active="digest" />

      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 text-balance tracking-tight">Digest Explorer</h1>
            <p className="text-lg text-muted-foreground text-balance">
              Load cached or freshly generated summaries for your research topic.
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
                onKeyDown={(e) => e.key === "Enter" && loadLatest()}
              />
            </div>

            <div className="flex gap-3 justify-center">
              <button
                className="h-12 px-8 bg-secondary text-foreground border border-border rounded-xl font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                onClick={() => loadLatest()}
                disabled={loading || !topic.trim()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Load Digest
              </button>
              <button
                className="h-12 px-8 bg-foreground text-background rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                onClick={generateDigest}
                disabled={loading || !topic.trim()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Generate Digest
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

      {hasDigest ? (
        <div className="mx-auto max-w-6xl px-6 py-12 space-y-8">
          <section className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-foreground">Weekly Digest</h2>
              {digest?.digestId && <span className="text-xs text-muted-foreground">#{digest.digestId}</span>}
            </div>
            {typeof digest?.summary === "string" ? (
              <DigestSummary text={digest.summary} />
            ) : (
              <p className="text-muted-foreground">No summary available.</p>
            )}
            {digest?.audioUrl && (
              <audio controls className="w-full mt-2">
                <source src={digest.audioUrl} />
                Your browser does not support the audio element.
              </audio>
            )}
          </section>

          {clusters.map((cluster, clusterIdx) => {
            const clusterLabel = cluster.label || `Cluster ${clusterIdx + 1}`
            const topPapers = Array.isArray(cluster.topPapers) ? cluster.topPapers : []

            return (
              <section key={`cluster-${clusterIdx}-${clusterLabel}`} className="bg-card border border-border rounded-2xl p-6 space-y-6">
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
                        <li key={`cluster-${clusterIdx}-bullet-${bulletIdx}`} className="flex gap-2 items-start">
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
                        key={`cluster-${clusterIdx}-paper-${paper.arxivId ?? paper.id ?? paperIdx}`}
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
      ) : (
        !loading && (
          <div className="mx-auto max-w-5xl px-6 py-24 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No digest loaded</h2>
            <p className="text-muted-foreground">Enter a topic above to load a cached digest or generate a fresh one.</p>
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
