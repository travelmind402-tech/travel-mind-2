import React from "react";
import { Text, View } from "react-native";
import { AgentScreen, Card, CardHeader, Row, Pill, BulletList } from "@/components/AgentScreen";
import { fetchCuisine } from "@/services/api";
import { useColors } from "@/hooks/useColors";

function Content({ data }: { data: any }) {
  const colors = useColors();
  const d = data?.cuisine_guide ?? data?.cuisine ?? data ?? {};

  return (
    <View style={{ gap: 0 }}>
      {d.summary && (
        <Card style={{ backgroundColor: colors.accent, borderColor: colors.accentForeground + "22" }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>{d.summary}</Text>
        </Card>
      )}

      {d.must_try_dishes?.length > 0 && (
        <Card>
          <CardHeader icon="star" title="Must-Try Dishes" />
          {d.must_try_dishes.map((dish: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < d.must_try_dishes.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{dish.name ?? dish}</Text>
              {dish.description && <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2, lineHeight: 17 }}>{dish.description}</Text>}
              {dish.dietary_tags?.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                  {dish.dietary_tags.map((tag: string) => (
                    <Pill key={tag} label={tag} />
                  ))}
                </View>
              )}
              {dish.ordering_tip && <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>Tip: {dish.ordering_tip}</Text>}
            </View>
          ))}
        </Card>
      )}

      {d.street_food_guide && (
        <Card>
          <CardHeader icon="map-pin" title="Street Food Guide" />
          {typeof d.street_food_guide === "string" ? (
            <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 19 }}>{d.street_food_guide}</Text>
          ) : (
            <>
              {d.street_food_guide.best_areas?.length > 0 && (
                <>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Best Areas</Text>
                  <BulletList items={d.street_food_guide.best_areas} />
                </>
              )}
              {d.street_food_guide.safety_tips?.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Safety Tips</Text>
                  <BulletList items={d.street_food_guide.safety_tips} />
                </View>
              )}
            </>
          )}
        </Card>
      )}

      {d.dietary_accommodation?.length > 0 && (
        <Card>
          <CardHeader icon="check-circle" title="Dietary Accommodations" />
          {d.dietary_accommodation.map((item: any, i: number) => (
            <Row key={i} label={item.diet_type ?? item.type ?? String(i + 1)} value={item.availability ?? item.note ?? ""} />
          ))}
        </Card>
      )}

      {d.budget_meal_plan && (
        <Card>
          <CardHeader icon="dollar-sign" title="Budget Meal Plan" />
          {typeof d.budget_meal_plan === "string" ? (
            <Text style={{ fontSize: 13, color: colors.foreground }}>{d.budget_meal_plan}</Text>
          ) : (
            Object.entries(d.budget_meal_plan).map(([k, v]) => (
              <Row key={k} label={k.replace(/_/g, " ")} value={String(v)} />
            ))
          )}
        </Card>
      )}

      {d.tourist_trap_warnings?.length > 0 && (
        <Card style={{ borderColor: "#fcd34d" }}>
          <CardHeader icon="alert-circle" title="Tourist Trap Warnings" />
          <BulletList items={d.tourist_trap_warnings.map((t: any) => typeof t === "string" ? t : (t.description ?? t.name ?? JSON.stringify(t)))} />
        </Card>
      )}

      {d.restaurants?.length > 0 && (
        <Card>
          <CardHeader icon="coffee" title="Recommended Restaurants" />
          {d.restaurants.slice(0, 5).map((r: any, i: number) => (
            <View key={i} style={{ paddingVertical: 7, borderBottomWidth: i < Math.min(d.restaurants.length, 5) - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{r.name}</Text>
              {r.cuisine && <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{r.cuisine}</Text>}
              {r.price_range && <Text style={{ fontSize: 12, color: colors.primary }}>{r.price_range}</Text>}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

export default function CuisineScreen() {
  return (
    <AgentScreen
      title="Cuisine Guide"
      description="Must-try dishes, dietary safety & local dining tips"
      iconName="coffee"
      fetchFn={fetchCuisine}
      renderContent={(data) => <Content data={data} />}
    />
  );
}
