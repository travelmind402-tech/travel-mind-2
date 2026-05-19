import httpx
import asyncio
import os
from dotenv import load_dotenv
import aiohttp
import aiohttp
from datetime import datetime, timedelta
load_dotenv()

OPENWEATHER_KEY = os.getenv("OPENWEATHER_API_KEY")
NCEI_TOKEN = os.getenv("NCEI_TOKEN")


# ─────────────────────────────────────────────
# TOOL 0 — Geocode city to lat/lon
# ─────────────────────────────────────────────
async def geocode_city(city: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://geocoding-api.open-meteo.com"
                "/v1/search",
                params={"name": city, "count": 1}
            )
            data = r.json()
            if not data.get("results"):
                return {
                    "error": f"City '{city}' not found",
                    "latitude": 0,
                    "longitude": 0
                }
            result = data["results"][0]
            return {
                "latitude": result["latitude"],
                "longitude": result["longitude"],
                "country": result.get("country", ""),
                "timezone": result.get("timezone", "auto")
            }
    except Exception as e:
        return {
            "error": str(e),
            "latitude": 0,
            "longitude": 0
        }


# ─────────────────────────────────────────────
# TOOL 1 — Real-time forecast (OpenWeatherMap)
# ─────────────────────────────────────────────
async def call_openweathermap(city: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.openweathermap.org"
                "/data/2.5/forecast",
                params={
                    "q": city,
                    "appid": OPENWEATHER_KEY,
                    "units": "metric"
                }
            )
            data = r.json()

            if data.get("cod") != "200":
                return {
                    "error": data.get("message",
                                      "API error")
                }

            items = data.get("list", [])

            # Precipitation next 24h / 48h / 72h
            rain_24h = sum(
                i.get("rain", {}).get("3h", 0)
                for i in items[:8]
            )
            rain_48h = sum(
                i.get("rain", {}).get("3h", 0)
                for i in items[:16]
            )
            rain_72h = sum(
                i.get("rain", {}).get("3h", 0)
                for i in items[:24]
            )

            current = items[0] if items else {}
            alerts  = data.get("alerts", [])

            return {
                "temperature_c": {
                    "current": current.get(
                        "main", {}).get("temp"),
                    "min": current.get(
                        "main", {}).get("temp_min"),
                    "max": current.get(
                        "main", {}).get("temp_max"),
                },
                "feels_like_c": current.get(
                    "main", {}).get("feels_like"),
                "humidity_percent": current.get(
                    "main", {}).get("humidity"),
                "wind_speed_kmh": round(
                    current.get("wind", {})
                           .get("speed", 0) * 3.6, 1
                ),
                "conditions": current.get(
                    "weather", [{}])[0]
                    .get("description", ""),
                "visibility_km": round(
                    current.get("visibility", 0) / 1000, 1
                ),
                "precipitation_mm": {
                    "next_24h": round(rain_24h, 1),
                    "next_48h": round(rain_48h, 1),
                    "next_72h": round(rain_72h, 1),
                },
                "severe_weather_alerts": [
                    a.get("event") for a in alerts
                ],
                "forecast_7day": [
                    {
                        "datetime": i.get("dt_txt"),
                        "temp": i.get(
                            "main", {}).get("temp"),
                        "rain_mm": i.get(
                            "rain", {}).get("3h", 0),
                        "conditions": i.get(
                            "weather", [{}])[0]
                            .get("description", "")
                    }
                    for i in items[::8]
                ]
            }
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────
# TOOL 2 — Historical precipitation
#          (Open-Meteo Archive — FREE, no key)
# ─────────────────────────────────────────────
async def fetch_historical_precipitation(
    lat: float,
    lon: float,
    travel_month_start: str,
    travel_month_end: str
) -> dict:
    """
    Fetches same-month precipitation data for the
    past 20 years from Open-Meteo Archive.
    travel_month_start format: "YYYY-MM-DD"
    """
    try:
        from datetime import datetime
        import calendar

        start_dt = datetime.strptime(
            travel_month_start, "%Y-%m-%d"
        )
        end_dt = datetime.strptime(
            travel_month_end, "%Y-%m-%d"
        )
        travel_month = start_dt.month
        current_year = datetime.now().year

        all_precip   = []
        yearly_data  = {}
        high_rain_days   = 0   # > 50mm
        flood_level_days = 0   # > 100mm
        fog_days         = 0   # weathercode 45 or 48

        async with httpx.AsyncClient(timeout=30) as client:
            for yr in range(current_year - 20, current_year):
                last_day = calendar.monthrange(
                    yr, travel_month)[1]
                s = f"{yr}-{travel_month:02d}-01"
                e = f"{yr}-{travel_month:02d}-{last_day}"

                r = await client.get(
                    "https://archive-api.open-meteo.com"
                    "/v1/archive",
                    params={
                        "latitude":  lat,
                        "longitude": lon,
                        "start_date": s,
                        "end_date":   e,
                        "daily": (
                            "precipitation_sum,"
                            "weathercode,"
                            "windspeed_10m_max,"
                            "temperature_2m_max,"
                            "temperature_2m_min"
                        ),
                        "timezone": "auto"
                    }
                )
                yr_data = r.json()
                daily   = yr_data.get("daily", {})

                precip  = daily.get(
                    "precipitation_sum", [])
                codes   = daily.get("weathercode", [])
                tmax    = daily.get(
                    "temperature_2m_max", [])

                yr_total = 0
                for i, val in enumerate(precip):
                    if val is None:
                        continue
                    all_precip.append(val)
                    yr_total += val
                    if val > 50:
                        high_rain_days += 1
                    if val > 100:
                        flood_level_days += 1

                # Count fog days
                for code in codes:
                    if code in [45, 48]:
                        fog_days += 1

                yearly_data[yr] = {
                    "total_mm": round(yr_total, 1),
                    "max_single_day_mm": round(
                        max(
                            (v for v in precip
                             if v is not None),
                            default=0
                        ), 1
                    ),
                    "high_rain_days": sum(
                        1 for v in precip
                        if v is not None and v > 50
                    )
                }

        if not all_precip:
            return {"error": "No historical data returned"}

        avg_daily   = sum(all_precip) / len(all_precip)
        max_daily   = max(all_precip)
        total_days  = len(all_precip)
        flood_prob  = round(
            (flood_level_days / total_days) * 100, 1
        ) if total_days > 0 else 0

        worst_year = max(
            yearly_data,
            key=lambda y: yearly_data[y]["total_mm"]
        )

        import statistics
        try:
            std = statistics.stdev(all_precip)
            if std < 5:
                variability = "low"
            elif std < 15:
                variability = "medium"
            elif std < 30:
                variability = "high"
            else:
                variability = "extreme"
        except Exception:
            variability = "unknown"

        return {
            "years_analyzed": list(yearly_data.keys()),
            "yearly_breakdown": yearly_data,
            "avg_daily_rainfall_mm": round(avg_daily, 1),
            "max_single_day_rainfall_mm": round(max_daily, 1),
            "high_rain_days_over_50mm": high_rain_days,
            "flood_level_days_over_100mm": flood_level_days,
            "fog_days_count": fog_days,
            "flood_probability_percent": flood_prob,
            "rainfall_variability": variability,
            "worst_year": worst_year,
            "worst_year_total_mm": yearly_data[worst_year][
                "total_mm"
            ],
            "total_days_analyzed": total_days,
            "source": "open-meteo-archive"
        }

    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────
