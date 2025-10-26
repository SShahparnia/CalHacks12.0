import hashlib


def build_digest_id(topic: str, days: int) -> str:
    """
    Mirror the legacy digest id format so caches remain compatible.
    """
    key = f"{topic}_{days}"
    return f"dg_{hashlib.sha1(key.encode()).hexdigest()[:10]}"
