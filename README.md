# PaperMapper

PaperMapper is a minimal AI-powered research companion that fetches new arXiv papers, clusters them by theme, and summarizes each week’s developments into a clear, concise digest with optional text-to-speech narration.

Built during CalHacks, powered by Claude 3.5, Chroma, and V0 by Vercel.

---

## Features

- Fetches the latest papers from arXiv by topic  
- Clusters related papers using MiniLM and Chroma  
- Generates human-readable digests with Claude 3.5 Sonnet  
- Optional audio digest using Fish Audio (TTS)  
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
| Vector Store | Chroma |
| LLM | Claude 3.5 Sonnet (API) |
| Text to Speech | Fish Audio (Fish Speech TTS) |

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
pip install fastapi uvicorn[standard] python-arxiv sentence-transformers chromadb scikit-learn anthropic sqlite-utils requests
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
  ],
  "audioUrl": "https://.../dg_123.mp3"
}
```

---

## Using Chroma for Paper Storage and Retrieval

PaperMapper uses **Chroma** as its vector database to store and retrieve paper embeddings.

```python
import chromadb
from sentence_transformers import SentenceTransformer

client = chromadb.Client()
collection = client.get_or_create_collection("papers")

model = SentenceTransformer("all-MiniLM-L6-v2")

texts = [p["abstract"] for p in papers]
embeddings = model.encode(texts)

collection.add(
    ids=[p["id"] for p in papers],
    embeddings=embeddings.tolist(),
    metadatas=[{"title": p["title"], "url": p["url"]} for p in papers],
    documents=texts
)

# Query examples
query_results = collection.query(
    query_texts=["diffusion training efficiency"],
    n_results=10
)
```

Chroma automatically persists your embeddings and metadata to a local `.chroma/` directory, so no additional storage setup is required.

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
│   ├── chroma_store.py
│   └── tts_fish_audio.py
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

## Text to Speech Integration (Fish Audio)

PaperMapper uses **Fish Audio (Fish Speech)** to generate natural spoken digests.

**Installation**
```bash
pip install fish-audio
```

**Example Usage**
```python
from fish_audio import FishTTS

tts = FishTTS()
tts.generate("This week in AI safety, researchers introduced new alignment methods...", "output.mp3")
```

The generated MP3 can be served directly through the `/api/tts` endpoint and played in the frontend audio component.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss the proposed changes.

---
