## Inspiration
Even within a single research area, the volume of new arXiv submissions makes it hard to keep up. Our team kept bookmarking papers in group chats, only to lose track of who read what. We wanted a lightweight companion that could scan the latest uploads, surface the highlights, and package them into a briefing that teammates could skim between hackathon shifts.

## What it does
PaperLink turns a single topic prompt into a polished research digest in seconds. The FastAPI backend pulls the freshest arXiv papers, generates MiniLM embeddings, and clusters related work before asking Claude 3.5 Sonnet (proxied through Lava) for concise cluster labels and an executive summary. The Next.js 14 frontend offers two entry points: a “Browse” view for quick paper cards and a “Digest” view that renders weekly or monthly briefings, complete with featured papers, cluster bullets, and cached digests you can reload instantly. Highlight any sentence in the digest and a floating control pipes it through our Fish Audio TTS hook so you can listen on the fly. Everything persists in Chroma Cloud collections, with a local Chroma fallback for offline hacking, so repeat requests stay snappy.

## How we built it
We started by mapping the research workflow with sponsor mentors, reading arXiv and Chroma docs, and iterating with AI copilots until we had the right API contracts. On the backend we stood up FastAPI endpoints that orchestrate arXiv ingestion, embedding reuse via Chroma Cloud, KMeans clustering, prompt engineering, and digest caching keyed by stable IDs. The frontend uses Next.js App Router with React server components to drive the topic search, cached digest hydration, and markdown-to-component rendering. We layered in Tailwind-based UI polish, a reusable fetch library, and a Next route that forwards highlight snippets to Fish Audio for speech. None of it came easily; we literally glued it together through sheer grit over the 36-hour window.

## Challenges we ran into
- Respecting arXiv rate limits while still filtering results by fresh submission dates took careful client tuning and retries.
- LLMs love to freestyle, so we had to batch prompts and harden JSON parsing to keep cluster labels and summaries deterministic.
- We were onboarding to an entirely new stack: FastAPI, Chroma, Claude 3.5 via Lava, and Fish Audio, all at once, so every integration came with a docs-deep dive and a learning curve.
- Wiring the cache against Chroma Cloud collections required guardrails around schema migrations, multi-tenant settings, and TTLs.
- The digest view juggles weekly, monthly, and “latest” states; synchronizing URL params with React state without race conditions was surprisingly tricky.
- Our Fish Audio text-to-speech route exposed how fragile audio streaming can be under hackathon Wi-Fi, so we built lots of defensive logging and fallbacks.
- We absolutely borked version control mid-hackathon; merges stomped files, branches diverged, and we lost data until we refactored the project structure and painstakingly recovered each module.

## Accomplishments that we're proud of
- Built an end-to-end pipeline that can go from topic idea to shareable digest with embedded paper context in under a minute.
- Re-used embeddings across requests, cutting inference time dramatically and keeping the experience real-time even on a laptop GPU.
- Shipped a scrappy MVP that actually delivered the first digest without manual intervention, a magical “it works!” moment at 3 A.M.
- Celebrated every new feature landing in prod, from cached digests to highlight-to-speech; seeing the UI light up never got old.
- Delivered an interaction detail we love: highlight any insight in the digest and have PaperLink read it aloud, no browser extensions needed.
- Brought Chroma Cloud online so teammates can see each other’s digests instantly without extra configuration.
- Had way too much fun instrumenting Lava for Anthropic billing and auditioning Fish Audio voices until we found ones that felt like a real research presenter.
- Wrapped it all in a clean, modern UI that feels at home next to the best productivity tools.

## What we learned
- Prompt design matters as much as model choice; tight markdown templates were the difference between rambling copy and briefing-grade summaries.
- Investing in vector storage early pays off; you can ship features like “latest cached digest” and “cluster-aware enrichment” without reprocessing everything.
- Sponsor conversations saved us from rabbit holes; hearing how researchers triage papers refocused our UX decisions.
- Strong Git hygiene is not optional; branch discipline and small commits would have saved hours of recovery time once the repo went sideways.
- Even small quality-of-life touches (floating nav, keyboard shortcuts, highlight-to-speech) turn an MVP into something teams actually want to use.

## What's next for PaperLink
- Productionize the Fish Audio integration with configurable voices and offline caching so listening works on mobile.
- Add team workspaces with shared topics, email/Slack digests, and “follow” alerts for emerging clusters.
- Expand beyond arXiv by tapping publisher APIs and open datasets, with per-track prompt tuning.
- Layer in analytics, think trendlines for embedding clusters or “papers similar to what your lab cited last week.”
- Ship a Chrome extension so you can save an interesting abstract in one click and have it show up in your next briefing.
