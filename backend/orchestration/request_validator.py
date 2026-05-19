"""
Request Validation Layer

Decouples request validation from endpoint implementations.
Provides a clean abstraction for request processing.
"""

from typing import Any, Dict
from models.schemas import BudgetRequest, TripCreateRequest


# NOTE: TripCreateRequest includes native_language/phrases_needed in schemas.py.
# RequestValidator must pass them through to SessionOrchestrator/DB;
# otherwise the language agent will fallback to English.


class RequestValidator:
    """
    Centralizes request validation and normalization.
    Reduces coupling between endpoints and request model details.
    """

    @staticmethod
    def validate_trip_create_request(request: TripCreateRequest) -> Dict[str, Any]:
        """
        Validate and normalize trip creation request.
        Returns normalized parameters for session orchestrator.
        """
        return {
            "city": request.city,
            "country": request.country,
            "travel_start_date": request.travel_start_date,
            "travel_end_date": request.travel_end_date,
            "traveler_type": request.traveler_type,
            "daily_budget": request.daily_budget,
            "currency": request.currency,
            "budget_tier": request.budget_tier,
            "family_members": request.family_members,
            "group_size": request.group_size,
            "known_allergies": request.known_allergies,
            "known_sensitivities": request.known_sensitivities,
            "transit_waypoints": request.transit_waypoints,
            "dietary_restrictions": request.dietary_restrictions,
            "cuisine_preferences": request.cuisine_preferences,
            "travel_style": request.travel_style,
            "native_language": request.native_language,
            "phrases_needed": request.phrases_needed or [],
        }

    @staticmethod
    def validate_budget_request(request: BudgetRequest) -> Dict[str, Any]:
        return {
            "city":              request.city,
            "country":           request.country,
            "travel_start_date": request.travel_start_date,
            "travel_end_date":   request.travel_end_date,
            "traveler_type":     request.traveler_type,
            "daily_budget":      request.daily_budget,
            "currency":          request.currency,
            # weather_context is None at validation time;
            # the orchestrator fetches and injects it before running the budget agent.
            "weather_context":   None,
        }