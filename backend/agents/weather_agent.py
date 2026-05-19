import asyncio
import json
from datetime import datetime
from google.genai import types
from dotenv import load_dotenv
from tools.weather_tool import (
    geocode_city,
    call_openweathermap,
    fetch_historical_precipitation,
    fetch_reliefweb_disasters,
    fetch_ncei_station_data,
    fetch_health_and_pollen_data,
    fetch_route_forecast,
    calculate_mosquito_risk,
    fetch_historical_seismic_data,
    fetch_realtime_fires
)
from utils.cache import (
    build_cache_key,
    get_cache,
    set_cache,
    TTL
)
from utils.llm import (
    SUPPORTED_GEMMA_MODELS,
    generate_content_with_timeout,
    is_retryable_model_error,
)

load_dotenv()

WEATHER_SYSTEM_PROMPT = """You are a Master Disaster Prediction & Travel Weather Safety Analyst. 
Your goal is to cross-analyze 20 years of historical data with real-time variables to predict calamities and provide a high-fidelity travel safety advisory.

Respond ONLY in this JSON format:
{
  "summary": "...",
  "current_season": "e.g. Pre-Monsoon Spring in Northern India | Sakura Season in Japan",
  "temperature": "...",
  "conditions": "...",
  "severe_alerts": "...",
  "calamity_prediction_alert": {
    "status": "CLEAR | ADVISORY | CRITICAL",
    "predicted_events": ["Soil Liquefaction", "Rockfalls", "Broken Gas Lines", "Aftershocks", "Dam/Levee Failure"],
    "historical_basis": "Summary of 20-year seismic and flood patterns found",
    "probability_score": "0-100%"
  },
  "journey_weather_timeline": [],
  "travel_health_index": {
    "heat_stress_risk": "...",
    "mosquito_activity": "...",
    "air_quality_concern": "...",
    "uv_exposure_risk": "...",
    "overall_health_recommendation": "..."
  },
  "allergen_alerts": [
    {
      "allergen_type": "...",
      "level": "...",
      "origin_season": "...",
      "precautions": "..."
    }
  ],
  "seasonal_environmental_factors": {
    "sensory_note": "How the season affects the smell/feel of the air",
    "economic_impact": "Expected surge pricing or seasonal discounts",
    "infrastructure_risk": "Power outage risks or road slippery conditions"
  },
  "packing_tips": [],
  "best_time_outdoors": "...",
  "hazard_risk_assessment": {
    "overall_risk_level": "...",
    "primary_hazards": [
      {
        "hazard_type": "...",
        "risk_level": "...",
        "impact": "..."
      }
    ]
  },
  "traveler_safety_recommendations": [],
  "emergency_contacts_relevant": [],
  "should_reconsider_travel": false,
  "reconsider_reason": null
}

Rules you must follow:
1. DISASTER PREDICTION: Analyze 20-year seismic history. If max_magnitude > 6.0 AND soil moisture > 80%, predict HIGH risk of Soil Liquefaction. If Urban + Mag 6.5+ history, warn of Broken Gas Lines.
2. SEASONAL DETECTION: Identify the exact local season based on travel dates. Mention seasonal scents and economic impacts.
3. FAMILY & ALLERGY RULE: If traveler_type is family, proactively ask about allergies in the summary.
4. TIMELINE RULE: If transit_waypoints_provided is not empty,
   you MUST populate journey_weather_timeline with one entry
   per waypoint. Use transit_waypoints_weather data which
   contains real forecast data per city. Each entry must have:
   - location: the waypoint city name
   - temperature: actual temp from the data
   - conditions: actual conditions from the data
   - alerts: any severe alerts
   - travel_advisory: specific advice for that leg of journey
   Never leave journey_weather_timeline empty if waypoints
   were provided.
5. INFRASTRUCTURE: If 3+ floods in 20 years for this month + heavy rain forecast, warn of Dam and Levee Vulnerability.
6. HEALTH: Tailor Heat Stress and UV warnings for the traveler_type.
7. ALLERGY RULE: The traveler's known_allergies list must be
   cross-referenced against local allergens, pollution, mold,
   dust, pollen, and food allergens. Always populate
   allergen_alerts with entries specific to what the traveler
   is allergic to. Never leave allergen_alerts empty if
   known_allergies is provided.
"""


