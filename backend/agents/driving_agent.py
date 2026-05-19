import asyncio
import json
from datetime import datetime
from google.genai import types
from dotenv import load_dotenv
from tools.weather_tool import (
    geocode_city,
    fetch_daily_trip_forecast,
)
from tools.driving_tool import (
    fetch_elevation,
    calculate_driving_score,
    analyse_route_conditions
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

DRIVING_SYSTEM_PROMPT = """
You are an expert road safety and driving conditions analyst
for travelers in India and globally.

You receive:
1. Day-by-day weather forecast
2. Python-calculated driving scores per day
3. Terrain and elevation data
4. Route waypoint analysis
5. Vehicle type and driver experience
6. A pre_fetched_weather_advisory block from the weather
   agent — use calamity_status and primary_hazards to
   add specific route warnings. If predicted_events
   includes Landslide or Rockfall, flag those stretches.

Produce a complete driving safety advisory.
Be specific about route names, road numbers, and local
knowledge about dangerous stretches.

Respond ONLY in this JSON format, no other text:
{
  "destination": "...",
  "overall_driving_risk": "low | moderate | high | extreme",
  "trip_driving_summary": "...",
  "daily_driving_guide": [
    {
      "date": "YYYY-MM-DD",
      "driving_score": 0,
      "condition": "excellent | good | moderate | poor | dangerous",
      "color_code": "green | yellow | orange | red",
      "recommendation": "...",
      "best_departure_time": "...",
      "max_speed_advisory": "...",
      "active_hazards": ["...", "..."],
      "route_specific_warnings": ["...", "..."],
      "emergency_stops": [
        {
          "location": "...",
          "reason": "...",
          "distance_from_start_km": 0
        }
      ]
    }
  ],
  "dangerous_stretches": [
    {
      "route_name": "...",
      "stretch": "...",
      "risk_type": "landslide | flood | fog | sharp_bends | poor_surface",
      "risk_level": "critical | high | medium",
      "advisory": "...",
      "alternative_route": "..."
    }
  ],
  "vehicle_specific_advice": {
    "vehicle_type": "...",
    "suitability_rating": "excellent | good | poor | unsuitable",
    "specific_tips": ["...", "..."],
    "modification_suggestions": ["...", "..."]
  },
  "driver_checklist": ["..."],
  "emergency_kit_for_conditions": ["..."],
  "emergency_contacts": [
    {
      "service": "...",
      "number": "...",
      "when_to_call": "..."
    }
  ],
  "fuel_advisory": "...",
  "parking_advisory": "...",
  "night_driving_assessment": "...",
  "best_driving_day": "YYYY-MM-DD",
  "worst_driving_day": "YYYY-MM-DD",
  "should_avoid_self_drive": false,
  "avoid_reason": null
}
"""


async def run_driving_agent(
    city: str,
    country: str,
    travel_start_date: str,
    travel_end_date: str,
    traveler_type: str,
    route_waypoints: list,
    vehicle_type: str,
    driver_experience: str,
    night_driving: bool,
    weather_context: dict | None = None,
) -> dict:

    # ── Cache check ───────────────────────────────────
    cache_key = build_cache_key(
        "driving",
        city=city,
        start=travel_start_date,
        end=travel_end_date,
        vehicle=vehicle_type,
        experience=driver_experience,
        night=str(night_driving)
    )
    cached = await get_cache(cache_key)
    if cached:
        print("[DrivingAgent] Serving from cache")
        return cached

    print(f"[DrivingAgent] Starting road condition "
          f"analysis for {city}...")

    # ── Geocode for elevation ─────────────────────────
    # fetch_daily_trip_forecast geocodes city
    # internally — pass city string, NOT lat/lon.
    # fetch_elevation needs explicit lat/lon coords.
    coords = await geocode_city(city)
    if "error" in coords:
        return {
            "error": f"Could not locate {city}",
            "overall_driving_risk": "unknown"
        }

    lat = coords["latitude"]
    lon = coords["longitude"]

    print(f"[DrivingAgent] Geocoded {city} -> "
          f"lat={lat}, lon={lon}")

    # ── Fetch forecast + elevation in parallel ─────────
    print("[DrivingAgent] Fetching forecast + elevation "
          "in parallel...")

    results = await asyncio.gather(
        fetch_daily_trip_forecast(
            city,              # ← city string (correct)
            travel_start_date,
            travel_end_date
        ),
        fetch_elevation(lat, lon),
        return_exceptions=True
    )

    def safe(r):
        return r if not isinstance(
            r, Exception) else {"error": str(r)}

    forecast       = safe(results[0])
    elevation_data = safe(results[1])

    # Defensive: ensure forecast is always a list
    if not isinstance(forecast, list):
        forecast = []

    elevation_m  = elevation_data.get("elevation_m", 0) \
        if isinstance(elevation_data, dict) else 0
    terrain_type = elevation_data.get(
        "terrain_type", "plains") \
        if isinstance(elevation_data, dict) else "plains"

    print(f"[DrivingAgent] Elevation: {elevation_m}m "
          f"({terrain_type})")
    print(f"[DrivingAgent] Forecast days received: "
          f"{len(forecast)}")

    # ── Score each day in Python ──────────────────────
    daily_scores = []
    for day in forecast:
        if not isinstance(day, dict) or "error" in day:
            continue
        score = calculate_driving_score(
            day,
            elevation_m,
            terrain_type,
            vehicle_type,
            driver_experience,
            night_driving
        )
        daily_scores.append({
            "date":    day.get("date", "unknown"),
            "weather": {
                "rain_mm":  day.get("rain_mm", 0),
                "wind_kmh": day.get("wind_kmh", 0),
                "temp_max": day.get("temp_max_c", 0),
                "temp_min": day.get("temp_min_c", 0),
                "code":     day.get("weather_code", 0),
                "sunrise":  day.get("sunrise", ""),
                "sunset":   day.get("sunset", ""),
            },
            "driving_score": score
        })

    if not daily_scores:
        print("[DrivingAgent] No valid forecast days — "
              "returning early")
        return {
            "error": "No usable forecast data for driving analysis",
            "overall_driving_risk": "unknown",
            # Exposes raw forecast so caller can debug
            "_raw_forecast": forecast,
            "_elevation_m":  elevation_m,
            "_geocode_ok":   True,   # confirms geocode worked
        }

    # ── Route analysis (runs after forecast scores) ───
    # Kept sequential so waypoint forecasts share the
    # same date-clamping fix in fetch_daily_forecast.
    try:
        route_analysis = await analyse_route_conditions(
            route_waypoints,
            travel_start_date,
            travel_end_date,
            vehicle_type,
            driver_experience,
            night_driving
        )
        if not isinstance(route_analysis, list):
            route_analysis = []
    except Exception as exc:
        print(f"[DrivingAgent] Route analysis failed: {exc}")
        route_analysis = []

    best_day  = max(
        daily_scores,
        key=lambda x: x["driving_score"]["driving_score"]
    )
    worst_day = min(
        daily_scores,
        key=lambda x: x["driving_score"]["driving_score"]
    )

    # ── Build bundle ──────────────────────────────────
    bundle = {
        "city":              city,
        "country":           country,
        "travel_dates":      (
            f"{travel_start_date} to {travel_end_date}"
        ),
        "traveler_type":     traveler_type,
        "vehicle_type":      vehicle_type,
        "driver_experience": driver_experience,
        "night_driving":     night_driving,
        "destination_elevation_m": elevation_m,
        "terrain_type":      terrain_type,
        "daily_driving_scores": daily_scores,
        "route_waypoints":   route_waypoints,
        "route_analysis":    route_analysis,
        "best_driving_day":  best_day["date"],
        "worst_driving_day": worst_day["date"],
        "trip_overview": {
            "total_days": len(daily_scores),
            "dangerous_days": sum(
                1 for d in daily_scores
                if d["driving_score"][
                    "driving_score"] < 20
            ),
            "poor_days": sum(
                1 for d in daily_scores
                if 20 <= d["driving_score"][
                    "driving_score"] < 40
            ),
            "good_days": sum(
                1 for d in daily_scores
                if d["driving_score"][
                    "driving_score"] >= 60
            ),
            "any_landslide_risk": any(
                d["driving_score"].get("landslide_risk")
                for d in daily_scores
            ),
            "any_frost_risk": any(
                d["driving_score"].get("frost_risk")
                for d in daily_scores
            ),
            "any_fog_risk": any(
                d["driving_score"].get("fog_risk")
                for d in daily_scores
            ),
        },
        "pre_fetched_weather_advisory": {
            "summary":           weather_context.get("summary") if weather_context else None,
            "conditions":        weather_context.get("conditions") if weather_context else None,
            "calamity_status":   weather_context.get("calamity_prediction_alert", {}).get("status") if weather_context else None,
            "predicted_events":  weather_context.get("calamity_prediction_alert", {}).get("predicted_events") if weather_context else [],
            "hazard_risk_level": weather_context.get("hazard_risk_assessment", {}).get("overall_risk_level") if weather_context else None,
            "primary_hazards":   weather_context.get("hazard_risk_assessment", {}).get("primary_hazards") if weather_context else [],
            "severe_alerts":     weather_context.get("severe_alerts") if weather_context else None,
        } if weather_context else {},
    }

    if weather_context:
        print(
            f"[DrivingAgent] Weather context injected — "
            f"calamity={bundle['pre_fetched_weather_advisory']['calamity_status']} "
            f"hazard={bundle['pre_fetched_weather_advisory']['hazard_risk_level']}"
        )

    # ── Gemma analysis — free-only fallback chain ─────
    print("[DrivingAgent] Sending to Gemma...")

    DRIVING_MODELS = SUPPORTED_GEMMA_MODELS

    parsed     = None
    last_error = None
    last_raw   = ""

    for model in DRIVING_MODELS:
        for attempt in range(3):
            try:
                print(
                    f"[DrivingAgent] {model} "
                    f"attempt {attempt + 1}..."
                )
                response = await generate_content_with_timeout(
                    model=model,
                    contents=(
                        f"Produce a complete driving safety "
                        f"advisory for {city}, {country}:\n\n"
                        f"{json.dumps(bundle, indent=2)}"
                    ),
                    system_instruction=DRIVING_SYSTEM_PROMPT,
                    temperature=0.2,
                    max_output_tokens=1800,
                    timeout_seconds=120,
                )
                last_raw = (response.text or "").strip()
                text     = last_raw \
                    .replace("```json", "") \
                    .replace("```", "") \
                    .strip()
                parsed   = json.loads(text)
                print(f"[DrivingAgent] ✓ {model} OK")
                break

            except json.JSONDecodeError as exc:
                last_error = (
                    f"JSON parse failed on {model}: {exc}"
                )
                print(
                    f"[DrivingAgent] {last_error} | "
                    f"raw[:200]={last_raw[:200]}"
                )
                break
            except asyncio.TimeoutError:
                last_error = f"{model} timed out after 90s"
                print(f"[DrivingAgent] {last_error}")
                break
            except Exception as exc:
                last_error = str(exc)
                if is_retryable_model_error(last_error):
                    wait = 2 ** attempt
                    print(
                        f"[DrivingAgent] {model} server "
                        f"error, retry in {wait}s..."
                    )
                    await asyncio.sleep(wait)
                else:
                    print(
                        f"[DrivingAgent] {model} failed: "
                        f"{last_error[:80]}"
                    )
                    break
        if parsed:
            break

    if parsed is None:
        print(
            f"[DrivingAgent] All models failed — "
            f"structured fallback. Error: {last_error}"
        )
        return {
            "error":                  "Driving analysis failed — raw scores available",
            "error_detail":           last_error,
            "overall_driving_risk":   "unknown",
            "daily_scores_available": daily_scores,
            "best_driving_day":       best_day["date"],
            "worst_driving_day":      worst_day["date"],
            "_fallback_used":         True,
        }

    parsed["_raw_daily_scores"]     = daily_scores
    parsed["_elevation_m"]          = elevation_m
    parsed["_terrain_type"]         = terrain_type
    parsed["_generated_at"]         = datetime.now().isoformat()
    parsed["_weather_context_used"] = weather_context is not None

    await set_cache(cache_key, parsed, TTL["driving"])
    return parsed
