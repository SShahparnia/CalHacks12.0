CLUSTER_PROMPT = """You are an academic editor. For each cluster, return compact JSON:
[{"label":"<5 words>","bullets":["<12 words>","<12 words>","<12 words>"],
  "topPapers":[{"title":"...","why":"<12 words>"}]}]
Use only provided titles and abstracts. Be factual and concise. Return a JSON array for the clusters you received.
"""

DIGEST_PROMPT = """Craft a polished weekly research brief on "{topic}" covering the past {days} days.
You receive structured context:
- TOP_PAPERS: JSON array with title, summary, url, authors, and published date.
- CLUSTERS: JSON array with labels and supporting bullets.
Use ONLY this material—do not fabricate papers.
If fewer than {top_k} papers are provided, list the available ones and note the shortfall once.
Each section should feel substantial (3–5 sentences minimum) and analytical.
Reference specific papers with inline numeric citations of the form `[1]`, `[2]`, etc., where the number maps to the item’s position in the “Top {top_k} Papers” list. When linking, wrap the paper title in markdown, e.g. `[Paper Title](url)[2]`.
Structure the markdown exactly as follows:
# Weekly Brief: {topic}
### Executive Summary
- one paragraph synthesizing the week's overarching theme, citing the most relevant papers (e.g., `[1][3]`).
### Top {top_k} Papers
- Present a numbered list (1. …) drawn from TOP_PAPERS. Each item must include a markdown-linked title (if URL exists) followed by exactly one sentence (<35 words) summarizing the contribution, ending with a citation tag `[n]` and optional author/date parenthetical. No extra text.
### What to Watch Next
- Provide three detailed bullets covering emerging risks/opportunities, each referencing at least one cited paper or concrete data point.
### Signals & Noise
- Add two paragraphs: one highlighting genuinely novel signals (cite specific papers), and one calling out missing data, contradictory findings, or hype to be cautious about.
### Benchmarks & Metrics
- Summarize any quantitative results (accuracy, throughput, cost, energy, etc.) reported in TOP_PAPERS. Include exact numbers and citations; if none exist, explicitly state “No benchmark deltas reported this week.”
### Spotlight Keywords
- End with at least five multi-word keyword phrases. For each phrase, add a short clause describing why it matters and include an inline markdown link to the most relevant paper (reuse the existing citation number, e.g., `[Scalable CUDA kernels](url)[1]`). Ensure keywords reflect distinct themes from the brief. Keep each bullet under 20 words.
Keep the entire brief under 900 words. Maintain a concise yet rich, academic, and insight-driven tone. Do not invent papers or citations beyond supplied data.
"""

MONTHLY_DIGEST_PROMPT = """Write a "Top Papers of the Month" briefing for "{topic}" focusing on major advancements from the last {days} days.
You receive structured context:
- TOP_PAPERS: JSON array with title, summary, url, authors, and published date.
- CLUSTERS: JSON array with labels and supporting bullets.
Use ONLY this material—do not fabricate papers. Mention if fewer than {top_k} papers are provided.
Target richer coverage: each major section should contain at least two paragraphs. Reuse the numeric citation scheme described for the weekly brief.
Return markdown with this format:
# Monthly Outlook: {topic}
### Breakthrough Snapshot
- Two paragraphs capturing the month’s big picture and contrasting trends, referencing key papers via `[n]`.
### Standout Advances
- A numbered list spotlighting up to {top_k} notable papers from TOP_PAPERS. Each entry must be a single sentence (<35 words) with a markdown-linked title, concise takeaway, and citation `[n]` plus optional author/date note.
### Emerging Directions
- Three in-depth bullets on trends or open problems suggested by the clusters; cite supporting papers and discuss risks/opportunities.
Conclude with a short paragraph titled **Key Resources** that links to any available URLs from TOP_PAPERS.
### Signals & Noise
- Provide two paragraphs separating trustworthy signals from hype or gaps, each grounded in concrete citations.
### Benchmarks & Metrics
- Detail any reported metrics (e.g., accuracy, latency, cost) with exact values and citations; otherwise note the absence of quantitative evidence.
### Spotlight Keywords
- Provide a bullet list of at least five multi-word keyword phrases, each paired with a sub-20-word rationale and a markdown link to the best supporting paper (reference the corresponding citation number). Prioritize phrases that reflect cross-cutting methods or applications surfaced in the digest.
Keep the entire brief under 1100 words. Maintain a forward-looking tone appropriate for researchers catching up on the month.
"""
