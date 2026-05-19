import httpx
import asyncio
from datetime import datetime
from tools.weather_tool import (
    geocode_city,
    fetch_daily_trip_forecast,
)


# ─────────────────────────────────────────────
# TOOL — Elevation profile fetcher
# Open-Meteo elevation API (FREE, no key)
# ─────────────────────────────────────────────
async def fetch_elevation(lat: float, lon: float) -> dict:
    """
    Gets elevation at a specific coordinate.
    Used to detect mountain/hill roads.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.open-meteo.com/v1/elevation",
                params={
                    "latitude":  lat,
                    "longitude": lon
                }
            )
            data = r.json()
            elevation = data.get("elevation", [0])
            return {
                "elevation_m": elevation[0]
                    if isinstance(elevation, list)
                    else elevation,
                "terrain_type": classify_terrain(
                    elevation[0]
                    if isinstance(elevation, list)
                    else elevation
                )
            }
    except Exception as e:
        return {
            "elevation_m": 0,
            "terrain_type": "unknown",
            "error": str(e)
        }


def classify_terrain(elevation_m: float) -> str:
    """
    Classifies terrain type based on elevation.
    """
    if elevation_m < 100:
        return "plains"
    elif elevation_m < 500:
        return "hilly"
    elif elevation_m < 1500:
        return "mountain"
    else:
        return "high_altitude"


# ─────────────────────────────────────────────
# ROAD CONDITION SCORER (Pure Python)
# ─────────────────────────────────────────────
def calculate_driving_score(
    day: dict,
    elevation_m: float,
    terrain_type: str,
    vehicle_type: str,
    driver_experience: str,
    night_driving: bool
) -> dict:
    """
    Pure Python driving safety scorer.
    Combines weather data with terrain and
    vehicle factors to produce a driving score.

    Score 0-100:
    80-100 = excellent driving conditions
    60-79  = good, drive with normal care
    40-59  = moderate, drive carefully
    20-39  = poor, avoid if possible
    0-19   = dangerous, do not drive
    """

    score = 100
    warnings = []
    hazards = []

    rain_mm   = day.get("rain_mm", 0) or 0
    rain_hrs  = day.get("rain_hours", 0) or 0
    wind_kmh  = day.get("wind_kmh", 0) or 0
    temp_max  = day.get("temp_max_c", 25) or 25
    temp_min  = day.get("temp_min_c", 15) or 15
    uv        = day.get("uv_index", 0) or 0
    code      = day.get("weather_code", 0) or 0
    visibility_factor = 1.0

    # ── Rain penalties ────────────────────────────────
    if rain_mm > 50:
        score -= 40
        hazards.append("Extreme rainfall — serious flood risk")
        warnings.append(
            "Avoid driving if rainfall exceeds 50mm"
        )
    elif rain_mm > 20:
        score -= 25
        hazards.append("Heavy rain — aquaplaning risk")
        warnings.append(
            "Reduce speed to max 40kmh on wet roads"
        )
    elif rain_mm > 10:
        score -= 15
        warnings.append(
            "Moderate rain — roads slippery"
        )
    elif rain_mm > 0:
        score -= 8
        warnings.append("Light rain — drive carefully")

    # ── Rain duration penalty ─────────────────────────
    if rain_hrs > 12:
        score -= 15
        hazards.append(
            "Prolonged rain — waterlogging on low roads"
        )
    elif rain_hrs > 6:
        score -= 8

    # ── Terrain penalties ─────────────────────────────
    if terrain_type == "high_altitude":
        score -= 15
        hazards.append(
            "High altitude roads — thin air, sharp bends"
        )
    elif terrain_type == "mountain":
        score -= 10
        warnings.append(
            "Mountain roads — watch for falling rocks"
        )
    elif terrain_type == "hilly":
        score -= 5

    # Rain + mountain = landslide risk
    if rain_mm > 20 and terrain_type in [
        "mountain", "high_altitude"
    ]:
        score -= 20
        hazards.append(
            "LANDSLIDE RISK — rain on mountain terrain"
        )

    # Rain + hilly = road washout risk
    if rain_mm > 30 and terrain_type == "hilly":
        score -= 15
        hazards.append(
            "Road washout possible on hilly terrain"
        )

    # ── Wind penalties ────────────────────────────────
    if wind_kmh > 80:
        score -= 25
        hazards.append(
            "Dangerous wind — risk of vehicle being pushed"
        )
    elif wind_kmh > 60:
        score -= 15
        warnings.append(
            "Strong wind — keep firm grip on steering"
        )
    elif wind_kmh > 40:
        score -= 8
        warnings.append(
            "Moderate wind — caution on exposed roads"
        )

    # ── Storm weather code penalties ──────────────────
    # WMO codes: 95+ = thunderstorm, 85+ = snow shower
    if code >= 95:
        score -= 30
        hazards.append(
            "Thunderstorm — do not drive"
        )
    elif code >= 80:
        score -= 15
        warnings.append(
            "Rain showers — visibility reduced"
        )

    # Fog codes (45=fog, 48=depositing rime fog)
    if code in [45, 48]:
        score -= 25
        visibility_factor = 0.3
        hazards.append(
            "FOG — visibility potentially below 50m"
        )

    # ── Temperature penalties ─────────────────────────
    if temp_min < 2:
        score -= 20
        hazards.append(
            "FROST RISK — black ice possible on roads"
        )
    elif temp_min < 5:
        score -= 10
        warnings.append(
            "Near freezing — watch for ice on bridges"
        )

    if temp_max > 42:
        score -= 10
        warnings.append(
            "Extreme heat — tyre blowout risk increases"
        )

    # ── Vehicle type adjustments ──────────────────────
    vehicle_adjustments = {
        "scooter": -15,   # most vulnerable
        "bike":    -10,
        "car":       0,
        "bus":      -5,
        "suv":       5    # better ground clearance
    }
    score += vehicle_adjustments.get(vehicle_type, 0)

    if vehicle_type in ["scooter", "bike"]:
        if rain_mm > 5:
            hazards.append(
                f"{vehicle_type.title()} extremely "
                f"dangerous in rain — consider alternative"
            )
        if wind_kmh > 30:
            warnings.append(
                f"High wind dangerous for "
                f"{vehicle_type} riders"
            )

    # ── Driver experience adjustments ────────────────
    experience_adjustments = {
        "beginner":     -10,
        "intermediate":   0,
        "expert":         5
    }
    score += experience_adjustments.get(
        driver_experience, 0
    )

    if driver_experience == "beginner":
        warnings.append(
            "Beginner driver — avoid mountain roads "
            "in rain completely"
        )

    # ── Night driving penalty ─────────────────────────
    if night_driving:
        score -= 15
        warnings.append(
            "Night driving — wildlife on roads, "
            "poor road markings in hilly areas"
        )
        if terrain_type in ["mountain", "high_altitude"]:
            score -= 10
            hazards.append(
                "Night + mountain = very high risk. "
                "Strongly avoid."
            )

    # ── Final score clamping ──────────────────────────
    score = max(0, min(100, score))

    # ── Score classification ──────────────────────────
    if score >= 80:
        condition = "excellent"
        recommendation = "Safe to drive normally"
        color = "green"
    elif score >= 60:
        condition = "good"
        recommendation = "Drive with normal caution"
        color = "green"
    elif score >= 40:
        condition = "moderate"
        recommendation = "Drive carefully, reduce speed"
        color = "yellow"
    elif score >= 20:
        condition = "poor"
        recommendation = "Avoid if possible, high risk"
        color = "orange"
    else:
        condition = "dangerous"
        recommendation = "Do NOT drive — wait for conditions to improve"
        color = "red"

    # ── Best departure window ─────────────────────────
    if rain_hrs <= 4:
        departure_window = "Any time — minimal rain"
    elif rain_hrs <= 8:
        departure_window = (
            "Before 08:00 or after 16:00 "
            "to avoid peak rain hours"
        )
    elif rain_hrs <= 14:
        departure_window = (
            "Early morning 05:00-07:00 only "
            "before rain builds"
        )
    else:
        departure_window = (
            "Consider postponing — rain all day. "
            "If must drive: before dawn only"
        )

    # ── Max recommended speed ─────────────────────────
    if score >= 80:
        max_speed = "Normal speed limits apply"
    elif score >= 60:
        max_speed = "Reduce by 20% — max 50kmh hills"
    elif score >= 40:
        max_speed = "Max 40kmh — max 20kmh on bends"
    else:
        max_speed = "Max 20kmh — hazard lights on"

    return {
        "driving_score":     round(score, 1),
        "condition":         condition,
        "color_code":        color,
        "recommendation":    recommendation,
        "max_speed_advisory": max_speed,
        "best_departure_window": departure_window,
        "active_hazards":    hazards,
        "warnings":          warnings,
        "visibility_factor": visibility_factor,
        "aquaplaning_risk":  rain_mm > 15,
        "landslide_risk":    (
            rain_mm > 20 and
            terrain_type in ["mountain", "hilly",
                             "high_altitude"]
        ),
        "frost_risk":        temp_min < 5,
        "fog_risk":          code in [45, 48],
    }


# ─────────────────────────────────────────────
# ROUTE ANALYSER
# Checks each waypoint along the route
# ─────────────────────────────────────────────
async def analyse_route_conditions(
    waypoints: list,
    travel_start_date: str,
    travel_end_date: str,
    vehicle_type: str,
    driver_experience: str,
    night_driving: bool
) -> list:
    """
    Analyses driving conditions for each
    waypoint along the route.
    """
    if not waypoints:
        return []

    route_analysis = []

    for waypoint in waypoints:
        # Geocode the waypoint
        coords = await geocode_city(waypoint)
        if "error" in coords:
            route_analysis.append({
                "waypoint": waypoint,
                "error": f"Could not locate {waypoint}"
            })
            continue

        lat = coords["latitude"]
        lon = coords["longitude"]

        # Get elevation
        elevation_data = await fetch_elevation(lat, lon)
        elevation_m  = elevation_data.get(
            "elevation_m", 0)
        terrain_type = elevation_data.get(
            "terrain_type", "plains")

        # Get forecast for this waypoint
        forecast = await fetch_daily_trip_forecast(
            waypoint,
            travel_start_date,
            travel_end_date
        )

        # Guard: forecast[0] is a dict — check for
        # "error" key inside the dict, not via `in` on
        # the list (which checks list membership, not keys).
        # Also guard against empty list.
        forecast_failed = (
            not forecast or
            not isinstance(forecast, list) or
            (
                isinstance(forecast[0], dict) and
                "error" in forecast[0]
            )
        )
        if forecast_failed:
            route_analysis.append({
                "waypoint":    waypoint,
                "elevation_m": elevation_m,
                "terrain_type": terrain_type,
                "error": "Forecast unavailable"
            })
            continue

        # Score each day for this waypoint
        daily_scores = []
        for day in forecast:
            day_score = calculate_driving_score(
                day,
                elevation_m,
                terrain_type,
                vehicle_type,
                driver_experience,
                night_driving
            )
            daily_scores.append({
                "date":    day["date"],
                "score":   day_score
            })

        route_analysis.append({
            "waypoint":     waypoint,
            "elevation_m":  elevation_m,
            "terrain_type": terrain_type,
            "daily_scores": daily_scores,
            "worst_day":    min(
                daily_scores,
                key=lambda x: x["score"]["driving_score"]
            ),
            "best_day":     max(
                daily_scores,
                key=lambda x: x["score"]["driving_score"]
            )
        })

    return route_analysis
