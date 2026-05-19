import asyncio
import json
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types
import os

from tools.budget_tool import (
    calculate_trip_days,
    classify_budget_tier,
)
from tools.weather_tool import fetch_exchange_rate
from utils.cache import TTL, build_cache_key, get_cache, set_cache

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GOOGLE_GENERATIVE_API_KEY")
)

# ─────────────────────────────────────────────
# PHASE 1 PROMPT — Generate interest questions
# for the specific destination
# ─────────────────────────────────────────────
INTEREST_QUESTION_PROMPT = """
You are a travel planning assistant.

A traveler is visiting {city}, {country} for {trip_days} days
as a {traveler_type} traveler with a {budget_tier} budget
of {symbol}{daily_budget}/day.

Generate 3-4 short, specific questions to understand
what kind of activities and experiences they want.

Questions must be:
- Specific to {city} (mention real place types found there)
- Multiple choice so user can pick easily
- Cover: activity type, food preference, pace preference,
  must-see vs off-beat preference

Respond ONLY in this JSON format, no other text:
{{
  "greeting": "One friendly sentence welcoming them and
               mentioning their destination",
  "questions": [
    {{
      "id": "activity_type",
      "question": "What kind of activities excite you most?",
      "options": [
        "Beaches and water sports",
        "History and culture",
        "Food and nightlife",
        "Nature and adventure"
      ]
    }},
    {{
      "id": "pace",
      "question": "What's your travel pace?",
      "options": [
        "Packed schedule — see everything",
        "Relaxed — 2-3 things per day",
        "Spontaneous — plan as I go"
      ]
    }},
    {{
      "id": "food_preference",
      "question": "What's your food priority?",
      "options": [
        "Local street food only",
        "Mix of local and restaurants",
        "Cafes and trendy spots"
      ]
    }},
    {{
      "id": "experience_type",
      "question": "Do you prefer popular spots or hidden gems?",
      "options": [
        "Must-see iconic places",
        "Hidden gems and local spots",
        "Mix of both"
      ]
    }}
  ]
}}
"""

# ─────────────────────────────────────────────
# PHASE 2 PROMPT — Full budget plan WITH
# user interest answers baked in
# ─────────────────────────────────────────────
BUDGET_SYSTEM_PROMPT = """
You are an expert travel budget planner who knows
local costs in every city worldwide.

You receive:
1. Destination city and country
2. Daily budget in local currency
3. Live hotel data
4. Transport options
5. Budget tier classification
6. User's specific interests and preferences

CRITICAL RULES:
- Suggest activities and places ONLY matching
  the user's stated interests from user_interests field
- Never suggest generic activities like "City Walking Tour"
  unless the user said they like walking/exploration
- All money amounts MUST be in local currency
  using currency_symbol provided
- Never show USD unless asked
- Be realistic — use actual local pricing knowledge
- For student travelers: highlight free options first
- For elderly travelers: add accessibility cost notes
- Flag hidden costs travelers always miss
- suggested_activities in _metadata MUST match
  user_interests (specific place names, not generic)

Respond ONLY in this JSON format, no other text:
{
  "destination": "...",
  "trip_summary": {
    "total_days": 0,
    "total_budget_local": "...",
    "budget_tier": "backpacker | budget | mid_range | luxury",
    "budget_feasibility": "comfortable | tight | over_budget",
    "daily_budget_local": "..."
  },
  "daily_breakdown": {
    "accommodation_local": "...",
    "food_local": "...",
    "transport_local": "...",
    "activities_local": "...",
    "misc_local": "...",
    "total_daily_local": "..."
  },
  "total_trip_estimate": {
    "accommodation_total": "...",
    "food_total": "...",
    "transport_total": "...",
    "activities_total": "...",
    "grand_total": "...",
    "savings_from_budget": "..."
  },

  "hidden_costs_warning": [
    "specific hidden cost travelers miss in this city"
  ],
  "money_saving_hacks": [
    "specific actionable tip to save money in this city"
  ],
  "student_discounts": [
    {
      "place": "...",
      "discount": "...",
      "how_to_get": "..."
    }
  ],
  "free_things_to_do": [
    {
      "activity": "...",
      "location": "...",
      "best_time": "..."
    }
  ],
  "emergency_fund_recommendation_local": "...",
  "atm_and_payment_tips": "...",
  "currency_advice": "..."
}
"""


