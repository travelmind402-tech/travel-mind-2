"""
utils/cache.py

Two-layer cache — no Redis required:
  Layer 1: In-memory dict (exchange rates, forecasts)
           Zero latency, lost on restart — fine for short TTLs
  Layer 2: SQLite file (cuisine, culture, disruptions)
           1-2ms latency, survives restarts — good for long TTLs

Drop-in replacement for the Redis version.
All function signatures stay identical so no agent changes needed.
"""

import json
import sqlite3
import hashlib
import os
import time
import threading
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────

# SQLite file lives next to this file
DB_PATH = Path(__file__).parent.parent / "travelmind_cache.db"

# In-memory dict — shared across all requests
# Structure: { key: { "value": dict, "expires_at": float } }
_memory_cache: dict = {}
_memory_lock  = threading.Lock()

# TTL constants — identical to Redis version
TTL = {
    "weather":       10800,    # 3 hours
    "historical":    2592000,  # 30 days
    "disaster":      604800,   # 7 days
    "cuisine":       21600,    # 6 hours
    "culture":       2592000,  # 30 days
    "disruption":    86400,    # 24 hours
    "driving":       10800,    # 3 hours
    "budget":        86400,    # 24 hours
    "exchange_rate": 3600,     # 1 hour
    "restaurants":   21600,    # 6 hours
}

# Agents that use in-memory only (short TTL, high frequency)
_MEMORY_ONLY_PREFIXES = {
    "exchange_rate",
    "weather",
    "driving",
}

# Agents that use SQLite (longer TTL, worth persisting)
_SQLITE_PREFIXES = {
    "cuisine",
    "culture",
    "disruption",
    "budget",
    "historical",
    "disaster",
    "restaurants",
}


# ─────────────────────────────────────────────
# SQLite SETUP
# ─────────────────────────────────────────────

