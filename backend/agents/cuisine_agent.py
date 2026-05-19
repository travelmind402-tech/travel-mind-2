import asyncio
import json
from datetime import datetime

from dotenv import load_dotenv
from google.genai import types

from tools.cuisine_tool import (
    classify_budget_level,
    fetch_food_markets,
    map_price_level_to_cost,
    merge_restaurant_data,
    search_places_geoapify,
    search_restaurants_foursquare,
)
from tools.weather_tool import fetch_exchange_rate
from utils.cache import TTL, build_cache_key, get_cache, set_cache
from utils.llm import (
    SUPPORTED_GEMMA_MODELS,
    generate_content_with_timeout,
    is_retryable_model_error,
)

load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
# Free Gemma-only model chain.
# ─────────────────────────────────────────────────────────────────────────────
CUISINE_MODELS = SUPPORTED_GEMMA_MODELS

CUISINE_KNOWLEDGE_PROMPT = """
You are a local food and cuisine expert for travelers.
Given a destination, provide deep cuisine knowledge.

Respond ONLY in this JSON format, no other text:
{
  "cuisine_overview": {
    "food_culture": "...",
    "signature_ingredients": ["...", "..."],
    "eating_customs": "...",
    "tipping_at_restaurants": "...",
    "meal_timings": {
      "breakfast": "...",
      "lunch": "...",
      "dinner": "..."
    },
    "current_season_specials": ["...", "..."]
  },
  "must_try_dishes": [
    {
      "dish_name": "...",
      "description": "...",
      "estimated_cost_usd": 0,
      "dietary_tags": ["vegetarian | vegan | halal | gluten_free"],
      "seasonal_availability": "year_round | seasonal | rare",
      "ordering_tip": "...",
      "where_to_find": "street_stall | local_restaurant | upscale"
    }
  ],
  "street_food_guide": {
    "best_areas": ["...", "..."],
    "safety_rating": "high | medium | low",
    "best_time_to_visit": "...",
    "must_try_street_foods": ["...", "..."],
    "hygiene_tips": ["...", "..."],
    "average_meal_cost_usd": 0
  },
  "dietary_accommodation": {
    "vegetarian_friendly": true,
    "vegan_options": "...",
    "halal_availability": "...",
    "gluten_free_options": "...",
    "allergy_warning": "..."
  },
  "local_drinks": {
    "non_alcoholic": ["...", "..."],
    "alcoholic": ["...", "..."],
    "water_safety": "safe | boil | bottle_only",
    "best_local_cafe": "..."
  },
  "tourist_trap_foods": [
    {
      "item": "...",
      "location": "...",
      "warning": "...",
      "better_alternative": "..."
    }
  ],
  "food_experiences": [
    {
      "experience": "...",
      "description": "...",
      "estimated_cost_usd": 0,
      "duration": "..."
    }
  ],
  "emergency_food": "...",
  "budget_meal_plan": {
    "cheap_breakfast": "...",
    "cheap_lunch": "...",
    "cheap_dinner": "...",
    "daily_food_budget_usd_minimum": 0,
    "daily_food_budget_usd_comfortable": 0
  }
}
"""