def _build_fallback(
    city: str,
    trip_days: int,
    daily_budget: float,
    currency: str,
    symbol: str,
    budget_tier: str,
    exchange_rate: str,
    suggested_activities: list
) -> dict:
    total     = daily_budget * trip_days
    emergency = round(daily_budget * 0.1, 0)

    return {
        "destination": city,
        "trip_summary": {
            "total_days":         trip_days,
            "total_budget_local": f"{symbol}{total:,.0f}",
            "budget_tier":        budget_tier,
            "budget_feasibility": "tight"
                if budget_tier == "budget" else "comfortable",
            "daily_budget_local": f"{symbol}{daily_budget:,.0f}",
        },
        "daily_breakdown": {
            "accommodation_local": f"{symbol}{round(daily_budget*0.40):,.0f}",
            "food_local":          f"{symbol}{round(daily_budget*0.30):,.0f}",
            "transport_local":     f"{symbol}{round(daily_budget*0.15):,.0f}",
            "activities_local":    f"{symbol}{round(daily_budget*0.10):,.0f}",
            "misc_local":          f"{symbol}{round(daily_budget*0.05):,.0f}",
            "total_daily_local":   f"{symbol}{daily_budget:,.0f}",
        },
        "total_trip_estimate": {
            "accommodation_total": f"{symbol}{round(daily_budget*0.40*trip_days):,.0f}",
            "food_total":          f"{symbol}{round(daily_budget*0.30*trip_days):,.0f}",
            "transport_total":     f"{symbol}{round(daily_budget*0.15*trip_days):,.0f}",
            "activities_total":    f"{symbol}{round(daily_budget*0.10*trip_days):,.0f}",
            "grand_total":         f"{symbol}{total:,.0f}",
            "savings_from_budget": f"{symbol}0",
        },

        "hidden_costs_warning": [
            "Always carry extra cash for local transport",
            "Entry fees at attractions not included",
        ],
        "money_saving_hacks": [
            "Eat at local dhabas instead of tourist restaurants",
            "Use shared transport instead of private cabs",
        ],
        "student_discounts":   [],
        "free_things_to_do":   [],
        "emergency_fund_recommendation_local": f"{symbol}{emergency:,.0f}",
        "atm_and_payment_tips": "Carry local cash for small vendors.",
        "currency_advice":      exchange_rate,
        "_fallback_used":       True,
        "_metadata": {
            "hotels_found":         0,
            "trip_days":            trip_days,
            "currency":             currency,
            "exchange_rate":        exchange_rate,
            "budget_tier":          budget_tier,
            "suggested_activities": suggested_activities,
            "generated_at":         datetime.now().isoformat(),
        }
    }


# ─────────────────────────────────────────────
# PHASE 1 — Generate interest questions
# Call this FIRST from your endpoint.
# Return the questions to the frontend.
# ─────────────────────────────────────────────
async def get_budget_interest_questions(
    city: str,
    country: str,
    travel_start_date: str,
    travel_end_date: str,
    traveler_type: str,
    daily_budget: float = 3000.0,
    currency: str = "INR",
) -> dict:
    """
    Phase 1: Ask the user what they want to do
    before generating any budget plan.
    Returns questions for the frontend to display.
    """
    trip_days  = calculate_trip_days(travel_start_date, travel_end_date)

    exchange       = await fetch_exchange_rate(currency, "USD")
    rate_to_usd    = exchange.get("rate", 0.012)
    daily_usd      = round(daily_budget * rate_to_usd, 2)
    budget_tier    = classify_budget_tier(daily_usd, traveler_type)

    symbol = {
        "INR": "₹", "EUR": "€", "GBP": "£",
        "JPY": "¥", "AUD": "A$", "CAD": "C$",
        "SGD": "S$", "THB": "฿", "USD": "$",
        "BDT": "৳", "NPR": "Rs"
    }.get(currency, currency)

    prompt = INTEREST_QUESTION_PROMPT.format(
        city=city,
        country=country,
        trip_days=trip_days,
        traveler_type=traveler_type,
        budget_tier=budget_tier,
        symbol=symbol,
        daily_budget=f"{daily_budget:,.0f}",
    )

    try:
        response = client.models.generate_content(
            model="models/gemma-4-31b-it",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=800,
            )
        )
        text = response.text.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(text)

        # Attach metadata so frontend knows what to do next
        parsed["_phase"] = "interest_collection"
        parsed["_next_step"] = "submit_answers_to_/budget/plan"
        parsed["_context"] = {
            "city":               city,
            "country":            country,
            "travel_start_date":  travel_start_date,
            "travel_end_date":    travel_end_date,
            "traveler_type":      traveler_type,
            "daily_budget":       daily_budget,
            "currency":           currency,
        }
        return parsed

    except Exception as e:
        print(f"[BudgetAgent] Interest question generation failed: {e}")
        # Fallback: return generic questions so flow doesn't break
        return {
            "_phase":     "interest_collection",
            "_fallback":  True,
            "_next_step": "submit_answers_to_/budget/plan",
            "_context": {
                "city":              city,
                "country":           country,
                "travel_start_date": travel_start_date,
                "travel_end_date":   travel_end_date,
                "traveler_type":     traveler_type,
                "daily_budget":      daily_budget,
                "currency":          currency,
            },
            "greeting": f"Let's plan your trip to {city}!",
            "questions": [
                {
                    "id":       "activity_type",
                    "question": "What kind of activities excite you?",
                    "options":  [
                        "Beaches and nature",
                        "History and culture",
                        "Food and nightlife",
                        "Adventure and sports"
                    ]
                },
                {
                    "id":       "pace",
                    "question": "What's your travel pace?",
                    "options":  [
                        "Packed — see everything",
                        "Relaxed — 2-3 things/day",
                        "Spontaneous"
                    ]
                },
                {
                    "id":       "experience_type",
                    "question": "Popular spots or hidden gems?",
                    "options":  [
                        "Must-see iconic places",
                        "Hidden local gems",
                        "Mix of both"
                    ]
                }
            ]
        }


