"""
Session Orchestration Layer

Decouples session endpoints from direct agent/database calls.
Provides a clean abstraction for session workflows.
"""

import uuid
from typing import Any, Dict, List, Optional

from agents.budget_agent import run_budget_agent
from agents.culture_agent import run_culture_agent
from agents.cuisine_agent import run_cuisine_agent
from agents.disruption_agent import run_disruption_agent
from agents.driving_agent import run_driving_agent
from agents.language_agent import run_language_agent
from agents.weather_agent import run_weather_agent

from orchestration.database_service import (
    TripService,
    WeatherService,
    BudgetService,
    ContextService,
)


class AgentContext:
    """
    Encapsulates all contextual data for agent execution.
    Reduces coupling between endpoints and agent functions.
    """

    def __init__(self, trip_data: Dict[str, Any]):
        self.trip_id = trip_data.get("trip_id")
        self.user_id = trip_data.get("user_id")
        self.city = trip_data.get("city")
        self.country = trip_data.get("country")
        self.travel_start_date = trip_data.get("date_from")
        self.travel_end_date = trip_data.get("date_to")
        self.traveler_type = trip_data.get("traveler_type")
        self.family_members = trip_data.get("family_members", 0)
        self.known_allergies = trip_data.get("known_allergies", [])
        self.known_sensitivities = trip_data.get("known_sensitivities", [])
        self.transit_waypoints = trip_data.get("transit_waypoints", [])
        self.daily_budget = trip_data.get("daily_budget", 3000.0)
        self.currency = trip_data.get("currency", "INR")
        self.budget_tier = trip_data.get("budget_tier", "mid_range")
        self.travel_style = trip_data.get("travel_style", "general")
        self._explicit_group_size = trip_data.get("group_size")
        self.dietary_restrictions = trip_data.get("dietary_restrictions", [])
        self.cuisine_preferences = trip_data.get("cuisine_preferences", "all")
        self.native_language = trip_data.get("native_language", "English")
        self.phrases_needed = trip_data.get("phrases_needed", [])

        self._weather_cache: Optional[Dict] = None
        self._budget_cache: Optional[Dict] = None

    async def get_weather(self) -> Dict[str, Any]:
        """Lazy-load weather data from database."""
        if self._weather_cache is None:
            self._weather_cache = await WeatherService.get_trip_weather(
                self.trip_id
            )
        return self._weather_cache

    async def get_budget(self) -> Dict[str, Any]:
        """Lazy-load budget data from database."""
        if self._budget_cache is None:
            self._budget_cache = await BudgetService.get_trip_budget(self.trip_id)
        return self._budget_cache

    @property
    def group_size(self) -> int:
        """Resolve explicit group size or derive from family members."""
        if self._explicit_group_size is not None and self._explicit_group_size >= 1:
            return int(self._explicit_group_size)
        return max(1, 1 + self.family_members)

    @property
    def daily_budget_usd(self) -> float:
        """Convert daily budget to USD."""
        return round(self.daily_budget * 0.012, 2)


