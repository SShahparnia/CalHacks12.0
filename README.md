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
| Embeddings | Sentence Transformers (`all-MiniLM-L6-v2`) |
| LLM | Claude 3.5 Sonnet (Anthropic API) |
| Text to Speech | Fish Audio / Fish Speech (optional) |

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
# Optional overrides
# DATABASE_URL=backend/kensa.db
# CHROMA_DIR=./chroma_store
```

Run the API:
```bash
uvicorn main:app --reload --port 8000
```

The server exposes OpenAPI docs at `http://localhost:8000/docs`.

### 3. Frontend (Next.js)
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
│   ├── main.py           # FastAPI entry point
│   ├── services.py       # arXiv fetch, embeddings, clustering, Claude calls
│   ├── db.py             # SQLite helpers and schema
│   ├── prompts.py        # Prompt templates for Claude
│   ├── chroma_store/     # Persistent Chroma collection
│   └── requirements.txt
├── frontend/
│   ├── app/page.tsx      # PaperLink UI (App Router)
│   ├── lib/fetch.ts      # Client helpers that call the API
│   └── package.json
├── docs/
│   └── planning.md
└── README.md
```

---

## Prompt Templates

**Cluster Summaries**
```
You are an academic editor. For each cluster, return JSON in the following format:
[
  {
    "label": "<5 words>",
    "bullets": ["<12 words>", "<12 words>", "<12 words>"],
    "topPapers": [{"title": "...", "why": "<12 words>"}]
  }
]
Use only the provided titles and abstracts. Be factual and concise.
```

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

## License

MIT License. See `LICENSE` for details.
