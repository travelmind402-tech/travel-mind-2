import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, useEffect } from "react";

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
  isLoading: boolean;
  setSession: (userId: string, tripId: string, form: TripForm) => void;
  clearSession: () => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);
const KEY = "@travelmind_session";

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripForm, setTripForm] = useState<TripForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setUserId(parsed.userId);
          setTripId(parsed.tripId);
          setTripForm(parsed.tripForm);
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const setSession = (uId: string, tId: string, form: TripForm) => {
    setUserId(uId);
    setTripId(tId);
    setTripForm(form);
    AsyncStorage.setItem(KEY, JSON.stringify({ userId: uId, tripId: tId, tripForm: form }));
  };

  const clearSession = () => {
    setUserId(null);
    setTripId(null);
    setTripForm(null);
    AsyncStorage.removeItem(KEY);
  };

  return (
    <TripContext.Provider value={{ userId, tripId, tripForm, isLoading, setSession, clearSession }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within TripProvider");
  return ctx;
}
