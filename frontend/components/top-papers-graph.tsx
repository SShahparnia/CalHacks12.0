"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { DigestPaper } from "./paper-card"

type TopPapersGraphProps = {
  topic: string
  papers: DigestPaper[]
}

const truncate = (text: string, limit = 34) => {
  if (!text) return ""
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

export function TopPapersGraph({ topic, papers }: TopPapersGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || papers.length === 0) {
      return
    }

    const width = containerRef.current.clientWidth || 400
    const height = containerRef.current.clientHeight || 320

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("viewBox", `0 0 ${width} ${height}`)

    const nodes = [
      { id: "topic", label: topic || "Digest Topic", type: "topic" as const },
      ...papers.map((paper, idx) => ({
        id: paper.arxivId || paper.id || `paper-${idx}`,
        label: paper.title || `Paper ${idx + 1}`,
        url: paper.url,
        type: "paper" as const,
        rank: idx + 1,
      })),
    ]

    const links = papers.map((paper, idx) => ({
      source: "topic",
      target: paper.arxivId || paper.id || `paper-${idx}`,
      distance: 90 + idx * 12,
    }))

    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d: any) => d.distance)
      )
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => (d.type === "topic" ? 60 : 48)))

    const link = svg
      .append("g")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.2)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5)

    const node = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", (d: any) => (d.type === "paper" && d.url ? "pointer" : "default"))
      .on("click", (_event, d: any) => {
        if (d.type === "paper" && d.url) {
          window.open(d.url, "_blank", "noopener,noreferrer")
        }
      })

    node
      .append("circle")
      .attr("r", (d: any) => (d.type === "topic" ? 40 : 26))
      .attr("fill", (d: any) => (d.type === "topic" ? "var(--primary)" : "var(--card)"))
      .attr("stroke", (d: any) => (d.type === "topic" ? "var(--primary)" : "var(--border)"))
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0px 8px 16px rgba(0,0,0,0.15))")

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("fill", (d: any) => (d.type === "topic" ? "var(--primary-foreground)" : "var(--foreground)"))
      .attr("font-weight", (d: any) => (d.type === "topic" ? 600 : 500))
      .attr("font-size", (d: any) => (d.type === "topic" ? 14 : 11))
      .attr("dy", (d: any) => (d.type === "topic" ? 5 : 4))
      .text((d: any) =>
        d.type === "topic" ? truncate(d.label, 26) : `${d.rank}. ${truncate(d.label, 24)}`
      )

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as any).x)
        .attr("y1", (d: any) => (d.source as any).y)
        .attr("x2", (d: any) => (d.target as any).x)
        .attr("y2", (d: any) => (d.target as any).y)

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [papers, topic])

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Relationship Map</p>
          <h3 className="text-lg font-semibold">Top Papers Graph</h3>
        </div>
        <span className="text-xs text-muted-foreground">Tap nodes to open papers</span>
      </div>
      {papers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Insufficient papers to visualize.</p>
      ) : (
        <svg ref={svgRef} className="w-full h-72" role="img" aria-label="Graph of top papers" />
      )}
    </div>
  )
}