# ─────────────────────────────────────────────
# PHASE 2 — Full budget plan with user answers
# Call this AFTER collecting interest answers.
# ─────────────────────────────────────────────
async def run_budget_agent(
    city: str,
    country: str,
    travel_start_date: str,
    travel_end_date: str,
    traveler_type: str,
    daily_budget: float = 3000.0,
    currency: str = "INR",
    weather_context: Optional[dict] = None,
    # ── NEW: user interest answers from Phase 1 ──
    user_interests: Optional[dict] = None,
) -> dict:
    """
    Phase 2: Generate the full budget plan
    using the user's interest answers.
    user_interests example:
    {
      "activity_type": "Beaches and water sports",
      "pace": "Relaxed — 2-3 things per day",
      "food_preference": "Local street food only",
      "experience_type": "Hidden gems and local spots"
    }
    """

    # ── Cache check ───────────────────────────────────
    cache_key = build_cache_key(
        "budget",
        city=city,
        start=travel_start_date,
        end=travel_end_date,
        budget=daily_budget,
        currency=currency,
        traveler=traveler_type,
        # Include interests in cache key so different
        # interest answers don't serve the same cached plan
        interests=json.dumps(user_interests or {}, sort_keys=True),
    )
    cached = await get_cache(cache_key)
    if cached:
        print(f"[BudgetAgent] Serving from cache")
        return cached

    print(f"[BudgetAgent] Starting budget analysis for {city}...")

    # ── Exchange rate ─────────────────────────────────
    exchange         = await fetch_exchange_rate(currency, "USD")
    rate_to_usd      = exchange.get("rate", 0.012)
    exchange_display = await fetch_exchange_rate("USD", currency)
    rate_display     = exchange_display.get("rate", 83.5)

    symbol = {
        "INR": "₹", "EUR": "€", "GBP": "£",
        "JPY": "¥", "AUD": "A$", "CAD": "C$",
        "SGD": "S$", "THB": "฿", "USD": "$",
        "BDT": "৳", "NPR": "Rs"
    }.get(currency, currency)

    daily_budget_usd  = round(daily_budget * rate_to_usd, 2)
    exchange_rate_str = f"1 USD ≈ {rate_display:.2f} {currency}"
    trip_days         = calculate_trip_days(travel_start_date, travel_end_date)
    budget_tier       = classify_budget_tier(daily_budget_usd, traveler_type)
    total_budget      = daily_budget * trip_days

    print(
        f"[BudgetAgent] {trip_days} days | "
        f"{symbol}{daily_budget}/day | tier: {budget_tier} | "
        f"interests: {user_interests is not None}"
    )

    # ── Build bundle WITH user interests ──────────────
    bundle = {
        "city":              city,
        "country":           country,
        "travel_dates":      f"{travel_start_date} to {travel_end_date}",
        "traveler_type":     traveler_type,
        "trip_days":         trip_days,
        "daily_budget":      daily_budget,
        "total_budget":      total_budget,
        "currency":          currency,
        "currency_symbol":   symbol,
        "exchange_rate":     exchange_rate_str,
        "budget_tier":       budget_tier,
        "weather_summary": (
            weather_context.get("summary", "")
            if weather_context else ""
        ),
        # ── This is the key addition ──────────────────
        "user_interests": user_interests or {},
        "interest_note": (
            "IMPORTANT: suggested_activities and free_things_to_do "
            "MUST reflect the user_interests above. "
            "Do NOT suggest generic activities. "
            "Suggest specific places in this city that match "
            "what the user said they want."
            if user_interests
            else "No interests provided — use general recommendations."
        ),
    }

    # ── Build interest-aware suggested_activities ─────
    # Gemma will fill these with specific places for downstream UI use.
    interest_based_activities_prompt = ""
    if user_interests:
        interest_based_activities_prompt = (
            f"\n\nBased on user_interests, also populate "
            f"_metadata.suggested_activities with 4-6 SPECIFIC "
            f"place names in {city} that match: "
            f"{json.dumps(user_interests)}. "
            f"Each must have: name (specific place), type, "
            f"duration_hours, preferred_date (null), notes."
        )

    # ── Gemma call ────────────────────────────────────
    print(f"[BudgetAgent] Sending to Gemma with interests...")

    last_error = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="models/gemma-4-31b-it",
                contents=(
                    f"Create a personalized travel budget plan "
                    f"for {city}, {country} based on the user's "
                    f"stated interests:\n\n"
                    f"{json.dumps(bundle, indent=2)}"
                    f"{interest_based_activities_prompt}"
                ),
                config=types.GenerateContentConfig(
                    system_instruction=BUDGET_SYSTEM_PROMPT,
                    temperature=0.2,
                    max_output_tokens=1500,
                )
            )

            text   = response.text.strip()
            text   = text.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(text)

            # ── Build suggested_activities from interests ──
            # Fall back to generic only if Gemma didn't populate them
            suggested_activities = (
                parsed.get("_metadata", {}).get("suggested_activities")
                or _interest_to_activities(user_interests, city)
            )

            parsed["_metadata"] = {
                "trip_days":             trip_days,
                "currency":              currency,
                "exchange_rate":         exchange_rate_str,
                "budget_tier":           budget_tier,
                "user_interests":        user_interests or {},
                "suggested_activities":  suggested_activities,
                "weather_context_used":  weather_context is not None,
                "generated_at":          datetime.now().isoformat(),
            }

            await set_cache(cache_key, parsed, TTL["budget"])
            print(f"[BudgetAgent] Success on attempt {attempt + 1}")
            return parsed

        except json.JSONDecodeError as e:
            print(f"[BudgetAgent] JSON parse error attempt {attempt+1}: {e}")
            last_error = e
            if attempt == 0:
                await asyncio.sleep(1)

        except Exception as e:
            print(f"[BudgetAgent] API error attempt {attempt+1}: {e}")
            last_error = e
            if attempt == 0:
                await asyncio.sleep(2)

    # ── Fallback ──────────────────────────────────────
    print(f"[BudgetAgent] All attempts failed — fallback. Error: {last_error}")
    fallback = _build_fallback(
        city=city,
        trip_days=trip_days,
        daily_budget=daily_budget,
        currency=currency,
        symbol=symbol,
        budget_tier=budget_tier,
        exchange_rate=exchange_rate_str,
        suggested_activities=_interest_to_activities(user_interests, city),
    )
    await set_cache(cache_key, fallback, 1800)
    return fallback


