import { AgentPage } from "@/components/AgentPage";
import { fetchDisruption } from "@/services/api";
import { AlertTriangle, Zap, Bus, Wifi, ShieldAlert, ThumbsUp, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
  always: "bg-red-100 text-red-700",
  often: "bg-orange-100 text-orange-700",
  sometimes: "bg-amber-100 text-amber-700",
  rarely: "bg-emerald-100 text-emerald-700",
  recent: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  old: "bg-muted text-muted-foreground",
};

function StatusBadge({ value }: { value: string }) {
  const color = severityColors[value?.toLowerCase?.()] ?? "bg-muted text-muted-foreground";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{value}</span>;
}

function DisruptionDisplay({ data }: { data: any }) {
  const d = data?.disruption_analysis ?? data ?? {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {d.overall_disruption_risk && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Overall Risk:</span>
            <StatusBadge value={d.overall_disruption_risk} />
          </div>
        )}
        {d.confidence_level && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Confidence:</span>
            <StatusBadge value={d.confidence_level} />
          </div>
        )}
        {d.data_freshness && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Data:</span>
            <StatusBadge value={d.data_freshness} />
          </div>
        )}
      </div>

      {d.disruption_hotspots?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Disruption Hotspots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {d.disruption_hotspots.map((h: any, i: number) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{h.location}</span>
                  <StatusBadge value={h.severity} />
                  <Badge variant="outline" className="text-xs capitalize">{h.disruption_type?.replace(/_/g, " ")}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {h.frequency && <span>Frequency: <strong>{h.frequency}</strong></span>}
                  {h.typical_duration && <span>Duration: <strong>{h.typical_duration}</strong></span>}
                </div>
                {h.advisory && <p className="text-sm">{h.advisory}</p>}
                {h.trigger_condition && <p className="text-xs text-muted-foreground">Trigger: {h.trigger_condition}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {d.power_situation && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs">Power</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {d.power_situation.outage_frequency && <p>Outages: <StatusBadge value={d.power_situation.outage_frequency} /></p>}
              {d.power_situation.typical_duration_hours && <p className="text-muted-foreground text-xs">Avg. {d.power_situation.typical_duration_hours}h</p>}
              {d.power_situation.advisory && <p className="text-xs text-muted-foreground mt-2">{d.power_situation.advisory}</p>}
            </CardContent>
          </Card>
        )}

        {d.transport_situation && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <Bus className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs">Transport</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {d.transport_situation.local_transport_reliability && (
                <p>Reliability: <StatusBadge value={d.transport_situation.local_transport_reliability} /></p>
              )}
              {d.transport_situation.surge_pricing_risk !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Surge pricing: {d.transport_situation.surge_pricing_risk ? "⚠️ Possible" : "✓ Unlikely"}
                </p>
              )}
              {d.transport_situation.advisory && <p className="text-xs text-muted-foreground mt-2">{d.transport_situation.advisory}</p>}
            </CardContent>
          </Card>
        )}

        {d.connectivity_situation && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2">
              <Wifi className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs">Connectivity</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {d.connectivity_situation.mobile_network_risk && (
                <p>Mobile: <StatusBadge value={d.connectivity_situation.mobile_network_risk} /></p>
              )}
              {d.connectivity_situation.atm_reliability && (
                <p>ATM: <StatusBadge value={d.connectivity_situation.atm_reliability} /></p>
              )}
              {d.connectivity_situation.advisory && <p className="text-xs text-muted-foreground mt-2">{d.connectivity_situation.advisory}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {d.scam_alerts?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Scam Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.scam_alerts.map((s: any, i: number) => (
              <div key={i} className="border-l-2 border-orange-400 pl-3 text-sm space-y-1">
                <p className="font-medium">{s.scam_type}</p>
                {s.location && <p className="text-muted-foreground text-xs">{s.location}</p>}
                {s.how_to_avoid && <p className="text-muted-foreground">{s.how_to_avoid}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {d.positive_notes?.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400">Good News</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {d.positive_notes.map((n: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {d.best_backup_plans?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Backup Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {d.best_backup_plans.map((p: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">→</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AgentDisruption() {
  return (
    <AgentPage
      title="Disruption Alerts"
      description="Real-world disruptions, scam alerts, power & transport reliability, and backup plans."
      icon={AlertTriangle}
      fetchData={fetchDisruption}
      formatData={(data) => <DisruptionDisplay data={data} />}
    />
  );
}
