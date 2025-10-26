import os
import sqlite3
from typing import Any, Dict, List, Optional
from datetime import datetime

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
  created_at TEXT NOT NULL
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

def save_digest(digest_id: str, topic: str, days: int, summary: str, clusters_json: str, audio_url: Optional[str]) -> None:
    with _conn:
        _conn.execute(
            "INSERT OR REPLACE INTO digests(id, topic, days, summary, clusters_json, audio_url, created_at) VALUES(?,?,?,?,?,?,?)",
            (digest_id, topic, days, summary, clusters_json, audio_url, datetime.utcnow().isoformat())
        )