def _interest_to_activities(
    user_interests: Optional[dict],
    city: str
) -> list:
    """
    Converts raw user interest answers into
    structured activity stubs for downstream UI use.
    Used as fallback when Gemma doesn't populate them.
    """
    if not user_interests:
        return []

    activity_type = user_interests.get("activity_type", "")
    pace          = user_interests.get("pace", "")
    food_pref     = user_interests.get("food_preference", "")
    exp_type      = user_interests.get("experience_type", "")

    activities = []

    # Map interest answers to activity types
    if "beach" in activity_type.lower() or "water" in activity_type.lower():
        activities.append({
            "name":           f"Beach exploration in {city}",
            "type":           "outdoor",
            "duration_hours": 4,
            "preferred_date": None,
            "notes":          "Based on user interest: beaches"
        })
    if "history" in activity_type.lower() or "culture" in activity_type.lower():
        activities.append({
            "name":           f"Heritage and cultural sites in {city}",
            "type":           "indoor",
            "duration_hours": 3,
            "preferred_date": None,
            "notes":          "Based on user interest: history/culture"
        })
    if "food" in activity_type.lower() or "nightlife" in activity_type.lower():
        activities.append({
            "name":           f"Local food market in {city}",
            "type":           "flexible",
            "duration_hours": 2,
            "preferred_date": None,
            "notes":          "Based on user interest: food/nightlife"
        })
    if "adventure" in activity_type.lower() or "nature" in activity_type.lower():
        activities.append({
            "name":           f"Nature trail or adventure activity near {city}",
            "type":           "outdoor",
            "duration_hours": 5,
            "preferred_date": None,
            "notes":          "Based on user interest: adventure/nature"
        })
    if "hidden" in exp_type.lower() or "local" in exp_type.lower():
        activities.append({
            "name":           f"Local neighbourhood walk in {city}",
            "type":           "outdoor",
            "duration_hours": 2,
            "preferred_date": None,
            "notes":          "Based on preference: hidden gems"
        })
    if "street food" in food_pref.lower():
        activities.append({
            "name":           f"Street food exploration in {city}",
            "type":           "flexible",
            "duration_hours": 1,
            "preferred_date": None,
            "notes":          "Based on food preference: street food"
        })

    return activities
