"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { Loader2 } from "lucide-react"

export type GraphNode = {
  id: string
  label: string
  kind: string
  clusterLabel?: string | null
  clusterIndex?: number | null
  authors?: string | null
  url?: string | null
  published?: string | number | null
  summary?: string | null
  citationCount?: number | null
  referenceCount?: number | null
  degree?: number
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  kind?: string
  relation?: string
  weight?: number
}

export type RelationshipGraph = {
  nodes?: GraphNode[]
  edges?: GraphEdge[]
}

type RelationshipGraphPanelProps = {
  graph?: RelationshipGraph | null
  topic: string
  loading?: boolean
}

const CLUSTER_COLORS = ["#7c3aed", "#ec4899", "#14b8a6", "#f97316", "#0ea5e9", "#a855f7"]

const ROLE_COLORS: Record<string, { fill: string; stroke: string }> = {
  digest: { fill: "var(--primary)", stroke: "var(--primary)" },
  cited_by: { fill: "rgba(34,197,94,0.18)", stroke: "#22c55e" },
  references: { fill: "rgba(249,115,22,0.2)", stroke: "#f97316" },
  bridge: { fill: "rgba(236,72,153,0.2)", stroke: "#ec4899" },
}

const EDGE_COLORS: Record<string, { stroke: string; dashed?: boolean }> = {
  citation: { stroke: "var(--border)" },
  similarity: { stroke: "#a855f7", dashed: true },
}

