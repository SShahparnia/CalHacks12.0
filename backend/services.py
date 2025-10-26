import os, json, re
from typing import List, Dict, Any, Optional
import arxiv
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
import numpy as np
import chromadb
from chromadb.config import Settings
import requests  # Add this import
import datetime as dt
from dotenv import load_dotenv

load_dotenv()
CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_store")
CLUSTER_BATCH_SIZE = max(1, int(os.getenv("CLUSTER_BATCH_SIZE", "4")))
LABEL_MAX_TOKENS = max(100, int(os.getenv("LABEL_MAX_TOKENS", "350")))

def fetch_arxiv(topic: str, days: int = 7, limit: int = 60) -> List[Dict[str, Any]]:
    # Build the search; we'll filter by date ourselves
    search = arxiv.Search(
        query=topic,
        max_results=limit,  # library still paginates under the hood
        sort_by=arxiv.SortCriterion.SubmittedDate,
    )

    # More resilient client: smaller pages + retries + polite delay
    client = arxiv.Client(page_size=25, delay_seconds=1, num_retries=3)

    cutoff = dt.date.today() - dt.timedelta(days=days)
    papers: List[Dict[str, Any]] = []

    try:
        for r in client.results(search):
            # Optional date filter (your old code ignored `days`)
            pub_date = (r.updated or r.published).date()
            if pub_date < cutoff:
                continue

            papers.append({
                "id": r.get_short_id(),
                "title": r.title,
                "abstract": r.summary,
                "url": r.entry_id,
                "published_at": pub_date.isoformat(),
                "authors": ", ".join(a.name for a in getattr(r, "authors", []) if getattr(a, "name", None)),
            })

            if len(papers) >= limit:
                break

    except arxiv.UnexpectedEmptyPageError:
        # arXiv served an empty page mid-iteration; return what we have
        pass
    except Exception as e:
        # Surface other issues (network, rate limits) as a 500 you can see
        raise RuntimeError(f"arXiv fetch failed: {e}")

    return papers


def get_chroma():
    client = chromadb.PersistentClient(path=CHROMA_DIR, settings=Settings(anonymized_telemetry=False))
    return client.get_or_create_collection("papers")

_embed_model = None
def embed_texts(texts: List[str]) -> np.ndarray:
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return np.asarray(_embed_model.encode(texts), dtype=np.float32)

def fetch_or_create_embeddings(papers: List[Dict[str, Any]]) -> np.ndarray:
    """
    Return embeddings for the provided papers, re-using any vectors already persisted in Chroma.
    """
    if not papers:
        return np.empty((0, 0), dtype=np.float32)

    col = get_chroma()
    ids = [p["id"] for p in papers]
    existing_map: Dict[str, np.ndarray] = {}

    try:
        existing = col.get(ids=ids, include=["embeddings"])
        if existing and existing.get("ids"):
            for idx, pid in enumerate(existing["ids"]):
                embeds = existing.get("embeddings") or []
                if idx < len(embeds) and embeds[idx] is not None:
                    existing_map[pid] = np.asarray(embeds[idx], dtype=np.float32)
    except Exception:
        # If Chroma is unavailable, fall back to re-embedding everything.
        existing_map = {}

    embeddings: List[Optional[np.ndarray]] = [None] * len(papers)
    new_indices: List[int] = []
    for i, paper in enumerate(papers):
        cached = existing_map.get(paper["id"])
        if cached is not None:
            embeddings[i] = cached
        else:
            new_indices.append(i)

    if new_indices:
        texts = [papers[i]["abstract"] for i in new_indices]
        new_embeds = embed_texts(texts)
        for offset, idx in enumerate(new_indices):
            embeddings[idx] = new_embeds[offset]

        upsert_chroma(
            [papers[i] for i in new_indices],
            np.asarray([embeddings[i] for i in new_indices], dtype=np.float32)
        )

    # All entries should now be populated; stack them into a single array.
    return np.vstack(embeddings).astype(np.float32)

def upsert_chroma(papers: List[Dict[str, Any]], embeds: np.ndarray) -> None:
    col = get_chroma()
    ids = [p["id"] for p in papers]
    existing_ids = set()
    try:
        existing = col.get(ids=ids)
        if existing and existing.get("ids"):
            existing_ids.update(existing["ids"])
    except Exception:
        existing_ids = set()

    to_store = [
        (idx, paper_id)
        for idx, paper_id in enumerate(ids)
        if paper_id not in existing_ids
    ]
    if not to_store:
        return
    indices = [idx for idx, _ in to_store]
    col.upsert(
        ids=[ids[idx] for idx in indices],
        documents=[papers[idx]["abstract"] for idx in indices],
        embeddings=[embeds[idx].tolist() for idx in indices],
        metadatas=[{"title": papers[idx]["title"], "url": papers[idx]["url"]} for idx in indices]
    )

