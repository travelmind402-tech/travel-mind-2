import asyncio
import json
from datetime import datetime

from dotenv import load_dotenv
from google.genai import types

from tools.culture_tool import (
    fetch_dress_code_venues,
    fetch_festivals_and_events,
    fetch_language_tips,
    fetch_local_customs,
)
from tools.weather_tool import geocode_city
from utils.cache import TTL, build_cache_key, get_cache, set_cache
from utils.llm import (
    SUPPORTED_GEMMA_MODELS,
    generate_content_with_timeout,
    is_retryable_model_error,
)

load_dotenv()

CULTURE_SYSTEM_PROMPT = """You are a Master Cultural Intelligence Analyst and Travel Etiquette Expert.
Your goal is to give travelers a deep, practical, and respectful cultural briefing for their destination.

Respond ONLY in this JSON format:
{
  "summary": "...",
  "destination_overview": {
    "cultural_identity": "Brief cultural character of the destination",
    "primary_religion": "...",
    "social_conservatism_level": "Conservative | Moderate | Liberal",
    "traveler_friendliness": "High | Medium | Low",
    "best_cultural_experience": "One sentence on the single best cultural thing to do here"
  },
  "customs_and_etiquette": {
    "greeting_style": "...",
    "dining_etiquette": [],
    "dos": [],
    "donts": [],
    "tipping_culture": "...",
    "bargaining_culture": "...",
    "punctuality_norm": "...",
    "physical_contact_norms": "..."
  },
  "dress_code_guide": {
    "general_street_wear": "...",
    "religious_sites": "...",
    "beach_or_resort": "...",
    "formal_dining_or_theatre": "...",
    "conservative_areas_nearby": true,
    "packing_dress_tips": []
  },
  "language_guide": {
    "official_languages": [],
    "script_used": "Latin | Devanagari | Arabic | Cyrillic | Kanji | etc.",
    "english_proficiency": "High | Medium | Low",
    "essential_phrases": [
      { "phrase": "Hello", "local": "...", "pronunciation": "..." },
      { "phrase": "Thank you", "local": "...", "pronunciation": "..." },
      { "phrase": "Please", "local": "...", "pronunciation": "..." },
      { "phrase": "Excuse me", "local": "...", "pronunciation": "..." },
      { "phrase": "Where is...?", "local": "...", "pronunciation": "..." },
      { "phrase": "How much?", "local": "...", "pronunciation": "..." },
      { "phrase": "I don't understand", "local": "...", "pronunciation": "..." },
      { "phrase": "Help!", "local": "...", "pronunciation": "..." }
    ],
    "useful_scripts_tip": "..."
  },
  "festivals_and_events": {
    "during_travel_dates": [],
    "cultural_significance": "...",
    "crowd_impact_warning": "..."
  },
  "religious_and_sacred_sites": {
    "major_sites_nearby": [],
    "behavior_rules": [],
    "photography_rules": "..."
  },
  "local_laws_travelers_must_know": [],
  "cultural_sensitivity_score": {
    "score": "1-10",
    "explanation": "...",
    "risk_level": "Low | Medium | High"
  },
  "traveler_type_specific_tips": {
    "advice": "..."
  },
  "weather_cultural_impact": {
    "note": "...",
    "festival_weather_warning": "...",
    "dress_adjustment": "..."
  },
  "emergency_phrases": [
    { "phrase": "Call the police", "local": "..." },
    { "phrase": "I need a doctor", "local": "..." }
  ],
  "overall_cultural_readiness_tips": []
}

Rules you must follow:
1. DRESS CODE RULE: If religious_sites_nearby > 2, set conservative_areas_nearby to true and include specific clothing advice.
2. TRAVELER TYPE RULE: Tailor traveler_type_specific_tips to the traveler_type field (solo, family, couple, student, elderly, business).
3. LANGUAGE RULE: Always provide 8 essential phrases with accurate local script and pronunciation guide.
4. FESTIVALS RULE: Cross-reference festivals_and_events data with travel dates. If a major festival falls during travel, add a crowd_impact_warning.
5. LAWS RULE: Always include 3-5 local laws that could catch foreign travelers off-guard.
6. SENSITIVITY SCORE: Rate the destination 1-10 on cultural sensitivity required.
7. WEATHER RULE: If weather_context is provided, fill weather_cultural_impact — note how weather affects festivals, dress, and cultural activities. If no weather context, set note to "No weather data available".
8. SUMMARY: Write a vivid 2-sentence cultural character summary of the destination.
"""


