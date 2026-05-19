import httpx
import asyncio
import os
import math
from datetime import datetime
from dotenv import load_dotenv
from tools.weather_tool import geocode_city

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
ORS_KEY      = os.getenv("OPENROUTESERVICE_KEY")


# ─────────────────────────────────────────────
# TOOL 1 — Booking.com hotel search
#          (via RapidAPI — FREE 100 calls/month)
# ─────────────────────────────────────────────
async def search_hotels_booking(
    city: str,
    check_in: str,
    check_out: str,
    max_price_usd: float = 100.0,
    adults: int = 1,
) -> list:
    if not RAPIDAPI_KEY:
        print("[BudgetTool] RAPIDAPI_KEY missing")
        return []

    try:
        async with httpx.AsyncClient(timeout=15) as client:

            # Step 1 — Search destination ID
            dest_r = await client.get(
                "https://booking-com15.p.rapidapi.com"
                "/api/v1/hotels/searchDestination",
                headers={
                    "X-RapidAPI-Key":  RAPIDAPI_KEY,
                    "X-RapidAPI-Host": "booking-com15.p.rapidapi.com"
                },
                params={"query": city}
            )

            print(f"[BudgetTool] Destination search "
                  f"status: {dest_r.status_code}")

            dest_data = dest_r.json().get("data", [])
            if not dest_data:
                print(f"[BudgetTool] No destination "
                      f"found for {city}")
                return []

            dest_id   = dest_data[0].get("dest_id", "")
            dest_type = dest_data[0].get(
                "dest_type", "city")

            print(f"[BudgetTool] Found destination: "
                  f"{dest_id} ({dest_type})")

            # Step 2 — Search hotels
            hotel_r = await client.get(
                "https://booking-com15.p.rapidapi.com"
                "/api/v1/hotels/searchHotels",
                headers={
                    "X-RapidAPI-Key":  RAPIDAPI_KEY,
                    "X-RapidAPI-Host": "booking-com15.p.rapidapi.com"
                },
                params={
                    "dest_id":          dest_id,
                    "search_type":      dest_type,
                    "arrival_date":     check_in,
                    "departure_date":   check_out,
                    "adults":           adults,
                    "room_qty":         1,
                    "page_number":      1,
                    "units":            "metric",
                    "temperature_unit": "c",
                    "languagecode":     "en-us",
                    "currency_code":    "USD",
                    "sort_by":          "popularity"
                }
            )

            print(f"[BudgetTool] Hotel search "
                  f"status: {hotel_r.status_code}")

            if hotel_r.status_code != 200:
                print(f"[BudgetTool] Hotel error: "
                      f"{hotel_r.text[:200]}")
                return []

            hotels_raw = hotel_r.json().get(
                "data", {}).get("hotels", [])

            print(f"[BudgetTool] Raw hotels found: "
                  f"{len(hotels_raw)}")

            hotels = []
            for h in hotels_raw[:10]:
                prop       = h.get("property", {})
                price_info = prop.get(
                    "priceBreakdown", {})
                gross      = price_info.get(
                    "grossPrice", {})
                price_val  = float(
                    gross.get("value", 0))

                # Skip if over budget
                if price_val > max_price_usd * 1.5:
                    continue

                hotels.append({
                    "name":              prop.get(
                        "name", ""),
                    "rating":            prop.get(
                        "reviewScore", 0),
                    "review_word":       prop.get(
                        "reviewScoreWord", ""),
                    "review_count":      prop.get(
                        "reviewCount", 0),
                    "price_usd":         round(
                        price_val, 2),
                    "price_per_night_usd": round(
                        price_val, 2),
                    "property_type":     prop.get(
                        "propertyClass", 0),
                    "photo_url":         prop.get(
                        "photoUrls", [""])[0],
                    "source":            "booking.com"
                })

            return sorted(
                hotels,
                key=lambda x: x["price_usd"]
            )[:5]

    except Exception as e:
        print(f"[BudgetTool] Booking.com error: {e}")
        return []


