"use client"
import { FileText } from "lucide-react"

export type DigestPaper = {
  title: string
  url?: string
  arxivId?: string
  id?: string
  summary?: string
  why?: string
  authors?: string
  published?: string
  published_at?: string
  abstract?: string
  cluster?: string
}

type PaperCardProps = {
  paper: DigestPaper & Record<string, any>
  clusterLabel?: string
}

export function PaperCard({ paper, clusterLabel }: PaperCardProps) {
  const displayCluster = clusterLabel ?? paper.cluster
  const summary = paper.summary ?? paper.why ?? paper.abstract
  const href = paper.url ?? "#"
  const arxivId = paper.arxivId ?? paper.id

  const publishedText = paper.published ?? paper.published_at
  const publishedDate = publishedText ? new Date(publishedText) : null
  const publishedLabel =
    publishedDate && !Number.isNaN(publishedDate.getTime())
      ? publishedDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : null

  return (
    <a
      href={href}
      target={href === "#" ? "_self" : "_blank"}
      rel={href === "#" ? undefined : "noreferrer"}
      className="flex gap-6 p-6 bg-card border border-border rounded-2xl hover:border-primary/50 transition-all group"
    >
      <div className="flex-shrink-0 w-48 h-64 bg-secondary rounded-xl overflow-hidden border border-border flex items-center justify-center relative">
        {arxivId ? (
          <iframe
            src={`https://arxiv.org/pdf/${arxivId}.pdf#view=FitH`}
            className="w-full h-full pointer-events-none"
            title={`PDF preview of ${paper.title}`}
          />
        ) : (
          <div className="text-center p-4">
            <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">PDF Preview</p>
            <p className="text-xs text-muted-foreground mt-1">arXiv</p>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors text-pretty leading-tight">
            {paper.title}
          </h3>
        </div>

        {displayCluster && (
          <div className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-3 self-start">
            {displayCluster}
          </div>
        )}

        {summary && <p className="text-muted-foreground leading-relaxed text-pretty flex-1">{summary}</p>}

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border">
          {paper.authors && <span className="truncate font-medium">{paper.authors}</span>}
          {publishedLabel && (
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/50">•</span>
              {publishedLabel}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}