CUISINE_MERGE_PROMPT = """
You are a local food expert and travel advisor.
You receive cuisine knowledge, live restaurant listings,
food markets, user budget, dietary preferences, and optionally weather context.

Merge all data into one complete practical cuisine guide.

Rules:
- Always show costs in local currency using currency_symbol
- Filter restaurants that exceed daily_budget_local
- Mark each restaurant as within_budget/tight/over_budget
- Highlight dietary-friendly options based on restrictions
- Put tourist trap warnings prominently
- Give specific ordering tips for each must-try dish
- Include local language name of each dish
- WEATHER RULE: If weather_context is provided, fill weather_dining_impact:
  note how weather affects outdoor dining, street food safety, and seasonal dishes.
  If heavy rain is forecast, warn about street food hygiene and suggest indoor alternatives.
  If no weather context, set note to "No weather data available".
- ALLERGY RULE: If known_allergies is provided, flag any must-try dishes or
  restaurants that may contain those allergens.

Respond ONLY in this JSON format, no other text:
{
  "destination": "...",
  "currency_used": "...",
  "cuisine_overview": {},
  "must_try_dishes": [
    {
      "dish_name": "...",
      "local_name": "...",
      "description": "...",
      "estimated_cost_local": "...",
      "dietary_tags": [],
      "seasonal_availability": "...",
      "ordering_tip": "...",
      "where_to_find": "...",
      "allergy_flag": "..."
    }
  ],
  "recommended_restaurants": [
    {
      "name": "...",
      "cuisine_type": "...",
      "rating": 0,
      "price_level": "...",
      "estimated_cost_per_person_local": "...",
      "address": "...",
      "opening_hours": "...",
      "must_order": ["...", "..."],
      "best_for": "...",
      "budget_fit": "within | tight | over",
      "dietary_options": ["..."],
      "insider_tip": "..."
    }
  ],
  "street_food_guide": {
    "best_areas": [],
    "safety_rating": "...",
    "best_time_to_visit": "...",
    "must_try_street_foods": [],
    "hygiene_tips": [],
    "average_meal_cost_local": "..."
  },
  "food_markets": [
    {
      "name": "...",
      "type": "...",
      "best_time": "...",
      "what_to_buy": [],
      "address": "..."
    }
  ],
  "dietary_accommodation": {},
  "weather_dining_impact": {
    "note": "...",
    "street_food_warning": "...",
    "indoor_alternatives": "...",
    "seasonal_dish_recommendation": "..."
  },
  "budget_meal_plan": {
    "breakfast_options": [],
    "lunch_options": [],
    "dinner_options": [],
    "daily_food_budget_estimate_local": "...",
    "money_saving_tips": []
  },
  "local_drinks": {},
  "tourist_trap_foods": [],
  "food_experiences": [],
  "seasonal_specials": [],
  "emergency_food": "...",
  "overall_food_rating": "excellent | good | average | poor"
}
"""


# ─────────────────────────────────────────────────────────────────────────────
# Internal: cuisine knowledge via Gemma
# ─────────────────────────────────────────────────────────────────────────────

async def _get_cuisine_knowledge(
    city: str,
    country: str,
    travel_start_date: str,
    travel_end_date: str,
    dietary_restrictions: list,
) -> dict:
    restrictions_text = (
        f"Dietary restrictions: {', '.join(dietary_restrictions)}"
        if dietary_restrictions
        else "No dietary restrictions"
    )
    prompt = (
        f"Give me deep cuisine knowledge for {city}, {country}. "
        f"Travel dates: {travel_start_date} to {travel_end_date}. "
        f"{restrictions_text}. Keep all responses concise."
    )

    for model in CUISINE_MODELS:
        for attempt in range(3):
            try:
                print(f"[CuisineAgent] Knowledge: {model} attempt {attempt + 1}...")
                response = await generate_content_with_timeout(
                    model=model,
                    contents=prompt,
                    system_instruction=CUISINE_KNOWLEDGE_PROMPT,
                    temperature=0.3,
                    max_output_tokens=1600,
                    timeout_seconds=10_000,

                )
                text   = (response.text or "").strip()
                text   = text.replace("```json", "").replace("```", "").strip()
                result = json.loads(text)
                print(f"[CuisineAgent] ✓ {model} knowledge OK")
                return result

            except json.JSONDecodeError:
                print(f"[CuisineAgent] JSON parse error on {model} — skipping")
                break
            except asyncio.TimeoutError:
                print(f"[CuisineAgent] {model} knowledge timed out after 75s")
                break
            except Exception as exc:
                err = str(exc)
                if is_retryable_model_error(err):
                    wait = 2 ** attempt
                    print(f"[CuisineAgent] {model} server error, retrying in {wait}s...")
                    await asyncio.sleep(wait)
                else:
                    print(f"[CuisineAgent] {model} failed: {err[:80]}")
                    break

    print("[CuisineAgent] All models failed for cuisine knowledge — using empty fallback")
    return {}


# ─────────────────────────────────────────────────────────────────────────────
# Main agent
# ─────────────────────────────────────────────────────────────────────────────

