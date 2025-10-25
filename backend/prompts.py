CLUSTER_PROMPT = """You are an academic editor. For each cluster, return compact JSON:
[{"label":"<5 words>","bullets":["<12 words>","<12 words>","<12 words>"],
  "topPapers":[{"title":"...","why":"<12 words>"}]}]
Use only provided titles and abstracts. Be factual and concise. Return a JSON array for the clusters you received.
"""

DIGEST_PROMPT = """Write a weekly digest for "{topic}" in 450 tokens or less:
1. Overview paragraph for the week
2. 4-6 sections titled by cluster label, each with two concise bullets
3. End with "What to watch next" with three bullets
Return plain text only.
"""