# TOOL 3 — ReliefWeb disaster history
#          (UN OCHA — FREE, no key)
# ─────────────────────────────────────────────
async def fetch_reliefweb_disasters(
    country: str,
    disaster_types: list
) -> list:
    try:
        from datetime import datetime, timedelta
        twenty_years_ago = (
            datetime.now() - timedelta(days=7300)
        ).strftime("%Y-%m-%dT00:00:00+00:00")

        results = []

        async with httpx.AsyncClient(timeout=10) as client:
            for dtype in disaster_types:
                r = await client.get(
                    "https://api.reliefweb.int"
                    "/v1/disasters",
                    params={
                        "appname": "travelmind",
                        "filter[operator]": "AND",
                        "filter[conditions][0][field]":
                            "country.name",
                        "filter[conditions][0][value]":
                            country,
                        "filter[conditions][1][field]":
                            "type.name",
                        "filter[conditions][1][value]":
                            dtype,
                        "filter[conditions][2][field]":
                            "date.created",
                        "filter[conditions][2]"
                        "[value][from]":
                            twenty_years_ago,
                        "limit": 10,
                        "sort[]": "date.created:desc",
                        "fields[include][]": [
                            "name", "date",
                            "type", "status"
                        ]
                    }
                )
                data = r.json()
                for d in data.get("data", []):
                    fields = d.get("fields", {})
                    results.append({
                        "name": fields.get("name", ""),
                        "date": fields.get(
                            "date", {}).get(
                            "created", "")[:10],
                        "type": dtype,
                        "status": fields.get(
                            "status", "")
                    })

        return results

    except Exception as e:
        return [{"error": str(e)}]


