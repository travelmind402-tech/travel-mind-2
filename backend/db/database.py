import os
import aiosqlite

DB_PATH = os.path.join(os.path.dirname(__file__), "travelmind.db")


async def get_db() -> aiosqlite.Connection:
    """Return an open aiosqlite connection with row_factory set."""
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA busy_timeout=5000")
    return conn


async def init_db() -> None:
    """
    Create all tables and indexes on startup.
    Safe to call multiple times — uses IF NOT EXISTS throughout.
    Also runs ALTER TABLE to add new columns to existing DBs without
    dropping data (idempotent via try/except on each ALTER).
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")

        # ── Main trips table ─────────────────────────────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS trips (
                id                  TEXT PRIMARY KEY,
                user_id             TEXT NOT NULL,
                city                TEXT NOT NULL,
                country             TEXT NOT NULL,
                date_from           TEXT NOT NULL,
                date_to             TEXT NOT NULL,
                traveler_type       TEXT NOT NULL,
                family_members      INTEGER DEFAULT 0,
                known_allergies     TEXT DEFAULT '[]',
                transit_waypoints   TEXT DEFAULT '[]',
                -- weather
                weather_json        TEXT,
                -- budget context (added in v2 — see ALTER TABLE block below)
                daily_budget        REAL DEFAULT 3000.0,
                currency            TEXT DEFAULT 'INR',
                budget_tier         TEXT DEFAULT 'mid_range',
                budget_json         TEXT,
                travel_style        TEXT DEFAULT 'general',
                group_size          INTEGER DEFAULT 1,
                dietary_restrictions TEXT DEFAULT '[]',
                cuisine_preferences TEXT DEFAULT 'all',
                known_sensitivities TEXT DEFAULT '[]',
                native_language TEXT DEFAULT 'English',
                phrases_needed TEXT DEFAULT '[]',
                -- timestamps
                created_at          TEXT DEFAULT (datetime('now')),
                expires_at          TEXT NOT NULL
            )
        """)

        # ── Indexes ──────────────────────────────────────────────────────────
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_trips_expires_at ON trips(expires_at)"
        )

        await db.commit()

        # ── Idempotent migrations for existing DBs ───────────────────────────
        # If the DB was created before v2 columns existed, add them safely.
        new_columns = [
            ("daily_budget", "REAL DEFAULT 3000.0"),
            ("currency",     "TEXT DEFAULT 'INR'"),
            ("budget_tier",  "TEXT DEFAULT 'mid_range'"),
            ("budget_json",  "TEXT"),
            ("travel_style", "TEXT DEFAULT 'general'"),
            ("group_size", "INTEGER DEFAULT 1"),
            ("dietary_restrictions", "TEXT DEFAULT '[]'"),
            ("cuisine_preferences", "TEXT DEFAULT 'all'"),
            ("known_sensitivities", "TEXT DEFAULT '[]'"),
            ("native_language", "TEXT DEFAULT 'English'"),
            ("phrases_needed", "TEXT DEFAULT '[]'"),
        ]
        for col_name, col_def in new_columns:
            try:
                await db.execute(
                    f"ALTER TABLE trips ADD COLUMN {col_name} {col_def}"
                )
                await db.commit()
                print(f"[DB] Migrated: added column '{col_name}'")
            except Exception:
                # Column already exists — safe to ignore
                pass
