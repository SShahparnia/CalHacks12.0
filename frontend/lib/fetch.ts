const DEFAULT_BASE = "http://127.0.0.1:8000"
const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_BASE).replace(/\/$/, "")

function buildUrl(path: string) {
  return `${API_BASE}${path}`
}

async function parseJsonOrThrow(response: Response, fallbackMessage: string) {
  const raw = await response.text()
  if (!response.ok) {
    let message = fallbackMessage
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        message = parsed?.detail || parsed?.message || fallbackMessage
      } catch {
        message = raw
      }
    }
    throw new Error(message || fallbackMessage)
  }

  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

type DigestOptions = {
  days?: number
  topK?: number
  period?: "weekly" | "monthly"
  voice?: boolean
}

export async function createDigest(topic: string, options: DigestOptions = {}) {
  const { days = 7, topK, period, voice = false } = options
  const r = await fetch(buildUrl("/api/digest"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      topic,
      days,
      voice,
      ...(typeof topK === "number" ? { topK } : {}),
      ...(period ? { period } : {}),
    }),
  })
  return parseJsonOrThrow(r, "Failed to generate digest")
}

export async function getLatest(topic: string, options: { days?: number } = {}) {
  const base = buildUrl("/api/digest/latest")
  const search = new URLSearchParams({
    topic,
  })
  if (options.days) {
    search.set("days", String(options.days))
  }
  const url = `${base}${base.includes("?") ? "&" : "?"}${search.toString()}`
  const r = await fetch(url, { cache: "no-store" })
  return parseJsonOrThrow(r, "No cached digest")
}

export async function listPapers(topic: string, days = 7, limit = 10) {
  const base = buildUrl("/api/papers")
  const qs = new URLSearchParams({
    topic,
    days: String(days),
    limit: String(limit),
  }).toString()
  const url = `${base}${base.includes("?") ? "&" : "?"}${qs}`
  const r = await fetch(url, { cache: "no-store" })
  const data = await parseJsonOrThrow(r, "No papers found")
  return Array.isArray((data as any)?.papers) ? (data as any).papers : []
}
