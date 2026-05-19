import { AgentPage } from "@/components/AgentPage";
import { fetchCulture } from "@/services/api";
import { Globe, BookOpen, Shirt, MessageSquare, Calendar, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const levelColors: Record<string, string> = {
  conservative: "bg-red-100 text-red-700",
  moderate: "bg-amber-100 text-amber-700",
  liberal: "bg-emerald-100 text-emerald-700",
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-red-100 text-red-700",
};

function StatusBadge({ value }: { value: string }) {
  const color = levelColors[value?.toLowerCase?.()] ?? "bg-muted text-muted-foreground";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{value}</span>;
}

function CultureDisplay({ data }: { data: any }) {
  const d = data?.culture_analysis ?? data ?? {};
  const overview = d.destination_overview ?? {};
  const etiquette = d.customs_and_etiquette ?? {};
  const dress = d.dress_code_guide ?? {};
  const langGuide = d.language_guide ?? {};
  const festivals = d.festivals_and_events ?? {};
  const laws = d.local_laws_travelers_must_know ?? [];
  const sensitivity = d.cultural_sensitivity_score ?? {};
  const travelerTips = d.traveler_type_specific_tips ?? {};

  return (
    <div className="space-y-4">
      {d.summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4 text-sm leading-relaxed">{d.summary}</CardContent>
        </Card>
      )}

      {Object.keys(overview).length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Destination Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {overview.cultural_identity && <p>{overview.cultural_identity}</p>}
            <div className="flex flex-wrap gap-2">
              {overview.primary_religion && <Badge variant="outline">{overview.primary_religion}</Badge>}
              {overview.social_conservatism_level && <StatusBadge value={overview.social_conservatism_level} />}
              {overview.traveler_friendliness && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Traveler-friendly:</span>
                  <StatusBadge value={overview.traveler_friendliness} />
                </div>
              )}
            </div>
            {overview.best_cultural_experience && (
              <p className="text-muted-foreground italic text-xs">✨ {overview.best_cultural_experience}</p>
            )}
          </CardContent>
        </Card>
      )}

      {Object.keys(etiquette).length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Customs & Etiquette</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {etiquette.greeting_style && (
              <p className="text-sm"><span className="font-medium">Greeting:</span> {etiquette.greeting_style}</p>
            )}
            {etiquette.tipping_culture && (
              <p className="text-sm"><span className="font-medium">Tipping:</span> {etiquette.tipping_culture}</p>
            )}
            {etiquette.physical_contact_norms && (
              <p className="text-sm"><span className="font-medium">Physical contact:</span> {etiquette.physical_contact_norms}</p>
            )}
            {(etiquette.dos?.length > 0 || etiquette.donts?.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {etiquette.dos?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-1.5">✓ Do</p>
                    <ul className="space-y-1">
                      {etiquette.dos.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-emerald-500 mt-0.5">•</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {etiquette.donts?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 mb-1.5">✕ Don't</p>
                    <ul className="space-y-1">
                      {etiquette.donts.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-red-500 mt-0.5">•</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {etiquette.dining_etiquette?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Dining Etiquette</p>
                <ul className="space-y-1">
                  {etiquette.dining_etiquette.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {Object.keys(dress).length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Shirt className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Dress Code Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dress.general_street_wear && <p><span className="font-medium">Street:</span> {dress.general_street_wear}</p>}
            {dress.religious_sites && <p><span className="font-medium">Religious sites:</span> {dress.religious_sites}</p>}
            {dress.beach_or_resort && <p><span className="font-medium">Beach/Resort:</span> {dress.beach_or_resort}</p>}
            {dress.packing_dress_tips?.length > 0 && (
              <div className="pt-1">
                <p className="text-muted-foreground text-xs mb-1">Packing Tips</p>
                <ul className="space-y-1">
                  {dress.packing_dress_tips.map((t: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground"><span className="text-primary mt-0.5">•</span>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {langGuide.essential_phrases?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Essential Phrases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {langGuide.essential_phrases.map((p: any, i: number) => (
                <div key={i} className="grid grid-cols-3 gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0 text-sm">
                  <span className="text-muted-foreground">{p.phrase}</span>
                  <span className="font-medium">{p.local}</span>
                  <span className="text-muted-foreground italic text-xs">{p.pronunciation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(festivals).length > 0 && festivals.during_travel_dates?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Festivals During Your Visit</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {festivals.during_travel_dates.map((f: any, i: number) => (
              <div key={i} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                {typeof f === "string" ? <p>{f}</p> : (
                  <>
                    <p className="font-medium">{f.name ?? f.festival}</p>
                    {f.dates && <p className="text-muted-foreground text-xs">{f.dates}</p>}
                    {f.significance && <p className="text-muted-foreground">{f.significance}</p>}
                  </>
                )}
              </div>
            ))}
            {festivals.crowd_impact_warning && (
              <p className="text-xs text-orange-600 dark:text-orange-400 pt-1">⚠️ {festivals.crowd_impact_warning}</p>
            )}
          </CardContent>
        </Card>
      )}

      {laws.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            <CardTitle className="text-sm">Local Laws to Know</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {laws.map((law: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-0.5 shrink-0">⚖</span><span>{law}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {Object.keys(sensitivity).length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-4 text-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-medium">Cultural Sensitivity Score:</span>
              <span className="text-2xl font-bold text-primary">{sensitivity.score}/10</span>
              {sensitivity.risk_level && <StatusBadge value={sensitivity.risk_level + " risk"} />}
            </div>
            {sensitivity.explanation && <p className="text-muted-foreground">{sensitivity.explanation}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AgentCulture() {
  return (
    <AgentPage
      title="Cultural Briefing"
      description="Customs, etiquette, dress codes, local laws, festivals, and cultural sensitivity for your destination."
      icon={Globe}
      fetchData={fetchCulture}
      formatData={(data) => <CultureDisplay data={data} />}
    />
  );
}
