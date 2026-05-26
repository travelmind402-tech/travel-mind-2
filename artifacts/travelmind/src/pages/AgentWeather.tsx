import { AgentPage } from "@/components/AgentPage";
import { fetchWeather } from "@/services/api";
import { Cloud, Thermometer, AlertTriangle, Heart, Wind, Leaf, ChevronRight, Shield, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function StatusBadge({ value, map }: { value: string; map: Record<string, string> }) {
  const color = map[value?.toLowerCase?.()] ?? "bg-muted text-muted-foreground";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{value}</span>;
}

const severityColors: Record<string, string> = {
  clear: "bg-emerald-100 text-emerald-700",
  advisory: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  moderate: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  extreme: "bg-red-100 text-red-700",
};

function WeatherDisplay({ data }: { data: any }) {
  const d = data?.weather_analysis ?? data?.weather ?? data ?? {};

  return (
    <div className="space-y-4">
      {d.summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm leading-relaxed text-foreground">{d.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Severe Alerts */}
      {d.severe_alerts && d.severe_alerts !== "None" && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">{d.severe_alerts}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Conditions */}
        {(d.current_season || d.temperature || d.conditions) && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <Thermometer className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {d.current_season && <p><span className="text-muted-foreground">Season:</span> {d.current_season}</p>}
              {d.temperature && <p><span className="text-muted-foreground">Temp:</span> {d.temperature}</p>}
              {d.conditions && <p><span className="text-muted-foreground">Conditions:</span> {d.conditions}</p>}
              {d.best_time_outdoors && (
                <p className="pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Best outdoors:</span> {d.best_time_outdoors}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Calamity Risk */}
        {d.calamity_prediction_alert && (
          <Card className={d.calamity_prediction_alert.status === "CLEAR" ? "border-emerald-200" : "border-red-200"}>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Calamity Risk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <StatusBadge value={d.calamity_prediction_alert.status} map={severityColors} />
              {d.calamity_prediction_alert.probability_score && (
                <p><span className="text-muted-foreground">Probability:</span> {d.calamity_prediction_alert.probability_score}</p>
              )}
              {d.calamity_prediction_alert.historical_basis && (
                <p className="text-muted-foreground text-xs">{d.calamity_prediction_alert.historical_basis}</p>
              )}
              {d.calamity_prediction_alert.predicted_events?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {d.calamity_prediction_alert.predicted_events.map((e: string) => (
                    <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hazard Risk Assessment */}
      {d.hazard_risk_assessment && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">
              Hazard Risk Assessment
              {d.hazard_risk_assessment.overall_risk_level && (
                <StatusBadge value={d.hazard_risk_assessment.overall_risk_level} map={severityColors} />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.hazard_risk_assessment.primary_hazards?.map((h: any, i: number) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0 text-sm">
                  <StatusBadge value={h.risk_level} map={severityColors} />
                  <div>
                    <span className="font-medium">{h.hazard_type}</span>
                    {h.impact && <p className="text-muted-foreground text-xs mt-0.5">{h.impact}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Travel Health Index */}
      {d.travel_health_index && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Travel Health Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {Object.entries(d.travel_health_index).map(([k, v]) =>
                k !== "overall_health_recommendation" && (
                  <div key={k} className="flex justify-between items-center border-b border-border/50 py-1.5">
                    <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                    <StatusBadge value={String(v)} map={severityColors} />
                  </div>
                )
              )}
            </div>
            {d.travel_health_index.overall_health_recommendation && (
              <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">
                {d.travel_health_index.overall_health_recommendation}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Day-by-Day Forecast */}
      {d.journey_weather_timeline?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Wind className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Day-by-Day Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.journey_weather_timeline.map((day: any, i: number) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="text-xs font-mono bg-muted px-2 py-1 rounded shrink-0">{day.date ?? `Day ${i + 1}`}</div>
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{day.condition ?? day.summary ?? ""}</span>
                    {day.temperature && <span className="text-muted-foreground ml-2">{day.temperature}</span>}
                    {day.recommendation && <p className="text-muted-foreground text-xs mt-0.5">{day.recommendation}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allergen Alerts */}
      {d.allergen_alerts?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Allergen Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.allergen_alerts.map((a: any, i: number) => (
                <div key={i} className="py-1.5 border-b border-border/50 last:border-0 text-sm">
                  <div className="flex items-center gap-3">
                    <StatusBadge value={a.level} map={severityColors} />
                    <span className="font-medium">{a.allergen_type}</span>
                    {a.origin_season && <span className="text-muted-foreground text-xs">({a.origin_season})</span>}
                  </div>
                  {a.precautions && <p className="text-muted-foreground text-xs mt-1 ml-1">{a.precautions}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seasonal Environmental Factors */}
      {d.seasonal_environmental_factors && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Environmental Factors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {d.seasonal_environmental_factors.sensory_note && (
              <p className="italic text-muted-foreground">{d.seasonal_environmental_factors.sensory_note}</p>
            )}
            {d.seasonal_environmental_factors.economic_impact && (
              <p><span className="text-muted-foreground">Economic:</span> {d.seasonal_environmental_factors.economic_impact}</p>
            )}
            {d.seasonal_environmental_factors.infrastructure_risk && (
              <p><span className="text-muted-foreground">Infrastructure:</span> {d.seasonal_environmental_factors.infrastructure_risk}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Packing Tips — supports both packing_tips and packing_recommendations */}
      {(d.packing_tips ?? d.packing_recommendations)?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <ChevronRight className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Packing Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {(d.packing_tips ?? d.packing_recommendations).map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Safety Recommendations */}
      {d.traveler_safety_recommendations?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Safety Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {d.traveler_safety_recommendations.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Emergency Contacts */}
      {d.emergency_contacts_relevant?.length > 0 && (
        <Card className="border-red-100">
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Phone className="w-4 h-4 text-red-500" />
            <CardTitle className="text-sm text-red-600">Emergency Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {d.emergency_contacts_relevant.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AgentWeather() {
  return (
    <AgentPage
      title="Weather Analysis"
      description="Forecast, health risks, allergen alerts, and packing recommendations powered by Gemma 4."
      icon={Cloud}
      fetchData={fetchWeather}
      formatData={(data) => <WeatherDisplay data={data} />}
    />
  );
}
