import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_url: str | None = None
_key: str | None = None
_client: Client | None = None


def get_client() -> Client:
    global _url, _key, _client
    if _client is not None:
        return _client
    _url = os.getenv("SUPABASE_URL", "")
    _key = os.getenv("SUPABASE_SERVICE_KEY", "")
    if not _url or not _key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    _client = create_client(_url, _key)
    return _client


def get_bucket() -> str:
    return os.getenv("STORAGE_BUCKET", "research-reports")
