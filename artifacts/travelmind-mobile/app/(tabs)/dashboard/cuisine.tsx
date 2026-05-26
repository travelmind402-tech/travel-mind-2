import React from "react";
import { Text, View } from "react-native";
import { AgentScreen, Card, CardHeader, Row, Pill, BulletList } from "@/components/AgentScreen";
import { fetchCuisine } from "@/services/api";
import { useColors } from "@/hooks/useColors";

const DIET_COLORS: Record<string, string> = {
  vegetarian: "#10b981",
  vegan: "#16a34a",
  halal: "#3b82f6",
  gluten_free: "#f59e0b",
};

function Content({ data }: { data: any }) {
  const colors = useColors();
  const d = data?.cuisine_analysis ?? data?.cuisine_guide ?? data?.cuisine ?? data ?? {};
  const overview = d.cuisine_overview ?? {};
  const dishes = d.must_try_dishes ?? [];
  const restaurants = d.recommended_restaurants ?? d.restaurants ?? [];
  const street = d.street_food_guide ?? {};
  const markets = d.food_markets ?? [];
  const dietary = d.dietary_accommodation ?? {};
  const drinks = d.local_drinks ?? {};
  const traps = d.tourist_trap_foods ?? d.tourist_trap_warnings ?? [];
  const budget = d.budget_meal_plan ?? {};
  const experiences = d.food_experiences ?? [];
  const weatherDining = d.weather_dining_impact ?? {};

  return (
    <View style={{ gap: 0 }}>
      {/* Food Culture */}
      {overview.food_culture && (
        <Card style={{ backgroundColor: colors.accent, borderColor: colors.accentForeground + "22" }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>{overview.food_culture}</Text>
        </Card>
      )}

      {/* Signature Ingredients */}
      {overview.signature_ingredients?.length > 0 && (
        <Card>
          <CardHeader icon="leaf" title="Key Ingredients" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
            {overview.signature_ingredients.map((i: string) => <Pill key={i} label={i} />)}
          </View>
        </Card>
      )}

      {/* Meal Timings & Customs */}
      {(overview.meal_timings || overview.eating_customs) && (
        <Card>
          <CardHeader icon="clock" title="Dining Info" />
          {overview.meal_timings && Object.entries(overview.meal_timings).map(([meal, time]) => (
            <Row key={meal} label={meal} value={String(time)} />
          ))}
          {overview.tipping_at_restaurants && <Row label="Tipping" value={overview.tipping_at_restaurants} />}
          {overview.eating_customs && (
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 8, lineHeight: 17 }}>{overview.eating_customs}</Text>
          )}
        </Card>
      )}

      {/* Must-Try Dishes */}
      {dishes.length > 0 && (
        <Card>
          <CardHeader icon="star" title="Must-Try Dishes" />
          {dishes.map((dish: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < dishes.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                    {dish.dish_name ?? dish.name ?? dish}
                    {dish.local_name && dish.local_name !== dish.dish_name
                      ? <Text style={{ fontFamily: "Inter_400Regular", color: colors.mutedForeground, fontSize: 12 }}> ({dish.local_name})</Text>
                      : null}
                  </Text>
                </View>
                {(dish.estimated_cost_local ?? dish.estimated_cost_usd) && (
                  <View style={{ backgroundColor: colors.muted, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>
                      {dish.estimated_cost_local ?? `$${dish.estimated_cost_usd}`}
                    </Text>
                  </View>
                )}
              </View>
              {dish.description && <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2, lineHeight: 17 }}>{dish.description}</Text>}
              {dish.dietary_tags?.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                  {dish.dietary_tags.map((tag: string) => (
                    <Pill key={tag} label={tag.replace(/_/g, " ")} color={DIET_COLORS[tag]} />
                  ))}
                </View>
              )}
              {dish.ordering_tip && <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>💡 {dish.ordering_tip}</Text>}
              {dish.allergy_flag && dish.allergy_flag !== "none" && (
                <Text style={{ fontSize: 12, color: "#ea580c", marginTop: 3 }}>⚠️ {dish.allergy_flag}</Text>
              )}
            </View>
          ))}
        </Card>
      )}

      {/* Recommended Restaurants */}
      {restaurants.length > 0 && (
        <Card>
          <CardHeader icon="coffee" title="Recommended Restaurants" />
          {restaurants.map((r: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < restaurants.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1 }}>{r.name}</Text>
                {r.estimated_cost_per_person_local && (
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{r.estimated_cost_per_person_local}</Text>
                )}
              </View>
              {r.address && <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{r.address}</Text>}
              {r.cuisine_type && <Text style={{ fontSize: 12, color: colors.primary, marginTop: 2 }}>{r.cuisine_type.replace(/;/g, " / ")}</Text>}
              {r.must_order?.length > 0 && (
                <Text style={{ fontSize: 12, color: colors.foreground, marginTop: 3 }}>🍽 {r.must_order.join(", ")}</Text>
              )}
              {r.insider_tip && <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>💡 {r.insider_tip}</Text>}
            </View>
          ))}
        </Card>
      )}

      {/* Street Food Guide */}
      {Object.keys(street).length > 0 && (
        <Card>
          <CardHeader icon="map-pin" title="Street Food Guide" />
          {street.best_areas?.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Best Areas</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                {street.best_areas.map((a: string) => <Pill key={a} label={a} />)}
              </View>
            </View>
          )}
          {street.best_time_to_visit && <Row label="Best Time" value={street.best_time_to_visit} />}
          {street.safety_rating && <Row label="Safety" value={street.safety_rating} />}
          {street.average_meal_cost_local && <Row label="Avg Cost" value={street.average_meal_cost_local} />}
          {street.must_try_street_foods?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Must Try</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                {street.must_try_street_foods.map((f: string) => <Pill key={f} label={f} />)}
              </View>
            </View>
          )}
          {(street.hygiene_tips ?? street.safety_tips)?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Hygiene Tips</Text>
              <BulletList items={street.hygiene_tips ?? street.safety_tips} />
            </View>
          )}
        </Card>
      )}

      {/* Food Markets */}
      {markets.length > 0 && (
        <Card>
          <CardHeader icon="shopping-bag" title="Food Markets" />
          {markets.map((m: any, i: number) => (
            <View key={i} style={{ paddingVertical: 7, borderBottomWidth: i < markets.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{m.name}</Text>
                {m.best_time && <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{m.best_time}</Text>}
              </View>
              {m.address && <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 1 }}>{m.address}</Text>}
              {m.what_to_buy?.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                  {m.what_to_buy.map((item: string) => <Pill key={item} label={item} />)}
                </View>
              )}
            </View>
          ))}
        </Card>
      )}

      {/* Weather & Dining */}
      {Object.keys(weatherDining).length > 0 && (
        <Card style={{ borderColor: "#93c5fd" }}>
          <CardHeader icon="cloud" title="Weather & Dining" />
          {weatherDining.note && <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 17, marginBottom: 6 }}>{weatherDining.note}</Text>}
          {weatherDining.street_food_warning && <Text style={{ fontSize: 12, color: "#ea580c", marginBottom: 4 }}>⚠️ {weatherDining.street_food_warning}</Text>}
          {weatherDining.indoor_alternatives && <Text style={{ fontSize: 12, color: colors.foreground, marginBottom: 4 }}>🏠 {weatherDining.indoor_alternatives}</Text>}
          {weatherDining.seasonal_dish_recommendation && <Text style={{ fontSize: 12, color: "#16a34a" }}>🌿 {weatherDining.seasonal_dish_recommendation}</Text>}
        </Card>
      )}

      {/* Dietary Accommodation */}
      {Object.keys(dietary).length > 0 && !Array.isArray(dietary) && (
        <Card>
          <CardHeader icon="check-circle" title="Dietary Accommodation" />
          {dietary.vegetarian_friendly !== undefined && (
            <Row label="Vegetarian" value={dietary.vegetarian_friendly ? "✓ Friendly" : "Limited"} />
          )}
          {dietary.vegan_options && <Row label="Vegan" value={dietary.vegan_options} />}
          {dietary.halal_availability && <Row label="Halal" value={dietary.halal_availability} />}
          {dietary.gluten_free_options && <Row label="Gluten-Free" value={dietary.gluten_free_options} />}
          {dietary.allergy_warning && (
            <Text style={{ fontSize: 12, color: "#ea580c", marginTop: 6 }}>⚠️ {dietary.allergy_warning}</Text>
          )}
        </Card>
      )}

      {/* Local Drinks */}
      {Object.keys(drinks).length > 0 && (
        <Card>
          <CardHeader icon="droplets" title="Local Drinks" />
          {drinks.water_safety && (
            <Row label="Water" value={drinks.water_safety?.toLowerCase().includes("bottle") ? "⚠️ Bottled only" : drinks.water_safety?.toLowerCase() === "safe" ? "✓ Tap safe" : drinks.water_safety} />
          )}
          {drinks.best_local_cafe && <Row label="Best Cafe" value={drinks.best_local_cafe} />}
          {drinks.non_alcoholic?.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginBottom: 4 }}>Non-alcoholic</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                {drinks.non_alcoholic.map((d: string) => <Pill key={d} label={d} />)}
              </View>
            </View>
          )}
          {drinks.alcoholic?.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginBottom: 4 }}>Alcoholic</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                {drinks.alcoholic.map((d: string) => <Pill key={d} label={d} />)}
              </View>
            </View>
          )}
        </Card>
      )}

      {/* Seasonal Specials */}
      {d.seasonal_specials?.length > 0 && (
        <Card>
          <CardHeader icon="sun" title="Seasonal Specials" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
            {d.seasonal_specials.map((s: string) => <Pill key={s} label={s} color="#16a34a" />)}
          </View>
        </Card>
      )}

      {/* Tourist Trap Warnings */}
      {traps.length > 0 && (
        <Card style={{ borderColor: "#fcd34d" }}>
          <CardHeader icon="alert-circle" title="Tourist Trap Foods" />
          {traps.map((t: any, i: number) => (
            <View key={i} style={{ paddingVertical: 6, borderBottomWidth: i < traps.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              {typeof t === "string" ? (
                <Text style={{ fontSize: 13, color: colors.foreground }}>{t}</Text>
              ) : (
                <>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                    {t.item ?? t.name ?? ""} {t.location ? <Text style={{ fontFamily: "Inter_400Regular", color: colors.mutedForeground, fontSize: 11 }}>@ {t.location}</Text> : null}
                  </Text>
                  {t.warning && <Text style={{ fontSize: 12, color: "#ea580c", marginTop: 2 }}>{t.warning}</Text>}
                  {t.better_alternative && <Text style={{ fontSize: 12, color: "#16a34a", marginTop: 1 }}>Better: {t.better_alternative}</Text>}
                </>
              )}
            </View>
          ))}
        </Card>
      )}

      {/* Budget Meal Plan */}
      {Object.keys(budget).length > 0 && (
        <Card style={{ backgroundColor: colors.muted + "80" }}>
          <CardHeader icon="dollar-sign" title="Budget Meal Plan" />
          {budget.breakfast_options?.length > 0 && <Row label="Breakfast" value={budget.breakfast_options.join(" / ")} />}
          {budget.lunch_options?.length > 0 && <Row label="Lunch" value={budget.lunch_options.join(" / ")} />}
          {budget.dinner_options?.length > 0 && <Row label="Dinner" value={budget.dinner_options.join(" / ")} />}
          {budget.daily_food_budget_estimate_local && <Row label="Daily estimate" value={budget.daily_food_budget_estimate_local} />}
          {budget.money_saving_tips?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <BulletList items={budget.money_saving_tips} />
            </View>
          )}
        </Card>
      )}

      {/* Food Experiences */}
      {experiences.length > 0 && (
        <Card>
          <CardHeader icon="compass" title="Food Experiences" />
          {experiences.map((e: any, i: number) => (
            <View key={i} style={{ paddingVertical: 7, borderBottomWidth: i < experiences.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1 }}>{e.experience}</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{e.duration}</Text>
              </View>
              {e.estimated_cost_local && <Text style={{ fontSize: 11, color: colors.primary, marginTop: 1 }}>{e.estimated_cost_local}</Text>}
              {e.description && <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2, lineHeight: 17 }}>{e.description}</Text>}
            </View>
          ))}
        </Card>
      )}

      {/* Emergency Food */}
      {d.emergency_food && (
        <Text style={{ fontSize: 12, color: colors.mutedForeground, paddingHorizontal: 4, paddingBottom: 8 }}>🆘 Emergency food: {d.emergency_food}</Text>
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
