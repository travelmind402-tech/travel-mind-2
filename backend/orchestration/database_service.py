"""
Database Service Layer

Provides high-level database operations for sessions and trips.
Encapsulates all database access patterns.
"""

import asyncio
from typing import Any, Dict, List, Optional

from db.trip_store import (
    create_trip,
    get_budget,
    get_trip,
    get_weather,
    list_user_trips,
    save_budget,
    save_weather,
)


class TripService:
    """
    Encapsulates all trip-related database operations.
    Reduces direct coupling to trip_store module.
    """

    @staticmethod
    async def create_new_trip(
        user_id: str,
        city: str,
        country: str,
        date_from: str,
        date_to: str,
        traveler_type: str,
        daily_budget: float,
        currency: str,
        budget_tier: str,
        family_members: int = 0,
        group_size: int = 1,
        known_allergies: Optional[List[str]] = None,
        known_sensitivities: Optional[List[str]] = None,
        transit_waypoints: Optional[List[str]] = None,
        dietary_restrictions: Optional[List[str]] = None,
        cuisine_preferences: str = "all",
        travel_style: str = "general",
        native_language: str = "English",
        phrases_needed: Optional[List[str]] = None,
    ) -> str:
        """
        Create a new trip record in the database.
        Returns the trip_id.
        """
        return await create_trip(
            user_id=user_id,
            city=city,
            country=country,
            date_from=date_from,
            date_to=date_to,
            traveler_type=traveler_type,
            family_members=family_members,
            known_allergies=known_allergies or [],
            transit_waypoints=transit_waypoints or [],
            daily_budget=daily_budget,
            currency=currency,
            budget_tier=budget_tier,
            travel_style=travel_style,
            group_size=group_size,
            dietary_restrictions=dietary_restrictions or [],
            cuisine_preferences=cuisine_preferences,
            known_sensitivities=known_sensitivities or [],
            native_language=native_language,
            phrases_needed=phrases_needed or [],
        )

    @staticmethod
    async def get_trip_data(trip_id: str) -> Dict[str, Any]:
        """
        Fetch complete trip record from database.
        Raises HTTPException if trip not found.
        """
        return await get_trip(trip_id)

    @staticmethod
    async def get_user_trips(user_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all trips for a user, sorted newest first.
        """
        return await list_user_trips(user_id)


class WeatherService:
    """
    Encapsulates weather data storage and retrieval.
    Provides a focused interface for weather context operations.
    """

    @staticmethod
    async def save_trip_weather(trip_id: str, weather_data: Dict[str, Any]) -> None:
        """
        Persist weather analysis for a trip.
        """
        await save_weather(trip_id, weather_data)

    @staticmethod
    async def get_trip_weather(trip_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached weather analysis for a trip.
        Returns None if not yet computed.
        """
        return await get_weather(trip_id)


class BudgetService:
    """
    Encapsulates budget data storage and retrieval.
    Provides a focused interface for budget context operations.
    """

    @staticmethod
    async def save_trip_budget(trip_id: str, budget_data: Dict[str, Any]) -> None:
        """
        Persist budget analysis for a trip.
        """
        await save_budget(trip_id, budget_data)

    @staticmethod
    async def get_trip_budget(trip_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached budget analysis for a trip.
        Returns None if not yet computed.
        """
        return await get_budget(trip_id)


class ContextService:
    """
    Centralizes all context data retrieval for session workflows.
    Provides a single point of access to trip, weather, and budget data.
    """

    @staticmethod
    async def get_session_context(trip_id: str) -> Dict[str, Any]:
        """
        Fetch all relevant context for a session in one call.
        Reduces multiple database round-trips.
        """
        trip, weather, budget = await asyncio.gather(
            TripService.get_trip_data(trip_id),
            WeatherService.get_trip_weather(trip_id),
            BudgetService.get_trip_budget(trip_id),
        )

        return {
            "trip": trip,
            "weather": weather,
            "budget": budget,
        }

    @staticmethod
    async def get_trip_with_weather(trip_id: str) -> tuple:
        """
        Fetch trip and weather context together.
        Optimized for agents that need both.
        """
        trip, weather = await asyncio.gather(
            TripService.get_trip_data(trip_id),
            WeatherService.get_trip_weather(trip_id),
        )
        return trip, weather

    @staticmethod
    async def get_trip_with_weather_and_budget(trip_id: str) -> tuple:
        """
        Fetch trip, weather, and budget context together.
        Optimized for agents that need all three.
        """
        trip, weather, budget = await asyncio.gather(
            TripService.get_trip_data(trip_id),
            WeatherService.get_trip_weather(trip_id),
            BudgetService.get_trip_budget(trip_id),
        )
        return trip, weather, budget
