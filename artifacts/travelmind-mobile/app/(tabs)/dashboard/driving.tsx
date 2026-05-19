import React from "react";
import { Text, View } from "react-native";
import { AgentScreen, Card, CardHeader, Row, Pill, BulletList } from "@/components/AgentScreen";
import { fetchDriving } from "@/services/api";
import { useColors } from "@/hooks/useColors";

const RISK: Record<string, string> = {
  low: "#10b981", moderate: "#f59e0b", high: "#f97316", extreme: "#ef4444",
};

function Content({ data }: { data: any }) {
  const colors = useColors();
  const d = data?.driving_analysis ?? data?.driving ?? data ?? {};

  return (
    <View style={{ gap: 0 }}>
      {d.summary && (
        <Card style={{ backgroundColor: colors.accent, borderColor: colors.accentForeground + "22" }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>{d.summary}</Text>
        </Card>
      )}

      {(d.overall_risk || d.road_condition_score !== undefined) && (
        <Card>
          <CardHeader icon="activity" title="Risk Overview" />
          {d.overall_risk && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Pill label={d.overall_risk} color={RISK[d.overall_risk?.toLowerCase?.()] ?? colors.muted} />
            </View>
          )}
          {d.road_condition_score !== undefined && <Row label="Road Condition Score" value={String(d.road_condition_score)} />}
          {d.driving_difficulty && <Row label="Driving Difficulty" value={d.driving_difficulty} />}
        </Card>
      )}

      {d.daily_driving_guide?.length > 0 && (
        <Card>
          <CardHeader icon="map" title="Daily Driving Guide" />
          {d.daily_driving_guide.map((day: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < d.daily_driving_guide.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <View style={{ backgroundColor: colors.muted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>{day.date ?? `Day ${i + 1}`}</Text>
                </View>
                {day.risk_level && <Pill label={day.risk_level} color={RISK[day.risk_level?.toLowerCase?.()] ?? colors.muted} />}
              </View>
              {day.condition && <Text style={{ fontSize: 13, color: colors.foreground }}>{day.condition}</Text>}
              {day.recommendation && <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>{day.recommendation}</Text>}
            </View>
          ))}
        </Card>
      )}

      {d.dangerous_stretches?.length > 0 && (
        <Card>
          <CardHeader icon="alert-octagon" title="Dangerous Stretches" />
          {d.dangerous_stretches.map((s: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < d.dangerous_stretches.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{s.location ?? s.name ?? ""}</Text>
              {s.hazard && <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>{s.hazard}</Text>}
              {s.alternative_route && <Text style={{ fontSize: 12, color: colors.primary, marginTop: 2 }}>Alt: {s.alternative_route}</Text>}
            </View>
          ))}
        </Card>
      )}

      {d.rules_and_regulations?.length > 0 && (
        <Card>
          <CardHeader icon="book" title="Road Rules" />
          <BulletList items={d.rules_and_regulations} />
        </Card>
      )}

      {d.emergency_contacts && (
        <Card>
          <CardHeader icon="phone" title="Emergency Contacts" />
          {Object.entries(d.emergency_contacts).map(([k, v]) => (
            <Row key={k} label={k.replace(/_/g, " ")} value={String(v)} />
          ))}
        </Card>
      )}

      {d.driver_checklist?.length > 0 && (
        <Card>
          <CardHeader icon="check-square" title="Driver Checklist" />
          <BulletList items={d.driver_checklist} />
        </Card>
      )}
    </View>
  );
}

export default function DrivingScreen() {
  return (
    <AgentScreen
      title="Driving Intelligence"
      description="Road conditions, safety guide & emergency contacts"
      iconName="truck"
      fetchFn={fetchDriving}
      renderContent={(data) => <Content data={data} />}
    />
  );
}
