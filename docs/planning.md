# PaperMapper — 10–12 Hour Build Plan (Claude 3.5 + V0 Frontend)

**Goal:**  
Build a web app that automatically fetches recent **arXiv papers** by topic, clusters them by theme, and generates a **spoken weekly digest** using **Claude 3.5 Sonnet**.

---

## Tech Stack Overview

| Layer | Tool | Purpose |
|-------|------|----------|
| **Frontend** | **V0 by Vercel (Next.js + Tailwind)** | Rapid, elegant UI generation |
| **Backend** | **FastAPI + Uvicorn** | Lightweight API layer |
| **Database** | **SQLite** | Store papers, digests, cached outputs |
| **Embeddings** | `sentence-transformers` **all-MiniLM-L6-v2** | Local, fast embeddings |
| **Vector Index** | **FAISS** (in-process) | Paper clustering |
| **LLM** | **Claude 3.5 Sonnet (API)** | Summaries + digest writing |
| **TTS (optional)** | **ElevenLabs** or **Piper** | Spoken digest |
| **Deployment** | **Vercel (frontend)** + local/Render backend | Simple hosting |

---

## System Architecture (Simplified)

```
arXiv API → Embedding (MiniLM) → FAISS → Clustering (KMeans)
       ↓                                 ↓
    SQLite ← Claude 3.5 Sonnet ← FastAPI → Frontend (V0)
       ↓
  Optional TTS → Audio digest (MP3)
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

### **Hour 0–2: Setup & Mock Stage**
**Goal:** Have a working skeleton with mock data visible in the browser.

#### Tasks
- **Frontend (V0):**
  - Scaffold `/papermapper` with:
    - Topic input bar + day selector  
    - “Generate Digest” button  
    - Cluster card layout (label, bullets, paper links)
  - Include placeholders and loading states.

- **Backend (FastAPI):**
  - Create `/api/digest/generate` returning static mock JSON.
  - Verify CORS works with local Next.js.

#### Milestone
Clicking **Generate Digest** shows mock clusters on the screen.

---

### **Hour 2–4: Data Ingestion + Storage**
**Goal:** Pull real arXiv data and store it.

#### Tasks
- Use `python-arxiv` or simple `requests` to fetch:
  ```python
  import arxiv
  search = arxiv.Search(query=topic, max_results=50, sort_by=arxiv.SortCriterion.SubmittedDate)
  ```
- Parse and normalize:
  - `id`, `title`, `abstract`, `authors`, `url`, `published_at`
- Store in **SQLite** table:
  ```sql
  CREATE TABLE papers (
      id TEXT PRIMARY KEY,
      title TEXT,
      abstract TEXT,
      url TEXT,
      published_at TEXT
  );
  ```
- Dedup by title hash.

#### Milestone
Database fills with ~50–100 papers per topic.

---

### **Hour 4–6: Embedding + Clustering**
**Goal:** Create groups of related papers.

#### Tasks
- Use MiniLM to embed abstracts:
  ```python
  from sentence_transformers import SentenceTransformer
  model = SentenceTransformer('all-MiniLM-L6-v2')
  embeddings = model.encode(paper_abstracts)
  ```
- Build **FAISS** index:
  ```python
  import faiss
  index = faiss.IndexFlatL2(embeddings.shape[1])
  index.add(embeddings)
  ```
- Run **KMeans (k=6)** clustering:
  ```python
  from sklearn.cluster import KMeans
  km = KMeans(n_clusters=6, random_state=42)
  clusters = km.fit_predict(embeddings)
  ```
- For each cluster:
  - Pick top 3 papers closest to centroid.
  - Save `{cluster_id, title, abstract, url}`.

#### Milestone
Real clusters with top 3 papers each (labels TBD).

---

### **Hour 6–8: Claude Summaries + Digest**
**Goal:** Replace placeholder labels/bullets with real summaries.

#### Tasks
- Use **Claude 3.5 Sonnet** for:
  - **Cluster labeling & bullets**
  - **Weekly digest composition**

**Cluster Prompt:**
```
You are an academic editor. For EACH cluster, return compact JSON:
{ "label":"<≤5 words>",
  "bullets":["<≤12 words>","<≤12 words>","<≤12 words>"],
  "topPapers":[{"title":"...","why":"<≤12 words>"}] }
