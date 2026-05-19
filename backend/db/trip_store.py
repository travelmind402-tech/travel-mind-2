import json
from datetime import date, timedelta
from typing import Optional

from db.database import get_db


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _trip_id(user_id: str, city: str, date_from: str, date_to: str) -> str:
    """Deterministic, human-readable trip ID."""
    return f"{user_id}:{city.lower()}:{date_from}:{date_to}"


def _parse_trip_row(row) -> dict:
    """
    Convert a raw aiosqlite Row to a clean Python dict.
    Deserialises all JSON columns. Returns None-safe values.
    """
    trip = dict(row)
    trip["trip_id"] = trip.get("id")
    trip["known_allergies"]   = json.loads(trip.get("known_allergies")   or "[]")
    trip["transit_waypoints"] = json.loads(trip.get("transit_waypoints") or "[]")
    trip["dietary_restrictions"] = json.loads(trip.get("dietary_restrictions") or "[]")
    trip["known_sensitivities"] = json.loads(trip.get("known_sensitivities") or "[]")
    trip["group_size"] = trip.get("group_size") or 1
    trip["travel_style"] = trip.get("travel_style") or "general"
    trip["cuisine_preferences"] = trip.get("cuisine_preferences") or "all"
    trip["native_language"] = trip.get("native_language") or "English"
    trip["phrases_needed"] = json.loads(trip.get("phrases_needed") or "[]")

    for col in ("weather_json", "budget_json"): 
        raw = trip.get(col)
        trip[col] = json.loads(raw) if raw else None

    return trip


# ─────────────────────────────────────────────────────────────────────────────
# Trip lifecycle
# ─────────────────────────────────────────────────────────────────────────────

async def create_trip(
    user_id: str,
    city: str,
    country: str,
    date_from: str,
    date_to: str,
    traveler_type: str,
    family_members: int,
    known_allergies: list,
    transit_waypoints: list,
    daily_budget: float = 3000.0,
    currency: str = "INR",
    budget_tier: str = "mid_range",
    travel_style: str = "general",
    group_size: int = 1,
    dietary_restrictions: list = None,
    cuisine_preferences: str = "all",
    known_sensitivities: list = None,
    native_language: str = "English",
    phrases_needed: list = None,
) -> str:
    """
    Insert or replace a trip row.
    expires_at = date_to + 1 day (trip data is considered stale after return).
    Returns trip_id.
    """
    trip_id    = _trip_id(user_id, city, date_from, date_to)
    expires_at = (date.fromisoformat(date_to) + timedelta(days=1)).isoformat()

    if dietary_restrictions is None:
        dietary_restrictions = []
    if known_sensitivities is None:
        known_sensitivities = []
    if phrases_needed is None:
        phrases_needed = []

    db = await get_db()
    try:
        await db.execute(
            """
            INSERT OR REPLACE INTO trips (
                id, user_id, city, country,
                date_from, date_to, traveler_type,
                family_members, known_allergies, transit_waypoints,
                daily_budget, currency, budget_tier,
                travel_style, group_size,
                dietary_restrictions, cuisine_preferences,
                known_sensitivities, native_language,
                phrases_needed,
                expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                trip_id, user_id, city, country,
                date_from, date_to, traveler_type,
                family_members,
                json.dumps(known_allergies),
                json.dumps(transit_waypoints),
                daily_budget, currency, budget_tier,
                travel_style, group_size,
                json.dumps(dietary_restrictions), cuisine_preferences,
                json.dumps(known_sensitivities), native_language,
                json.dumps(phrases_needed),
                expires_at,
            ),
        )
        await db.commit()
    finally:
        await db.close()

    return trip_id


async def get_trip(trip_id: str) -> Optional[dict]:
    """Return full parsed trip row, or None if not found."""
    db = await get_db()
    try:
        async with db.execute(
            "SELECT * FROM trips WHERE id = ?", (trip_id,)
        ) as cursor:
            row = await cursor.fetchone()
    finally:
        await db.close()

    return _parse_trip_row(row) if row else None


async def list_user_trips(user_id: str) -> list[dict]:
    """All trips for a user, newest first."""
    db = await get_db()
    try:
        async with db.execute(
            "SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ) as cursor:
            rows = await cursor.fetchall()
    finally:
        await db.close()

    return [_parse_trip_row(r) for r in rows]


# ─────────────────────────────────────────────────────────────────────────────
# Weather persistence
# ─────────────────────────────────────────────────────────────────────────────

async def save_weather(trip_id: str, weather: dict) -> None:
    """Persist weather agent output for a trip."""
    db = await get_db()
    try:
        await db.execute(
            "UPDATE trips SET weather_json = ? WHERE id = ?",
            (json.dumps(weather), trip_id),
        )
        await db.commit()
    finally:
        await db.close()


async def get_weather(trip_id: str) -> Optional[dict]:
    """
    Return stored weather dict if present and trip has not expired.
    Returns None if: trip missing, trip expired, or weather never saved.
    """
    db = await get_db()
    try:
        async with db.execute(
            "SELECT weather_json, expires_at FROM trips WHERE id = ?",
            (trip_id,),
        ) as cursor:
            row = await cursor.fetchone()
    finally:
        await db.close()

    if row is None:
        return None
    if row["expires_at"] <= date.today().isoformat():
        return None
    if row["weather_json"] is None:
        return None

    return json.loads(row["weather_json"])


# ─────────────────────────────────────────────────────────────────────────────
# Budget persistence
# ─────────────────────────────────────────────────────────────────────────────

async def save_budget(trip_id: str, budget: dict) -> None:
    """
    Persist budget agent output for a trip.
    Called by /session/{trip_id}/budget after run_budget_agent() completes.
    """
    db = await get_db()
    try:
        await db.execute(
            "UPDATE trips SET budget_json = ? WHERE id = ?",
            (json.dumps(budget), trip_id),
        )
        await db.commit()
    finally:
        await db.close()


async def get_budget(trip_id: str) -> Optional[dict]:
    """
    Return stored budget dict, or None if budget agent has not run yet.
    """
    db = await get_db()
    try:
        async with db.execute(
            "SELECT budget_json, expires_at FROM trips WHERE id = ?",
            (trip_id,),
        ) as cursor:
            row = await cursor.fetchone()
    finally:
        await db.close()

    if row is None:
        return None
    # Budget is also considered stale after trip expiry
    if row["expires_at"] <= date.today().isoformat():
        return None
    if row["budget_json"] is None:
        return None

    return json.loads(row["budget_json"])
