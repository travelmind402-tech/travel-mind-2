import { createContext, useContext, useState, ReactNode } from "react";

export interface TripForm {
  city: string;
  country: string;
  travel_start_date: string;
  travel_end_date: string;
  traveler_type: string;
  family_members: number;
  group_size: number;
  known_allergies: string[];
  known_sensitivities: string[];
  transit_waypoints: string[];
  dietary_restrictions: string[];
  cuisine_preferences: string;
  travel_style: string;
  daily_budget: number;
  currency: string;
  budget_tier: string;
  native_language: string;
  phrases_needed: string[];
}

interface TripContextType {
  userId: string | null;
  tripId: string | null;
  tripForm: TripForm | null;
  setSession: (userId: string, tripId: string, form: TripForm) => void;
  clearSession: () => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripForm, setTripForm] = useState<TripForm | null>(null);

  const setSession = (uId: string, tId: string, form: TripForm) => {
    setUserId(uId);
    setTripId(tId);
    setTripForm(form);
  };

  const clearSession = () => {
    setUserId(null);
    setTripId(null);
    setTripForm(null);
  };

  return (
    <TripContext.Provider value={{ userId, tripId, tripForm, setSession, clearSession }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (!context) throw new Error("useTrip must be used within a TripProvider");
  return context;
}