export function RelationshipGraphPanel({ graph, topic, loading = false }: RelationshipGraphPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

  const nodes = useMemo(() => (graph?.nodes ?? []).slice(0, 36), [graph])
  const edges = useMemo(() => {
    const allowed = new Set(nodes.map((node) => node.id))
    return (graph?.edges ?? []).filter((edge) => allowed.has(edge.source) && allowed.has(edge.target))
  }, [graph, nodes])

  useEffect(() => {
    if (!svgRef.current) return
    if (!containerRef.current || nodes.length === 0) {
      svgRef.current.innerHTML = ""
      return
    }

    const width = containerRef.current.clientWidth || 360
    const height = 260

    const localNodes = nodes.map((node) => ({ ...node }))
    const localEdges = edges.map((edge) => ({ ...edge }))

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("viewBox", `0 0 ${width} ${height}`)

    const defs = svg.append("defs")
    defs
      .append("marker")
      .attr("id", "citation-arrow")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 12)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", "var(--border)")

    const simulation = d3
      .forceSimulation(localNodes as any)
      .force(
        "link",
        d3
          .forceLink(localEdges as any)
          .id((d: any) => d.id)
          .distance((d: any) => (d.kind === "similarity" ? 120 : 90))
          .strength((d: any) => (d.kind === "similarity" ? 0.4 : 0.8))
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d: any) => (d.kind === "digest" ? 42 : 30))
      )

    const link = svg
      .append("g")
      .attr("stroke-linecap", "round")
      .selectAll("line")
      .data(localEdges)
      .join("line")
      .attr("stroke", (d: any) => EDGE_COLORS[d.kind ?? "citation"]?.stroke || "var(--border)")
      .attr("stroke-width", (d: any) => (d.kind === "similarity" ? 1.5 : 1.8))
      .attr("stroke-dasharray", (d: any) => (EDGE_COLORS[d.kind ?? "citation"]?.dashed ? "5 4" : ""))
      .attr("marker-end", (d: any) => (d.kind === "citation" ? "url(#citation-arrow)" : null))
      .attr("opacity", 0.85)

    const node = svg
      .append("g")
      .selectAll("g")
      .data(localNodes)
      .join("g")
      .style("cursor", (d: any) => (d.url ? "pointer" : "default"))
      .call(
        d3
          .drag<SVGGElement, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on("drag", (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    node
      .append("circle")
      .attr("r", (d: any) => (d.kind === "digest" ? 26 : 20))
      .attr("fill", (d: GraphNode) => getNodeFill(d))
      .attr("stroke", (d: GraphNode) => getNodeStroke(d))
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0px 4px 8px rgba(15,23,42,0.18))")

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => (d.kind === "digest" ? 4 : 3))
      .attr("font-size", (d: any) => (d.kind === "digest" ? 12 : 10))
      .attr("font-weight", (d: any) => (d.kind === "digest" ? 600 : 500))
      .attr("fill", "var(--card-foreground)")
      .text((d: GraphNode) => truncateLabel(d))

    node
      .on("mouseenter", (event, datum: GraphNode) => {
        setHoverNode(datum)
        setHoverPos({ x: event.offsetX + 12, y: event.offsetY - 12 })
      })
      .on("mouseleave", () => setHoverNode(null))
      .on("click", (_event, datum: GraphNode) => {
        if (datum.url) {
          window.open(datum.url, "_blank", "noopener,noreferrer")
        }
      })

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
  }, [nodes, edges])

  const hasGraph = nodes.length > 0 && edges.length > 0

  return (
    <div ref={containerRef} className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Citation Chains</p>
          <h3 className="text-base font-semibold text-foreground">Relationship Graph</h3>
        </div>
        <span className="text-xs text-muted-foreground">{nodes.length} nodes</span>
      </div>

      {nodes.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing citations…</span>
            </>
          ) : (
            <span>No citation data yet for {topic || "this topic"}.</span>
          )}
        </div>
      ) : (
        <div className="relative">
          <svg ref={svgRef} className="h-60 w-full" role="img" aria-label="Graph of paper relationships" />
          {hoverNode && hoverPos && (
            <div
              className="pointer-events-none absolute z-10 w-64 rounded-xl border border-border bg-background/95 p-3 text-left shadow-2xl"
              style={{ left: hoverPos.x, top: Math.max(hoverPos.y - 40, 8) }}
            >
              <p className="text-sm font-semibold text-foreground">{hoverNode.label}</p>
              {hoverNode.clusterLabel && hoverNode.kind === "digest" && (
                <p className="text-xs text-muted-foreground">{hoverNode.clusterLabel}</p>
              )}
              {hoverNode.authors && (
                <p className="mt-1 text-xs text-muted-foreground">{hoverNode.authors}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground/90">
                {hoverNode.published && <span>Published {hoverNode.published}</span>}
                {typeof hoverNode.citationCount === "number" && (
                  <span>{hoverNode.citationCount} cites</span>
                )}
                {typeof hoverNode.referenceCount === "number" && (
                  <span>{hoverNode.referenceCount} refs</span>
                )}
              </div>
              {hoverNode.summary && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{hoverNode.summary}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <LegendSwatch color="var(--primary)" label="Digest paper" />
        <LegendSwatch color={ROLE_COLORS.cited_by.stroke} label="Cited by" />
        <LegendSwatch color={ROLE_COLORS.references.stroke} label="References" />
        <LegendSwatch color={EDGE_COLORS.similarity.stroke} dashed label="Similarity" />
        {hasGraph && <span className="text-xs text-muted-foreground/80">Drag nodes to explore</span>}
      </div>
    </div>
  )
}

function getNodeFill(node: GraphNode) {
  if (node.kind === "digest") {
    const idx = typeof node.clusterIndex === "number" ? node.clusterIndex : 0
    return CLUSTER_COLORS[idx % CLUSTER_COLORS.length]
  }
  return ROLE_COLORS[node.kind]?.fill ?? "var(--card)"
}

function getNodeStroke(node: GraphNode) {
  if (node.kind === "digest") {
    return "rgba(15,23,42,0.9)"
  }
  return ROLE_COLORS[node.kind]?.stroke ?? "var(--border)"
}

function truncateLabel(node: GraphNode, limit = 22) {
  const value = node.label || node.id
  if (value.length <= limit) return value
  return `${value.slice(0, limit - 1)}…`
}

type LegendProps = {
  color: string
  label: string
  dashed?: boolean
}

function LegendSwatch({ color, label, dashed }: LegendProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="block"
        style={{
          width: 14,
          height: dashed ? 2 : 8,
          borderRadius: dashed ? 0 : 999,
          background: dashed ? "transparent" : color,
          border: dashed ? `1px dashed ${color}` : `1px solid ${color}`,
        }}
      />
      {label}
    </span>
  )
}

