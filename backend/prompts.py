CLUSTER_PROMPT = """You are an academic editor. Produce compact, machine-parseable JSON summarizing the clusters provided.

Output requirements (RETURN ONLY JSON, no extra text):
- A JSON array of cluster objects.
- Each cluster object must have exactly these keys in this order: "label", "bullets", "topPapers".
- "label": short descriptive label (max 5 words).
- "bullets": array of up to 3 concise bullets (each max 12 words) describing the cluster theme; factual and derived only from provided titles/abstracts.
- "topPapers": array of up to 3 objects, each with keys "title" (use the title exactly as supplied) and "why" (one concise reason, max 12 words, factual).

Constraints:
- Use only information from the supplied titles and abstracts. Do not invent papers, results, numbers, authors, or citations.
- Keep language factual, neutral, and compact.
- Return valid JSON (no trailing commas, no comments).
- Prefer the most representative papers first within "topPapers".

Example valid output:
[{"label":"self-supervised vision","bullets":["reduces need for labels","pretraining on large image sets","improves transfer learning"],"topPapers":[{"title":"Example Paper A","why":"strong pretraining gains"},{"title":"Example Paper B","why":"novel augmentation approach"}]}]
"""

DIGEST_PROMPT = """Craft a polished weekly research brief on "{topic}" covering the past {days} days. Output ONLY markdown following this exact structure and headings.

Markdown structure (must follow exactly):
# Weekly Brief: {topic}

### Executive Summary
- Two to three sentences summarizing the week's overarching theme (concise, factual).

### Top {top_k} Papers
- Use a numbered list ("1. ", "2. ", ...) with up to {top_k} entries, ordered by likely impact.
- Each item must be formatted as: <Exact Title> — one sentence (<=25 words) describing the paper's key contribution or novelty. Use titles exactly as provided and do not invent content.

### Cluster Highlights
- For each provided cluster, add a subsection with heading: #### {cluster label}
- Under each cluster heading include up to two bullets (use "- ") describing the cluster theme or the most important insight (each <=20 words). Base these statements only on the supplied cluster bullets, titles, and abstracts.

### What to Watch Next
- Three short forward-looking bullets (use "- "), each identifying a developing trend, open question, or promising direction suggested by the week's papers or clusters (each <=25 words).

Constraints:
- Do not invent papers, results, or citations beyond the supplied data.
- Keep tone concise, insightful, and academic.
- Return only the markdown described above, with no additional commentary, metadata, or JSON.
"""

MONTHLY_DIGEST_PROMPT = """Write a "Top Papers of the Month" briefing for "{topic}" focused on major advancements from the last {days} days. Output ONLY markdown following this exact structure.

Markdown structure (must follow exactly):
# Monthly Outlook: {topic}

### Breakthrough Snapshot
- One paragraph (2–4 sentences) summarizing the month's big picture and most significant shift or advance.

### Standout Advances
- A numbered list ("1. ", "2. ", ...) of up to {top_k} notable papers, ordered by significance.
- Each item must include the paper title exactly as provided, followed by a single-sentence takeaway (<=25 words) describing the main advance or implication.

### Emerging Directions
- Three bullets (use "- ") identifying trends, open problems, or promising next steps implied by the clusters and papers (each <=25 words).

Constraints:
- Use only supplied titles, abstracts, and cluster summaries. Do not hallucinate new papers, results, or citations.
- Keep tone forward-looking, concise, and suitable for researchers.
- Return only the specified markdown, with no extra text or metadata.
"""