Use only the provided titles/abstract snippets. Be factual, no hype.
```

**Digest Prompt:**
```
Write a weekly digest for "{topic}" in ≤450 tokens:
1) One-paragraph overview (what changed this week)
2) 4–6 sections titled by cluster labels, each with 2 concise bullets
3) End with "What to watch next" (3 bullets)
Return plain text.
```

#### Tasks (continued)
- Batch 2 clusters per call to reduce latency/cost.
- Add JSON validation & retry logic.
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
Each cluster has a meaningful label and summary; digest text generated.

---

### **Hour 8–10: Frontend Integration + Polishing**
**Goal:** Connect everything, make it feel smooth and finished.

#### Tasks
- Hook V0 frontend → `/api/digest/generate`
- Show:
  - Cluster label + bullets
  - Top papers as links
  - Digest text below clusters
- Add:
  - Loading skeletons (`isLoading` state)
  - Error toasts
  - Empty-state message (“No papers found”)

- Polish styling:
  - Large readable fonts
  - Card shadows
  - Color-coded clusters

#### Milestone
Full round trip: **type topic → Generate → clusters + digest render.**

---

### **Hour 10–12: Extras + Demo Polish**
**Goal:** Add finishing touches and optional features.

#### Optional Add-Ons
1. **TTS (Spoken Digest):**
   - Use ElevenLabs or Piper for `/api/tts`
   - Play audio via `<audio>` element in UI.
2. **Caching:**
   - Cache digests by `(topic,days)` for 12–24 hours.
   - If cached, skip LLM call.
3. **Chat About Papers (stretch goal):**
   - Retrieve top-k papers from FAISS → send to Claude → return grounded answer.
4. **Hotness Score:**
   - Add simple metric: `score = recency + cluster_size`.

#### Demo Prep
- Test 2 topics: `"diffusion models"` and `"LLM safety"`.
- Record short walkthrough.
- 60–90 sec live demo script:
  ```
  1. Enter topic "LLM safety"
  2. Click Generate
  3. See themed clusters + summaries
  4. Play 2-min audio digest
  5. Copy share link for others
  ```

#### Milestone
Fully polished, demo-ready PaperMapper.

---

## 👥 Team Roles

| Role | Responsibilities |
|------|------------------|
| **P1 – Backend Lead** | FastAPI setup, Claude integration, caching, TTS endpoint |
| **P2 – Frontend (V0)** | Page scaffolding, styling, fetch logic, loading states |
| **P3 – Data / ML** | arXiv ingest, embeddings, FAISS, clustering |
| **P4 – QA / Integrator** | Testing, validation, debugging, polish |

---

## ⚙️ Guardrails & Configs

- **Claude Settings:**
  - `temperature = 0.4`
  - `max_tokens = 400–600`
  - `model = claude-3.5-sonnet`
- **Error handling:** Retry once on invalid JSON.
- **Caching:** Save digest JSON by `(topic, days)` in SQLite.
- **Security:** Keep Claude API key server-side only.
- **Performance:** Cap abstracts to 3 per cluster to limit context.

---

## Final Deliverables

| Deliverable | Description |
|--------------|-------------|
| **Frontend (V0)** | `/papermapper` page with input, clusters, digest, and player |
| **Backend (FastAPI)** | `/api/digest/generate` connected to Claude |
| **SQLite DB** | Stores cached papers and digests |
| **Claude Summaries** | Cluster labels, bullets, and digest |
| **Audio Digest (optional)** | 2–3 minute spoken summary |
| **Demo Video** | 1-minute screen recording of working app |

---

## What “Done” Looks Like

- User enters topic → clicks **Generate Digest**  
- App fetches arXiv papers → clusters → uses Claude → shows labeled clusters  
- Digest paragraph + top papers displayed beautifully  
- Audio digest plays smoothly  
- Cached results load instantly next time  

**Result:**  
A polished, research-focused, open-source, LLM-powered tool that looks clean, sounds professional, and *actually solves a real problem*.

---

## Example Directory Layout

```
papermapper/
├── backend/
│   ├── main.py
│   ├── arxiv_ingest.py
│   ├── clustering.py
│   ├── claude_client.py
│   ├── database.py
│   └── tts.py
├── frontend/
│   ├── app/
│   │   └── papermapper/
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
- Add **search bar** for past digests (`/digest/[id]` route)
- **Email weekly digest** to yourself via cron (APScheduler)
- Display **graph of clusters** using `Plotly` or `recharts`
- Add “**Eco mode**”: mini multi-agent debate ranking clusters by importance

---

## Pitch Summary (For Judges)
> “We built **PaperMapper**, an open-source research companion that turns an entire week of new arXiv papers into a 2-minute digest.  
> It fetches, clusters, summarizes, and even reads the results aloud.  
> Powered by Claude 3.5 and a local FAISS + MiniLM pipeline — all open, fast, and focused on saving researchers time.”

---