async def run_weather_agent(
    city: str,
    country: str,
    travel_start_date: str,
    travel_end_date: str,
    traveler_type: str,
    family_members: int = 0,
    known_allergies: list = None,
    transit_waypoints: list = None
) -> dict:

    if known_allergies is None:
        known_allergies = []
    if transit_waypoints is None:
        transit_waypoints = []

    # ── Cache check ───────────────────────────────────
    # Sort waypoints so order doesn't matter
    # but different waypoints = different cache key
    waypoints_str = ",".join(
        sorted(transit_waypoints)
    ) if transit_waypoints else "none"

    allergies_str = ",".join(
        sorted(known_allergies)
    ) if known_allergies else "none"

    cache_key = build_cache_key(
        "weather",
        city=city,
        start=travel_start_date,
        end=travel_end_date,
        traveler=traveler_type,
        waypoints=waypoints_str,
        allergies=allergies_str
    )
    cached = await get_cache(cache_key)
    if cached:
        print(f"[WeatherAgent] Serving from cache")
        return cached

    # ── Step 1: Geocode ───────────────────────────────
    coords = await geocode_city(city)
    if "error" in coords and coords.get("latitude") == 0:
        return {
            "error": f"Could not locate city: {city}",
            "summary": "Weather data unavailable",
            "hazard_risk_assessment": {
                "overall_risk_level": "unknown"
            }
        }

    lat = coords["latitude"]
    lon = coords["longitude"]

    print(f"[WeatherAgent] Geocoded {city} -> "
          f"lat={lat}, lon={lon}")

    # ── Step 2: Fetch all data in parallel ────────────
    print("[WeatherAgent] Fetching all data sources "
          "in parallel...")

    results = await asyncio.gather(
        call_openweathermap(city),
        fetch_historical_precipitation(
            lat, lon,
            travel_start_date,
            travel_end_date
        ),
        fetch_reliefweb_disasters(
            country,
            ["Earthquake", "Flood", "Fire",
             "Tsunami", "Landslide"]
        ),
        fetch_ncei_station_data(
            lat, lon,
            travel_start_date,
            travel_end_date
        ),
        fetch_health_and_pollen_data(lat, lon),
        fetch_route_forecast(transit_waypoints),
        fetch_historical_seismic_data(lat, lon),
        fetch_realtime_fires(lat, lon),
        return_exceptions=True
    )

    def safe(r):
        return r if not isinstance(
            r, Exception) else {"error": str(r)}

    realtime      = safe(results[0])
    hist_precip   = safe(results[1])
    reliefweb     = safe(results[2])
    ncei          = safe(results[3])
    health_pollen = safe(results[4])
    route_weather = safe(results[5])
    seismic_20yr  = safe(results[6])
    fire_data     = safe(results[7])

    print(f"[WeatherAgent] Realtime: "
          f"{'OK' if 'error' not in realtime else 'FAIL'}")
    print(f"[WeatherAgent] Historical: "
          f"{'OK' if 'error' not in hist_precip else 'FAIL'}")
    print(f"[WeatherAgent] Disasters: "
          f"{len(reliefweb) if isinstance(reliefweb, list) else 'FAIL'}")

    def nested_value(source, key, nested_key, default):
        value = source.get(key, {}) if isinstance(source, dict) else {}
        return value.get(nested_key, default) if isinstance(value, dict) else default

    def scalar_value(source, key, default):
        value = source.get(key, default) if isinstance(source, dict) else default
        return value if value is not None else default

    # ── Step 3: Mosquito risk ─────────────────────────
    mosq_risk = calculate_mosquito_risk(
        temp=nested_value(realtime, "temperature_c", "current", 25),
        humidity=scalar_value(realtime, "humidity_percent", 50),
        precip_last_7d=nested_value(realtime, "precipitation_mm", "next_24h", 0),
        wind_speed=scalar_value(realtime, "wind_speed_kmh", 5)
    )

    # ── Step 4: Build bundle ──────────────────────────
    bundle = {
        "city":             city,
        "country":          country,
        "travel_dates":     (
            f"{travel_start_date} to {travel_end_date}"
        ),
        "traveler_type":    traveler_type,
        "family_members":   family_members,
        "known_allergies":  known_allergies,
        "transit_waypoints_provided": transit_waypoints,
        "realtime_weather": realtime,
        "historical_seismic_20yr": seismic_20yr,
        "thermal_fire_anomalies":  fire_data,
        "historical_precipitation_context": hist_precip,
        "reliefweb_disaster_history": reliefweb,
        "health_and_pollen_data": health_pollen,
        "calculated_mosquito_risk": mosq_risk,
        "route_weather_data": route_weather,
        "transit_waypoints_weather": {
            waypoint: result
            for waypoint, result in zip(
                transit_waypoints,
                route_weather if isinstance(
                    route_weather, list) else []
            )
        } if isinstance(route_weather, list) else {},
    }

    # ── Step 5: Gemma analysis — free-only fallback chain ────────────────────
    print("[WeatherAgent] Sending to Gemma...")

    WEATHER_MODELS = SUPPORTED_GEMMA_MODELS

    parsed     = None
    last_error = None
    last_raw   = ""

    for model in WEATHER_MODELS:
        for attempt in range(3):
            try:
                print(f"[WeatherAgent] {model} attempt {attempt + 1}...")
                response = await generate_content_with_timeout(
                    model=model,
                    contents=(
                        f"Perform Deep Calamity Prediction and "
                        f"Travel Analysis for {city}:\n\n"
                        f"{json.dumps(bundle, indent=2)}"
                    ),
                    system_instruction=WEATHER_SYSTEM_PROMPT,
                    temperature=0.1,
                    max_output_tokens=1800,
                    timeout_seconds=90,
                )
                # last_raw assigned before json.loads — no NameError risk
                last_raw = (response.text or "").strip()
                text     = last_raw.replace("```json", "").replace("```", "").strip()
                parsed   = json.loads(text)
                print(f"[WeatherAgent] ✓ {model} OK")
                break

            except json.JSONDecodeError as exc:
                last_error = f"JSON parse failed on {model}: {exc}"
                print(f"[WeatherAgent] {last_error} | raw[:200]={last_raw[:200]}")
                break
            except asyncio.TimeoutError:
                last_error = f"{model} timed out after 90s"
                print(f"[WeatherAgent] {last_error}")
                break
            except Exception as exc:
                last_error = str(exc)
                if is_retryable_model_error(last_error):
                    wait = 2 ** attempt
                    print(f"[WeatherAgent] {model} server error, retry in {wait}s...")
                    await asyncio.sleep(wait)
                else:
                    print(f"[WeatherAgent] {model} failed: {last_error[:80]}")
                    break
        if parsed:
            break

    if parsed is None:
        print(f"[WeatherAgent] All models failed — structured fallback. Error: {last_error}")
        return {
            "error":        "Weather analysis failed — raw data available",
            "error_detail": last_error,
            "summary":      f"Weather data collected for {city} but synthesis failed.",
            "current_season": "unknown",
            "calamity_prediction_alert": {"status": "UNKNOWN", "predicted_events": [], "probability_score": "0%"},
            "hazard_risk_assessment":    {"overall_risk_level": "unknown", "primary_hazards": []},
            "packing_tips":              [],
            "should_reconsider_travel":  False,
            "reconsider_reason":         None,
            "_raw_data_available":       True,
            "_fallback_used":            True,
        }

    parsed["_metadata"] = {
        "seismic_events_found":   seismic_20yr.get("total_significant_events", 0) if isinstance(seismic_20yr, dict) else 0,
        "fire_hotspots_detected": len(fire_data) if isinstance(fire_data, list) else 0,
        "data_retrieval_time":    datetime.now().isoformat(),
    }

    await set_cache(cache_key, parsed, TTL["weather"])
    return parsed
