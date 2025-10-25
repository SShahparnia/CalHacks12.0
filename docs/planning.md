# Kensa — 10–12 Hour Build Plan (Claude 3.5 + V0 Frontend)

**Goal:**  
Build a web app that automatically fetches recent **arXiv papers** by topic, clusters them by theme, and generates a **spoken weekly digest** using **Claude 3.5 Sonnet** and **Fish Audio (TTS)**.

---

## Tech Stack Overview

| Layer | Tool | Purpose |
|-------|------|----------|
| **Frontend** | **V0 by Vercel (Next.js + Tailwind)** | Rapid, elegant UI generation |
| **Backend** | **FastAPI + Uvicorn** | Lightweight API layer |
| **Database** | **SQLite** | Store papers, digests, cached outputs |
| **Embeddings** | `sentence-transformers` **all-MiniLM-L6-v2** | Local, fast embeddings |
| **Vector Store** | **Chroma** | Paper embedding storage and retrieval |
| **LLM** | **Claude 3.5 Sonnet (API)** | Summaries and digest writing |
| **TTS** | **Fish Audio (Fish Speech)** | Spoken digest generation |
| **Deployment** | **Vercel (frontend)** + local or Render backend | Simple hosting |

---

## System Architecture (Simplified)

```
arXiv API → Embedding (MiniLM) → Chroma → Clustering (KMeans)
       ↓                                ↓
    SQLite ← Claude 3.5 Sonnet ← FastAPI → Frontend (V0)
       ↓
   Fish Audio → Audio digest (MP3)
```

---

## API Contracts

### `/api/digest/generate`  
**POST body:**
```json
{ "topic": "diffusion models", "days": 7 }
```

**Response:**
```json
{
  "digestId": "dg_123",
  "summary": "This week in diffusion models...",
  "clusters": [
    {
      "label": "Efficient Training",
      "bullets": ["LoRA variants reduce memory", "New gradient scaling methods"],
      "papers": [
        { "id": "2501.12345", "title": "Improving Diffusion...", "url": "https://arxiv.org/abs/2501.12345" }
      ]
    }
  ],
  "audioUrl": "https://.../dg_123.mp3"
}
```

### `/api/digest/latest?topic=...`  
Returns the latest cached digest.

---

## 10–12 Hour Timeline (Detailed)

### **Hour 0–2: Setup and Mock Stage**
**Goal:** Have a working skeleton with mock data visible in the browser.

#### Tasks
- **Frontend (V0):**
  - Scaffold `/kensa` with:
    - Topic input bar and day selector  
    - Generate Digest button  
    - Cluster card layout (label, bullets, paper links)
  - Include placeholders and loading states.

- **Backend (FastAPI):**
  - Create `/api/digest/generate` returning static mock JSON.
  - Verify CORS works with local Next.js.

#### Milestone
Clicking **Generate Digest** shows mock clusters on the screen.

---

### **Hour 2–4: Data Ingestion and Storage**
**Goal:** Pull real arXiv data and store it.

#### Tasks
- Use `python-arxiv` or `requests` to fetch:
  ```python
  import arxiv
  search = arxiv.Search(query=topic, max_results=50, sort_by=arxiv.SortCriterion.SubmittedDate)
  ```
- Parse and normalize:
  - `id`, `title`, `abstract`, `authors`, `url`, `published_at`
- Store in SQLite:
  ```sql
  CREATE TABLE papers (
      id TEXT PRIMARY KEY,
      title TEXT,
      abstract TEXT,
      url TEXT,
      published_at TEXT
  );
  ```
- Deduplicate by title hash.

#### Milestone
Database fills with 50–100 papers per topic.

---

### **Hour 4–6: Embedding and Clustering**
**Goal:** Create groups of related papers.

#### Tasks
- Use MiniLM to embed abstracts:
  ```python
  from sentence_transformers import SentenceTransformer
  model = SentenceTransformer("all-MiniLM-L6-v2")
  embeddings = model.encode(paper_abstracts)
  ```
- Store embeddings in **Chroma**:
  ```python
  import chromadb
  client = chromadb.Client()
  collection = client.get_or_create_collection("papers")

  collection.add(
      ids=[p["id"] for p in papers],
      embeddings=embeddings.tolist(),
      metadatas=[{"title": p["title"], "url": p["url"]} for p in papers],
      documents=[p["abstract"] for p in papers]
  )
  ```
- Run KMeans clustering:
  ```python
  from sklearn.cluster import KMeans
  km = KMeans(n_clusters=6, random_state=42)
  clusters = km.fit_predict(embeddings)
  ```
- For each cluster:
  - Pick top 3 papers closest to centroid.
  - Save `{cluster_id, title, abstract, url}`.

#### Milestone
Real clusters with top 3 papers each (labels pending).

---

### **Hour 6–8: Claude Summaries and Digest**
**Goal:** Replace placeholder labels and bullets with real summaries.

#### Tasks
- Use Claude 3.5 Sonnet for:
  - Cluster labeling and summary bullets  
  - Weekly digest generation  

**Cluster Prompt**
```
You are an academic editor. For each cluster, return compact JSON:
{ "label":"<≤5 words>",
  "bullets":["<≤12 words>","<≤12 words>","<≤12 words>"],
  "topPapers":[{"title":"...","why":"<≤12 words>"}] }
Use only the provided titles and abstracts. Be factual and concise.
```

