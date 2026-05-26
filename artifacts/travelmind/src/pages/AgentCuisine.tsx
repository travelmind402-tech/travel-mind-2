import { AgentPage } from "@/components/AgentPage";
import { fetchCuisine } from "@/services/api";
import { Utensils, MapPin, Droplets, AlertCircle, Star, ShoppingBag, Coffee, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const dietColors: Record<string, string> = {
  vegetarian: "bg-emerald-100 text-emerald-700",
  vegan: "bg-green-100 text-green-700",
  halal: "bg-blue-100 text-blue-700",
  kosher: "bg-violet-100 text-violet-700",
  gluten_free: "bg-amber-100 text-amber-700",
};

function CuisineDisplay({ data }: { data: any }) {
  const d = data?.cuisine_analysis ?? data ?? {};
  const overview = d.cuisine_overview ?? {};
  const dishes = d.must_try_dishes ?? [];
  const restaurants = d.recommended_restaurants ?? [];
  const street = d.street_food_guide ?? {};
  const markets = d.food_markets ?? [];
  const dietary = d.dietary_accommodation ?? {};
  const drinks = d.local_drinks ?? {};
  const traps = d.tourist_trap_foods ?? [];
  const budget = d.budget_meal_plan ?? {};
  const experiences = d.food_experiences ?? [];
  const weatherDining = d.weather_dining_impact ?? {};

  return (
    <div className="space-y-4">
      {d.destination && (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold">{d.destination}</span>
          {d.currency_used && <Badge variant="outline" className="text-xs">{d.currency_used}</Badge>}
          {d.overall_food_rating && <Badge className="text-xs capitalize bg-emerald-100 text-emerald-700">{d.overall_food_rating}</Badge>}
        </div>
      )}

      {overview.food_culture && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4 text-sm leading-relaxed">{overview.food_culture}</CardContent>
        </Card>
      )}

      {/* Signature Ingredients */}
      {overview.signature_ingredients?.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-1">Key ingredients:</span>
          {overview.signature_ingredients.map((i: string) => (
            <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {overview.eating_customs && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Eating Customs</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>{overview.eating_customs}</p>
              {overview.tipping_at_restaurants && <p><span className="font-medium text-foreground">Tipping:</span> {overview.tipping_at_restaurants}</p>}
            </CardContent>
          </Card>
        )}
        {overview.meal_timings && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Meal Timings</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {Object.entries(overview.meal_timings).map(([meal, time]) => (
                <div key={meal} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{meal}</span>
                  <span>{String(time)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Must-Try Dishes */}
      {dishes.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Must-Try Dishes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dishes.map((dish: any, i: number) => (
              <div key={i} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-sm">{dish.dish_name}</span>
                    {dish.local_name && dish.local_name !== dish.dish_name && (
                      <span className="text-xs text-muted-foreground ml-2">({dish.local_name})</span>
                    )}
                  </div>
                  {(dish.estimated_cost_local ?? dish.estimated_cost_usd) && (
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded shrink-0">
                      {dish.estimated_cost_local ?? `$${dish.estimated_cost_usd}`}
                    </span>
                  )}
                </div>
                {dish.description && <p className="text-sm text-muted-foreground mt-1">{dish.description}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {dish.dietary_tags?.map((tag: string) => (
                    <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium ${dietColors[tag] ?? "bg-muted text-muted-foreground"}`}>
                      {tag.replace(/_/g, " ")}
                    </span>
                  ))}
                  {dish.where_to_find && <Badge variant="outline" className="text-xs">{dish.where_to_find}</Badge>}
                  {dish.seasonal_availability && <Badge variant="outline" className="text-xs capitalize">{dish.seasonal_availability.replace(/_/g, " ")}</Badge>}
                </div>
                {dish.ordering_tip && <p className="text-xs text-primary mt-1">💡 {dish.ordering_tip}</p>}
                {dish.allergy_flag && dish.allergy_flag !== "none" && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">⚠️ {dish.allergy_flag}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommended Restaurants */}
      {restaurants.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Recommended Restaurants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {restaurants.map((r: any, i: number) => (
              <div key={i} className="border-b border-border/50 pb-3 last:border-0 last:pb-0 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{r.name}</span>
                  {r.estimated_cost_per_person_local && (
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded shrink-0">{r.estimated_cost_per_person_local}</span>
                  )}
                </div>
                {r.address && <p className="text-xs text-muted-foreground mt-0.5">{r.address}</p>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.cuisine_type && <Badge variant="secondary" className="text-xs capitalize">{r.cuisine_type.replace(/;/g, " / ")}</Badge>}
                  {r.best_for && <Badge variant="outline" className="text-xs">{r.best_for}</Badge>}
                  {r.dietary_options?.map((d: string) => (
                    <span key={d} className={`px-2 py-0.5 rounded-full text-xs font-medium ${dietColors[d] ?? "bg-muted text-muted-foreground"}`}>
                      {d.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                {r.must_order?.length > 0 && (
                  <p className="text-xs text-primary mt-1">🍽 Order: {r.must_order.join(", ")}</p>
                )}
                {r.insider_tip && <p className="text-xs text-muted-foreground mt-0.5">💡 {r.insider_tip}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Street Food Guide */}
      {Object.keys(street).length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Street Food Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {street.best_areas?.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Best Areas</p>
                <div className="flex flex-wrap gap-1">
                  {street.best_areas.map((a: string) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}
                </div>
              </div>
            )}
            {street.best_time_to_visit && <p><span className="text-muted-foreground">Best Time:</span> {street.best_time_to_visit}</p>}
            {street.safety_rating && <p><span className="text-muted-foreground">Safety:</span> <span className="capitalize font-medium">{street.safety_rating}</span></p>}
            {street.average_meal_cost_local && <p><span className="text-muted-foreground">Avg cost:</span> {street.average_meal_cost_local}</p>}
            {street.must_try_street_foods?.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Must Try</p>
                <div className="flex flex-wrap gap-1">
                  {street.must_try_street_foods.map((f: string) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)}
                </div>
              </div>
            )}
            {street.hygiene_tips?.length > 0 && (
              <div className="pt-1">
                <p className="text-muted-foreground text-xs mb-1">Hygiene Tips</p>
                <ul className="space-y-1">
                  {street.hygiene_tips.map((t: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground"><span className="text-primary mt-0.5">•</span>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Food Markets */}
      {markets.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Food Markets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {markets.map((m: any, i: number) => (
              <div key={i} className="border-b border-border/50 pb-2 last:border-0 last:pb-0 text-sm">
                <div className="flex items-start justify-between">
                  <span className="font-medium">{m.name}</span>
                  {m.best_time && <span className="text-xs text-muted-foreground">{m.best_time}</span>}
                </div>
                {m.address && <p className="text-xs text-muted-foreground mt-0.5">{m.address}</p>}
                {m.what_to_buy?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {m.what_to_buy.map((item: string) => <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>)}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weather Dining Impact */}
      {Object.keys(weatherDining).length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700 dark:text-blue-300">Weather & Dining</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {weatherDining.note && <p className="text-muted-foreground">{weatherDining.note}</p>}
            {weatherDining.street_food_warning && <p className="text-orange-600 dark:text-orange-400 text-xs">⚠️ {weatherDining.street_food_warning}</p>}
            {weatherDining.indoor_alternatives && <p className="text-xs">🏠 {weatherDining.indoor_alternatives}</p>}
            {weatherDining.seasonal_dish_recommendation && <p className="text-emerald-600 dark:text-emerald-400 text-xs">🌿 {weatherDining.seasonal_dish_recommendation}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Dietary Accommodation */}
        {Object.keys(dietary).length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <Leaf className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Dietary Accommodation</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              {dietary.vegetarian_friendly !== undefined && (
                <p><span className="text-muted-foreground">Vegetarian:</span> {dietary.vegetarian_friendly ? "✓ Friendly" : "Limited"}</p>
              )}
              {dietary.vegan_options && <p><span className="text-muted-foreground">Vegan:</span> {dietary.vegan_options}</p>}
              {dietary.halal_availability && <p><span className="text-muted-foreground">Halal:</span> {dietary.halal_availability}</p>}
              {dietary.gluten_free_options && <p><span className="text-muted-foreground">Gluten-Free:</span> {dietary.gluten_free_options}</p>}
              {dietary.allergy_warning && (
                <p className="text-orange-600 dark:text-orange-400 text-xs pt-1">⚠️ {dietary.allergy_warning}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Local Drinks */}
        {Object.keys(drinks).length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Local Drinks</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {drinks.water_safety && (
                <p className={`font-medium ${drinks.water_safety?.toLowerCase() === "safe" ? "text-emerald-600" : "text-orange-600"}`}>
                  Water: {drinks.water_safety?.toLowerCase() === "safe" ? "✓ Tap safe" : drinks.water_safety?.toLowerCase().includes("bottle") ? "⚠️ Bottled only" : `⚠️ ${drinks.water_safety}`}
                </p>
              )}
              {drinks.best_local_cafe && <p><span className="text-muted-foreground">Best Cafe:</span> {drinks.best_local_cafe}</p>}
              {drinks.non_alcoholic?.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Non-alcoholic</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {drinks.non_alcoholic.map((d: string) => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
                  </div>
                </div>
              )}
              {drinks.alcoholic?.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Alcoholic</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {drinks.alcoholic.map((d: string) => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Seasonal Specials */}
      {d.seasonal_specials?.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-1">🌿 Seasonal now:</span>
          {d.seasonal_specials.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
        </div>
      )}

      {/* Tourist Trap Foods */}
      {traps.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <CardTitle className="text-sm">Tourist Trap Foods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {traps.map((t: any, i: number) => (
              <div key={i} className="text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <p className="font-medium">{t.item} <span className="text-muted-foreground text-xs">@ {t.location}</span></p>
                <p className="text-orange-600 dark:text-orange-400 text-xs mt-0.5">{t.warning}</p>
                {t.better_alternative && <p className="text-emerald-600 dark:text-emerald-400 text-xs">Better: {t.better_alternative}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Budget Meal Plan */}
      {Object.keys(budget).length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Budget Meal Plan</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {budget.breakfast_options?.length > 0 && (
              <p><span className="text-muted-foreground">Breakfast:</span> {budget.breakfast_options.join(" / ")}</p>
            )}
            {budget.lunch_options?.length > 0 && (
              <p><span className="text-muted-foreground">Lunch:</span> {budget.lunch_options.join(" / ")}</p>
            )}
            {budget.dinner_options?.length > 0 && (
              <p><span className="text-muted-foreground">Dinner:</span> {budget.dinner_options.join(" / ")}</p>
            )}
            {budget.daily_food_budget_estimate_local && (
              <p className="pt-1 border-t border-border"><span className="text-muted-foreground">Daily estimate:</span> <strong>{budget.daily_food_budget_estimate_local}</strong></p>
            )}
            {budget.money_saving_tips?.length > 0 && (
              <ul className="pt-1 space-y-1">
                {budget.money_saving_tips.map((t: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground text-xs"><span className="text-primary mt-0.5">•</span>{t}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Food Experiences */}
      {experiences.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Coffee className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Food Experiences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {experiences.map((e: any, i: number) => (
              <div key={i} className="text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <div className="flex items-start justify-between">
                  <span className="font-medium">{e.experience}</span>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {e.duration && <span>{e.duration}</span>}
                    {e.estimated_cost_local && <span className="font-mono">{e.estimated_cost_local}</span>}
                  </div>
                </div>
                {e.description && <p className="text-muted-foreground text-xs mt-0.5">{e.description}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Emergency Food */}
      {d.emergency_food && (
        <p className="text-xs text-muted-foreground px-1">🆘 Emergency food: {d.emergency_food}</p>
      )}
    </div>
  );
}

export default function AgentCuisine() {
  return (
    <AgentPage
      title="Cuisine Guide"
      description="Must-try dishes, street food map, dietary accommodation, local drinks, and tourist food traps."
      icon={Utensils}
      fetchData={fetchCuisine}
      formatData={(data) => <CuisineDisplay data={data} />}
    />
  );
}
