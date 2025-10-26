import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from chroma_client import get_collection
from digest_ids import build_digest_id

DIGEST_COLLECTION = os.getenv("CHROMA_DIGEST_COLLECTION", "digests")


def _digests_collection():
    return get_collection(DIGEST_COLLECTION)


def _serialize_metadata(
    topic: str,
    days: int,
    summary: str,
    clusters_json: str,
    audio_url: Optional[str],
    top_k: int,
    period: str,
    voice: bool,
) -> Dict[str, Any]:
    return {
        "topic": topic,
        "days": days,
        "clusters_json": clusters_json,
        "audio_url": audio_url,
        "top_k": top_k,
        "period": period,
        "voice": bool(voice),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _extract_record(record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    ids = record.get("ids") or []
    if not ids:
        return None
    metadatas = record.get("metadatas") or []
    documents = record.get("documents") or []
    metadata = metadatas[0] if metadatas else {}
    summary = documents[0] if documents else ""
    return {
        "id": ids[0],
        "topic": metadata.get("topic"),
        "days": metadata.get("days"),
        "summary": summary,
        "clusters_json": metadata.get("clusters_json") or "[]",
        "audio_url": metadata.get("audio_url"),
        "top_k": metadata.get("top_k", 5),
        "period": metadata.get("period", "weekly"),
        "voice": metadata.get("voice", False),
        "created_at": metadata.get("created_at"),
    }


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
    col = _digests_collection()
    metadata = _serialize_metadata(topic, days, summary, clusters_json, audio_url, top_k, period, voice)
    col.upsert(
        ids=[digest_id],
        documents=[summary],
        metadatas=[metadata],
    )


def _get_by_id(digest_id: str) -> Optional[Dict[str, Any]]:
    col = _digests_collection()
    record = col.get(ids=[digest_id], include=["metadatas", "documents"])
    if not record or not record.get("ids"):
        return None
    return _extract_record(record)


def get_latest_digest(topic: str, days: int) -> Optional[Dict[str, Any]]:
    digest_id = build_digest_id(topic, days)
    record = _get_by_id(digest_id)
    if record and record.get("topic") == topic and record.get("days") == days:
        return record
    return None


def get_cached_digest(
    topic: str,
    days: int,
    top_k: int,
    period: str,
    voice: bool,
    ttl_hours: int,
) -> Optional[Dict[str, Any]]:
    digest_id = build_digest_id(topic, days)
    record = _get_by_id(digest_id)
    if not record:
        return None

    if any([
        record.get("top_k") != top_k,
        record.get("period") != period,
        bool(record.get("voice")) != bool(voice),
    ]):
        return None

    created_at = record.get("created_at")
    if not created_at or ttl_hours <= 0:
        return record

    try:
        created = datetime.fromisoformat(created_at)
    except ValueError:
        return record

    if datetime.now(timezone.utc) - created <= timedelta(hours=max(0, ttl_hours)):
        return record
    return None