# ─────────────────────────────────────────────
# TOOL 2 — OpenRouteService transport
#          (FREE — no credit card needed)
# ─────────────────────────────────────────────
async def search_transport_ors(
    origin_city: str,
    destination_city: str
) -> dict:
    if not ORS_KEY:
        print("[BudgetTool] OPENROUTESERVICE_KEY missing "
              "— returning estimated transport only")

    try:
        # Geocode both cities
        origin_coords, dest_coords = await asyncio.gather(
            geocode_city(origin_city),
            geocode_city(destination_city)
        )

        if "error" in origin_coords or \
           "error" in dest_coords:
            return {
                "error":   "Could not geocode cities",
                "options": []
            }

        o_lat = origin_coords["latitude"]
        o_lon = origin_coords["longitude"]
        d_lat = dest_coords["latitude"]
        d_lon = dest_coords["longitude"]

        # Straight-line distance in km
        dlat    = math.radians(d_lat - o_lat)
        dlon    = math.radians(d_lon - o_lon)
        a       = (
            math.sin(dlat / 2) ** 2 +
            math.cos(math.radians(o_lat)) *
            math.cos(math.radians(d_lat)) *
            math.sin(dlon / 2) ** 2
        )
        dist_km = round(
            6371 * 2 * math.asin(math.sqrt(a)), 1
        )

        transport_options = []

        # ── Driving route via ORS ─────────────────────
        if ORS_KEY:
            try:
                async with httpx.AsyncClient(
                    timeout=15
                ) as client:
                    drive_r = await client.post(
                        "https://api.openrouteservice.org"
                        "/v2/directions/driving-car",
                        headers={
                            "Authorization": ORS_KEY,
                            "Content-Type":
                                "application/json"
                        },
                        json={
                            "coordinates": [
                                [o_lon, o_lat],
                                [d_lon, d_lat]
                            ]
                        }
                    )

                    if drive_r.status_code == 200:
                        route_data = drive_r.json()
                        summary    = route_data.get(
                            "routes", [{}]
                        )[0].get("summary", {})
                        dist_m     = summary.get(
                            "distance", 0)
                        duration_s = summary.get(
                            "duration", 0)
                        dist_road  = round(
                            dist_m / 1000, 1)
                        hours      = round(
                            duration_s / 3600, 1)

                        fuel_cost_usd = round(
                            (dist_road / 12) * 1.2, 2
                        )

                        transport_options.append({
                            "mode":     "car / taxi",
                            "distance_km":    dist_road,
                            "duration_hours": hours,
                            "price_usd":      fuel_cost_usd,
                            "notes":  (
                                "Fuel cost only. "
                                "Add tolls and taxi fare."
                            ),
                            "source": "openrouteservice"
                        })
            except Exception as e:
                print(f"[BudgetTool] ORS drive error: {e}")

        # ── Public transport estimates (pure Python) ──
        if dist_km < 500:
            bus_cost    = round(dist_km * 0.02, 2)
            bus_hours   = round(dist_km / 50, 1)
            train_cost  = round(dist_km * 0.015, 2)
            train_hours = round(dist_km / 80, 1)

            transport_options.append({
                "mode":           "bus",
                "distance_km":    dist_km,
                "duration_hours": bus_hours,
                "price_usd":      bus_cost,
                "notes": "Estimated local bus cost",
                "source": "estimated"
            })

            transport_options.append({
                "mode":           "train",
                "distance_km":    dist_km,
                "duration_hours": train_hours,
                "price_usd":      train_cost,
                "notes": (
                    "Estimated train cost. "
                    "Book on IRCTC for India."
                ),
                "source": "estimated"
            })

        # ── Flight estimate (long distance only) ──────
        if dist_km > 400:
            if dist_km < 1000:
                flight_cost = round(
                    50 + dist_km * 0.05, 2)
            else:
                flight_cost = round(
                    100 + dist_km * 0.04, 2)

            transport_options.append({
                "mode":           "flight",
                "distance_km":    dist_km,
                "duration_hours": round(
                    dist_km / 800, 1),
                "price_usd":      flight_cost,
                "notes": (
                    "Estimated budget airline price. "
                    "Check Google Flights for live prices."
                ),
                "source": "estimated"
            })

        # ── Walking (short distances only) ────────────
        if dist_km < 10:
            transport_options.append({
                "mode":           "walking",
                "distance_km":    dist_km,
                "duration_hours": round(dist_km / 5, 1),
                "price_usd":      0,
                "notes":          "Free option",
                "source":         "estimated"
            })

        return {
            "origin":      origin_city,
            "destination": destination_city,
            "distance_km": dist_km,
            "options":     sorted(
                transport_options,
                key=lambda x: x["price_usd"]
            )
        }

    except Exception as e:
        print(f"[BudgetTool] Transport error: {e}")
        return {"error": str(e), "options": []}


