import { AgentPage } from "@/components/AgentPage";
import { fetchDriving } from "@/services/api";
import { Car, AlertTriangle, Phone, Wrench, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const riskColors: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  extreme: "bg-red-100 text-red-700",
  critical: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  excellent: "bg-emerald-100 text-emerald-700",
  good: "bg-blue-100 text-blue-700",
  poor: "bg-orange-100 text-orange-700",
  dangerous: "bg-red-100 text-red-700",
};

const colorDot: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
};

function StatusBadge({ value }: { value: string }) {
  const color = riskColors[value?.toLowerCase?.()] ?? "bg-muted text-muted-foreground";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${color}`}>{value}</span>;
}

function DrivingDisplay({ data }: { data: any }) {
  const d = data?.driving_analysis ?? data ?? {};

  return (
    <div className="space-y-4">
      {d.trip_driving_summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 mb-2">
              {d.overall_driving_risk && <StatusBadge value={d.overall_driving_risk + " risk"} />}
              {d.should_avoid_self_drive && (
                <Badge className="bg-red-100 text-red-700 border-red-200">Avoid Self-Drive</Badge>
              )}
            </div>
            <p className="text-sm leading-relaxed">{d.trip_driving_summary}</p>
            {d.avoid_reason && <p className="text-xs text-muted-foreground mt-1">{d.avoid_reason}</p>}
          </CardContent>
        </Card>
      )}

      {d.daily_driving_guide?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Daily Driving Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.daily_driving_guide.map((day: any, i: number) => (
              <div key={i} className="flex gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <div className={`w-3 h-3 rounded-full ${colorDot[day.color_code] ?? "bg-muted"}`} />
                  {day.driving_score !== undefined && (
                    <span className="text-xs font-bold text-muted-foreground">{day.driving_score}</span>
                  )}
                </div>
                <div className="flex-1 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">{day.date}</span>
                    <StatusBadge value={day.condition} />
                    {day.best_departure_time && (
                      <span className="text-xs text-muted-foreground">Best depart: {day.best_departure_time}</span>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground">{day.recommendation}</p>
                  {day.active_hazards?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {day.active_hazards.map((h: string) => (
                        <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {d.dangerous_stretches?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <CardTitle className="text-sm">Dangerous Stretches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.dangerous_stretches.map((s: any, i: number) => (
              <div key={i} className="border-l-2 border-red-400 pl-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{s.stretch ?? s.route_name}</span>
                  <StatusBadge value={s.risk_level} />
                  {s.risk_type && <Badge variant="outline" className="text-xs capitalize">{s.risk_type.replace(/_/g, " ")}</Badge>}
                </div>
                {s.advisory && <p className="text-sm text-muted-foreground">{s.advisory}</p>}
                {s.alternative_route && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Alternative: {s.alternative_route}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {d.vehicle_specific_advice && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Vehicle Advice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{d.vehicle_specific_advice.vehicle_type}</span>
              {d.vehicle_specific_advice.suitability_rating && <StatusBadge value={d.vehicle_specific_advice.suitability_rating} />}
            </div>
            {d.vehicle_specific_advice.specific_tips?.length > 0 && (
              <ul className="space-y-1 text-muted-foreground">
                {d.vehicle_specific_advice.specific_tips.map((t: string, i: number) => (
                  <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>{t}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {d.driver_checklist?.length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Driver Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {d.driver_checklist.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">☐</span><span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {d.emergency_contacts?.length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Emergency Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {d.emergency_contacts.map((c: any, i: number) => (
                <div key={i} className="text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.service}</span>
                    <span className="font-mono text-primary">{c.number}</span>
                  </div>
                  {c.when_to_call && <p className="text-xs text-muted-foreground">{c.when_to_call}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {(d.fuel_advisory || d.parking_advisory || d.night_driving_assessment) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {d.fuel_advisory && <p><span className="font-medium">Fuel:</span> {d.fuel_advisory}</p>}
            {d.parking_advisory && <p><span className="font-medium">Parking:</span> {d.parking_advisory}</p>}
            {d.night_driving_assessment && <p><span className="font-medium">Night Driving:</span> {d.night_driving_assessment}</p>}
            {d.best_driving_day && <p><span className="font-medium">Best Day:</span> <span className="font-mono">{d.best_driving_day}</span></p>}
            {d.worst_driving_day && <p><span className="font-medium">Worst Day:</span> <span className="font-mono">{d.worst_driving_day}</span></p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AgentDriving() {
  return (
    <AgentPage
      title="Driving Intelligence"
      description="Daily driving conditions, dangerous stretches, emergency contacts, and road safety for your route."
      icon={Car}
      fetchData={fetchDriving}
      formatData={(data) => <DrivingDisplay data={data} />}
    />
  );
}
