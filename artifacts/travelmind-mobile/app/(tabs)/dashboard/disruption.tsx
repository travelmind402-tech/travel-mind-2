import React from "react";
import { Text, View } from "react-native";
import { AgentScreen, Card, CardHeader, Pill, BulletList } from "@/components/AgentScreen";
import { fetchDisruption } from "@/services/api";
import { useColors } from "@/hooks/useColors";

const SEV: Record<string, string> = {
  low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444",
};

function Content({ data }: { data: any }) {
  const colors = useColors();
  const d = data?.disruption_analysis ?? data ?? {};

  return (
    <View style={{ gap: 0 }}>
      {d.summary && (
        <Card style={{ backgroundColor: colors.accent, borderColor: colors.accentForeground + "22" }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>{d.summary}</Text>
        </Card>
      )}

      {d.hotspots?.length > 0 && (
        <Card>
          <CardHeader icon="alert-triangle" title="Disruption Hotspots" />
          {d.hotspots.map((h: any, i: number) => (
            <View key={i} style={{ paddingVertical: 10, borderBottomWidth: i < d.hotspots.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Pill label={h.severity ?? "unknown"} color={SEV[h.severity?.toLowerCase?.()] ?? colors.muted} />
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1 }}>{h.location ?? h.name ?? ""}</Text>
              </View>
              {h.description && (
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 17 }}>{h.description}</Text>
              )}
              {h.impact && (
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.foreground, marginTop: 3 }}>{h.impact}</Text>
              )}
            </View>
          ))}
        </Card>
      )}

      {(d.power_reliability || d.connectivity || d.transport) && (
        <Card>
          <CardHeader icon="zap" title="Infrastructure Status" />
          {d.power_reliability && <View style={{ marginBottom: 8 }}><Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 3 }}>POWER</Text><Text style={{ fontSize: 13, color: colors.foreground }}>{d.power_reliability}</Text></View>}
          {d.connectivity && <View style={{ marginBottom: 8 }}><Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 3 }}>CONNECTIVITY</Text><Text style={{ fontSize: 13, color: colors.foreground }}>{d.connectivity}</Text></View>}
          {d.transport && <View><Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 3 }}>TRANSPORT</Text><Text style={{ fontSize: 13, color: colors.foreground }}>{d.transport}</Text></View>}
        </Card>
      )}

      {d.scam_alerts?.length > 0 && (
        <Card>
          <CardHeader icon="shield" title="Scam Alerts" />
          <BulletList items={d.scam_alerts.map((s: any) => typeof s === "string" ? s : (s.description ?? s.type ?? JSON.stringify(s)))} />
        </Card>
      )}

      {d.backup_plans?.length > 0 && (
        <Card>
          <CardHeader icon="life-buoy" title="Backup Plans" />
          <BulletList items={d.backup_plans.map((p: any) => typeof p === "string" ? p : (p.plan ?? p.description ?? JSON.stringify(p)))} />
        </Card>
      )}

      {d.recommendations?.length > 0 && (
        <Card>
          <CardHeader icon="check-circle" title="Recommendations" />
          <BulletList items={d.recommendations} />
        </Card>
      )}
    </View>
  );
}

export default function DisruptionScreen() {
  return (
    <AgentScreen
      title="Disruption Alerts"
      description="Road closures, strikes, scam alerts & backup plans"
      iconName="alert-triangle"
      fetchFn={fetchDisruption}
      renderContent={(data) => <Content data={data} />}
    />
  );
}