# ─────────────────────────────────────────────
# TOOL 3 — Trip days calculator (Pure Python)
# ─────────────────────────────────────────────
def calculate_trip_days(
    travel_start_date: str,
    travel_end_date: str
) -> int:
    """
    Calculates number of trip days from date strings.
    Returns minimum 1 day.
    """
    start = datetime.strptime(
        travel_start_date, "%Y-%m-%d")
    end   = datetime.strptime(
        travel_end_date, "%Y-%m-%d")
    return max((end - start).days, 1)


# ─────────────────────────────────────────────
# TOOL 4 — Budget tier classifier (Pure Python)
# ─────────────────────────────────────────────
def classify_budget_tier(
    daily_budget_usd: float,
    traveler_type: str = "solo"
) -> str:
    """
    Classifies daily budget into price tier.
    Adjusts thresholds based on traveler type.

    Returns: "backpacker" | "budget" |
             "mid_range"  | "luxury"
    """
    if traveler_type == "student":
        if daily_budget_usd < 15:
            return "backpacker"
        elif daily_budget_usd < 40:
            return "budget"
        elif daily_budget_usd < 100:
            return "mid_range"
        else:
            return "luxury"
    else:
        if daily_budget_usd < 20:
            return "backpacker"
        elif daily_budget_usd < 60:
            return "budget"
        elif daily_budget_usd < 150:
            return "mid_range"
        else:
            return "luxury"


# ─────────────────────────────────────────────
# TOOL 5 — Budget distribution calculator
#          (Pure Python)
# ─────────────────────────────────────────────
def calculate_budget_distribution(
    daily_budget_usd: float,
    traveler_type: str = "solo"
) -> dict:
    """
    Splits daily budget across categories.
    Students get more food allocation, less
    accommodation (use hostels).
    """
    if traveler_type == "student":
        food_pct      = 0.35
        accomm_pct    = 0.25
        transport_pct = 0.20
        activity_pct  = 0.15
        misc_pct      = 0.05
    elif traveler_type == "elderly":
        food_pct      = 0.25
        accomm_pct    = 0.45
        transport_pct = 0.15
        activity_pct  = 0.10
        misc_pct      = 0.05
    else:
        food_pct      = 0.30
        accomm_pct    = 0.40
        transport_pct = 0.15
        activity_pct  = 0.10
        misc_pct      = 0.05

    return {
        "accommodation": round(
            daily_budget_usd * accomm_pct, 2),
        "food":          round(
            daily_budget_usd * food_pct, 2),
        "transport":     round(
            daily_budget_usd * transport_pct, 2),
        "activities":    round(
            daily_budget_usd * activity_pct, 2),
        "misc":          round(
            daily_budget_usd * misc_pct, 2),
    }


# ─────────────────────────────────────────────
# TOOL 6 — Hidden cost estimator (Pure Python)
# ─────────────────────────────────────────────
def estimate_hidden_costs(
    city: str,
    trip_days: int,
    daily_budget_usd: float
) -> dict:
    """
    Estimates commonly missed travel costs.
    Returns amounts in USD.
    """
    return {
        "sim_card_usd":         5.0,
        "airport_transfer_usd": round(
            daily_budget_usd * 0.5, 2),
        "tips_per_day_usd":     round(
            daily_budget_usd * 0.03, 2),
        "total_tips_usd":       round(
            daily_budget_usd * 0.03 * trip_days, 2),
        "travel_insurance_usd": round(
            trip_days * 2.5, 2),
        "visa_fee_usd":         0,
        "total_hidden_usd":     round(
            5.0 +
            daily_budget_usd * 0.5 +
            daily_budget_usd * 0.03 * trip_days +
            trip_days * 2.5,
            2
        )
    }