# ─────────────────────────────────────────────
# TOOL 4 — NOAA NCEI station data
#          (free, requires free token)
# ─────────────────────────────────────────────
async def fetch_ncei_station_data(
    lat: float,
    lon: float,
    travel_month_start: str,
    travel_month_end: str
) -> dict:
    if not NCEI_TOKEN:
        return {
            "error": "No NCEI token configured",
            "source": "ncei-skipped"
        }
    try:
        from datetime import datetime
        import calendar

        start_dt = datetime.strptime(
            travel_month_start, "%Y-%m-%d"
        )
        current_year = datetime.now().year
        travel_month = start_dt.month

        # Find nearest station first
        async with httpx.AsyncClient(timeout=10) as client:
            station_r = await client.get(
                "https://www.ncdc.noaa.gov"
                "/cdo-web/api/v2/stations",
                headers={"token": NCEI_TOKEN},
                params={
                    "datasetid": "GHCND",
                    "extent": (
                        f"{lat-1},{lon-1},"
                        f"{lat+1},{lon+1}"
                    ),
                    "limit": 1,
                    "sortfield": "datacoverage",
                    "sortorder": "desc"
                }
            )
            station_data = station_r.json()
            stations = station_data.get("results", [])

            if not stations:
                return {
                    "error": "No nearby NCEI station found",
                    "source": "ncei"
                }

            station_id = stations[0]["id"]
            all_precip = []

            for yr in range(
                current_year - 20, current_year
            ):
                last_day = calendar.monthrange(
                    yr, travel_month)[1]
                s = f"{yr}-{travel_month:02d}-01"
                e = (f"{yr}-{travel_month:02d}"
                     f"-{last_day}")

                data_r = await client.get(
                    "https://www.ncdc.noaa.gov"
                    "/cdo-web/api/v2/data",
                    headers={"token": NCEI_TOKEN},
                    params={
                        "datasetid":  "GHCND",
                        "stationid":  station_id,
                        "startdate":  s,
                        "enddate":    e,
                        "datatypeid": "PRCP",
                        "limit":      31,
                        "units":      "metric"
                    }
                )
                yr_data = data_r.json()
                for item in yr_data.get("results", []):
                    val = item.get("value", 0)
                    # NCEI PRCP is in tenths of mm
                    all_precip.append(val / 10)

        if not all_precip:
            return {
                "error": "No NCEI precipitation data",
                "source": "ncei"
            }

        return {
            "station_id": station_id,
            "years_analyzed": 20,
            "avg_daily_precip_mm": round(
                sum(all_precip) / len(all_precip), 1
            ),
            "max_daily_precip_mm": round(
                max(all_precip), 1
            ),
            "high_rain_days": sum(
                1 for v in all_precip if v > 50
            ),
            "source": "ncei"
        }

    except Exception as e:
        return {"error": str(e), "source": "ncei"}