async def run_culture_agent(
    city: str,
    country: str,
    travel_start_date: str,
    travel_end_date: str,
    traveler_type: str,
    travel_style: str = "general",
    group_size: int = 1,
    known_sensitivities: list = None,
    # ── Session-injected fields ──────────────────────
    family_members: int = 0,
    known_allergies: list = None,
    weather_context: dict = None,
) -> dict:

    if known_sensitivities is None:
        known_sensitivities = []
    if known_allergies is None:
        known_allergies = []

    # ── Cache check ──────────────────────────────────
    cache_key = build_cache_key(
        "culture",
        city=city,
        country=country,
        traveler=traveler_type,
        style=travel_style,
    )
    cached = await get_cache(cache_key)
    if cached:
        print("[CultureAgent] Serving from cache")
        return cached

    # ── Step 1: Geocode city ─────────────────────────
    coords = await geocode_city(city)
    if "error" in coords:
        return {"error": f"Could not locate city: {city}"}

    lat, lon = coords["latitude"], coords["longitude"]

    # ── Step 2: Parallel data fetch ──────────────────
    print(f"[CultureAgent] Running cultural intelligence scan for {city}, {country}...")

    results = await asyncio.gather(
        fetch_local_customs(country),
        fetch_festivals_and_events(city, country, travel_start_date, travel_end_date),
        fetch_language_tips(country),
        fetch_dress_code_venues(lat, lon, travel_style),
        return_exceptions=True,
    )

    def safe(r):
        return r if not isinstance(r, Exception) else {"error": str(r)}

    customs_data  = safe(results[0])
    festivals     = safe(results[1])
    language_data = safe(results[2])
    venue_data    = safe(results[3])

    # ── Step 3: Bundle everything for Gemma ─────────
    bundle = {
        "city":                  city,
        "country":               country,
        "travel_dates":          f"{travel_start_date} to {travel_end_date}",
        "traveler_type":         traveler_type,
        "travel_style":          travel_style,
        "group_size":            group_size,
        "family_members":        family_members,
        "known_sensitivities":   known_sensitivities,
        "known_allergies":       known_allergies,
        "country_metadata":      customs_data,
        "live_events_festivals": festivals,
        "language_data":         language_data,
        "venue_and_dress_data":  venue_data,
        # Weather context from DB — None if not available
        "weather_context":       weather_context,
    }

    # ── Step 4: Gemma synthesis — free-only fallback chain ───────────────────
    CULTURE_MODELS = SUPPORTED_GEMMA_MODELS

    parsed     = None
    last_error = None
    last_raw   = ""

    for model in CULTURE_MODELS:
        for attempt in range(3):
            try:
                print(f"[CultureAgent] {model} attempt {attempt + 1}...")
                response = await generate_content_with_timeout(
                    model=model,
                    contents=(
                        f"Generate a complete Cultural Intelligence Briefing for a traveler "
                        f"visiting {city}, {country}:\n\n{json.dumps(bundle, indent=2)}"
                    ),
                    system_instruction=CULTURE_SYSTEM_PROMPT,
                    temperature=0.2,
                    max_output_tokens=1800,
                    timeout_seconds=10_000,

                )
                last_raw = (response.text or "").strip()
                text     = last_raw.replace("```json", "").replace("```", "").strip()
                parsed   = json.loads(text)
                print(f"[CultureAgent] ✓ {model} OK")
                break

            except json.JSONDecodeError as exc:
                last_error = f"JSON parse failed on {model}: {exc}"
                print(f"[CultureAgent] {last_error}")
                break
            except asyncio.TimeoutError:
                last_error = f"{model} timed out after 90s"
                print(f"[CultureAgent] {last_error}")
                break
            except Exception as exc:
                last_error = str(exc)
                if is_retryable_model_error(last_error):
                    wait = 2 ** attempt
                    print(f"[CultureAgent] {model} server error, retry in {wait}s...")
                    await asyncio.sleep(wait)
                else:
                    print(f"[CultureAgent] {model} failed: {last_error[:80]}")
                    break
        if parsed:
            break

    if parsed is None:
        print(f"[CultureAgent] All models failed — structured fallback. Error: {last_error}")
        return {
            "error":         "Culture synthesis failed",
            "error_detail":  last_error,
            "summary":       f"Cultural data collected for {city} but synthesis failed.",
            "destination_overview": {},
            "customs_and_etiquette": {
                "dos": customs_data.get("dos", []),
                "donts": customs_data.get("donts", []),
            },
            "language_guide":   language_data,
            "festivals_and_events": {
                "during_travel_dates": festivals if isinstance(festivals, list) else [],
            },
            "cultural_sensitivity_score": {"score": "unknown", "risk_level": "unknown"},
            "_fallback_used": True,
            "_fallback_reason": last_error,
        }

    parsed["_metadata"] = {
        "festivals_found":        len(festivals) if isinstance(festivals, list) else 0,
        "languages_found":        language_data.get("total_found", 0),
        "religious_sites_nearby": venue_data.get("religious_sites_nearby", 0),
        "weather_context_used":   weather_context is not None,
        "data_retrieval_time":    datetime.now().isoformat(),
    }

    await set_cache(cache_key, parsed, TTL["culture"])
    return parsed
