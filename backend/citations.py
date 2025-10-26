import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

import requests

from db import (
    get_citation_rows,
    get_paper_metadata_map,
    replace_citations_for_source,
    upsert_paper_metadata,
)

OPENALEX_BASE_URL = os.getenv("OPENALEX_BASE_URL", "https://api.openalex.org")
OPENALEX_TIMEOUT = float(os.getenv("OPENALEX_TIMEOUT", "10"))
OPENALEX_MAILTO = os.getenv("OPENALEX_MAILTO")
CITATION_TTL_HOURS = int(os.getenv("CITATION_TTL_HOURS", "24"))
CITATION_MAX_REFERENCES = int(os.getenv("CITATION_MAX_REFERENCES", "4"))
CITATION_MAX_CITED_BY = int(os.getenv("CITATION_MAX_CITED_BY", "4"))
CITATION_BATCH_SIZE = int(os.getenv("CITATION_BATCH_SIZE", "25"))


def normalize_arxiv_id(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    prefixes = ["https://arxiv.org/abs/", "http://arxiv.org/abs/", "https://arxiv.org/pdf/", "http://arxiv.org/pdf/"]
    for prefix in prefixes:
        if cleaned.lower().startswith(prefix):
            cleaned = cleaned[len(prefix) :]
            break
    if cleaned.lower().startswith("arxiv:"):
        cleaned = cleaned.split(":", 1)[1]
    cleaned = cleaned.replace(".pdf", "").strip()
    return cleaned or None


def ensure_citations_for_papers(papers: Sequence[Dict[str, Any]]) -> None:
    focus: List[Dict[str, Any]] = []
    seen: Set[str] = set()
    for paper in papers:
        candidate = paper.get("paper_id") or paper.get("arxivId") or paper.get("id")
        normalized = normalize_arxiv_id(candidate)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        focus.append(
            {
                "paper_id": normalized,
                "title": paper.get("title"),
                "authors": paper.get("authors"),
                "url": paper.get("url"),
                "published_at": paper.get("published") or paper.get("published_at"),
                "source": paper.get("source", "arxiv"),
            }
        )
    if not focus:
        return
    upsert_paper_metadata(focus)
    meta_map = get_paper_metadata_map([p["paper_id"] for p in focus])
    now = datetime.utcnow()
    for paper in focus:
        meta = meta_map.get(paper["paper_id"])
        if _is_stale(meta, now):
            _refresh_citations_for_paper(paper)


def load_citation_context(
    focus_ids: Sequence[str],
    max_neighbors: int = 6,
) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    focus_clean = [pid for pid in focus_ids if pid]
    rows = get_citation_rows(focus_clean, limit_per=max_neighbors)
    neighbor_ids = [row["target_id"] for row in rows]
    metadata_ids = list(dict.fromkeys(focus_clean + neighbor_ids))
    metadata_map = get_paper_metadata_map(metadata_ids)
    return rows, metadata_map


def _is_stale(meta: Optional[Dict[str, Any]], now: datetime) -> bool:
    if not meta:
        return True
    synced = meta.get("citations_synced_at")
    if not synced:
        return True
    try:
        synced_at = datetime.fromisoformat(str(synced))
    except ValueError:
        return True
    return now - synced_at > timedelta(hours=CITATION_TTL_HOURS)


def _refresh_citations_for_paper(paper: Dict[str, Any]) -> None:
    paper_id = paper["paper_id"]
    now_iso = datetime.utcnow().isoformat()
    work = _fetch_openalex_work(paper_id)
    if not work:
        upsert_paper_metadata(
            [
                {
                    **paper,
                    "paper_id": paper_id,
                    "citations_synced_at": now_iso,
                }
            ]
        )
        replace_citations_for_source(paper_id, [])
        return

    base_meta = _work_to_metadata(work, source_label="openalex", citations_synced_at=now_iso)
    base_meta["paper_id"] = paper_id

    references = work.get("referenced_works") or []
    reference_meta = _fetch_openalex_batch(references[:CITATION_MAX_REFERENCES])
    cited_meta = _fetch_cited_by_works(work.get("id"), CITATION_MAX_CITED_BY)

    metadata_rows = [base_meta]
    citation_rows: List[Dict[str, Any]] = []

    for ref in reference_meta:
        meta = _work_to_metadata(ref, source_label="openalex-reference")
        if not meta.get("paper_id"):
            continue
        metadata_rows.append(meta)
        citation_rows.append(
            {
                "target_id": meta["paper_id"],
                "relation": "references",
                "weight": 1.0,
                "context": "references",
                "origin": "openalex",
                "updated_at": now_iso,
            }
        )

    for cite in cited_meta:
        meta = _work_to_metadata(cite, source_label="openalex-cited")
        if not meta.get("paper_id"):
            continue
        metadata_rows.append(meta)
        citation_rows.append(
            {
                "target_id": meta["paper_id"],
                "relation": "cited_by",
                "weight": 0.9,
                "context": "cited_by",
                "origin": "openalex",
                "updated_at": now_iso,
            }
        )

    upsert_paper_metadata(metadata_rows)
    replace_citations_for_source(paper_id, citation_rows)


def _work_to_metadata(
    work: Dict[str, Any],
    *,
    source_label: str,
    citations_synced_at: Optional[str] = None,
) -> Dict[str, Any]:
    ids = work.get("ids") or {}
    arxiv_url = ids.get("arxiv")
    paper_id = normalize_arxiv_id(arxiv_url) or work.get("id")
    authors = work.get("authorships") or []
    author_names = ", ".join(
        a.get("author", {}).get("display_name")
        for a in authors
        if a.get("author", {}).get("display_name")
    )
    published = work.get("publication_year")
    if work.get("publication_date"):
        published = work.get("publication_date")
    primary_location = (work.get("primary_location") or {}).get("landing_page_url")
    url = primary_location or (work.get("open_access") or {}).get("oa_url") or work.get("id")

    return {
        "paper_id": paper_id,
        "title": work.get("display_name"),
        "authors": author_names or None,
        "url": url,
        "published_at": published,
        "source": source_label,
        "external_id": work.get("id"),
        "doi": ids.get("doi"),
        "raw_json": work,
        "citations_synced_at": citations_synced_at,
        "cited_by_count": work.get("cited_by_count"),
        "referenced_count": work.get("referenced_works_count"),
    }


def _fetch_openalex_work(arxiv_id: str) -> Optional[Dict[str, Any]]:
    if not arxiv_id:
        return None
    endpoint = f"/works/arXiv:{arxiv_id}"
    data = _request_openalex(endpoint)
    if isinstance(data, dict) and data.get("id"):
        return data
    return None


def _fetch_openalex_batch(ids: Sequence[str]) -> List[Dict[str, Any]]:
    cleaned = [value for value in ids if value]
    if not cleaned:
        return []
    results: List[Dict[str, Any]] = []
    for idx in range(0, len(cleaned), CITATION_BATCH_SIZE):
        chunk = cleaned[idx : idx + CITATION_BATCH_SIZE]
        filters = "|".join(chunk)
        data = _request_openalex("/works", params={"filter": f"openalex_id:{filters}", "per-page": len(chunk)})
        if isinstance(data, dict):
            results.extend(data.get("results", []))
    return results


def _fetch_cited_by_works(openalex_id: Optional[str], limit: int) -> List[Dict[str, Any]]:
    if not openalex_id or limit <= 0:
        return []
    data = _request_openalex(
        "/works",
        params={
            "filter": f"cites:{openalex_id}",
            "per-page": min(limit, 25),
            "sort": "cited_by_count:desc",
        },
    )
    if isinstance(data, dict):
        return data.get("results", [])[:limit]
    return []


def _request_openalex(path: str, params: Optional[Dict[str, Any]] = None) -> Optional[Any]:
    url = f"{OPENALEX_BASE_URL.rstrip('/')}{path}"
    query = dict(params or {})
    if OPENALEX_MAILTO:
        query.setdefault("mailto", OPENALEX_MAILTO)
    try:
        response = requests.get(url, params=query, timeout=OPENALEX_TIMEOUT)
        if response.status_code >= 400:
            return None
        return response.json()
    except requests.RequestException:
        return None
