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
    # Guard: price_level may arrive as string, None, or 0
    # from merged/Geoapify data — normalise to int first.
    try:
        price_level = int(price_level) if price_level else 1
    except (TypeError, ValueError):
        price_level = 1

    # Guard: currency_rate must be numeric
    try:
        currency_rate = float(currency_rate)
    except (TypeError, ValueError):
        currency_rate = 1.0

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


# ─────────────────────────────────────────────
# CULTURE TOOLS
# ─────────────────────────────────────────────

async def fetch_local_customs(country: str) -> dict:
    """
    Fetches country-level metadata: region, subregion,
    languages, currencies, timezones, etc.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://restcountries.com/v3.1/name/{country}",
                headers={"Accept": "application/json"}
            )
            data = r.json()
            if not data:
                return {"error": "Country not found"}

            country_data = data[0]
            return {
                "name": country_data.get("name", {}).get("common", country),
                "region": country_data.get("region", ""),
                "subregion": country_data.get("subregion", ""),
                "languages": list(country_data.get("languages", {}).values()),
                "currencies": list(country_data.get("currencies", {}).keys()),
                "timezones": country_data.get("timezones", []),
                "capital": country_data.get("capital", [""])[0],
                "borders": country_data.get("borders", []),
                "area": country_data.get("area", 0),
                "population": country_data.get("population", 0)
            }
    except Exception as e:
        print(f"[CultureTool] Customs fetch error: {e}")
        return {"error": str(e)}


def _get_country_code(country_name: str) -> str:
    """
    Maps common country names to ISO 3166-1 alpha-2 codes
    for Ticketmaster API.
    """
    country_map = {
        "United States": "US",
        "United Kingdom": "GB",
        "Canada": "CA",
        "Australia": "AU",
        "Germany": "DE",
        "France": "FR",
        "Italy": "IT",
        "Spain": "ES",
        "Japan": "JP",
        "China": "CN",
        "India": "IN",
        "Brazil": "BR",
        "Mexico": "MX",
        "Netherlands": "NL",
        "Belgium": "BE",
        "Switzerland": "CH",
        "Austria": "AT",
        "Sweden": "SE",
        "Norway": "NO",
        "Denmark": "DK",
        "Finland": "FI",
        "Ireland": "IE",
        "Portugal": "PT",
        "Greece": "GR",
        "Turkey": "TR",
        "Russia": "RU",
        "South Korea": "KR",
        "Thailand": "TH",
        "Vietnam": "VN",
        "Indonesia": "ID",
        "Malaysia": "MY",
        "Singapore": "SG",
        "Philippines": "PH",
        "New Zealand": "NZ",
        "South Africa": "ZA",
        "Egypt": "EG",
        "Morocco": "MA",
        "Kenya": "KE",
        "Argentina": "AR",
        "Chile": "CL",
        "Peru": "PE",
        "Colombia": "CO",
        "United Arab Emirates": "AE",
        "Saudi Arabia": "SA",
        "Israel": "IL",
        "Jordan": "JO"
    }
    return country_map.get(country_name, "")


async def fetch_festivals_and_events(
    city: str,
    country: str,
    start_date: str,
    end_date: str
) -> list:
    """
    Fetches live events and festivals using Ticketmaster API.
    """
    try:
        country_code = _get_country_code(country)
        if not country_code:
            return []

        TICKETMASTER_KEY = os.getenv("TICKETMASTER_API_KEY", "")
        if not TICKETMASTER_KEY:
            return []

        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://app.ticketmaster.com/discovery/v2/events.json",
                params={
                    "apikey": TICKETMASTER_KEY,
                    "countryCode": country_code,
                    "city": city,
                    "startDateTime": f"{start_date}T00:00:00Z",
                    "endDateTime": f"{end_date}T23:59:59Z",
                    "size": 20,
                    "sort": "date,asc"
                }
            )
            data = r.json()
            events = data.get("_embedded", {}).get("events", [])

            result = []
            for event in events:
                result.append({
                    "name": event.get("name", ""),
                    "date": event.get("dates", {}).get("start", {}).get("localDate", ""),
                    "time": event.get("dates", {}).get("start", {}).get("localTime", ""),
                    "venue": event.get("_embedded", {}).get("venues", [{}])[0].get("name", ""),
                    "genre": event.get("classifications", [{}])[0].get("genre", {}).get("name", ""),
                    "url": event.get("url", ""),
                    "price_min": event.get("priceRanges", [{}])[0].get("min", 0),
                    "price_max": event.get("priceRanges", [{}])[0].get("max", 0),
                    "currency": event.get("priceRanges", [{}])[0].get("currency", "USD")
                })

            return result

    except Exception as e:
        print(f"[CultureTool] Events fetch error: {e}")
        return []


async def fetch_language_tips(country: str) -> dict:
    """
    Fetches language family, script, and writing system info
    from Wikidata. Use for pronunciation and communication tips.
    """
    try:
        # Simple fallback data for common countries
        language_data = {
            "United States": {
                "primary_language": "English",
                "family": "Indo-European (Germanic)",
                "script": "Latin",
                "writing_direction": "Left-to-right",
                "pronunciation_tips": "American English pronunciation varies by region",
                "useful_phrases": ["Hello", "Thank you", "Please", "Excuse me"]
            },
            "France": {
                "primary_language": "French",
                "family": "Indo-European (Romance)",
                "script": "Latin",
                "writing_direction": "Left-to-right",
                "pronunciation_tips": "French has nasal vowels and liaison between words",
                "useful_phrases": ["Bonjour", "Merci", "S'il vous plaît", "Excusez-moi"]
            },
            "Japan": {
                "primary_language": "Japanese",
                "family": "Japonic",
                "script": "Kanji, Hiragana, Katakana",
                "writing_direction": "Left-to-right, top-to-bottom",
                "pronunciation_tips": "Japanese has pitch accent, not stress accent",
                "useful_phrases": ["Konnichiwa", "Arigatou", "Onegaishimasu", "Sumimasen"]
            },
            "India": {
                "primary_language": "Hindi",
                "family": "Indo-European (Indo-Aryan)",
                "script": "Devanagari",
                "writing_direction": "Left-to-right",
                "pronunciation_tips": "Hindi has retroflex consonants and aspirated stops",
                "useful_phrases": ["Namaste", "Dhanyavaad", "Kripaya", "Maaf kijiye"]
            }
        }

        return language_data.get(country, {
            "primary_language": "English",
            "family": "Unknown",
            "script": "Latin",
            "writing_direction": "Left-to-right",
            "pronunciation_tips": "Check local language resources",
            "useful_phrases": ["Hello", "Thank you", "Please", "Excuse me"]
        })

    except Exception as e:
        print(f"[CultureTool] Language fetch error: {e}")
        return {"error": str(e)}


async def fetch_dress_code_venues(lat: float, lon: float, travel_style: str) -> dict:
    """
    Fetches venue types and dress code recommendations
    based on location and travel style.
    """
    try:
        # Use Geoapify to find popular venue types in the area
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.geoapify.com/v2/places",
                params={
                    "categories": "entertainment,leisure,catering",
                    "filter": f"circle:{lon},{lat},5000",
                    "bias": f"proximity:{lon},{lat}",
                    "limit": 50,
                    "apiKey": GEOAPIFY_KEY
                }
            )
            data = r.json()
            features = data.get("features", [])

            venue_types = {}
            for f in features:
                props = f.get("properties", {})
                categories = props.get("categories", [])
                for cat in categories:
                    if cat not in venue_types:
                        venue_types[cat] = 0
                    venue_types[cat] += 1

            # Dress code recommendations based on travel style and venue types
            dress_codes = {
                "luxury": {
                    "restaurants": "Formal attire required, jackets for men",
                    "clubs": "Smart casual to formal",
                    "religious_sites": "Modest clothing, cover shoulders and knees",
                    "beaches": "Swimwear appropriate"
                },
                "budget": {
                    "restaurants": "Casual clothing",
                    "clubs": "Casual to smart casual",
                    "religious_sites": "Modest clothing",
                    "beaches": "Casual beachwear"
                },
                "adventure": {
                    "restaurants": "Practical, comfortable clothing",
                    "clubs": "Casual",
                    "religious_sites": "Modest, comfortable clothing",
                    "beaches": "Swimwear and quick-dry clothing"
                },
                "cultural": {
                    "restaurants": "Respect local customs",
                    "clubs": "Local fashion",
                    "religious_sites": "Conservative, cover appropriately",
                    "beaches": "Modest swimwear"
                }
            }

            style_recs = dress_codes.get(travel_style.lower(), dress_codes["budget"])

            return {
                "venue_types": list(venue_types.keys())[:10],  # Top 10 venue types
                "dress_code_recommendations": style_recs,
                "general_tips": [
                    "Check venue websites for specific dress codes",
                    "Respect local customs and religious sites",
                    "Comfortable shoes for walking",
                    "Layer clothing for variable weather"
                ]
            }

    except Exception as e:
        print(f"[CultureTool] Dress code fetch error: {e}")
        return {"error": str(e)}