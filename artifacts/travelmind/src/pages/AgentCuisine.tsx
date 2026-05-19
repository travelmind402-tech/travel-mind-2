import { AgentPage } from "@/components/AgentPage";
import { fetchCuisine } from "@/services/api";
import { Utensils, MapPin, Droplets, AlertCircle, Star } from "lucide-react";
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
  const street = d.street_food_guide ?? {};
  const dietary = d.dietary_accommodation ?? {};
  const drinks = d.local_drinks ?? {};
  const traps = d.tourist_trap_foods ?? [];
  const budget = d.budget_meal_plan ?? {};

  return (
    <div className="space-y-4">
      {d.destination && (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold">{d.destination}</span>
          {d.currency_used && <Badge variant="outline" className="text-xs">{d.currency_used}</Badge>}
        </div>
      )}

      {overview.food_culture && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4 text-sm leading-relaxed">{overview.food_culture}</CardContent>
        </Card>
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
                    {dish.local_name && <span className="text-xs text-muted-foreground ml-2">({dish.local_name})</span>}
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
                    <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium ${dietColors[tag] ?? "bg-muted text-muted-foreground"}`}>{tag.replace(/_/g, " ")}</span>
                  ))}
                  {dish.where_to_find && <Badge variant="outline" className="text-xs capitalize">{dish.where_to_find.replace(/_/g, " ")}</Badge>}
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
            {street.safety_rating && (
              <p><span className="text-muted-foreground">Safety:</span> <span className="capitalize font-medium">{street.safety_rating}</span></p>
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

      <div className="grid sm:grid-cols-2 gap-4">
        {Object.keys(dietary).length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
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

        {Object.keys(drinks).length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Local Drinks</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {drinks.water_safety && (
                <p className={`font-medium ${drinks.water_safety === "safe" ? "text-emerald-600" : "text-orange-600"}`}>
                  Water: {drinks.water_safety === "safe" ? "✓ Tap safe" : drinks.water_safety === "bottle_only" ? "⚠️ Bottled only" : "⚠️ Boil first"}
                </p>
              )}
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

      {Object.keys(budget).length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Budget Meal Plan</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {budget.cheap_breakfast && <p><span className="text-muted-foreground">Breakfast:</span> {budget.cheap_breakfast}</p>}
            {budget.cheap_lunch && <p><span className="text-muted-foreground">Lunch:</span> {budget.cheap_lunch}</p>}
            {budget.cheap_dinner && <p><span className="text-muted-foreground">Dinner:</span> {budget.cheap_dinner}</p>}
            <div className="flex gap-4 pt-1 border-t border-border">
              {budget.daily_food_budget_usd_minimum && (
                <p><span className="text-muted-foreground">Min/day:</span> <strong>${budget.daily_food_budget_usd_minimum}</strong></p>
              )}
              {budget.daily_food_budget_usd_comfortable && (
                <p><span className="text-muted-foreground">Comfortable:</span> <strong>${budget.daily_food_budget_usd_comfortable}</strong></p>
              )}
            </div>
          </CardContent>
        </Card>
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
