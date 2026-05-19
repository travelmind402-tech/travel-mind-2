import { AgentPage } from "@/components/AgentPage";
import { useTrip } from "@/context/TripContext";
import { fetchLanguage } from "@/services/api";
import { MessageSquare, Globe, BookOpen, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const proficiencyColors: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-red-100 text-red-700",
  easy: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
};

function StatusBadge({ value }: { value: string }) {
  const color = proficiencyColors[value?.toLowerCase?.()] ?? "bg-muted text-muted-foreground";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{value}</span>;
}

function LanguageDisplay({ data }: { data: any }) {
  const { tripForm } = useTrip();
  const d = data?.language_analysis ?? data ?? {};
  const phrases = d.essential_phrases ?? [];
  const customTranslations = d.custom_translations ?? d.custom_phrases ?? [];
  const requestedPhrases = tripForm?.phrases_needed ?? [];
  const phraseHelpRows = customTranslations.length > 0
    ? customTranslations
    : requestedPhrases.map((phrase) => ({ native: phrase }));
  const customs = d.communication_customs ?? d.etiquette_rules ?? {};
  const translationApps = d.translation_apps ?? d.recommended_apps ?? d.translation_apps_recommended ?? [];
  const scripts = d.script_learning_tips ?? d.script_tips ?? d.script_reading_guide ?? {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {d.destination && <span className="font-semibold">{d.destination}</span>}
        {d.local_language && <Badge>{d.local_language}</Badge>}
        {d.script && <Badge variant="outline">{d.script}</Badge>}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {d.english_proficiency_locals && (
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">English Level</p>
            <StatusBadge value={d.english_proficiency_locals} />
          </div>
        )}
        {d.translation_difficulty && (
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
            <StatusBadge value={d.translation_difficulty} />
          </div>
        )}
        {d.script && (
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Script</p>
            <span className="text-sm font-medium">{d.script}</span>
          </div>
        )}
      </div>

      {phraseHelpRows.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Phrases You Need Help With</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {phraseHelpRows.map((p: any, i: number) => (
                <div key={i} className="border border-border rounded-lg bg-card p-3 space-y-1">
                  <p className="text-sm text-muted-foreground">{p.native ?? p.english ?? p.phrase ?? ""}</p>
                  {(p.local || p.translation) ? (
                    <p className="font-semibold text-sm text-foreground">{p.local ?? p.translation}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Translation will appear here after the language agent returns it.
                    </p>
                  )}
                  {p.phonetic && (
                    <p className="text-xs text-primary italic mt-0.5">{p.phonetic}</p>
                  )}
                  {(p.usage_tip || p.usage) && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-1.5">
                      {p.usage_tip ?? p.usage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {phrases.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Essential Phrases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {phrases.map((p: any, i: number) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-muted-foreground">{p.native}</span>
                  </div>
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{p.local}</p>
                      {p.phonetic && (
                        <p className="text-xs text-primary italic mt-0.5">{p.phonetic}</p>
                      )}
                    </div>
                  </div>
                  {p.usage_tip && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-1.5">{p.usage_tip}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {d.survival_phrases?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Survival Phrases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {d.survival_phrases.map((p: any, i: number) => (
                <div key={i} className="bg-muted/50 rounded-lg p-2.5 text-sm">
                  <p className="text-muted-foreground text-xs">{p.situation ?? p.context}</p>
                  <p className="font-medium mt-0.5">{p.local}</p>
                  {p.phonetic && <p className="text-primary italic text-xs">{p.phonetic}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(customs).length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Communication Customs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {Object.entries(customs).map(([key, val]) => (
              <div key={key} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                <span className="ml-1">{String(val)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(translationApps.length > 0 || d.offline_translation_tips) && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Tech & Translation Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {translationApps.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Recommended Apps</p>
                <div className="flex flex-wrap gap-1.5">
                  {translationApps.map((app: any) => (
                    <Badge key={typeof app === "string" ? app : app.name ?? app.app} variant="secondary">
                      {typeof app === "string" ? app : app.name ?? app.app}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {d.offline_translation_tips && (
              <p className="text-muted-foreground">{d.offline_translation_tips}</p>
            )}
          </CardContent>
        </Card>
      )}

      {Object.keys(scripts).length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Script Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {Object.entries(scripts).map(([k, v]) => (
              <p key={k}><span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span> {String(v)}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {d.quick_learning_tips?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Learning Tips</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {d.quick_learning_tips.map((tip: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span><span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AgentLanguage() {
  return (
    <AgentPage
      title="Language Assistant"
      description="Essential phrases with phonetics, script tips, translation apps, and communication customs."
      icon={MessageSquare}
      fetchData={fetchLanguage}
      formatData={(data) => <LanguageDisplay data={data} />}
    />
  );
}
