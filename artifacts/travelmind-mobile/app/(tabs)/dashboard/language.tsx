import React from "react";
import { Text, View } from "react-native";
import { AgentScreen, Card, CardHeader, Row, BulletList } from "@/components/AgentScreen";
import { fetchLanguage } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { useTrip } from "@/context/TripContext";

function Content({ data }: { data: any }) {
  const colors = useColors();
  const { tripForm } = useTrip();
  const d = data?.language_guide ?? data?.language ?? data ?? {};
  const customTranslations = d.custom_translations ?? d.custom_phrases ?? [];
  const requestedPhrases = tripForm?.phrases_needed ?? [];
  const phraseHelpRows = customTranslations.length > 0
    ? customTranslations
    : requestedPhrases.map((phrase) => ({ native: phrase }));

  return (
    <View style={{ gap: 0 }}>
      {(d.local_language || d.official_language) && (
        <Card style={{ backgroundColor: colors.accent, borderColor: colors.accentForeground + "22" }}>
          <Row label="Local Language" value={d.local_language ?? d.official_language ?? ""} />
          {(d.english_proficiency || d.english_proficiency_locals) && (
            <Row label="English Proficiency" value={d.english_proficiency ?? d.english_proficiency_locals} />
          )}
          {(d.difficulty_level || d.translation_difficulty) && (
            <Row label="Difficulty for Traveler" value={d.difficulty_level ?? d.translation_difficulty} />
          )}
        </Card>
      )}

      {phraseHelpRows.length > 0 && (
        <Card style={{ backgroundColor: colors.accent, borderColor: colors.primary + "44" }}>
          <CardHeader icon="message-square" title="Phrases You Need Help With" />
          {phraseHelpRows.map((p: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < phraseHelpRows.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{p.native ?? p.english ?? p.phrase ?? ""}</Text>
              {(p.local || p.translation) && (
                <Text style={{ fontSize: 14, color: colors.primary, marginTop: 2, fontFamily: "Inter_500Medium" }}>{p.local ?? p.translation}</Text>
              )}
              {!(p.local || p.translation) && (
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>Translation will appear here after the language agent returns it.</Text>
              )}
              {p.phonetic && (
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontStyle: "italic", marginTop: 1 }}>"{p.phonetic}"</Text>
              )}
              {(p.usage_tip || p.usage) && (
                <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 3, lineHeight: 16 }}>{p.usage_tip ?? p.usage}</Text>
              )}
            </View>
          ))}
        </Card>
      )}

      {d.essential_phrases?.length > 0 && (
        <Card>
          <CardHeader icon="message-square" title="Essential Phrases" />
          {d.essential_phrases.map((p: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < d.essential_phrases.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{p.native ?? p.english ?? p.phrase ?? ""}</Text>
              {(p.local || p.translation) && (
                <Text style={{ fontSize: 14, color: colors.primary, marginTop: 2, fontFamily: "Inter_500Medium" }}>{p.local ?? p.translation}</Text>
              )}
              {p.phonetic && (
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontStyle: "italic", marginTop: 1 }}>"{p.phonetic}"</Text>
              )}
              {(p.usage_tip || p.usage) && (
                <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 3, lineHeight: 16 }}>{p.usage_tip ?? p.usage}</Text>
              )}
            </View>
          ))}
        </Card>
      )}

      {(d.communication_customs || d.etiquette_rules) && (
        <Card>
          <CardHeader icon="users" title="Communication Customs" />
          {typeof (d.communication_customs ?? d.etiquette_rules) === "string" ? (
            <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 19 }}>{d.communication_customs ?? d.etiquette_rules}</Text>
          ) : Array.isArray(d.communication_customs ?? d.etiquette_rules) ? (
            <BulletList items={d.communication_customs ?? d.etiquette_rules} />
          ) : (
            Object.entries(d.communication_customs ?? d.etiquette_rules).map(([k, v]) => (
              <View key={k} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", marginBottom: 2 }}>{k.replace(/_/g, " ")}</Text>
                <Text style={{ fontSize: 13, color: colors.foreground }}>{String(v)}</Text>
              </View>
            ))
          )}
        </Card>
      )}

      {d.body_language_tips?.length > 0 && (
        <Card>
          <CardHeader icon="user" title="Body Language Tips" />
          <BulletList items={d.body_language_tips} />
        </Card>
      )}

      {(d.translation_apps ?? d.translation_apps_recommended)?.length > 0 && (
        <Card>
          <CardHeader icon="smartphone" title="Recommended Translation Apps" />
          {(d.translation_apps ?? d.translation_apps_recommended).map((app: any, i: number) => (
            <View key={i} style={{ paddingVertical: 7, borderBottomWidth: i < (d.translation_apps ?? d.translation_apps_recommended).length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{app.name ?? app.app ?? app}</Text>
              {(app.reason || app.best_for) && <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 1 }}>{app.reason ?? app.best_for}</Text>}
            </View>
          ))}
        </Card>
      )}

      {d.offline_survival_kit?.length > 0 && (
        <Card>
          <CardHeader icon="download" title="Offline Survival Kit" />
          <BulletList items={d.offline_survival_kit} />
        </Card>
      )}

      {d.emergency_phrases?.length > 0 && (
        <Card style={{ borderColor: "#fca5a5" }}>
          <CardHeader icon="alert-circle" title="Emergency Phrases" />
          {d.emergency_phrases.map((p: any, i: number) => (
            <View key={i} style={{ paddingVertical: 6, borderBottomWidth: i < d.emergency_phrases.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{p.english ?? p.phrase ?? ""}</Text>
              {p.translation && <Text style={{ fontSize: 13, color: "#dc2626", marginTop: 1 }}>{p.translation}</Text>}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

export default function LanguageScreen() {
  return (
    <AgentScreen
      title="Language Assistant"
      description="Essential phrases, phonetics & communication customs"
      iconName="message-square"
      fetchFn={fetchLanguage}
      renderContent={(data) => <Content data={data} />}
    />
  );
}
