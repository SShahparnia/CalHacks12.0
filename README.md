# PaperMapper

PaperMapper is a minimal AI-powered research companion that fetches new arXiv papers, clusters them by theme, and summarizes each week’s developments into a clear, concise digest with optional text-to-speech narration.

Built during CalHacks, powered by Claude 3.5, FAISS, and V0 by Vercel.

---

## Features

- Fetches the latest papers from arXiv by topic  
- Clusters related papers using MiniLM and FAISS  
- Generates human-readable digests with Claude 3.5 Sonnet  
- Optional audio digest using text-to-speech  
- Caches digests locally with SQLite  
- Simple and elegant V0 frontend built with Next.js and Tailwind

---

## Tech Stack

| Layer | Tools |
|-------|-------|
| Frontend | V0 by Vercel (Next.js, Tailwind) |
| Backend | FastAPI, Uvicorn |
| Database | SQLite |
| Embeddings | Sentence Transformers (all-MiniLM-L6-v2) |
| Vector Index | FAISS |
| LLM | Claude 3.5 Sonnet (API) |
| Text to Speech (Optional) | ElevenLabs or Piper |

---

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/papermapper.git
cd papermapper
```

### 2. Backend Setup
Create and activate a virtual environment, then install dependencies:
```bash
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn[standard] python-arxiv sentence-transformers faiss-cpu scikit-learn anthropic sqlite-utils
```

Run the backend:
```bash
uvicorn main:app --reload
```

### 3. Frontend Setup
From the `frontend` directory:
```bash
npm install
npm run dev
```

---

## API Overview

**POST /api/digest/generate**  
Generates a digest for a given topic.

**Body Example:**
```json
{ "topic": "diffusion models", "days": 7 }
```

**Response Example:**
```json
{
  "digestId": "dg_123",
  "summary": "This week in diffusion models...",
  "clusters": [
    {
      "label": "Efficient Training",
      "bullets": ["LoRA variants reduce memory", "Faster gradient methods"],
      "papers": [
        {"id": "2501.12345", "title": "Improving Diffusion", "url": "https://arxiv.org/abs/2501.12345"}
      ]
    }
  ]
}
```

---

## Project Structure

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
└── data/
    ├── papers.db
    └── digests/
```

---

## Example Prompts

**Cluster Summarization Prompt**
```
You are an academic editor. For each cluster, return JSON in the following format:
{
  "label": "<5 words>",
  "bullets": ["<12 words>", "<12 words>", "<12 words>"],
  "topPapers": [{"title": "...", "why": "<12 words>"}]
}
Use only the provided titles and abstracts. Be factual and concise.
```

**Digest Prompt**
```
Write a weekly digest for "{topic}" in 450 tokens or less:
1. Overview paragraph summarizing the week
2. 4–6 sections named by cluster label, each with two concise bullets
3. End with "What to watch next" containing three bullets
Return plain text only.
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss the proposed changes.

---