async def run_cuisine_agent(
    city: str,
    country: str,
    travel_start_date: str,
    travel_end_date: str,
    traveler_type: str,
    daily_budget_usd: float = 50.0,
    currency: str = "INR",
    dietary_restrictions: list = None,
    cuisine_preferences: str = "all",
    # ── Session-injected fields (read from trip row by main.py) ──────────────
    group_size: int = 1,
    family_members: int = 0,
    known_allergies: list = None,
    weather_context: dict = None,
    # Budget tier pre-classified at session start and stored in DB.
    # Passed here so we don't re-derive from a possibly imprecise USD conversion.
    budget_tier: str = None,
) -> dict:

    if dietary_restrictions is None:
        dietary_restrictions = []
    if known_allergies is None:
        known_allergies = []

    # ── Cache ────────────────────────────────────────────────────────────────
    cache_key = build_cache_key(
        "cuisine",
        city=city,
        currency=currency,
        dietary=str(sorted(dietary_restrictions)),
        preference=cuisine_preferences,
    )
    cached = await get_cache(cache_key)
    if cached:
        print("[CuisineAgent] Serving from cache")
        return cached

    print(f"[CuisineAgent] Starting for {city}...")

    # ── Exchange rate ────────────────────────────────────────────────────────
    exchange          = await fetch_exchange_rate("USD", currency)
    usd_to_local_rate = exchange.get("rate", 1.0)

    # Guard: rate must be float — API may return string/None on failure.
    try:
        usd_to_local_rate = float(usd_to_local_rate)
    except (TypeError, ValueError):
        usd_to_local_rate = 1.0

    symbol = {
        "INR": "₹", "EUR": "€", "GBP": "£",
        "JPY": "¥", "AUD": "A$", "CAD": "C$",
        "SGD": "S$", "THB": "฿", "USD": "$",
        "BDT": "৳", "NPR": "Rs",
    }.get(currency, currency)

    # Guard: daily_budget_usd must be a float.
    # main.py passes budget.get("trip_summary", {})
    # .get("total_budget_local") which is a formatted
    # string like "₹45,000" from the budget agent JSON.
    # Multiplying a string by a float raises:
    #   "can't multiply sequence by non-int of type 'float'"
    try:
        daily_budget_usd = float(daily_budget_usd)
    except (TypeError, ValueError):
        # Strip currency symbols/commas, keep digits and dot
        cleaned = "".join(
            c for c in str(daily_budget_usd)
            if c.isdigit() or c == "."
        )
        try:
            daily_budget_usd = float(cleaned) if cleaned else 50.0
        except ValueError:
            daily_budget_usd = 50.0
        print(
            f"[CuisineAgent] daily_budget_usd was non-numeric "
            f"— cleaned to {daily_budget_usd}"
        )

    daily_budget_local = round(daily_budget_usd * usd_to_local_rate, 2)
    food_budget_local  = round(daily_budget_local * 0.35, 2)

    # Use DB-stored tier if provided; otherwise derive from USD value.
    budget_level = budget_tier if budget_tier else classify_budget_level(daily_budget_usd)

    print(
        f"[CuisineAgent] {symbol}{daily_budget_local} {currency}/day | "
        f"tier={budget_level} | group={group_size} | allergies={len(known_allergies)}"
    )

    # ── Parallel data fetch ──────────────────────────────────────────────────
    print("[CuisineAgent] Fetching data in parallel...")

    results = await asyncio.gather(
        _get_cuisine_knowledge(
            city, country,
            travel_start_date, travel_end_date,
            dietary_restrictions,
        ),
        search_restaurants_foursquare(city, budget_level, limit=10),
        search_places_geoapify(city, place_type="catering.restaurant", limit=10),
        fetch_food_markets(city),
        return_exceptions=True,
    )

    def _safe(r, fallback):
        return r if not isinstance(r, Exception) else fallback

    cuisine_knowledge = _safe(results[0], {})
    foursquare_data   = _safe(results[1], [])
    geoapify_data     = _safe(results[2], [])
    markets_data      = _safe(results[3], {})

    print(
        f"[CuisineAgent] Foursquare={len(foursquare_data)} "
        f"Geoapify={len(geoapify_data)} restaurants"
    )

    # ── Merge + enrich restaurants ───────────────────────────────────────────
    merged_restaurants = merge_restaurant_data(foursquare_data, geoapify_data)

    for rest in merged_restaurants:
        rest["estimated_cost_per_person_local"] = map_price_level_to_cost(
            rest.get("price_level", 1), usd_to_local_rate, symbol
        )

    print(f"[CuisineAgent] Merged: {len(merged_restaurants)} restaurants")

    # ── Bundle for Gemma ─────────────────────────────────────────────────────
    bundle = {
        "city":                 city,
        "country":              country,
        "travel_dates":         f"{travel_start_date} to {travel_end_date}",
        "traveler_type":        traveler_type,
        "group_size":           group_size,
        "family_members":       family_members,
        "currency":             currency,
        "currency_symbol":      symbol,
        "exchange_rate":        f"1 USD = {usd_to_local_rate} {currency}",
        "daily_budget_usd":     daily_budget_usd,
        "daily_budget_local":   daily_budget_local,
        "food_budget_local":    food_budget_local,
        "budget_level":         budget_level,
        "dietary_restrictions": dietary_restrictions,
        "known_allergies":      known_allergies,
        "cuisine_preferences":  cuisine_preferences,
        "cuisine_knowledge":    cuisine_knowledge,
        "live_restaurants":     merged_restaurants,
        "food_markets":         markets_data,
        "weather_context":      weather_context,
    }

    # ── Gemma merge call ─────────────────────────────────────────────────────
    print("[CuisineAgent] Sending to Gemma for merge...")

    parsed     = None
    last_error = None
    last_raw   = ""

    for model in CUISINE_MODELS:
        for attempt in range(3):
            try:
                print(f"[CuisineAgent] Merge: {model} attempt {attempt + 1}...")
                response = await generate_content_with_timeout(
                    model=model,
                    contents=(
                        f"Create a complete cuisine guide for {city}, {country} "
                        f"using this data:\n\n{json.dumps(bundle, indent=2)}"
                    ),
                    system_instruction=CUISINE_MERGE_PROMPT,
                    temperature=0.3,
                    max_output_tokens=1800,
                    timeout_seconds=10_000,

                )
                last_raw = (response.text or "").strip()
                text     = last_raw.replace("```json", "").replace("```", "").strip()
                parsed   = json.loads(text)
                print(f"[CuisineAgent] ✓ {model} merge OK")
                break

            except json.JSONDecodeError:
                last_error = f"JSON parse failed on {model}"
                print(f"[CuisineAgent] {last_error}")
                break
            except asyncio.TimeoutError:
                last_error = f"{model} merge timed out after 90s"
                print(f"[CuisineAgent] {last_error}")
                break
            except Exception as exc:
                last_error = str(exc)
                if is_retryable_model_error(last_error):
                    wait = 2 ** attempt
                    print(f"[CuisineAgent] {model} server error, retrying in {wait}s...")
                    await asyncio.sleep(wait)
                else:
                    print(f"[CuisineAgent] {model} failed: {last_error[:80]}")
                    break
        if parsed:
            break

    # ── Structured fallback — never raise, always return something usable ────
    if parsed is None:
        print(f"[CuisineAgent] All models failed — returning structured fallback. Error: {last_error}")
        parsed = {
            "destination":            f"{city}, {country}",
            "currency_used":          currency,
            "cuisine_overview":       cuisine_knowledge.get("cuisine_overview", {}),
            "must_try_dishes":        cuisine_knowledge.get("must_try_dishes", []),
            "recommended_restaurants": merged_restaurants[:5],
            "street_food_guide":      cuisine_knowledge.get("street_food_guide", {}),
            "food_markets":           markets_data if isinstance(markets_data, list) else [],
            "dietary_accommodation":  cuisine_knowledge.get("dietary_accommodation", {}),
            "weather_dining_impact": {
                "note": "No weather data available" if not weather_context else "Weather data available but merge failed",
                "street_food_warning":          "",
                "indoor_alternatives":          "",
                "seasonal_dish_recommendation": "",
            },
            "budget_meal_plan":       cuisine_knowledge.get("budget_meal_plan", {}),
            "local_drinks":           cuisine_knowledge.get("local_drinks", {}),
            "tourist_trap_foods":     cuisine_knowledge.get("tourist_trap_foods", []),
            "food_experiences":       cuisine_knowledge.get("food_experiences", []),
            "seasonal_specials":      [],
            "emergency_food":         cuisine_knowledge.get("emergency_food", ""),
            "overall_food_rating":    "average",
            "_fallback_used":         True,
            "_fallback_reason":       last_error or "unknown",
        }

    # ── Metadata ─────────────────────────────────────────────────────────────
    parsed["_metadata"] = {
        "restaurants_found":    len(merged_restaurants),
        "data_sources":         ["gemma", "foursquare", "geoapify"],
        "budget_level":         budget_level,
        "currency":             currency,
        "exchange_rate":        exchange.get("example"),
        "weather_context_used": weather_context is not None,
        "allergies_checked":    len(known_allergies) > 0,
        "generated_at":         datetime.now().isoformat(),
    }

    await set_cache(cache_key, parsed, TTL["cuisine"])
    return parsed
