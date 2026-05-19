import { AgentPage } from "@/components/AgentPage";
import { fetchBudget } from "@/services/api";
import { Wallet, TrendingDown, Star, CreditCard, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const feasibilityColors: Record<string, string> = {
  comfortable: "bg-emerald-100 text-emerald-700",
  tight: "bg-amber-100 text-amber-700",
  over_budget: "bg-red-100 text-red-700",
};

function BudgetDisplay({ data }: { data: any }) {
  const d = data?.budget_analysis ?? data ?? {};
  const summary = d.trip_summary ?? {};
  const daily = d.daily_breakdown ?? {};
  const total = d.total_trip_estimate ?? {};
  const activities = d.recommended_activities ?? d.suggested_activities ?? [];
  const accommodation = d.accommodation_recommendations ?? [];
  const moneySaving = d.money_saving_tips ?? d.budget_hacks ?? [];
  const hiddenCosts = d.hidden_costs ?? [];
  const currency = d.currency_symbol ?? d.currency ?? "";

  return (
    <div className="space-y-4">
      {d.destination && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{d.destination}</span>
          {currency && <Badge variant="outline" className="text-xs">{currency}</Badge>}
        </div>
      )}

      {Object.keys(summary).length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center mb-2">
              {summary.budget_feasibility && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${feasibilityColors[summary.budget_feasibility] ?? "bg-muted"}`}>
                  {summary.budget_feasibility.replace("_", " ")}
                </span>
              )}
              {summary.budget_tier && <Badge variant="outline" className="capitalize">{summary.budget_tier.replace("_", " ")}</Badge>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {summary.total_days && (
                <div className="text-center p-2 bg-background rounded-lg">
                  <div className="text-xl font-bold text-primary">{summary.total_days}</div>
                  <div className="text-xs text-muted-foreground">Days</div>
                </div>
              )}
              {summary.daily_budget_local && (
                <div className="text-center p-2 bg-background rounded-lg">
                  <div className="text-lg font-bold text-primary">{summary.daily_budget_local}</div>
                  <div className="text-xs text-muted-foreground">Per Day</div>
                </div>
              )}
              {summary.total_budget_local && (
                <div className="text-center p-2 bg-background rounded-lg col-span-2">
                  <div className="text-lg font-bold text-primary">{summary.total_budget_local}</div>
                  <div className="text-xs text-muted-foreground">Total Budget</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(daily).length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(daily).map(([key, val]) => {
                const label = key.replace(/_local|_usd/, "").replace(/_/g, " ");
                const isTotal = key.includes("total");
                return (
                  <div key={key} className={`flex justify-between items-center py-1.5 ${isTotal ? "border-t border-border font-semibold" : "border-b border-border/50"} text-sm`}>
                    <span className={`capitalize ${isTotal ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                    <span className={isTotal ? "text-primary" : ""}>{String(val)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(total).length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Trip Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-sm">
              {Object.entries(total).map(([key, val]) => (
                <div key={key} className="flex justify-between border-b border-border/50 py-1 last:border-0">
                  <span className="text-muted-foreground capitalize">{key.replace(/_total|_local/, "").replace(/_/g, " ")}</span>
                  <span className="font-medium">{String(val)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {accommodation.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Accommodation Picks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accommodation.slice(0, 4).map((a: any, i: number) => (
              <div key={i} className="border-b border-border/50 pb-3 last:border-0 last:pb-0 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{a.name ?? a.hotel_name ?? a.property}</p>
                    {a.area && <p className="text-xs text-muted-foreground">{a.area}</p>}
                  </div>
                  {(a.price_per_night ?? a.nightly_rate ?? a.price) && (
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                      {a.price_per_night ?? a.nightly_rate ?? a.price}/night
                    </span>
                  )}
                </div>
                {a.why_recommended && <p className="text-muted-foreground text-xs mt-1">{a.why_recommended}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activities.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Recommended Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activities.slice(0, 6).map((a: any, i: number) => (
              <div key={i} className="flex items-start justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0 text-sm">
                <div className="flex-1">
                  <p className="font-medium">{a.name ?? a.activity ?? String(a)}</p>
                  {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                </div>
                {(a.cost ?? a.estimated_cost) && (
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded shrink-0">{a.cost ?? a.estimated_cost}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {moneySaving.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-500" />
            <CardTitle className="text-sm">Money-Saving Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {moneySaving.map((tip: any, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-emerald-500 mt-0.5">💡</span>
                  <span>{typeof tip === "string" ? tip : tip.tip ?? JSON.stringify(tip)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {hiddenCosts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <CardTitle className="text-sm">Hidden Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {hiddenCosts.map((cost: any, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-500 mt-0.5">⚠️</span>
                  <span>{typeof cost === "string" ? cost : cost.cost ?? cost.item ?? JSON.stringify(cost)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {d.payment_tips && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Payment Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{typeof d.payment_tips === "string" ? d.payment_tips : JSON.stringify(d.payment_tips)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AgentBudget() {
  return (
    <AgentPage
      title="Budget Planner"
      description="Daily cost breakdown, accommodation picks, hidden costs, and money-saving tips in local currency."
      icon={Wallet}
      fetchData={fetchBudget}
      formatData={(data) => <BudgetDisplay data={data} />}
    />
  );
}
