import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTrip } from "@/context/TripContext";

const AGENTS = [
  { name: "Weather", sub: "Forecast & health risks", icon: "cloud" as const, route: "/dashboard/weather", color: "#0ea5e9" },
  { name: "Disruptions", sub: "Closures & scam alerts", icon: "alert-triangle" as const, route: "/dashboard/disruption", color: "#f97316" },
  { name: "Driving", sub: "Road rules & conditions", icon: "truck" as const, route: "/dashboard/driving", color: "#8b5cf6" },
  { name: "Cuisine", sub: "Dining & dietary guide", icon: "coffee" as const, route: "/dashboard/cuisine", color: "#f59e0b" },
  { name: "Culture", sub: "Etiquette & local laws", icon: "globe" as const, route: "/dashboard/culture", color: "#10b981" },
  { name: "Budget", sub: "Cost breakdown & tips", icon: "credit-card" as const, route: "/dashboard/budget", color: "#2563eb" },
  { name: "Language", sub: "Phrases & phonetics", icon: "message-square" as const, route: "/dashboard/language", color: "#f43f5e" },
];

export default function DashboardHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tripForm, tripId, clearSession } = useTrip();

  useEffect(() => {
    if (!tripId) router.replace("/");
  }, [tripId]);

  if (!tripForm || !tripId) return null;

  const start = new Date(tripForm.travel_start_date);
  const end = new Date(tripForm.travel_end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  const daysUntil = Math.round((start.getTime() - today.getTime()) / 86400000);
  const totalBudget = tripForm.daily_budget * (nights || 1);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={[s.appName, { color: colors.mutedForeground }]}>TravelMind</Text>
          <Text style={[s.sessionId, { color: colors.mutedForeground }]}>
            #{tripId.split("-")[0]}
          </Text>
        </View>
        <Pressable
          onPress={() => { clearSession(); router.replace("/"); }}
          style={({ pressed }) => [s.newTripBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="plus" size={14} color={colors.foreground} />
          <Text style={[s.newTripText, { color: colors.foreground }]}>New Trip</Text>
        </Pressable>
      </View>

      <View style={[s.hero, { backgroundColor: colors.primary }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Feather name="map-pin" size={13} color="rgba(255,255,255,0.7)" />
          {tripForm.transit_waypoints.length > 0 ? (
            <Text style={s.heroSub}>Via {tripForm.transit_waypoints.join(", ")}</Text>
          ) : (
            <Text style={s.heroSub}>Direct route</Text>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={s.heroCity}>{tripForm.city}</Text>
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
          <Text style={s.heroCountry}>{tripForm.country}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
          <Feather name="calendar" size={13} color="rgba(255,255,255,0.7)" />
          <Text style={s.heroDates}>{fmt(start)} — {fmt(end)}</Text>
        </View>

        {daysUntil > 0 && (
          <View style={s.countdownBadge}>
            <Feather name="clock" size={12} color={colors.primary} />
            <Text style={[s.countdownText, { color: colors.primary }]}>{daysUntil}d to go</Text>
          </View>
        )}
        {daysUntil === 0 && (
          <View style={[s.countdownBadge, { backgroundColor: "#d1fae5" }]}>
            <Feather name="send" size={12} color="#059669" />
            <Text style={[s.countdownText, { color: "#059669" }]}>Departing today!</Text>
          </View>
        )}

        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statNum}>{nights}</Text>
            <Text style={s.statLabel}>nights</Text>
          </View>
          <View style={[s.statDivider]} />
          <View style={s.statItem}>
            <Text style={s.statNum}>{tripForm.daily_budget.toLocaleString()}</Text>
            <Text style={s.statLabel}>{tripForm.currency}/day</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>{totalBudget.toLocaleString()}</Text>
            <Text style={s.statLabel}>total ({tripForm.currency})</Text>
          </View>
        </View>

        <View style={s.badgeRow}>
          {[tripForm.budget_tier, tripForm.travel_style, tripForm.traveler_type].map((tag) => (
            <View key={tag} style={s.badge}>
              <Text style={s.badgeText}>{tag.replace(/_/g, " ")}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={[s.sectionTitle, { color: colors.foreground }]}>AI Agents</Text>
          <View style={[s.readyBadge, { backgroundColor: colors.accent }]}>
            <Text style={[s.readyText, { color: colors.accentForeground }]}>7 ready · Gemma 4</Text>
          </View>
        </View>

        <View style={s.agentGrid}>
          {AGENTS.map((agent) => (
            <Pressable
              key={agent.route}
              style={({ pressed }) => [
                s.agentCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={() => router.push(agent.route as any)}
            >
              <View style={[s.agentIcon, { backgroundColor: agent.color + "18" }]}>
                <Feather name={agent.icon} size={18} color={agent.color} />
              </View>
              <Text style={[s.agentName, { color: colors.foreground }]}>{agent.name}</Text>
              <Text style={[s.agentSub, { color: colors.mutedForeground }]}>{agent.sub}</Text>
              <Feather name="chevron-right" size={14} color={colors.border} style={{ marginTop: 4 }} />
            </Pressable>
          ))}
        </View>

        {(tripForm.dietary_restrictions.length > 0 || tripForm.known_allergies.length > 0) && (
          <View style={[s.flagsCard, { backgroundColor: colors.card, borderColor: "#fcd34d" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Feather name="alert-circle" size={14} color="#d97706" />
              <Text style={[s.flagsTitle, { color: colors.foreground }]}>Active Health Flags</Text>
            </View>
            <View style={s.chipRow}>
              {[...tripForm.dietary_restrictions, ...tripForm.known_allergies].map((f) => (
                <View key={f} style={[s.flagChip, { backgroundColor: "#fef3c7" }]}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#92400e" }}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sessionId: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  newTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  newTripText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  hero: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
  },
  heroSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  heroCity: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  heroCountry: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
  heroDates: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  countdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  countdownText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    marginTop: 16,
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  readyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  readyText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  agentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  agentCard: {
    width: "47%",
    borderWidth: 1,
    padding: 14,
  },
  agentIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  agentName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  agentSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 16,
  },
  flagsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  flagsTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  flagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
});