# ─────────────────────────────────────────────
# TOOL 5 — Health, UV, and Pollen Data
#          (Open-Meteo Air Quality — FREE, no key)
# ─────────────────────────────────────────────
async def fetch_health_and_pollen_data(lat: float, lon: float) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://air-quality-api.open-meteo.com/v1/air-quality",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "pm10,pm2_5,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen,uv_index",
                    "timezone": "auto"
                }
            )
            data = r.json()
            hourly = data.get("hourly", {})

            # Helper function to get the maximum value for the upcoming days
            def get_max(key):
                vals = [v for v in hourly.get(key, []) if v is not None]
                return round(max(vals), 1) if vals else 0

            return {
                "air_quality": {
                    "pm10_max_ug_m3": get_max("pm10"),
                    "pm2_5_max_ug_m3": get_max("pm2_5")
                },
                "pollen_count_max_grains_m3": {
                    "alder": get_max("alder_pollen"),
                    "birch": get_max("birch_pollen"),
                    "grass": get_max("grass_pollen"),
                    "mugwort": get_max("mugwort_pollen"),
                    "olive": get_max("olive_pollen"),
                    "ragweed": get_max("ragweed_pollen")
                },
                "uv_index_max": get_max("uv_index"),
                "source": "open-meteo-air-quality"
            }
    except Exception as e:
        return {"error": str(e), "source": "open-meteo-air-quality"}
    
# ─────────────────────────────────────────────
# TOOL 6 — Route Forecast (Batch Waypoints)
# ─────────────────────────────────────────────
async def fetch_route_forecast(waypoints: list) -> list:
    """
    Fetches a simple forecast for multiple cities in parallel.
    Used for the Journey Timeline.
    """
    if not waypoints:
        return []

    # We reuse your existing call_openweathermap function!
    tasks = [call_openweathermap(city) for city in waypoints]
    responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    route_results = []
    for i, city_name in enumerate(waypoints):
        data = responses[i]
        if isinstance(data, Exception) or "error" in data:
            route_results.append({"location": city_name, "error": "Data unavailable"})
        else:
            route_results.append({
                "location": city_name,
                "temp": data.get("temperature_c", {}).get("current"),
                "conditions": data.get("conditions"),
                "alerts": data.get("severe_weather_alerts", [])
            })
    return route_results

# ─────────────────────────────────────────────
# TOOL 7 — Mosquito Activity Calculator (BIO-LOGIC)
# ─────────────────────────────────────────────
def calculate_mosquito_risk(temp: float, humidity: float, precip_last_7d: float, wind_speed: float) -> str:
    """
    Biological model for mosquito activity thresholds.
    """
    score = 0
    # Temperature Score (Mosquitoes love 20-30°C)
    if 15 <= temp <= 35: score += 1
    if 25 <= temp <= 30: score += 1
    
    # Humidity Score (Higher humidity = Higher activity)
    if humidity > 60: score += 1
    if humidity > 80: score += 1
    
    # Rainfall Score (Stagnant water pools)
    if precip_last_7d > 10: score += 1
    
    # Wind Penalty (They can't fly in wind > 15km/h)
    if wind_speed > 15: score -= 2

    if score >= 4: return "PEAK (High activity & breeding risk)"
    if score >= 2: return "MODERATE (Active during dawn/dusk)"
    return "LOW (Minimal activity)"

