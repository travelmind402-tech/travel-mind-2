from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

def save_user_profile(session_id: str, profile: dict):
    supabase.table("user_profiles").upsert({
        "session_id": session_id,
        "name": profile["name"],
        "destination": profile["destination"],
        "country": profile["country"],
        "travel_start_date": profile["travel_start_date"],
        "travel_end_date": profile["travel_end_date"],
        "daily_budget_usd": profile["daily_budget_usd"],
        "traveler_type": profile["traveler_type"],
        "languages_spoken": profile["languages_spoken"],
    }).execute()

def get_user_profile(session_id: str) -> dict:
    result = supabase.table("user_profiles") \
        .select("*") \
        .eq("session_id", session_id) \
        .execute()
    return result.data[0] if result.data else None

def delete_user_profile(session_id: str):
    supabase.table("user_profiles") \
        .delete() \
        .eq("session_id", session_id) \
        .execute()