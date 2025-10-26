import os
from typing import Any, Dict, Optional

from db import (
    save_digest as sqlite_save_digest,
    get_latest_digest as sqlite_get_latest,
    get_cached_digest as sqlite_get_cached,
)

CACHE_BACKEND = os.getenv("DIGEST_CACHE_BACKEND", "sqlite").lower()
USE_CHROMA_CACHE = CACHE_BACKEND == "chroma"

if USE_CHROMA_CACHE:
    from chroma_digest_cache import (
        save_digest as chroma_save_digest,
        get_latest_digest as chroma_get_latest,
        get_cached_digest as chroma_get_cached,
    )
else:
    chroma_save_digest = chroma_get_latest = chroma_get_cached = None  # type: ignore


def save_digest(
    digest_id: str,
    topic: str,
    days: int,
    summary: str,
    clusters_json: str,
    audio_url: Optional[str],
    top_k: int,
    period: str,
    voice: bool,
) -> None:
    if USE_CHROMA_CACHE and chroma_save_digest:
        chroma_save_digest(digest_id, topic, days, summary, clusters_json, audio_url, top_k, period, voice)
        return
    sqlite_save_digest(digest_id, topic, days, summary, clusters_json, audio_url, top_k, period, voice)


def get_latest_digest(topic: str, days: int) -> Optional[Dict[str, Any]]:
    if USE_CHROMA_CACHE and chroma_get_latest:
        return chroma_get_latest(topic, days)
    return sqlite_get_latest(topic, days)


def get_cached_digest(
    topic: str,
    days: int,
    top_k: int,
    period: str,
    voice: bool,
    ttl_hours: int,
) -> Optional[Dict[str, Any]]:
    if USE_CHROMA_CACHE and chroma_get_cached:
        return chroma_get_cached(topic, days, top_k, period, voice, ttl_hours)
    return sqlite_get_cached(topic, days, top_k, period, voice, ttl_hours)