def _get_conn() -> sqlite3.Connection:
    """
    Returns a SQLite connection.
    Creates the cache table if it does not exist.
    """
    conn = sqlite3.connect(str(DB_PATH), timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # faster writes
    conn.execute("PRAGMA synchronous=NORMAL") # safe but fast
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cache (
            key         TEXT PRIMARY KEY,
            value       TEXT NOT NULL,
            expires_at  REAL NOT NULL,
            created_at  TEXT NOT NULL,
            prefix      TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS
        idx_cache_prefix ON cache(prefix)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS
        idx_cache_expires ON cache(expires_at)
    """)
    conn.commit()
    return conn


def _cleanup_expired_sqlite():
    """
    Removes expired rows from SQLite.
    Called lazily on cache miss.
    """
    try:
        with _get_conn() as conn:
            conn.execute(
                "DELETE FROM cache WHERE expires_at < ?",
                (time.time(),)
            )
            conn.commit()
    except Exception as e:
        print(f"[Cache] SQLite cleanup error: {e}")


# ─────────────────────────────────────────────
# KEY BUILDER — identical to Redis version
# ─────────────────────────────────────────────

def build_cache_key(prefix: str, **kwargs) -> str:
    """
    Builds a consistent cache key from prefix
    and keyword arguments.

    Example:
      build_cache_key("weather", city="Shillong",
                      date="2026-04-25")
      → "weather:city=shillong:date=2026-04-25"
    """
    parts = [prefix]
    for k, v in sorted(kwargs.items()):
        if v is not None:
            val = str(v).lower().strip()
            parts.append(f"{k}={val}")

    key = ":".join(parts)

    # Hash if too long
    if len(key) > 200:
        hashed = hashlib.md5(key.encode()).hexdigest()
        key    = f"{prefix}:hash:{hashed}"

    return key


def _get_prefix(key: str) -> str:
    """Extracts prefix from cache key."""
    return key.split(":")[0]


# ─────────────────────────────────────────────
# LAYER 1 — IN-MEMORY CACHE
# ─────────────────────────────────────────────

def _memory_get(key: str) -> dict | None:
    with _memory_lock:
        entry = _memory_cache.get(key)
        if entry is None:
            return None
        if time.time() > entry["expires_at"]:
            del _memory_cache[key]
            return None
        return entry["value"]


def _memory_set(key: str, value: dict, ttl: int):
    with _memory_lock:
        _memory_cache[key] = {
            "value":      value,
            "expires_at": time.time() + ttl
        }


def _memory_delete(key: str):
    with _memory_lock:
        _memory_cache.pop(key, None)


def _memory_clear_prefix(prefix: str) -> int:
    with _memory_lock:
        keys_to_delete = [
            k for k in _memory_cache
            if k.startswith(f"{prefix}:")
               or k == prefix
        ]
        for k in keys_to_delete:
            del _memory_cache[k]
        return len(keys_to_delete)


# ─────────────────────────────────────────────
# LAYER 2 — SQLITE CACHE
# ─────────────────────────────────────────────

def _sqlite_get(key: str) -> dict | None:
    try:
        with _get_conn() as conn:
            row = conn.execute(
                """
                SELECT value, expires_at
                FROM cache
                WHERE key = ?
                """,
                (key,)
            ).fetchone()

            if row is None:
                return None

            if time.time() > row["expires_at"]:
                conn.execute(
                    "DELETE FROM cache WHERE key = ?",
                    (key,)
                )
                conn.commit()
                return None

            return json.loads(row["value"])

    except Exception as e:
        print(f"[Cache] SQLite GET error: {e}")
        return None


def _sqlite_set(
    key: str,
    value: dict,
    ttl: int,
    prefix: str
):
    try:
        payload = json.dumps(value, default=str)
        with _get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO cache
                  (key, value, expires_at, created_at, prefix)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    key,
                    payload,
                    time.time() + ttl,
                    datetime.now().isoformat(),
                    prefix
                )
            )
            conn.commit()
    except Exception as e:
        print(f"[Cache] SQLite SET error: {e}")


def _sqlite_delete(key: str):
    try:
        with _get_conn() as conn:
            conn.execute(
                "DELETE FROM cache WHERE key = ?",
                (key,)
            )
            conn.commit()
    except Exception as e:
        print(f"[Cache] SQLite DEL error: {e}")


def _sqlite_clear_prefix(prefix: str) -> int:
    try:
        with _get_conn() as conn:
            result = conn.execute(
                """
                DELETE FROM cache
                WHERE prefix = ?
                   OR key LIKE ?
                """,
                (prefix, f"{prefix}:%")
            )
            conn.commit()
            return result.rowcount
    except Exception as e:
        print(f"[Cache] SQLite CLEAR error: {e}")
        return 0


# ─────────────────────────────────────────────
# PUBLIC API — identical signatures to Redis version
# ─────────────────────────────────────────────

async def get_cache(key: str) -> dict | None:
    """
    Checks in-memory first then SQLite.
    Returns None if not found or expired.
    """
    prefix = _get_prefix(key)

    # Layer 1: memory
    value = _memory_get(key)
    if value is not None:
        print(f"[Cache] MEM HIT  -> {key}")
        return value

    # Layer 2: SQLite (only for SQLite prefixes)
    if prefix in _SQLITE_PREFIXES:
        value = _sqlite_get(key)
        if value is not None:
            print(f"[Cache] SQL HIT  -> {key}")
            # Promote to memory for next request
            ttl = TTL.get(prefix, 3600)
            _memory_set(key, value, min(ttl, 3600))
            return value

    print(f"[Cache] MISS     -> {key}")
    return None


async def set_cache(
    key: str,
    value: dict,
    ttl: int
) -> bool:
    """
    Stores in memory always.
    Also stores in SQLite for long-TTL prefixes.
    """
    try:
        prefix = _get_prefix(key)

        # Always store in memory
        _memory_set(key, value, ttl)

        # Also persist to SQLite for longer TTLs
        if prefix in _SQLITE_PREFIXES:
            _sqlite_set(key, value, ttl, prefix)

        expires_h = ttl // 3600
        expires_m = (ttl % 3600) // 60
        print(f"[Cache] SET      -> {key} "
              f"(TTL {expires_h}h {expires_m}m)")
        return True

    except Exception as e:
        print(f"[Cache] SET error: {e}")
        return False


async def delete_cache(key: str) -> bool:
    """Deletes from both memory and SQLite."""
    try:
        _memory_delete(key)
        _sqlite_delete(key)
        print(f"[Cache] DEL      -> {key}")
        return True
    except Exception as e:
        print(f"[Cache] DEL error: {e}")
        return False


async def clear_prefix(prefix: str) -> int:
    """
    Clears all cache entries for a prefix
    from both memory and SQLite.
    """
    try:
        mem_count = _memory_clear_prefix(prefix)
        sql_count = _sqlite_clear_prefix(prefix)
        total     = mem_count + sql_count
        print(f"[Cache] CLEAR    -> {prefix}:* "
              f"({total} entries removed)")
        return total
    except Exception as e:
        print(f"[Cache] CLEAR error: {e}")
        return 0


async def cache_or_fetch(
    key: str,
    ttl: int,
    fetch_func,
    *args,
    **kwargs
) -> dict:
    """
    Checks cache first. If hit returns cached data.
    If miss calls fetch_func, stores result, returns it.

    Identical interface to Redis version.
    All agents call this without any changes.
    """
    cached = await get_cache(key)
    if cached is not None:
        cached["_from_cache"] = True
        cached["_cache_key"]  = key
        return cached

    # Fetch fresh
    result = await fetch_func(*args, **kwargs)

    # Only cache successful results
    if result and "error" not in result:
        result["_cached_at"] = datetime.now().isoformat()
        await set_cache(key, result, ttl)
    else:
        print(f"[Cache] SKIP SET -> error in result")

    return result


async def get_cache_stats() -> dict:
    """
    Returns stats about current cache usage.
    Used by GET /cache/stats endpoint.
    """
    try:
        # Memory stats
        now = time.time()
        with _memory_lock:
            mem_total   = len(_memory_cache)
            mem_expired = sum(
                1 for v in _memory_cache.values()
                if now > v["expires_at"]
            )
            mem_active  = mem_total - mem_expired
            mem_by_prefix: dict = {}
            for k in _memory_cache:
                p = _get_prefix(k)
                mem_by_prefix[p] = (
                    mem_by_prefix.get(p, 0) + 1
                )

        # SQLite stats
        sql_total   = 0
        sql_expired = 0
        sql_by_prefix: dict = {}

        try:
            with _get_conn() as conn:
                sql_total = conn.execute(
                    "SELECT COUNT(*) FROM cache"
                ).fetchone()[0]

                sql_expired = conn.execute(
                    "SELECT COUNT(*) FROM cache "
                    "WHERE expires_at < ?",
                    (now,)
                ).fetchone()[0]

                rows = conn.execute(
                    "SELECT prefix, COUNT(*) as cnt "
                    "FROM cache GROUP BY prefix"
                ).fetchall()
                sql_by_prefix = {
                    r["prefix"]: r["cnt"] for r in rows
                }

                db_size_bytes = os.path.getsize(DB_PATH) \
                    if DB_PATH.exists() else 0

        except Exception:
            db_size_bytes = 0

        return {
            "backend":          "sqlite+memory",
            "redis_required":   False,
            "memory_cache": {
                "total_keys":   mem_total,
                "active_keys":  mem_active,
                "expired_keys": mem_expired,
                "by_prefix":    mem_by_prefix,
            },
            "sqlite_cache": {
                "total_keys":   sql_total,
                "expired_keys": sql_expired,
                "active_keys":  sql_total - sql_expired,
                "by_prefix":    sql_by_prefix,
                "db_size_kb":   round(
                    db_size_bytes / 1024, 1
                ),
                "db_path":      str(DB_PATH),
            },
            "ttl_config":       TTL,
            "memory_only_agents": list(
                _MEMORY_ONLY_PREFIXES
            ),
            "sqlite_agents":    list(_SQLITE_PREFIXES),
        }

    except Exception as e:
        return {"error": str(e)}
