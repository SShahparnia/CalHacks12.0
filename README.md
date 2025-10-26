# PaperLink

PaperLink is an AI-powered research companion built at CalHacks 12.0. Give it a topic and it pulls the latest arXiv submissions, clusters them by theme, and asks Claude 3.5 to write a concise weekly briefing you can scan or share. A FastAPI backend handles ingestion, embeddings, and caching while a Next.js frontend presents the digest.

---

## Highlights

- Track new arXiv papers for any topic with a single request
- Cluster related work using MiniLM embeddings stored in Chroma
- Summarize each cluster and the overall week with Claude 3.5 Sonnet
- Cache past digests in SQLite for instant reloads
- Optional Fish Audio TTS hook (stubbed in repo and ready for integration)

---

## Tech Stack

| Layer | Tools |
|-------|-------|
| Frontend | Next.js 14 (App Router, React 18) |
| Backend | FastAPI, Uvicorn |
| Database | SQLite (`backend/kensa.db`) |
| Vector Store | Chroma (persistent client) |
| LLM | claude-haiku-4-5-20251001 (Anthropic API) |
| Text to Speech | Fish Audio / Fish Speech |

---

## Getting Started

### 1. Clone
```bash
git clone https://github.com/yourusername/paperlink.git
cd paperlink
```

### 2. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` with at least:
```
ANTHROPIC_API_KEY=sk-ant-...
# DATABASE_URL=backend/kensa.db
# CHROMA_DIR=./chroma_store
```

Run the API:
```bash
uvicorn main:app --reload --port 8000
```

#### Cloud digest cache (optional)
To share cached digests (weekly or monthly) across teammates, point the backend at a managed Chroma project (e.g. trychroma.com) and set the following in `backend/.env`:

```
DIGEST_CACHE_BACKEND=chroma
CHROMA_MODE=cloud
CHROMA_API_KEY=<your_chroma_api_key>
CHROMA_TENANT=<your_tenant_id>
CHROMA_DATABASE=<your_database_name>
CHROMA_HOST=api.trychroma.com   
CHROMA_PORT=443
CHROMA_SSL=true
CHROMA_PAPERS_COLLECTION=papers
CHROMA_DIGEST_COLLECTION=digests
```

Leave `DIGEST_CACHE_BACKEND` unset (or `sqlite`) to keep using the local `backend/kensa.db` cache.

### 3. Frontend Setup
From the `frontend` directory:
```bash
cd ../frontend
npm install
```

Configure `frontend/.env.local`:
```
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

Start the dev server:
```bash
npm run dev
```

Visit `http://localhost:3000` and generate a digest.

---

## API Reference

- `GET /api/health` – simple readiness check  
- `POST /api/digest` – generate a fresh digest  
- `GET /api/digest/latest?topic=<topic>` – fetch the most recent cached digest

### `POST /api/digest`

**Body**
```json
{ "topic": "diffusion models", "days": 7, "voice": false }
```

**Response**
```json
{
  "digestId": "dg_123",
  "summary": "This week in diffusion models...",
  "clusters": [
    {
      "label": "Efficient Training",
      "bullets": ["LoRA variants reduce memory", "Faster gradient methods"],
      "topPapers": [
        { "title": "Improving Diffusion", "url": "https://arxiv.org/abs/2501.12345", "why": "Parameter-efficient finetuning" }
      ]
    }
  ],
  "audioUrl": null
}
```

---

## Project Structure

```
paperlink/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── services.py          # arXiv fetch, embeddings, clustering, Claude calls
│   ├── db.py                # SQLite helpers and schema
│   ├── prompts.py           # Prompt templates for Claude
│   ├── chroma_store/        # Persistent Chroma collection
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   └── page.tsx         # PaperLink UI (App Router)
│   ├── lib/
│   │   └── fetch.ts         # Client helpers that call the API
│   └── package.json
├── docs/
│   └── planning.md
└── README.md
```

---


**Digest Writer**
```
Write a weekly digest for "{topic}" in 450 tokens or less:
1. Overview paragraph summarizing the week
2. 4–6 sections named by cluster label, each with two concise bullets
3. End with "What to watch next" containing three bullets
Return plain text only.
```

---

## Contributing

Pull requests are welcome. Please open an issue first for major changes so we can align on the approach.

---
