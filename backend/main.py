import os, json
from typing import Literal
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from prompts import CLUSTER_PROMPT, DIGEST_PROMPT, MONTHLY_DIGEST_PROMPT
from services import (
    fetch_arxiv,
    fetch_or_create_embeddings,
    cluster_embeddings,
    clusters_to_payload,
    label_clusters_with_claude,
    compose_digest,
    maybe_tts_fish_audio,
    enrich_top_papers,
)
from db import upsert_papers
from cache import save_digest, get_latest_digest, get_cached_digest
from digest_ids import build_digest_id

app = FastAPI(title="Kensa API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DEFAULT_CACHE_TTL = int(os.getenv("DIGEST_CACHE_TTL_HOURS", "6"))

class DigestReq(BaseModel):
  topic: str
  days: int = Field(default=7, ge=1, le=90)
  voice: bool = False
  top_k: int = Field(default=5, ge=3, le=12, alias="topK")
  period: Literal["weekly", "monthly"] = "weekly"

@app.get("/api/health")
def health():
    return {"ok": True}

@app.get("/api/papers")
def papers(topic: str = Query(..., min_length=2), days: int = Query(7, ge=1, le=30), limit: int = Query(10, ge=1, le=25)):
    rows = fetch_arxiv(topic, days, limit=limit)
    if not rows:
        raise HTTPException(status_code=404, detail="No papers found")
    return {"papers": rows[:limit]}

@app.get("/api/digest/latest")
def latest(
    topic: str = Query(..., min_length=2),
    days: int = Query(7, ge=1, le=90)
):
    row = get_latest_digest(topic, days)
    if not row:
        raise HTTPException(status_code=404, detail="No digest found")
    return {
        "digestId": row["id"],
        "summary": row["summary"],
        "clusters": json.loads(row["clusters_json"]),
        "audioUrl": row["audio_url"]
    }

@app.post("/api/digest")
def digest(req: DigestReq):
    topic = req.topic.strip()
    period_days = req.days
    if req.period == "monthly":
        period_days = max(req.days, 28)

    cached = get_cached_digest(
        topic,
        period_days,
        req.top_k,
        req.period,
        req.voice,
        DEFAULT_CACHE_TTL
    )
    if cached:
        return {
            "digestId": cached["id"],
            "summary": cached["summary"],
            "clusters": json.loads(cached["clusters_json"]),
            "audioUrl": cached["audio_url"],
            "days": period_days,
            "period": req.period,
            "topK": req.top_k
        }

    papers = fetch_arxiv(topic, period_days)
    if not papers:
        raise HTTPException(status_code=404, detail="No papers found")
    upsert_papers(papers)

    embeds = fetch_or_create_embeddings(papers)

    labels, _ = cluster_embeddings(embeds, k=6)
    payload = clusters_to_payload(papers, embeds, labels)

    labeled = label_clusters_with_claude(payload, CLUSTER_PROMPT)
    labeled = enrich_top_papers(labeled or [], papers)
    prompt_template = MONTHLY_DIGEST_PROMPT if req.period == "monthly" else DIGEST_PROMPT
    summary = compose_digest(req.topic, period_days, req.top_k, labeled, prompt_template)

    audio_url = maybe_tts_fish_audio(summary) if req.voice else None

    digest_id = build_digest_id(topic, period_days)
    save_digest(
        digest_id,
        topic,
        period_days,
        summary,
        json.dumps(labeled, ensure_ascii=False),
        audio_url,
        req.top_k,
        req.period,
        req.voice
    )

    return {
        "digestId": digest_id,
        "summary": summary,
        "clusters": labeled,
        "audioUrl": audio_url,
        "days": period_days,
        "period": req.period,
        "topK": req.top_k
    }
