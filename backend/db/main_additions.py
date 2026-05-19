# ─────────────────────────────────────────────────────────────────────────────
# ADD THESE IMPORTS at the top of main.py (alongside existing imports)
# ─────────────────────────────────────────────────────────────────────────────
import json
import uuid
from db.database import init_db
from db.trip_store import create_trip, save_weather, get_weather, get_trip, list_user_trips
from models.schemas import TripCreateRequest


# ─────────────────────────────────────────────────────────────────────────────
# ADD THIS STARTUP EVENT right after app = FastAPI(...) and middleware setup
# ─────────────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await init_db()


# ─────────────────────────────────────────────────────────────────────────────
# NEW ENDPOINTS — paste these at the bottom of main.py
# ─────────────────────────────────────────────────────────────────────────────

# POST /session/create
@app.post("/session/create")
async def session_create(request: TripCreateRequest):
    user_id = str(uuid.uuid4())

    trip_id = await create_trip(
        user_id=user_id,
        city=request.city,
        country=request.country,
        date_from=request.travel_start_date,
        date_to=request.travel_end_date,
        traveler_type=request.traveler_type,
        family_members=request.family_members,
        known_allergies=request.known_allergies,
        transit_waypoints=request.transit_waypoints,
    )

    return {"user_id": user_id, "trip_id": trip_id}


# POST /session/{trip_id}/weather
@app.post("/session/{trip_id}/weather")
async def session_weather(trip_id: str):
    trip = await get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    weather = await run_weather_agent(
        city=trip["city"],
        country=trip["country"],
        travel_start_date=trip["date_from"],
        travel_end_date=trip["date_to"],
        traveler_type=trip["traveler_type"],
        family_members=trip["family_members"],
        known_allergies=trip["known_allergies"],
        transit_waypoints=trip["transit_waypoints"],
    )

    await save_weather(trip_id, weather)

    return weather


# POST /session/{trip_id}/disruption
@app.post("/session/{trip_id}/disruption")
async def session_disruption(trip_id: str):
    trip = await get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    weather = await get_weather(trip_id)

    result = await run_disruption_agent(
        city=trip["city"],
        country=trip["country"],
        travel_month=trip["date_from"][5:7],   # "YYYY-MM-DD" → "MM"
        travel_year=trip["date_from"][:4],      # "YYYY-MM-DD" → "YYYY"
        traveler_type=trip["traveler_type"],
        weather_context=weather,
    )
    return result


# POST /session/{trip_id}/driving
@app.post("/session/{trip_id}/driving")
async def session_driving(trip_id: str):
    trip = await get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    weather = await get_weather(trip_id)

    result = await run_driving_agent(
        city=trip["city"],
        country=trip["country"],
        travel_start_date=trip["date_from"],
        travel_end_date=trip["date_to"],
        traveler_type=trip["traveler_type"],
        route_waypoints=trip["transit_waypoints"],
        vehicle_type="car",
        driver_experience="intermediate",
        night_driving=False,
        weather_context=weather,
    )
    return result


# POST /session/{trip_id}/cuisine
@app.post("/session/{trip_id}/cuisine")
async def session_cuisine(trip_id: str):
    trip = await get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    weather = await get_weather(trip_id)

    result = await run_cuisine_agent(
        city=trip["city"],
        country=trip["country"],
        travel_start_date=trip["date_from"],
        travel_end_date=trip["date_to"],
        traveler_type=trip["traveler_type"],
        family_members=trip["family_members"],
        known_allergies=trip["known_allergies"],
        daily_budget_usd=50.0,
        currency="USD",
        dietary_restrictions=[],
        cuisine_preferences="all",
        group_size=1,
        weather_context=weather,
    )
    return result


# POST /session/{trip_id}/culture
@app.post("/session/{trip_id}/culture")
async def session_culture(trip_id: str):
    trip = await get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    weather = await get_weather(trip_id)

    result = await run_culture_agent(
        city=trip["city"],
        country=trip["country"],
        travel_start_date=trip["date_from"],
        travel_end_date=trip["date_to"],
        traveler_type=trip["traveler_type"],
        family_members=trip["family_members"],
        known_allergies=trip["known_allergies"],
        travel_style="general",
        group_size=1,
        known_sensitivities=[],
        weather_context=weather,
    )
    return result


# GET /session/{trip_id}
@app.get("/session/{trip_id}")
async def session_get(trip_id: str):
    trip = await get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # weather_json is already parsed to dict by get_trip()
    return trip


# GET /session/user/{user_id}
@app.get("/session/user/{user_id}")
async def session_list_user(user_id: str):
    trips = await list_user_trips(user_id)
    return trips