class SessionOrchestrator:
    """
    Orchestrates session workflows and agent execution.
    Provides high-level operations for session management.
    """

    @staticmethod
    async def create_session(
        city: str,
        country: str,
        travel_start_date: str,
        travel_end_date: str,
        traveler_type: str,
        budget_tier: str,
        daily_budget: float,
        currency: str,
        family_members: int,
        group_size: int,
        known_allergies: List[str],
        known_sensitivities: List[str],
        transit_waypoints: List[str],
        dietary_restrictions: List[str],
        cuisine_preferences: str,
        travel_style: str,
        native_language: str,
        phrases_needed: List[str],
    ) -> Dict[str, Any]:
        """
        Initialize a new trip session without running any agent.

        Order:
            1. Create trip row in database
            2. Return session info
        """
        user_id = str(uuid.uuid4())

        print(
            f"[Session] Starting: {city} | tier={budget_tier} | user={user_id}"
        )

        # Create trip
        trip_id = await TripService.create_new_trip(
            user_id=user_id,
            city=city,
            country=country,
            date_from=travel_start_date,
            date_to=travel_end_date,
            traveler_type=traveler_type,
            family_members=family_members,
            group_size=group_size,
            known_allergies=known_allergies,
            known_sensitivities=known_sensitivities,
            transit_waypoints=transit_waypoints,
            daily_budget=daily_budget,
            currency=currency,
            budget_tier=budget_tier,
            travel_style=travel_style,
            dietary_restrictions=dietary_restrictions,
            cuisine_preferences=cuisine_preferences,
            native_language=native_language,
            phrases_needed=phrases_needed,
        )

        print(f"[Session] Trip created: {trip_id}")

        return {"user_id": user_id, "trip_id": trip_id}

    @staticmethod
    async def start_session(**kwargs) -> Dict[str, Any]:
        """Backward-compatible alias for session creation."""
        return await SessionOrchestrator.create_session(**kwargs)

    @staticmethod
    async def run_weather_workflow(
        context: AgentContext,
    ) -> Dict[str, Any]:
        """Run weather agent from stored trip context and persist result."""
        print(f"[Session] Running weather agent for {context.trip_id}...")

        weather = await run_weather_agent(
            city=context.city,
            country=context.country,
            travel_start_date=context.travel_start_date,
            travel_end_date=context.travel_end_date,
            traveler_type=context.traveler_type,
            family_members=context.family_members,
            known_allergies=context.known_allergies,
            transit_waypoints=context.transit_waypoints,
        )

        await WeatherService.save_trip_weather(context.trip_id, weather)
        print(f"[Session] Weather saved ✓")
        context._weather_cache = weather
        return weather

    @staticmethod
    async def run_budget_workflow(
        context: AgentContext,
    ) -> Dict[str, Any]:
        """Run budget agent and persist result."""
        print(f"[Session] Running budget agent for {context.trip_id}...")

        result = await run_budget_agent(
            city=context.city,
            country=context.country,
            travel_start_date=context.travel_start_date,
            travel_end_date=context.travel_end_date,
            traveler_type=context.traveler_type,
            daily_budget=context.daily_budget,
            currency=context.currency,
            weather_context=await context.get_weather(),
        )

        await BudgetService.save_trip_budget(context.trip_id, result)
        print(f"[Session] Budget saved ✓")
        return result

    @staticmethod
    async def run_disruption_workflow(
        context: AgentContext,
    ) -> Dict[str, Any]:
        """Run disruption agent using trip and weather context."""
        print(f"[Session] Running disruption agent for {context.trip_id}...")

        weather = await context.get_weather()

        return await run_disruption_agent(
            city=context.city,
            country=context.country,
            travel_month=int(context.travel_start_date[5:7]),
            travel_year=int(context.travel_start_date[:4]),
            traveler_type=context.traveler_type,
            weather_context=weather,
        )

    @staticmethod
    async def run_driving_workflow(
        context: AgentContext,
    ) -> Dict[str, Any]:
        """Run driving agent using trip and weather context."""
        print(f"[Session] Running driving agent for {context.trip_id}...")

        weather = await context.get_weather()

        return await run_driving_agent(
            city=context.city,
            country=context.country,
            travel_start_date=context.travel_start_date,
            travel_end_date=context.travel_end_date,
            traveler_type=context.traveler_type,
            route_waypoints=context.transit_waypoints,
            vehicle_type="car",
            driver_experience="intermediate",
            night_driving=False,
            weather_context=weather,
        )

    @staticmethod
    async def run_cuisine_workflow(
        context: AgentContext,
    ) -> Dict[str, Any]:
        """Run cuisine agent using trip, weather, and budget context."""
        print(f"[Session] Running cuisine agent for {context.trip_id}...")

        weather = await context.get_weather()
        budget = await context.get_budget()

        budget_tier = context.budget_tier
        if budget and budget.get("_metadata", {}).get("exchange_rate"):
            daily_budget_usd = round(float(context.daily_budget) * 0.012, 2)
        else:
            daily_budget_usd = context.daily_budget_usd

        print(
            f"[Session] Running cuisine agent for {context.trip_id} | "
            f"group={context.group_size} | tier={budget_tier} | "
            f"allergies={len(context.known_allergies)}"
        )

        return await run_cuisine_agent(
            city=context.city,
            country=context.country,
            travel_start_date=context.travel_start_date,
            travel_end_date=context.travel_end_date,
            traveler_type=context.traveler_type,
            family_members=context.family_members,
            known_allergies=context.known_allergies,
            dietary_restrictions=context.dietary_restrictions,
            cuisine_preferences=context.cuisine_preferences,
            group_size=context.group_size,
            budget_tier=budget_tier,
            weather_context=weather,
        )

    @staticmethod
    async def run_culture_workflow(
        context: AgentContext,
    ) -> Dict[str, Any]:
        """Run culture agent using trip and weather context."""
        print(f"[Session] Running culture agent for {context.trip_id}...")

        weather = await context.get_weather()

        return await run_culture_agent(
            city=context.city,
            country=context.country,
            travel_start_date=context.travel_start_date,
            travel_end_date=context.travel_end_date,
            traveler_type=context.traveler_type,
            family_members=context.family_members,
            known_allergies=context.known_allergies,
            travel_style=context.travel_style,
            group_size=context.group_size,
            known_sensitivities=context.known_sensitivities,
            weather_context=weather,
        )

    @staticmethod
    async def run_language_workflow(
        context: AgentContext,
    ) -> Dict[str, Any]:
        """Run language agent using trip context."""
        print(f"[Session] Running language agent for {context.trip_id}...")

        return await run_language_agent(
            city=context.city,
            country=context.country,
            traveler_type=context.traveler_type,
            native_language=context.native_language,
            phrases_needed=context.phrases_needed,
        )