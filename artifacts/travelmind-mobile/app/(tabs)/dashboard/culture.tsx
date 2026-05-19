import React from "react";
import { Text, View } from "react-native";
import { AgentScreen, Card, CardHeader, BulletList } from "@/components/AgentScreen";
import { fetchCulture } from "@/services/api";
import { useColors } from "@/hooks/useColors";

function Content({ data }: { data: any }) {
  const colors = useColors();
  const d = data?.cultural_guide ?? data?.culture ?? data ?? {};

  return (
    <View style={{ gap: 0 }}>
      {d.overview && (
        <Card style={{ backgroundColor: colors.accent, borderColor: colors.accentForeground + "22" }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>{d.overview}</Text>
        </Card>
      )}

      {(d.dos?.length > 0 || d.donts?.length > 0) && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {d.dos?.length > 0 && (
            <Card style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 12, color: "#059669" }}>✓</Text>
                </View>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Do</Text>
              </View>
              <BulletList items={d.dos} />
            </Card>
          )}
          {d.donts?.length > 0 && (
            <Card style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 12, color: "#dc2626" }}>✗</Text>
                </View>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Don't</Text>
              </View>
              <BulletList items={d.donts} />
            </Card>
          )}
        </View>
      )}

      {d.dress_code && (
        <Card>
          <CardHeader icon="user" title="Dress Code" />
          {typeof d.dress_code === "string" ? (
            <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 19 }}>{d.dress_code}</Text>
          ) : (
            Object.entries(d.dress_code).map(([ctx, rule]) => (
              <View key={ctx} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", marginBottom: 2 }}>{ctx.replace(/_/g, " ")}</Text>
                <Text style={{ fontSize: 13, color: colors.foreground }}>{String(rule)}</Text>
              </View>
            ))
          )}
        </Card>
      )}

      {d.essential_phrases?.length > 0 && (
        <Card>
          <CardHeader icon="message-square" title="Essential Phrases" />
          {d.essential_phrases.map((p: any, i: number) => (
            <View key={i} style={{ paddingVertical: 7, borderBottomWidth: i < d.essential_phrases.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{p.phrase ?? p.english ?? ""}</Text>
              {p.translation && <Text style={{ fontSize: 13, color: colors.primary, marginTop: 1 }}>{p.translation}</Text>}
              {p.phonetic && <Text style={{ fontSize: 12, color: colors.mutedForeground, fontStyle: "italic" }}>{p.phonetic}</Text>}
              {p.usage && <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{p.usage}</Text>}
            </View>
          ))}
        </Card>
      )}

      {d.festivals_and_events?.length > 0 && (
        <Card>
          <CardHeader icon="calendar" title="Festivals & Events" />
          {d.festivals_and_events.map((f: any, i: number) => (
            <View key={i} style={{ paddingVertical: 7, borderBottomWidth: i < d.festivals_and_events.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{f.name ?? f.event ?? ""}</Text>
              {f.date && <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{f.date}</Text>}
              {f.description && <Text style={{ fontSize: 12, color: colors.foreground, marginTop: 2, lineHeight: 17 }}>{f.description}</Text>}
            </View>
          ))}
        </Card>
      )}

      {d.local_laws?.length > 0 && (
        <Card style={{ borderColor: "#fcd34d" }}>
          <CardHeader icon="book" title="Local Laws to Know" />
          <BulletList items={d.local_laws.map((l: any) => typeof l === "string" ? l : (l.law ?? l.description ?? JSON.stringify(l)))} />
        </Card>
      )}

      {d.tipping_guide && (
        <Card>
          <CardHeader icon="dollar-sign" title="Tipping Guide" />
          {typeof d.tipping_guide === "string" ? (
            <Text style={{ fontSize: 13, color: colors.foreground }}>{d.tipping_guide}</Text>
          ) : (
            Object.entries(d.tipping_guide).map(([k, v]) => (
              <View key={k} style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>{k.replace(/_/g, " ")}</Text>
                <Text style={{ fontSize: 13, color: colors.foreground }}>{String(v)}</Text>
              </View>
            ))
          )}
        </Card>
      )}
    </View>
  );
}

export default function CultureScreen() {
  return (
    <AgentScreen
      title="Cultural Briefing"
      description="Etiquette, dress codes, local laws & essential phrases"
      iconName="globe"
      fetchFn={fetchCulture}
      renderContent={(data) => <Content data={data} />}
    />
  );
}