**Digest Prompt**
```
Write a weekly digest for "{topic}" in 450 tokens or less:
1. Overview paragraph summarizing the week
2. 4–6 sections titled by cluster label, each with two concise bullets
3. End with "What to watch next" containing three bullets
Return plain text.
```

#### Additional Tasks
- Batch two clusters per API call to reduce latency.
- Add JSON validation and retry logic.
- Save results to SQLite:
  ```sql
  CREATE TABLE digests (
      digest_id TEXT PRIMARY KEY,
      topic TEXT,
      summary TEXT,
      clusters_json TEXT,
      created_at TEXT
  );
  ```

#### Milestone
Each cluster has a label and bullets; digest generated successfully.

---

### **Hour 8–10: Frontend Integration and Polishing**
**Goal:** Connect everything and make it smooth for the demo.

#### Tasks
- Hook V0 frontend to `/api/digest/generate`
- Display:
  - Cluster label and bullets  
  - Linked paper titles  
  - Digest text below clusters  
- Add loading and error states:
  - Loading skeletons  
  - Error toasts  
  - Empty-state messages  

- Polish styling:
  - Large readable fonts  
  - Card shadows  
  - Color-coded clusters  

#### Milestone
Full workflow: user enters topic → generates digest → sees results.

---

### **Hour 10–12: Extras and Demo Polish**
**Goal:** Add final polish and optional enhancements.

#### Optional Add-ons
1. **TTS (Spoken Digest):**
   - Use Fish Audio (Fish Speech) for `/api/tts`
   - Play output via `<audio>` element in UI.
2. **Caching:**
   - Cache digests by `(topic,days)` for 12–24 hours.
   - Skip redundant LLM calls.
3. **Chat About Papers (stretch goal):**
   - Retrieve top-k papers from Chroma → summarize via Claude.
4. **Hotness Score:**
   - Simple ranking formula: `score = recency + cluster_size`.

#### Demo Prep
- Test topics: `"diffusion models"` and `"LLM safety"`.
- Prepare short walkthrough and 60–90 second demo script:
  ```
  1. Enter topic "LLM safety"
  2. Click Generate
  3. See clustered summaries
  4. Play spoken digest
  5. Copy share link
  ```

#### Milestone
Fully functional and polished Kensa demo.

---

## Team Roles

| Role | Responsibilities |
|------|------------------|
| Backend Lead | FastAPI setup, Claude integration, caching, TTS endpoint |
| Frontend Lead | V0 page scaffolding, styling, data integration |
| Data / ML Engineer | arXiv ingest, embeddings, Chroma, clustering |
| QA / Integrator | Testing, validation, debugging, polish |

---

## Configurations and Guardrails

- **Claude Configuration**
  - `temperature = 0.4`
  - `max_tokens = 400–600`
  - `model = claude-3.5-sonnet`
- **Error Handling**
  - Retry once on invalid JSON.
- **Caching**
  - Save digest JSON by `(topic, days)` in SQLite.
- **Security**
  - Keep Claude API key server-side.
- **Performance**
  - Limit abstracts to 3 per cluster for context control.

---

## Final Deliverables

| Deliverable | Description |
|--------------|-------------|
| **Frontend (V0)** | `/kensa` page with topic input, clusters, digest, and player |
| **Backend (FastAPI)** | `/api/digest/generate` connected to Claude |
| **SQLite Database** | Stores cached papers and digests |
| **Claude Summaries** | Cluster labels, bullets, and weekly digest |
| **Audio Digest** | 2–3 minute spoken summary using Fish Audio |
| **Demo Video** | 1-minute recording of working app |

---

## What “Done” Looks Like

- User enters a topic and clicks Generate Digest  
- Kensa fetches arXiv papers, embeds, and clusters them in Chroma  
- Claude generates readable summaries and digest text  
- Spoken digest is playable through Fish Audio  
- Results are cached for reuse  

**Result:**  
A clean, production-quality AI assistant for research discovery. Practical, elegant, and genuinely useful.

---

## Example Directory Layout

```
kensa/
├── backend/
│   ├── main.py
│   ├── arxiv_ingest.py
│   ├── clustering.py
│   ├── claude_client.py
│   ├── database.py
│   ├── chroma_store.py
│   └── tts_fish_audio.py
├── frontend/
│   ├── app/
│   │   └── kensa/
│   │       ├── page.tsx
│   │       └── components/
│   │           ├── TopicBar.tsx
│   │           ├── ClusterCard.tsx
│   │           ├── DigestPlayer.tsx
│   │           └── LoadingSkeleton.tsx
├── data/
│   ├── papers.db
│   └── digests/
│       └── *.json
└── README.md
```

---

## Bonus Ideas (If Time Permits)
- Add search for past digests (`/digest/[id]` route)
- Send weekly digests via email (APScheduler)
- Visualize clusters with `Plotly` or `recharts`
- Introduce multi-agent analysis (Planner, Critic, Summarizer)

---

## Pitch Summary (For Judges)
> “We built **Kensa**, an AI-powered research companion that turns a week of new arXiv papers into a concise, spoken digest.  
> It fetches, clusters, summarizes, and narrates research updates using Claude 3.5, Chroma, and Fish Audio.  
> Kensa makes cutting-edge research understandable and accessible to everyone.”
