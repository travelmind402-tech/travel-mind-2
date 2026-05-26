import React from "react";
import { Text, View } from "react-native";
import { AgentScreen, Card, CardHeader, Row, Pill, BulletList } from "@/components/AgentScreen";
import { fetchWeather } from "@/services/api";
import { useColors } from "@/hooks/useColors";

const SEV: Record<string, string> = {
  clear: "#10b981",
  advisory: "#f59e0b",
  critical: "#ef4444",
  low: "#10b981",
  medium: "#f59e0b",
  moderate: "#f59e0b",
  high: "#f97316",
  extreme: "#ef4444",
};

function Content({ data }: { data: any }) {
  const colors = useColors();
  const d = data?.weather_analysis ?? data?.weather ?? data ?? {};

  return (
    <View style={{ gap: 0 }}>
      {d.summary && (
        <Card style={{ backgroundColor: colors.accent, borderColor: colors.accentForeground + "22" }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>{d.summary}</Text>
        </Card>
      )}

      {/* Severe Alerts */}
      {d.severe_alerts && d.severe_alerts !== "None" && (
        <Card style={{ borderColor: "#f97316", backgroundColor: "#fff7ed" }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#c2410c", lineHeight: 19 }}>{d.severe_alerts}</Text>
        </Card>
      )}

      {/* Conditions */}
      {(d.current_season || d.temperature || d.conditions || d.best_time_outdoors) && (
        <Card>
          <CardHeader icon="thermometer" title="Conditions" />
          {d.current_season && <Row label="Season" value={d.current_season} />}
          {d.temperature && <Row label="Temperature" value={d.temperature} />}
          {d.conditions && <Row label="Conditions" value={d.conditions} />}
          {d.best_time_outdoors && <Row label="Best outdoors" value={d.best_time_outdoors} />}
        </Card>
      )}

      {/* Calamity Risk */}
      {d.calamity_prediction_alert && (
        <Card>
          <CardHeader icon="alert-triangle" title="Calamity Risk" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Pill label={d.calamity_prediction_alert.status} color={SEV[d.calamity_prediction_alert.status?.toLowerCase?.()] ?? colors.muted} />
            {d.calamity_prediction_alert.probability_score && (
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                {d.calamity_prediction_alert.probability_score}
              </Text>
            )}
          </View>
          {d.calamity_prediction_alert.historical_basis && (
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 17 }}>
              {d.calamity_prediction_alert.historical_basis}
            </Text>
          )}
          {d.calamity_prediction_alert.predicted_events?.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
              {d.calamity_prediction_alert.predicted_events.map((e: string) => (
                <Pill key={e} label={e} />
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Hazard Risk Assessment */}
      {d.hazard_risk_assessment && (
        <Card>
          <CardHeader icon="shield" title="Hazard Risk Assessment" />
          {d.hazard_risk_assessment.overall_risk_level && (
            <View style={{ marginBottom: 8 }}>
              <Pill label={d.hazard_risk_assessment.overall_risk_level} color={SEV[d.hazard_risk_assessment.overall_risk_level?.toLowerCase?.()] ?? colors.muted} />
            </View>
          )}
          {d.hazard_risk_assessment.primary_hazards?.map((h: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < d.hazard_risk_assessment.primary_hazards.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pill label={h.risk_level} color={SEV[h.risk_level?.toLowerCase?.()] ?? colors.muted} />
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1 }}>{h.hazard_type}</Text>
              </View>
              {h.impact && <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 3, lineHeight: 17 }}>{h.impact}</Text>}
            </View>
          ))}
        </Card>
      )}

      {/* Travel Health Index */}
      {d.travel_health_index && (
        <Card>
          <CardHeader icon="heart" title="Health Index" />
          {Object.entries(d.travel_health_index)
            .filter(([k]) => k !== "overall_health_recommendation")
            .map(([k, v]) => (
              <Row key={k} label={k.replace(/_/g, " ")} value={String(v)} />
            ))}
          {d.travel_health_index.overall_health_recommendation && (
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 8, lineHeight: 17 }}>
              {d.travel_health_index.overall_health_recommendation}
            </Text>
          )}
        </Card>
      )}

      {/* Day-by-Day Forecast */}
      {d.journey_weather_timeline?.length > 0 && (
        <Card>
          <CardHeader icon="wind" title="Day-by-Day Forecast" />
          {d.journey_weather_timeline.map((day: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < d.journey_weather_timeline.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ backgroundColor: colors.muted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>{day.date ?? `Day ${i + 1}`}</Text>
                </View>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground, flex: 1 }}>
                  {day.condition ?? day.summary ?? ""}
                  {day.temperature ? `  ${day.temperature}` : ""}
                </Text>
              </View>
              {day.recommendation && (
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 3 }}>{day.recommendation}</Text>
              )}
            </View>
          ))}
        </Card>
      )}

      {/* Allergen Alerts */}
      {d.allergen_alerts?.length > 0 && (
        <Card>
          <CardHeader icon="eye" title="Allergen Alerts" />
          {d.allergen_alerts.map((a: any, i: number) => (
            <View key={i} style={{ paddingVertical: 6, borderBottomWidth: i < d.allergen_alerts.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pill label={a.level} color={SEV[a.level?.toLowerCase?.()] ?? colors.muted} />
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground }}>{a.allergen_type}</Text>
                {a.origin_season && <Text style={{ fontSize: 11, color: colors.mutedForeground }}>({a.origin_season})</Text>}
              </View>
              {a.precautions && <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 3, lineHeight: 17 }}>{a.precautions}</Text>}
            </View>
          ))}
        </Card>
      )}

      {/* Environmental Factors */}
      {d.seasonal_environmental_factors && (
        <Card>
          <CardHeader icon="map-pin" title="Environmental Factors" />
          {d.seasonal_environmental_factors.sensory_note && (
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", color: colors.mutedForeground, marginBottom: 8, lineHeight: 18 }}>
              {d.seasonal_environmental_factors.sensory_note}
            </Text>
          )}
          {d.seasonal_environmental_factors.economic_impact && (
            <Row label="Economic" value={d.seasonal_environmental_factors.economic_impact} />
          )}
          {d.seasonal_environmental_factors.infrastructure_risk && (
            <Row label="Infrastructure" value={d.seasonal_environmental_factors.infrastructure_risk} />
          )}
        </Card>
      )}

      {/* Packing Tips — supports both field names */}
      {(d.packing_tips ?? d.packing_recommendations)?.length > 0 && (
        <Card>
          <CardHeader icon="package" title="Packing Tips" />
          <BulletList items={d.packing_tips ?? d.packing_recommendations} />
        </Card>
      )}

      {/* Safety Recommendations */}
      {d.traveler_safety_recommendations?.length > 0 && (
        <Card>
          <CardHeader icon="shield" title="Safety Recommendations" />
          <BulletList items={d.traveler_safety_recommendations} />
        </Card>
      )}

      {/* Emergency Contacts */}
      {d.emergency_contacts_relevant?.length > 0 && (
        <Card style={{ borderColor: "#fca5a5" }}>
          <CardHeader icon="phone" title="Emergency Contacts" />
          <BulletList items={d.emergency_contacts_relevant} />
        </Card>
      )}
    </View>
  );
}

export default function WeatherScreen() {
  return (
    <AgentScreen
      title="Weather Analysis"
      description="Forecast, health risks, allergen alerts & packing recommendations"
      iconName="cloud"
      fetchFn={fetchWeather}
      renderContent={(data) => <Content data={data} />}
    />
  );
}
