import os, json, hashlib
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from prompts import CLUSTER_PROMPT, DIGEST_PROMPT
from services import fetch_arxiv, embed_texts, upsert_chroma, cluster_embeddings, clusters_to_payload, label_clusters_with_claude, compose_digest, maybe_tts_fish_audio, enrich_top_papers
from db import upsert_papers, save_digest, get_latest_digest

app = FastAPI(title="Kensa API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class DigestReq(BaseModel):
  topic: str
  days: int = 7
  voice: bool = False

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
def latest(topic: str = Query(..., min_length=2)):
    row = get_latest_digest(topic)
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
    papers = fetch_arxiv(req.topic, req.days)
    if not papers:
        raise HTTPException(status_code=404, detail="No papers found")
    upsert_papers(papers)

    embeds = embed_texts([p["abstract"] for p in papers])
    upsert_chroma(papers, embeds)

    labels, _ = cluster_embeddings(embeds, k=6)
    payload = clusters_to_payload(papers, embeds, labels)

    labeled = label_clusters_with_claude(payload, CLUSTER_PROMPT)
    labeled = enrich_top_papers(labeled or [], papers)
    summary = compose_digest(req.topic, labeled, DIGEST_PROMPT)

    audio_url = maybe_tts_fish_audio(summary) if req.voice else None

    digest_id = f"dg_{hashlib.sha1(f'{req.topic}_{req.days}'.encode()).hexdigest()[:10]}"
    save_digest(digest_id, req.topic, req.days, summary, json.dumps(labeled, ensure_ascii=False), audio_url)

    return { "digestId": digest_id, "summary": summary, "clusters": labeled, "audioUrl": audio_url }
