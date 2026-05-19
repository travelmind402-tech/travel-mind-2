import httpx
import asyncio
import os
from dotenv import load_dotenv
from tools.weather_tool import (
    geocode_city,
    fetch_exchange_rate
)

load_dotenv()

FOURSQUARE_KEY  = os.getenv("FOURSQUARE_API_KEY")
GEOAPIFY_KEY    = os.getenv("GEOAPIFY_API_KEY")


# ─────────────────────────────────────────────
# TOOL 1 — Foursquare restaurant search
# ─────────────────────────────────────────────
async def search_restaurants_foursquare(
    city: str,
    budget_level: str = "all",
    limit: int = 10
) -> list:
    """
    Searches restaurants using Foursquare Places API.
    budget_level: cheap | moderate | expensive | all
    """
    try:
        coords = await geocode_city(city)
        if "error" in coords:
            return []

        lat = coords["latitude"]
        lon = coords["longitude"]

        # Map budget to Foursquare price levels 1-4
        price_map = {
            "cheap":     "1",
            "moderate":  "1,2",
            "expensive": "3,4",
            "all":       "1,2,3,4"
        }
        price = price_map.get(budget_level, "1,2,3,4")

        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.foursquare.com/v3/places/search",
                headers={
                    "Authorization": FOURSQUARE_KEY,
                    "Accept": "application/json"
                },
                params={
                    "ll":         f"{lat},{lon}",
                    "categories": "13000",  # Food category
                    "limit":      limit,
                    "sort":       "RATING",
                    "price":      price,
                    "fields": (
                        "name,location,rating,price,"
                        "hours,categories,photos,"
                        "stats,tips"
                    )
                }
            )
            data = r.json()
            results = data.get("results", [])

            restaurants = []
            for place in results:
                hours = place.get("hours", {})
                cats  = place.get("categories", [{}])
                photo = place.get("photos", [{}])

                restaurants.append({
                    "name":        place.get("name", ""),
                    "address":     place.get(
                        "location", {}).get(
                        "formatted_address", ""),
                    "rating":      place.get("rating", 0),
                    "price_level": place.get("price", 0),
                    "cuisine_type": cats[0].get(
                        "name", "") if cats else "",
                    "is_open_now": hours.get(
                        "open_now", None),
                    "opening_hours": hours.get(
                        "display", ""),
                    "photo_url": (
                        f"{photo[0].get('prefix', '')}"
                        f"300x200"
                        f"{photo[0].get('suffix', '')}"
                        if photo else ""
                    ),
                    "total_ratings": place.get(
                        "stats", {}).get(
                        "total_ratings", 0),
                    "source": "foursquare"
                })

            return restaurants

    except Exception as e:
        print(f"[CuisineTool] Foursquare error: {e}")
        return []


# ─────────────────────────────────────────────
# TOOL 2 — Geoapify restaurant + market search
# ─────────────────────────────────────────────
async def search_places_geoapify(
    city: str,
    place_type: str = "catering.restaurant",
    limit: int = 10
) -> list:
    """
    Searches places using Geoapify Places API.
    place_types:
      catering.restaurant  → restaurants
      catering.fast_food   → fast food
      catering.cafe        → cafes
      commercial.food      → food markets
      leisure.park         → parks near food areas
    """
    try:
        coords = await geocode_city(city)
        if "error" in coords:
            return []

        lat = coords["latitude"]
        lon = coords["longitude"]

        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.geoapify.com/v2/places",
                params={
                    "categories": place_type,
                    "filter":     (
                        f"circle:{lon},{lat},3000"
                    ),
                    "bias":       f"proximity:{lon},{lat}",
                    "limit":      limit,
                    "apiKey":     GEOAPIFY_KEY
                }
            )
            data = r.json()
            features = data.get("features", [])

            places = []
            for f in features:
                props = f.get("properties", {})
                places.append({
                    "name":         props.get("name", ""),
                    "address":      props.get(
                        "formatted", ""),
                    "cuisine":      props.get(
                        "catering", {}).get(
                        "cuisine", "local"),
                    "opening_hours": props.get(
                        "opening_hours", ""),
                    "website":      props.get(
                        "website", ""),
                    "phone":        props.get(
                        "contact", {}).get("phone", ""),
                    "category":     props.get(
                        "categories", [""])[0],
                    "lat":          props.get("lat", 0),
                    "lon":          props.get("lon", 0),
                    "source":       "geoapify"
                })

            return places

    except Exception as e:
        print(f"[CuisineTool] Geoapify error: {e}")
        return []


# ─────────────────────────────────────────────
# TOOL 3 — Food markets fetcher
# ─────────────────────────────────────────────
async def fetch_food_markets(city: str) -> list:
    """
    Fetches food markets and street food zones
    using Geoapify.
    """
    markets = await search_places_geoapify(
        city,
        place_type="commercial.food_and_drink",
        limit=5
    )

    cafes = await search_places_geoapify(
        city,
        place_type="catering.cafe",
        limit=5
    )

    return {
        "markets": markets,
        "cafes":   cafes
    }


# ─────────────────────────────────────────────
# TOOL 4 — Budget classifier (pure Python)
# ─────────────────────────────────────────────
def classify_budget_level(
    daily_budget_usd: float
) -> str:
    """
    Classifies daily budget into price tier.
    Used to filter restaurants appropriately.
    """
    if daily_budget_usd < 20:
        return "cheap"
    elif daily_budget_usd < 60:
        return "moderate"
    else:
        return "expensive"


# ─────────────────────────────────────────────
# TOOL 5 — Restaurant merger (pure Python)
# ─────────────────────────────────────────────
def merge_restaurant_data(
    foursquare_results: list,
    geoapify_results: list
) -> list:
    """
    Merges Foursquare and Geoapify results.
    Deduplicates by name similarity.
    Ranks by combined score.
    """
    merged = {}

    # Add Foursquare results first (higher quality)
    for r in foursquare_results:
        name = r.get("name", "").lower().strip()
        if name:
            merged[name] = r

    # Add Geoapify results if not already present
    for r in geoapify_results:
        name = r.get("name", "").lower().strip()
        if name and name not in merged:
            merged[name] = r
        elif name in merged:
            # Enrich existing with Geoapify data
            existing = merged[name]
            if not existing.get("opening_hours"):
                existing["opening_hours"] = r.get(
                    "opening_hours", "")
            if not existing.get("website"):
                existing["website"] = r.get(
                    "website", "")

    # Convert back to list and sort by rating
    result_list = list(merged.values())
    result_list.sort(
        key=lambda x: x.get("rating", 0),
        reverse=True
    )

    return result_list[:10]  # Top 10 only


# ─────────────────────────────────────────────
# TOOL 6 — Price level mapper (pure Python)
# ─────────────────────────────────────────────
def map_price_level_to_cost(
    price_level: int,
    currency_rate: float,
    currency_symbol: str
) -> str:
    """
    Maps Foursquare price level (1-4) to
    estimated cost per person in local currency.
    """
    # Base costs in USD per person
    usd_costs = {
        1: (3, 8),    # cheap: $3-8
        2: (8, 20),   # moderate: $8-20
        3: (20, 50),  # expensive: $20-50
        4: (50, 150)  # luxury: $50-150+
    }

    low, high = usd_costs.get(price_level, (5, 15))
    low_local  = round(low  * currency_rate)
    high_local = round(high * currency_rate)

    return (
        f"{currency_symbol}{low_local:,} - "
        f"{currency_symbol}{high_local:,}"
    )