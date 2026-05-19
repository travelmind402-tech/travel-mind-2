import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTrip } from "@/context/TripContext";

interface Props {
  title: string;
  description: string;
  iconName: keyof typeof Feather.glyphMap;
  fetchFn: (tripId: string) => Promise<any>;
  renderContent: (data: any) => React.ReactNode;
}

export function AgentScreen({ title, description, iconName, fetchFn, renderContent }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tripId } = useTrip();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!tripId || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(tripId);
      setData(result);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const bottom = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.hero, { backgroundColor: colors.primary }]}>
        <View style={s.iconWrap}>
          <Feather name={iconName} size={24} color="#fff" />
        </View>
        <Text style={s.heroTitle}>{title}</Text>
        <Text style={s.heroDesc}>{description}</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        {!data && !loading && !error && (
          <Pressable
            style={({ pressed }) => [
              s.runBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={run}
          >
            <Feather name="zap" size={16} color="#fff" />
            <Text style={s.runBtnText}>Run Agent</Text>
          </Pressable>
        )}

        {loading && (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[s.loadingText, { color: colors.mutedForeground }]}>
              Gemma 4 is analyzing your trip…
            </Text>
          </View>
        )}

        {!!error && (
          <View style={[s.errorCard, { backgroundColor: colors.card, borderColor: "#fca5a5" }]}>
            <Feather name="alert-circle" size={20} color={colors.destructive} />
            <Text style={[s.errorText, { color: colors.destructive }]}>{error}</Text>
            <Pressable
              style={({ pressed }) => [
                s.retryBtn,
                { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={run}
            >
              <Text style={[s.retryText, { color: colors.foreground }]}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {data && (
          <>
            {renderContent(data)}
            <Pressable
              style={({ pressed }) => [
                s.rerunBtn,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={run}
            >
              <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
              <Text style={[s.rerunText, { color: colors.mutedForeground }]}>Re-run Agent</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardHeader({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }) {
  const colors = useColors();
  return (
    <View style={s.cardHeader}>
      <Feather name={icon} size={15} color={colors.primary} />
      <Text style={[s.cardTitle, { color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[s.row, { borderBottomColor: colors.border }]}>
      <Text style={[s.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[s.rowValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

export function Pill({ label, color }: { label: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={[s.pill, { backgroundColor: color ?? colors.muted }]}>
      <Text style={[s.pillText, { color: color ? "#fff" : colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export function BulletList({ items }: { items: string[] }) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      {items.map((item, i) => (
        <View key={i} style={s.bullet}>
          <View style={[s.bulletDot, { backgroundColor: colors.primary }]} />
          <Text style={[s.bulletText, { color: colors.foreground }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    padding: 24,
    paddingTop: 20,
    gap: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  heroDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    lineHeight: 18,
  },
  runBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  runBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  centered: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  rerunBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 20,
  },
  rerunText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  card: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    textAlign: "right",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  bullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  bulletText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 19,
  },
});
