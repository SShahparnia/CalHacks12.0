import os, json
from typing import List, Dict, Any, Optional
import arxiv
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
import numpy as np
import chromadb
from chromadb.config import Settings
from anthropic import Anthropic
import datetime as dt
from dotenv import load_dotenv

CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_store")
load_dotenv()

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
    return np.asarray(_embed_model.encode(texts))

def upsert_chroma(papers: List[Dict[str, Any]], embeds: np.ndarray) -> None:
    col = get_chroma()
    ids = [p["id"] for p in papers]
    col.add(
        ids=ids,
        documents=[p["abstract"] for p in papers],
        embeddings=[e.tolist() for e in embeds],
        metadatas=[{"title": p["title"], "url": p["url"]} for p in papers]
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
            "papers": [{"title": papers[i]["title"], "abstract": papers[i]["abstract"], "url": papers[i]["url"]} for i in top]
        })
    return payload

def call_claude(prompt: str, system: str = "You are a concise academic editor.", max_tokens: int = 800) -> str:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("Missing ANTHROPIC_API_KEY in backend/.env")

    client = Anthropic(api_key=key)
    msg = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        temperature=0.4,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    # Anthropic Python SDK returns content blocks; take the first text block
    return msg.content[0].text if msg.content else ""

def label_clusters_with_claude(cluster_payload: List[Dict[str, Any]], cluster_prompt: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    batch: List[Dict[str, Any]] = []
    import json as _json
    for c in cluster_payload:
        batch.append(c)
        if len(batch) == 2:
            text = _json.dumps(batch, ensure_ascii=False)
            raw = call_claude(f"{cluster_prompt}\n\nCLUSTERS:\n{text}")
            try:
                arr = _json.loads(raw)
                if isinstance(arr, list):
                    out.extend(arr)
            except Exception:
                pass
            batch = []
    if batch:
        raw = call_claude(f"{cluster_prompt}\n\nCLUSTERS:\n{json.dumps(batch, ensure_ascii=False)}")
        try:
            arr = json.loads(raw)
            if isinstance(arr, list):
                out.extend(arr)
        except Exception:
            pass
    return out

def compose_digest(topic: str, labeled_clusters: List[Dict[str, Any]], digest_prompt: str) -> str:
    compact = [{"label": c.get("label","Cluster"), "bullets": c.get("bullets", [])} for c in labeled_clusters]
    return call_claude(digest_prompt.replace("{topic}", topic) + "\n\nCLUSTERS:\n" + json.dumps(compact, ensure_ascii=False))

def maybe_tts_fish_audio(text: str) -> Optional[str]:
    return None
