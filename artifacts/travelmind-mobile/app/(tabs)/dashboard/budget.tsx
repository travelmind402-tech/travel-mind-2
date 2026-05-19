import React from "react";
import { Text, View } from "react-native";
import { AgentScreen, Card, CardHeader, Row, Pill, BulletList } from "@/components/AgentScreen";
import { fetchBudget } from "@/services/api";
import { useColors } from "@/hooks/useColors";

const FEASIBILITY_COLOR: Record<string, string> = {
  feasible: "#10b981", comfortable: "#10b981", tight: "#f59e0b",
  very_tight: "#f97316", not_feasible: "#ef4444",
};

function Content({ data }: { data: any }) {
  const colors = useColors();
  const d = data?.budget_plan ?? data?.budget ?? data ?? {};
  const feasibility = d.feasibility_assessment ?? d.feasibility;

  return (
    <View style={{ gap: 0 }}>
      {feasibility && (
        <Card style={{ backgroundColor: colors.accent, borderColor: colors.accentForeground + "22" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pill
              label={typeof feasibility === "string" ? feasibility : (feasibility.status ?? "unknown")}
              color={FEASIBILITY_COLOR[((typeof feasibility === "string" ? feasibility : feasibility.status) ?? "").toLowerCase()] ?? colors.muted}
            />
            {typeof feasibility === "object" && feasibility.note && (
              <Text style={{ flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 18 }}>{feasibility.note}</Text>
            )}
          </View>
        </Card>
      )}

      {d.daily_breakdown && (
        <Card>
          <CardHeader icon="bar-chart-2" title="Daily Breakdown" />
          {Object.entries(d.daily_breakdown).map(([k, v]) => (
            <Row key={k} label={k.replace(/_/g, " ")} value={typeof v === "object" ? JSON.stringify(v) : String(v)} />
          ))}
        </Card>
      )}

      {d.total_estimate && (
        <Card>
          <CardHeader icon="layers" title="Total Estimate" />
          {typeof d.total_estimate === "string" ? (
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primary }}>{d.total_estimate}</Text>
          ) : (
            Object.entries(d.total_estimate).map(([k, v]) => (
              <Row key={k} label={k.replace(/_/g, " ")} value={String(v)} />
            ))
          )}
        </Card>
      )}

      {d.accommodation_picks?.length > 0 && (
        <Card>
          <CardHeader icon="home" title="Accommodation Picks" />
          {d.accommodation_picks.map((a: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < d.accommodation_picks.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{a.name ?? a.type ?? ""}</Text>
              {a.price_range && <Text style={{ fontSize: 12, color: colors.primary, marginTop: 2 }}>{a.price_range}</Text>}
              {a.description && <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2, lineHeight: 17 }}>{a.description}</Text>}
            </View>
          ))}
        </Card>
      )}

      {d.hidden_costs?.length > 0 && (
        <Card style={{ borderColor: "#fcd34d" }}>
          <CardHeader icon="alert-circle" title="Hidden Costs" />
          <BulletList items={d.hidden_costs.map((c: any) => typeof c === "string" ? c : (c.description ?? c.item ?? JSON.stringify(c)))} />
        </Card>
      )}

      {d.money_saving_tips?.length > 0 && (
        <Card>
          <CardHeader icon="trending-down" title="Money-Saving Tips" />
          <BulletList items={d.money_saving_tips.map((t: any) => typeof t === "string" ? t : (t.tip ?? t.description ?? JSON.stringify(t)))} />
        </Card>
      )}

      {d.activity_recommendations?.length > 0 && (
        <Card>
          <CardHeader icon="map" title="Activity Recommendations" />
          {d.activity_recommendations.slice(0, 5).map((a: any, i: number) => (
            <View key={i} style={{ paddingVertical: 7, borderBottomWidth: i < Math.min(d.activity_recommendations.length, 5) - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{a.name ?? a.activity ?? ""}</Text>
              {a.cost && <Text style={{ fontSize: 12, color: colors.primary }}>{a.cost}</Text>}
              {a.description && <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 17 }}>{a.description}</Text>}
            </View>
          ))}
        </Card>
      )}

      {d.currency_tips && (
        <Card>
          <CardHeader icon="credit-card" title="Currency Tips" />
          {typeof d.currency_tips === "string" ? (
            <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 19 }}>{d.currency_tips}</Text>
          ) : (
            <BulletList items={Array.isArray(d.currency_tips) ? d.currency_tips : Object.values(d.currency_tips).map(String)} />
          )}
        </Card>
      )}
    </View>
  );
}

export default function BudgetScreen() {
  return (
    <AgentScreen
      title="Budget Planner"
      description="Cost breakdown, accommodation picks & money-saving tips"
      iconName="credit-card"
      fetchFn={fetchBudget}
      renderContent={(data) => <Content data={data} />}
    />
  );
}
