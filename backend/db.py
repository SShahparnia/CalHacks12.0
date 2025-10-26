import os
import sqlite3
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

DB_PATH = os.getenv("DATABASE_URL", "backend/kensa.db")

DDL = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS papers (

  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS digests (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  days INTEGER NOT NULL,
  summary TEXT NOT NULL,
  clusters_json TEXT NOT NULL,
  audio_url TEXT,
  created_at TEXT NOT NULL,
  top_k INTEGER NOT NULL DEFAULT 5,
  period TEXT NOT NULL DEFAULT 'weekly',
  voice INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_digests_topic_created ON digests(topic, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digests_topic_days_created ON digests(topic, days, created_at DESC);
"""

def get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

_conn = get_conn()
with _conn:
    for stmt in DDL.strip().split(";"):
        s = stmt.strip()
        if s:
            _conn.execute(s)

def _ensure_digest_columns() -> None:
    expected = {
        "top_k": "INTEGER NOT NULL DEFAULT 5",
        "period": "TEXT NOT NULL DEFAULT 'weekly'",
        "voice": "INTEGER NOT NULL DEFAULT 0"
    }
    existing = {row["name"] for row in _conn.execute("PRAGMA table_info(digests)")}
    with _conn:
        for col, ddl in expected.items():
            if col not in existing:
                _conn.execute(f"ALTER TABLE digests ADD COLUMN {col} {ddl}")

_ensure_digest_columns()

def upsert_papers(rows: List[Dict[str, Any]]) -> None:
    sql = """
    INSERT INTO papers(id, title, abstract, url, published_at)
    VALUES(?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      abstract=excluded.abstract,
      url=excluded.url,
      published_at=excluded.published_at
    """
    vals = [(r["id"], r["title"], r["abstract"], r["url"], r["published_at"]) for r in rows]
    with _conn:
        _conn.executemany(sql, vals)

def get_latest_digest(topic: str, days: int) -> Optional[Dict[str, Any]]:
    row = _conn.execute(
        "SELECT * FROM digests WHERE topic=? AND days=? ORDER BY created_at DESC LIMIT 1",
    (topic, days)
    ).fetchone()
    if not row:
        return None
    return dict(row)

def get_cached_digest(topic: str, days: int, top_k: int, period: str, voice: bool, ttl_hours: int) -> Optional[Dict[str, Any]]:
    """
    Return the most recent digest matching the key parameters if it is still within the TTL window.
    """
    row = _conn.execute(
        """
        SELECT *
        FROM digests
        WHERE topic=? AND days=? AND top_k=? AND period=? AND voice=?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (topic, days, top_k, period, 1 if voice else 0)
    ).fetchone()
    if not row:
        return None

    ttl = max(0, ttl_hours)
    if ttl == 0:
        return dict(row)

    created = row["created_at"]
    try:
        created_at = datetime.fromisoformat(created)
    except ValueError:
        created_at = datetime.utcnow()
    if datetime.utcnow() - created_at <= timedelta(hours=ttl):
        return dict(row)
    return None

def save_digest(digest_id: str, topic: str, days: int, summary: str, clusters_json: str, audio_url: Optional[str], top_k: int, period: str, voice: bool) -> None:
    with _conn:
        _conn.execute(
            """
            INSERT OR REPLACE INTO digests(
                id, topic, days, summary, clusters_json, audio_url, created_at, top_k, period, voice
            ) VALUES(?,?,?,?,?,?,?,?,?,?)
            """,
            (
                digest_id,
                topic,
                days,
                summary,
                clusters_json,
                audio_url,
                datetime.utcnow().isoformat(),
                top_k,
                period,
                1 if voice else 0
            )
        )
