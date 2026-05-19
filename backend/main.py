import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html

# Keep existing intra-backend absolute imports working when launched as
# `uvicorn backend.main:app` from the repository root.
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(BACKEND_DIR / ".env")

from db.database import init_db
from db.trip_store import get_trip, list_user_trips
from models.schemas import TripCreateRequest
from orchestration.session_orchestrator import AgentContext, SessionOrchestrator
from orchestration.request_validator import RequestValidator
from utils.cache import clear_prefix, get_cache_stats


# ─────────────────────────────────────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────────────────────────────────────

OPENAPI_URL = "/openapi.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="TravelMind API",
    openapi_url=OPENAPI_URL,
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Shared helper — centralised trip_id validation
# Avoids repeating the same get_trip + 404 block in every endpoint.
# ─────────────────────────────────────────────────────────────────────────────

async def _require_trip(trip_id: str) -> dict:
    """
    Fetch trip row or raise 404.
    Single authority for trip_id validation across all session endpoints.
    """
    trip = await get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail=f"Trip '{trip_id}' not found")
    return trip


# ─────────────────────────────────────────────────────────────────────────────
# Docs
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=OPENAPI_URL,
        title=f"{app.title} - Swagger UI",
        swagger_js_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "TravelMind API"}


# ─────────────────────────────────────────────────────────────────────────────
# Session — Step 1: Create trip
# Creates trip_id only. Agents run independently from the stored trip context.
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/session/create")
async def session_create(request: TripCreateRequest):
    """
    Entry point for a new trip session. Does not run any agent.
    Delegates to SessionOrchestrator for all workflow logic.
    """
    try:
        params = RequestValidator.validate_trip_create_request(request)
        return await SessionOrchestrator.create_session(**params)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Session agents
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/session/{trip_id}/weather")
async def session_weather(trip_id: str):
    """Weather agent workflow. Reads trip input from DB and stores weather."""
    try:
        trip = await _require_trip(trip_id)
        context = AgentContext(trip)
        return await SessionOrchestrator.run_weather_workflow(context)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/session/{trip_id}/budget")
async def session_budget(trip_id: str):
    """Run budget agent from trip context. Delegates to SessionOrchestrator."""
    try:
        trip = await _require_trip(trip_id)
        context = AgentContext(trip)
        return await SessionOrchestrator.run_budget_workflow(context)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/session/{trip_id}/disruption")
async def session_disruption(trip_id: str):
    """Disruption agent workflow. Delegates to SessionOrchestrator."""
    try:
        trip = await _require_trip(trip_id)
        context = AgentContext(trip)
        return await SessionOrchestrator.run_disruption_workflow(context)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/session/{trip_id}/driving")
async def session_driving(trip_id: str):
    """Driving agent workflow. Delegates to SessionOrchestrator."""
    try:
        trip = await _require_trip(trip_id)
        context = AgentContext(trip)
        return await SessionOrchestrator.run_driving_workflow(context)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/session/{trip_id}/cuisine")
async def session_cuisine(trip_id: str):
    """Cuisine agent — reads trip + weather + budget from DB."""
    try:
        trip = await _require_trip(trip_id)
        context = AgentContext(trip)
        return await SessionOrchestrator.run_cuisine_workflow(context)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/session/{trip_id}/culture")
async def session_culture(trip_id: str):
    """Culture agent workflow. Delegates to SessionOrchestrator."""
    try:
        trip = await _require_trip(trip_id)
        context = AgentContext(trip)
        return await SessionOrchestrator.run_culture_workflow(context)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/session/{trip_id}/language")
async def session_language(trip_id: str):
    """Language guide agent workflow. Delegates to SessionOrchestrator."""
    try:
        trip = await _require_trip(trip_id)
        context = AgentContext(trip)
        return await SessionOrchestrator.run_language_workflow(context)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Session — Read endpoints
# NOTE: /session/user/{user_id} MUST be declared before /session/{trip_id}
# so FastAPI does not treat "user" as a trip_id.
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/session/user/{user_id}")
async def session_list_user(user_id: str):
    """All trips for a user, newest first."""
    try:
        return await list_user_trips(user_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/session/{trip_id}")
async def session_get(trip_id: str):
    """Full trip row including all stored JSON blobs."""
    return await _require_trip(trip_id)


# ─────────────────────────────────────────────────────────────────────────────
# Cache utilities
# ─────────────────────────────────────────────────────────────────────────────

@app.delete("/cache/clear-all")
async def cache_clear_all():
    prefixes = ["weather", "cuisine", "culture", "budget", "driving", "disruption", "language"]
    total = 0
    for prefix in prefixes:
        total += await clear_prefix(prefix)
    return {"message": "Full cache cleared", "total_keys_deleted": total}


@app.delete("/cache/clear/{prefix}")
async def cache_clear_prefix(prefix: str):
    count = await clear_prefix(prefix)
    return {"cleared": count, "prefix": prefix}


@app.get("/cache/stats")
async def cache_stats():
    return await get_cache_stats()