# ─────────────────────────────────────────────
# TOOL 8 — Global Epidemic Intelligence
# ─────────────────────────────────────────────
async def fetch_health_outbreaks(country: str) -> list:
    """
    Specifically hunts for active epidemics and health crises using ReliefWeb v2.
    """
    # 1. Using v2 is the standard for 2026
    url = "https://api.reliefweb.int/v2/reports"
    
    params = {
        "appname": "travelmind",
        # 2. Use primary_country for accuracy and wrap in quotes for names with spaces
        "query[value]": f'primary_country.name:"{country}" AND (Dengue OR Malaria OR Cholera OR Outbreak OR Ebola OR Zika)',
        "filter[field]": "primary_type.name",
        "filter[value]": "Epidemic",
        "limit": 3,
        "sort[]": "date:created:desc",
        # 3. CRITICAL: Tell the API to actually include the date fields in the response
        "fields[include][]": ["title", "date.created", "url"] 
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as resp:
                if resp.status != 200:
                    return []
                
                data = await resp.json()
                results = []
                
                for r in data.get("data", []):
                    fields = r.get("fields", {})
                    results.append({
                        "outbreak_report": fields.get("title", "No Title"),
                        # Safely access the nested date object
                        "date": fields.get("date", {}).get("created", "Unknown Date")
                    })
                return results
    except Exception as e:
        print(f"[HealthTool] Error fetching ReliefWeb: {e}")
        return []
    
# ─────────────────────────────────────────────
# TOOL 8 — USGS Seismic Intelligence (20-Year History)
# ─────────────────────────────────────────────
async def fetch_historical_seismic_data(lat: float, lon: float, radius_km: int = 100) -> dict:
    """
    Scans the USGS database for Magnitude 4.5+ events within 100km over the last 20 years.
    Targeting: Ground displacement, aftershocks, and magnitude patterns.
    """
    end_time = datetime.now().strftime("%Y-%m-%d")
    start_time = (datetime.now() - timedelta(days=20*365)).strftime("%Y-%m-%d")
    
    # API: https://earthquake.usgs.gov/fdsnws/event/1/
    url = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    params = {
        "format": "geojson",
        "starttime": start_time,
        "endtime": end_time,
        "latitude": lat,
        "longitude": lon,
        "maxradiuskm": radius_km,
        "minmagnitude": 4.5,
        "orderby": "magnitude"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as resp:
                data = await resp.json()
                features = data.get("features", [])
                
                return {
                    "total_significant_events": len(features),
                    "max_magnitude": features[0]["properties"]["mag"] if features else 0,
                    "recent_aftershocks_30d": len([f for f in features if f["properties"]["time"] > (datetime.now().timestamp() - 2592000)*1000]),
                    "notable_events": [
                        {
                            "mag": f["properties"]["mag"],
                            "place": f["properties"]["place"],
                            "time": datetime.fromtimestamp(f["properties"]["time"]/1000).strftime('%Y-%m-%d')
                        } for f in features[:3] # Top 3 for context
                    ]
                }
    except Exception as e:
        return {"error": f"Seismic fetch failed: {e}"}

# ─────────────────────────────────────────────
# TOOL 9 — NASA FIRMS Real-time Fire Detection
# ─────────────────────────────────────────────
async def fetch_realtime_fires(lat: float, lon: float) -> list:
    """
    Uses NASA VIIRS satellites to detect thermal anomalies (fires) in a 1-degree box.
    Requires NASA_FIRMS_MAP_KEY in .env.
    """
    map_key = os.getenv("NASA_FIRMS_MAP_KEY")
    if not map_key:
        return [{"error": "NASA_FIRMS_MAP_KEY missing in .env"}]

    # Define a bounding box (~111km around the point)
    west, south = lon - 0.5, lat - 0.5
    east, north = lon + 0.5, lat + 0.5
    area = f"{west},{south},{east},{north}"
    
    # NASA FIRMS API Version 2 (JSON)
    # Source: VIIRS_SNPP_NRT (Higher resolution than MODIS)
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/json/{map_key}/VIIRS_SNPP_NRT/{area}/1"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
                
                # Filter for high-confidence fires only
                return [
                    {
                        "latitude": f["latitude"],
                        "longitude": f["longitude"],
                        "intensity_frp": f["frp"], # Fire Radiative Power
                        "confidence": f["confidence"],
                        "is_night": f["daynight"] == "N"
                    } for f in data if f.get("confidence") in ['n', 'h']
                ]
    except Exception:
        return []
    


# ─────────────────────────────────────────────
# TOOL 10 — Detailed trip forecast extractor
# ─────────────────────────────────────────────
async def fetch_daily_trip_forecast(
    city: str,
    travel_start_date: str,
    travel_end_date: str
) -> list:
    """
    Fetches a clean day-by-day forecast between
    travel start and end dates.
    Returns one entry per day with weather quality score.

    Open-Meteo /v1/forecast only covers today + 16 days.
    Dates beyond that window are clamped to day-16.
    Past dates are fetched from the archive API instead.
    """
    try:
        coords = await geocode_city(city)
        lat = coords.get("latitude", 0)
        lon = coords.get("longitude", 0)

        # Only fail if we truly have no coordinates
        if lat == 0 and lon == 0:
            print(f"[ForecastTool] Geocode failed for '{city}': {coords.get('error', 'unknown')}")
            return [{"error": f"Could not geocode city: {city}"}]

        today      = datetime.now().date()
        start_dt   = datetime.strptime(
            travel_start_date, "%Y-%m-%d").date()
        end_dt     = datetime.strptime(
            travel_end_date, "%Y-%m-%d").date()

        # ── Open-Meteo forecast cap: today + 16 days ──
        forecast_cap = today + timedelta(days=16)

        # Clamp: if the whole trip is in the past,
        # use archive API for all days.
        # If partially future, clamp end to cap.
        effective_start = max(start_dt, today)
        effective_end   = min(end_dt, forecast_cap)

        # If travel dates are entirely in the past or
        # entirely beyond 16 days, we cannot get a
        # real forecast — return synthetic placeholders
        # so daily_scores is never empty.
        if effective_start > effective_end:
            print(
                f"[ForecastTool] Dates outside forecast "
                f"window ({travel_start_date} to "
                f"{travel_end_date}). "
                f"Generating neutral placeholders."
            )
            days_count = (end_dt - start_dt).days + 1
            placeholder_days = []
            for i in range(days_count):
                day_date = (
                    start_dt + timedelta(days=i)
                ).isoformat()
                placeholder_days.append({
                    "date":                day_date,
                    "outdoor_score":       60.0,
                    "day_type":            "good",
                    "outdoor_recommended": True,
                    "rain_mm":             0,
                    "rain_hours":          0,
                    "rain_window":         "minimal",
                    "temp_max_c":          28,
                    "temp_min_c":          18,
                    "wind_kmh":            15,
                    "uv_index":            5,
                    "weather_code":        1,
                    "sunrise":             "",
                    "sunset":              "",
                    "_placeholder":        True,
                    "_reason":             (
                        "Travel dates outside "
                        "Open-Meteo 16-day forecast window"
                    ),
                })
            return placeholder_days

        # Use clamped dates for the API call
        api_start = effective_start.isoformat()
        api_end   = effective_end.isoformat()

        if api_end != travel_end_date:
            print(
                f"[ForecastTool] End date clamped "
                f"{travel_end_date} -> {api_end} "
                f"(16-day forecast limit)"
            )

        async with httpx.AsyncClient(timeout=15) as client:
            params = {
                "latitude":   lat,
                "longitude":  lon,
                "daily": [
                    "precipitation_sum",
                    "precipitation_hours",
                    "weathercode",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "windspeed_10m_max",
                    "uv_index_max",
                    "sunrise",
                    "sunset"
                ],
                "timezone":   "auto",
                "start_date": api_start,
                "end_date":   api_end,
            }

            print(f"[ForecastTool] Calling Open-Meteo...")
            print(f"[ForecastTool] lat={lat} lon={lon}")
            print(f"[ForecastTool] dates: {api_start} to {api_end}")

            r = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params=params
            )

            print(f"[ForecastTool] Status: {r.status_code}")
            data = r.json()
            print(f"[ForecastTool] Response keys: {list(data.keys())}")

            # Open-Meteo returns {"reason": "...", "error": true}
            # when dates are invalid — catch it explicitly.
            if data.get("error"):
                print(
                    f"[ForecastTool] API error: "
                    f"{data.get('reason', 'unknown')}"
                )
                return []

            daily = data.get("daily", {})
            print(f"[ForecastTool] Daily keys: {list(daily.keys())}")
            print(f"[ForecastTool] Dates found: {daily.get('time', [])}")

            dates        = daily.get("time", [])
            precip       = daily.get("precipitation_sum", [])
            precip_hours = daily.get("precipitation_hours", [])
            codes        = daily.get("weathercode", [])
            tmax         = daily.get("temperature_2m_max", [])
            tmin         = daily.get("temperature_2m_min", [])
            wind         = daily.get("windspeed_10m_max", [])
            uv           = daily.get("uv_index_max", [])
            sunrise      = daily.get("sunrise", [])
            sunset       = daily.get("sunset", [])

            days = []
            for i, date in enumerate(dates):

                rain_mm    = precip[i]       if i < len(precip)       else 0
                rain_hrs   = precip_hours[i] if i < len(precip_hours) else 0
                code       = codes[i]        if i < len(codes)        else 0
                temp_max   = tmax[i]         if i < len(tmax)         else 25
                temp_min   = tmin[i]         if i < len(tmin)         else 15
                wind_spd   = wind[i]         if i < len(wind)         else 0
                uv_val     = uv[i]           if i < len(uv)           else 0
                sun_rise   = sunrise[i]      if i < len(sunrise)      else ""
                sun_set    = sunset[i]       if i < len(sunset)       else ""

                # ── Weather quality score (0-100) ──────────
                # 100 = perfect outdoor day
                # 0   = terrible outdoor day
                score = 100

                # Rain penalty
                if rain_mm > 0:
                    score -= min(rain_mm * 2, 40)

                # Rain hours penalty
                if rain_hrs > 4:
                    score -= 20
                elif rain_hrs > 2:
                    score -= 10

                # Storm/heavy weather codes penalty
                # WMO codes 61-99 = rain, storms, snow
                if code >= 80:
                    score -= 30
                elif code >= 61:
                    score -= 20
                elif code >= 51:
                    score -= 10

                # Extreme heat penalty (>40°C)
                if temp_max > 40:
                    score -= 20
                elif temp_max > 35:
                    score -= 10

                # Strong wind penalty
                if wind_spd > 60:
                    score -= 15
                elif wind_spd > 40:
                    score -= 5

                score = max(0, min(100, score))

                # ── Day classification ─────────────────────
                if score >= 75:
                    day_type = "excellent"
                    outdoor_recommended = True
                elif score >= 50:
                    day_type = "good"
                    outdoor_recommended = True
                elif score >= 30:
                    day_type = "poor"
                    outdoor_recommended = False
                else:
                    day_type = "bad"
                    outdoor_recommended = False

                # ── Rain window detection ──────────────────
                # Classify when rain hits during the day
                if rain_hrs <= 2:
                    rain_window = "minimal"
                elif rain_hrs <= 6:
                    rain_window = "morning_or_evening"
                elif rain_hrs <= 12:
                    rain_window = "half_day"
                else:
                    rain_window = "all_day"

                days.append({
                    "date":                 date,
                    "outdoor_score":        round(score, 1),
                    "day_type":             day_type,
                    "outdoor_recommended":  outdoor_recommended,
                    "rain_mm":              rain_mm   or 0,
                    "rain_hours":           rain_hrs  or 0,
                    "rain_window":          rain_window,
                    "temp_max_c":           temp_max,
                    "temp_min_c":           temp_min,
                    "wind_kmh":             wind_spd  or 0,
                    "uv_index":             uv_val    or 0,
                    "weather_code":         code,
                    "sunrise":              sun_rise,
                    "sunset":               sun_set,
                })

            return days

    except Exception as e:
        return [{"error": str(e)}]
    
# ─────────────────────────────────────────────
# TOOL 11 — Live exchange rate fetcher
#           (exchangerate.host — FREE, no key)
# ─────────────────────────────────────────────
async def fetch_exchange_rate(
    from_currency: str = "USD",
    to_currency: str = "INR"
) -> dict:
    """
    Fetches live exchange rate between two currencies.
    Completely free, no API key needed.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.exchangerate-api.com/v4/latest/USD"
            )
            data = r.json()
            rates = data.get("rates", {})

            to_rate   = rates.get(to_currency, 1)
            from_rate = rates.get(from_currency, 1)

            # Convert: from_currency → USD → to_currency
            rate = to_rate / from_rate

            return {
                "from":       from_currency,
                "to":         to_currency,
                "rate":       round(rate, 4),
                "source":     "exchangerate-api.com",
                "example":    f"1 {from_currency} = "
                              f"{round(rate, 2)} {to_currency}"
            }
    except Exception as e:
        # Fallback hardcoded rates if API fails
        fallback_rates = {
            "INR":  83.5,
            "EUR":  0.92,
            "GBP":  0.79,
            "JPY":  149.5,
            "AUD":  1.53,
            "CAD":  1.36,
            "SGD":  1.34,
            "THB":  35.1,
            "BDT":  110.0,
            "NPR":  133.5,
        }
        rate = fallback_rates.get(to_currency, 1.0)
        return {
            "from":    from_currency,
            "to":      to_currency,
            "rate":    rate,
            "source":  "fallback_hardcoded",
            "example": f"1 {from_currency} = "
                       f"{rate} {to_currency}",
            "warning": f"Live rate fetch failed: {str(e)}"
        }
