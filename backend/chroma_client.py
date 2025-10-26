import os
from functools import lru_cache

import chromadb
from chromadb import CloudClient
from chromadb.config import Settings


def _build_cloud_client() -> chromadb.api.ClientAPI:
    api_key = os.getenv("CHROMA_API_KEY")
    tenant = os.getenv("CHROMA_TENANT")
    database = os.getenv("CHROMA_DATABASE")
    if not api_key:
        raise RuntimeError("CHROMA_API_KEY must be set when CHROMA_MODE=cloud")
    if not tenant:
        raise RuntimeError("CHROMA_TENANT must be set when CHROMA_MODE=cloud")
    if not database:
        raise RuntimeError("CHROMA_DATABASE must be set when CHROMA_MODE=cloud")

    host = os.getenv("CHROMA_HOST", "api.trychroma.com")
    port = int(os.getenv("CHROMA_PORT", "443"))
    ssl_enabled = os.getenv("CHROMA_SSL", "true").lower() != "false"

    return CloudClient(
        tenant=tenant,
        database=database,
        api_key=api_key,
        cloud_host=host,
        cloud_port=port,
        enable_ssl=ssl_enabled,
    )


def _build_local_client() -> chromadb.PersistentClient:
    chroma_dir = os.getenv("CHROMA_DIR", "./chroma_store")
    os.makedirs(chroma_dir, exist_ok=True)
    return chromadb.PersistentClient(path=chroma_dir, settings=Settings(anonymized_telemetry=False))


@lru_cache(maxsize=1)
def get_chroma_client() -> chromadb.api.ClientAPI:
    mode = os.getenv("CHROMA_MODE", "local").lower()
    if mode == "cloud":
        return _build_cloud_client()
    return _build_local_client()


def get_collection(name: str):
    """Returns (and creates if needed) a Chroma collection with the provided name."""
    client = get_chroma_client()
    return client.get_or_create_collection(name)