def cluster_embeddings(embeds: np.ndarray, k: int = 6):
    n = int(len(embeds))
    if n == 0:
        # no data
        return np.array([], dtype=int), np.empty((0, 0))
    # k can't exceed n, and must be >= 1
    k = max(1, min(k, n))
    if n == 1:
        # single point: one cluster, center is the point
        return np.array([0], dtype=int), embeds.copy()
    km = KMeans(n_clusters=k, random_state=42, n_init="auto")
    labels = km.fit_predict(embeds)
    return labels, km.cluster_centers_


def clusters_to_payload(papers: List[Dict[str, Any]], embeds: np.ndarray, labels: np.ndarray):
    payload = []
    for cid in sorted(set(labels)):
        idxs = np.where(labels == cid)[0]
        centroid = embeds[idxs].mean(axis=0)
        dists = [(i, np.linalg.norm(embeds[i] - centroid)) for i in idxs]
        top = [i for i, _ in sorted(dists, key=lambda x: x[1])[:3]]
        payload.append({
            "cluster_id": int(cid),
            "papers": [
                {
                    "title": papers[i]["title"],
                    "abstract": papers[i]["abstract"],
                    "url": papers[i]["url"],
                    "id": papers[i]["id"],
                }
                for i in top
            ],
        })
    return payload

def call_claude(prompt: str, system: str = "You are a concise academic editor.", max_tokens: int = 800) -> str:
    lava_token = os.getenv("LAVA_FORWARD_TOKEN")
    lava_base = os.getenv("LAVA_BASE_URL", "https://api.lavapayments.com/v1")
    
    if not lava_token:
        raise RuntimeError("Missing LAVA_FORWARD_TOKEN in backend/.env")
    
    # Build Lava URL that routes to Anthropic
    url = f"{lava_base}/forward?u=https://api.anthropic.com/v1/messages"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {lava_token}",
        "anthropic-version": "2023-06-01"
    }
    
    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": max_tokens,
        "temperature": 0.4,
        "system": system,
        "messages": [{"role": "user", "content": prompt}]
    }
    
    response = requests.post(url, headers=headers, json=payload)
    
    # Log Lava request ID for tracking
    request_id = response.headers.get("x-lava-request-id")
    print(f"Lava request ID: {request_id}")
    
    if response.status_code != 200:
        raise RuntimeError(f"Lava/Anthropic API error: {response.text}")
    
    data = response.json()
    return data["content"][0]["text"] if data.get("content") else ""

def label_clusters_with_claude(cluster_payload: List[Dict[str, Any]], cluster_prompt: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    batch: List[Dict[str, Any]] = []
    import json as _json

    def _send(payload: List[Dict[str, Any]]) -> None:
        if not payload:
            return
        text = _json.dumps(payload, ensure_ascii=False)
        raw = call_claude(f"{cluster_prompt}\n\nCLUSTERS:\n{text}", max_tokens=LABEL_MAX_TOKENS)
        try:
            arr = _json.loads(raw)
            if isinstance(arr, list):
                out.extend(arr)
        except Exception:
            # If Claude returns malformed JSON, skip this batch; caller can decide how to handle empty clusters.
            pass

    for cluster in cluster_payload:
        batch.append(cluster)
        if len(batch) >= CLUSTER_BATCH_SIZE:
            _send(batch)
            batch = []
    if batch:
        _send(batch)
    return out

def compose_digest(topic: str, days: int, top_k: int, labeled_clusters: List[Dict[str, Any]], prompt_template: str) -> str:
    compact = [{"label": c.get("label","Cluster"), "bullets": c.get("bullets", [])} for c in labeled_clusters]
    prompt = prompt_template.format(topic=topic, days=days, top_k=top_k)
    return call_claude(prompt + "\n\nCLUSTERS:\n" + json.dumps(compact, ensure_ascii=False))

def maybe_tts_fish_audio(text: str) -> Optional[str]:
    return None


def _normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", title or "").strip().lower()


def enrich_top_papers(labeled_clusters: List[Dict[str, Any]], papers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Merge metadata (url, arxiv id, authors, published date) from the raw arXiv results
    into the LLM-labeled cluster response so the frontend can render richer cards.
    """
    index = {_normalize_title(p["title"]): p for p in papers}
    for cluster in labeled_clusters:
        top = []
        for entry in cluster.get("topPapers", []):
            title = entry.get("title")
            if not title:
                continue
            paper = index.get(_normalize_title(title))
            if paper:
                enriched = {
                    "title": paper["title"],
                    "why": entry.get("why"),
                    "summary": entry.get("why") or paper["abstract"],
                    "url": paper["url"],
                    "arxivId": paper["id"],
                    "published": paper["published_at"],
                    "authors": paper.get("authors"),
                    "abstract": paper["abstract"],
                }
                for key, value in entry.items():
                    if key not in enriched and value is not None:
                        enriched[key] = value
                top.append(enriched)
            else:
                fallback = dict(entry)
                fallback.setdefault("summary", entry.get("why"))
                top.append(fallback)
        cluster["topPapers"] = top
    return labeled_clusters
