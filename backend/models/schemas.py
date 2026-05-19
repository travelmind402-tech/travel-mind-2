from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional


class TripCreateRequest(BaseModel):
    city: str
    country: str
    travel_start_date: str
    travel_end_date: str
    traveler_type: str
    family_members: int = 0
    group_size: int = 1
    known_allergies: List[str] = Field(default_factory=list)
    known_sensitivities: List[str] = Field(default_factory=list)
    transit_waypoints: List[str] = Field(default_factory=list)
    dietary_restrictions: List[str] = Field(default_factory=list)
    cuisine_preferences: Literal["local", "street", "fine_dining", "all"] = "all"
    travel_style: Optional[str] = "general"
    daily_budget: float = 3000.0
    currency: str = "INR"
    budget_tier: Literal["budget", "mid_range", "luxury"] = "mid_range"

    # Used by /session/{trip_id}/language workflow
    native_language: str = "English"
    phrases_needed: Optional[List[str]] = None


class DisruptionRequest(BaseModel):
    city: str
    country: str
    travel_month: int  # 1-12
    travel_year: int
    traveler_type: Literal["solo", "elderly", "student", "family"]
    weather_context: Optional[dict] = None


class DrivingRequest(BaseModel):
    city: str
    country: str
    travel_start_date: str
    travel_end_date: str
    traveler_type: Literal["solo", "elderly", "student", "family"]
    route_waypoints: List[str] = Field(default_factory=list)
    vehicle_type: Literal["car", "bike", "bus", "suv", "scooter"] = "car"
    driver_experience: Literal["beginner", "intermediate", "expert"] = "intermediate"
    night_driving: bool = False
    weather_context: Optional[dict] = None


class CuisineRequest(BaseModel):
    city: str
    country: str
    travel_start_date: str
    travel_end_date: str
    traveler_type: Literal["solo", "elderly", "student", "family"]
    daily_budget_usd: float = 50.0
    currency: str = "INR"
    dietary_restrictions: List[str] = Field(default_factory=list)
    cuisine_preferences: Literal["local", "street", "fine_dining", "all"] = "all"
    group_size: int = 1


class CultureRequest(BaseModel):
    city: str
    country: str
    travel_start_date: str
    travel_end_date: str
    traveler_type: str
    travel_style: Optional[str] = "general"
    group_size: Optional[int] = 1
    known_sensitivities: Optional[List[str]] = Field(default_factory=list)


class BudgetRequest(BaseModel):
    city: str
    country: str
    travel_start_date: str
    travel_end_date: str
    traveler_type: Literal["solo", "elderly", "student", "family"]
    daily_budget: float = 3000.0
    currency: str = "INR"
    group_size: int = 1
    accommodation_preference: Literal[
        "hostel", "budget_hotel", "mid_range", "luxury", "any"
    ] = "any"
    transport_mode: Literal["public", "private", "mixed", "any"] = "any"
    include_flights: bool = False


class LanguageRequest(BaseModel):
    city: str
    country: str
    traveler_type: Literal["solo", "elderly", "student", "family"]
    native_language: str = "English"
    phrases_needed: Optional[List[str]] = None
    # e.g. ["Where is hospital?", "How much?"]