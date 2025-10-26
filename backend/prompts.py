CLUSTER_PROMPT = """You are an academic editor. For each cluster, return compact JSON:
[{"label":"<5 words>","bullets":["<12 words>","<12 words>","<12 words>"],
  "topPapers":[{"title":"...","why":"<12 words>"}]}]
Use only provided titles and abstracts. Be factual and concise. Return a JSON array for the clusters you received.
"""

DIGEST_PROMPT = """Craft a polished weekly research brief on "{topic}" covering the past {days} days.
Structure the markdown exactly as follows:
# Weekly Brief: {topic}
### Executive Summary
- Two to three sentences summarizing the week's overarching theme.
### Top {top_k} Papers
- Present a numbered list (1. …) of the most impactful new papers. Each item must include the paper title and a single sentence on its contribution.
### Cluster Highlights
- For each provided cluster, add a subsection `#### {{cluster label}}` containing up to two concise bullets describing the theme.
### What to Watch Next
- Three forward-looking bullets on developing trends.
Keep the tone concise, insightful, and academic. Do not invent papers or citations beyond supplied data.
"""

MONTHLY_DIGEST_PROMPT = """Write a "Top Papers of the Month" briefing for "{topic}" focusing on major advancements from the last {days} days.
Return markdown with this format:
# Monthly Outlook: {topic}
### Breakthrough Snapshot
- One paragraph capturing the month’s big picture.
### Standout Advances
- A numbered list spotlighting up to {top_k} notable papers, each with a one-sentence takeaway.
### Emerging Directions
- Three bullets on trends or open problems suggested by the clusters.
Maintain a forward-looking tone appropriate for researchers catching up on the month.
"""
