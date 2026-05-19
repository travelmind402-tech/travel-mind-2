import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTrip } from "@/context/TripContext";
import { startSession } from "@/services/api";
import type { TripForm } from "@/context/TripContext";

const TRAVELER_TYPES = ["solo", "couple", "family", "group", "business"];
const TRAVEL_STYLES = ["adventure", "relaxation", "cultural", "budget_backpacking", "luxury", "ecotourism"];
const CUISINE_PREFS = ["local", "vegetarian", "vegan", "halal", "kosher", "gluten_free", "fine_dining"];
const DIETARY_OPTIONS = ["vegetarian", "vegan", "halal", "kosher", "gluten_free", "dairy_free", "nut_free"];
const ALLERGY_OPTIONS = ["nuts", "shellfish", "dairy", "gluten", "eggs", "soy"];
const SENSITIVITY_OPTIONS = ["dust", "pollen", "cold", "heat", "humidity"];
const BUDGET_TIERS = ["budget", "mid_range", "luxury"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "SGD", "AED", "THB"];

const defaultForm: TripForm = {
  city: "",
  country: "",
  travel_start_date: "",
  travel_end_date: "",
  traveler_type: "solo",
  family_members: 0,
  group_size: 1,
  known_allergies: [],
  known_sensitivities: [],
  transit_waypoints: [],
  dietary_restrictions: [],
  cuisine_preferences: "local",
  travel_style: "adventure",
  daily_budget: 100,
  currency: "USD",
  budget_tier: "mid_range",
  native_language: "",
  phrases_needed: [],
};

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        {
          backgroundColor: selected ? colors.primary : colors.muted,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[
          s.chipText,
          { color: selected ? "#fff" : colors.mutedForeground },
        ]}
      >
        {label.replace(/_/g, " ")}
      </Text>
    </Pressable>
  );
}

function ChipGroup({
  options,
  selected,
  multi,
  onChange,
}: {
  options: string[];
  selected: string | string[];
  multi?: boolean;
  onChange: (val: any) => void;
}) {
  const toggle = (opt: string) => {
    if (multi) {
      const arr = selected as string[];
      onChange(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]);
    } else {
      onChange(opt);
    }
  };
  return (
    <View style={s.chipRow}>
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          selected={multi ? (selected as string[]).includes(opt) : selected === opt}
          onPress={() => toggle(opt)}
        />
      ))}
    </View>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
}) {
  const colors = useColors();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      keyboardType={keyboardType ?? "default"}
      style={[
        s.input,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          color: colors.foreground,
        },
      ]}
    />
  );
}

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setSession } = useTrip();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TripForm>(defaultForm);
  const [waypointInput, setWaypointInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof TripForm, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const canNext = () => {
    if (step === 0) return form.city && form.country && form.travel_start_date && form.travel_end_date;
    if (step === 1) return form.traveler_type;
    if (step === 2) return form.travel_style && form.cuisine_preferences;
    return form.daily_budget > 0 && form.native_language;
  };

  const submit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    try {
      const trimmedPhrase = phraseInput.trim();
      const phrasesNeeded = trimmedPhrase && !form.phrases_needed.includes(trimmedPhrase)
        ? [...form.phrases_needed, trimmedPhrase]
        : form.phrases_needed;
      const trimmedWaypoint = waypointInput.trim();
      const transitWaypoints = trimmedWaypoint && !form.transit_waypoints.includes(trimmedWaypoint)
        ? [...form.transit_waypoints, trimmedWaypoint]
        : form.transit_waypoints;
      const payload = {
        ...form,
        phrases_needed: phrasesNeeded,
        transit_waypoints: transitWaypoints,
      };
      const data = await startSession(payload as unknown as Record<string, unknown>);
      setSession(data.user_id, data.trip_id, payload);
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e.message ?? "Failed to create trip");
    } finally {
      setLoading(false);
    }
  };

  const steps = ["Destination", "Traveler", "Preferences", "Budget & Language"];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={[s.logoWrap, { backgroundColor: colors.primary }]}>
            <Feather name="navigation" size={20} color="#fff" />
          </View>
          <Text style={[s.logoText, { color: colors.foreground }]}>TravelMind</Text>
        </View>

        <View style={s.stepRow}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                s.stepDot,
                {
                  backgroundColor: i <= step ? colors.primary : colors.border,
                  flex: i < steps.length - 1 ? 1 : 0,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[s.stepLabel, { color: colors.mutedForeground }]}>
          Step {step + 1} of {steps.length} — {steps[step]}
        </Text>

        <View style={{ paddingHorizontal: 20 }}>
          {step === 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>Where are you going?</Text>
              <Field label="City">
                <Input value={form.city} onChangeText={(v) => set("city", v)} placeholder="e.g. Tokyo" />
              </Field>
              <Field label="Country">
                <Input value={form.country} onChangeText={(v) => set("country", v)} placeholder="e.g. Japan" />
              </Field>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Start Date">
                    <Input value={form.travel_start_date} onChangeText={(v) => set("travel_start_date", v)} placeholder="2026-06-01" />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="End Date">
                    <Input value={form.travel_end_date} onChangeText={(v) => set("travel_end_date", v)} placeholder="2026-06-08" />
                  </Field>
                </View>
              </View>
              <Field label="Transit Waypoints (optional)">
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={waypointInput}
                    onChangeText={setWaypointInput}
                    placeholder="e.g. Dubai"
                    placeholderTextColor={colors.mutedForeground}
                    style={[s.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  />
                  <Pressable
                    onPress={() => {
                      if (waypointInput.trim()) {
                        set("transit_waypoints", [...form.transit_waypoints, waypointInput.trim()]);
                        setWaypointInput("");
                      }
                    }}
                    style={[s.addBtn, { backgroundColor: colors.primary }]}
                  >
                    <Feather name="plus" size={18} color="#fff" />
                  </Pressable>
                </View>
                {form.transit_waypoints.length > 0 && (
                  <View style={s.chipRow}>
                    {form.transit_waypoints.map((w, i) => (
                      <Pressable
                        key={i}
                        onPress={() => set("transit_waypoints", form.transit_waypoints.filter((_, j) => j !== i))}
                        style={[s.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}
                      >
                        <Text style={[s.chipText, { color: colors.foreground }]}>{w}</Text>
                        <Feather name="x" size={12} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </Field>
            </View>
          )}

          {step === 1 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>Who's traveling?</Text>
              <Field label="Traveler Type">
                <ChipGroup options={TRAVELER_TYPES} selected={form.traveler_type} onChange={(v) => set("traveler_type", v)} />
              </Field>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Group Size">
                    <Input value={String(form.group_size)} onChangeText={(v) => set("group_size", parseInt(v) || 1)} keyboardType="numeric" placeholder="1" />
                  </Field>
                </View>
                {form.traveler_type === "family" && (
                  <View style={{ flex: 1 }}>
                    <Field label="Family Members">
                      <Input value={String(form.family_members)} onChangeText={(v) => set("family_members", parseInt(v) || 0)} keyboardType="numeric" placeholder="0" />
                    </Field>
                  </View>
                )}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>Your Preferences</Text>
              <Field label="Travel Style">
                <ChipGroup options={TRAVEL_STYLES} selected={form.travel_style} onChange={(v) => set("travel_style", v)} />
              </Field>
              <Field label="Cuisine Preference">
                <ChipGroup options={CUISINE_PREFS} selected={form.cuisine_preferences} onChange={(v) => set("cuisine_preferences", v)} />
              </Field>
              <Field label="Dietary Restrictions">
                <ChipGroup options={DIETARY_OPTIONS} selected={form.dietary_restrictions} multi onChange={(v) => set("dietary_restrictions", v)} />
              </Field>
              <Field label="Allergies">
                <ChipGroup options={ALLERGY_OPTIONS} selected={form.known_allergies} multi onChange={(v) => set("known_allergies", v)} />
              </Field>
              <Field label="Sensitivities">
                <ChipGroup options={SENSITIVITY_OPTIONS} selected={form.known_sensitivities} multi onChange={(v) => set("known_sensitivities", v)} />
              </Field>
            </View>
          )}

          {step === 3 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>Budget & Language</Text>
              <Field label="Daily Budget">
                <Input value={String(form.daily_budget)} onChangeText={(v) => set("daily_budget", parseFloat(v) || 0)} keyboardType="decimal-pad" placeholder="100" />
              </Field>
              <Field label="Currency">
                <ChipGroup options={CURRENCIES} selected={form.currency} onChange={(v) => set("currency", v)} />
              </Field>
              <Field label="Budget Tier">
                <ChipGroup options={BUDGET_TIERS} selected={form.budget_tier} onChange={(v) => set("budget_tier", v)} />
              </Field>
              <Field label="Native Language">
                <Input value={form.native_language} onChangeText={(v) => set("native_language", v)} placeholder="e.g. English" />
              </Field>
              <Field label="Phrases Needed (optional)">
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={phraseInput}
                    onChangeText={setPhraseInput}
                    placeholder="e.g. Where is the bus?"
                    placeholderTextColor={colors.mutedForeground}
                    style={[s.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  />
                  <Pressable
                    onPress={() => {
                      if (phraseInput.trim()) {
                        set("phrases_needed", [...form.phrases_needed, phraseInput.trim()]);
                        setPhraseInput("");
                      }
                    }}
                    style={[s.addBtn, { backgroundColor: colors.primary }]}
                  >
                    <Feather name="plus" size={18} color="#fff" />
                  </Pressable>
                </View>
                {form.phrases_needed.length > 0 && (
                  <View style={{ gap: 4, marginTop: 6 }}>
                    {form.phrases_needed.map((p, i) => (
                      <Pressable
                        key={i}
                        onPress={() => set("phrases_needed", form.phrases_needed.filter((_, j) => j !== i))}
                        style={[s.phraseRow, { backgroundColor: colors.muted, borderColor: colors.border }]}
                      >
                        <Text style={[{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground }]}>{p}</Text>
                        <Feather name="x" size={13} color={colors.mutedForeground} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </Field>

              {error && (
                <View style={[s.errorBox, { backgroundColor: "#fee2e2", borderColor: "#fca5a5" }]}>
                  <Text style={{ color: "#b91c1c", fontSize: 13, fontFamily: "Inter_400Regular" }}>{error}</Text>
                </View>
              )}
            </View>
          )}

          <View style={s.navRow}>
            {step > 0 && (
              <Pressable
                style={({ pressed }) => [s.backBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setStep((s) => s - 1)}
              >
                <Feather name="arrow-left" size={16} color={colors.foreground} />
                <Text style={[s.backText, { color: colors.foreground }]}>Back</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                s.nextBtn,
                {
                  backgroundColor: canNext() ? colors.primary : colors.muted,
                  opacity: pressed ? 0.85 : 1,
                  flex: step > 0 ? 0 : 1,
                },
              ]}
              onPress={() => {
                if (!canNext()) return;
                if (step < 3) {
                  Haptics.selectionAsync();
                  setStep((s) => s + 1);
                } else {
                  submit();
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={s.nextText}>{step === 3 ? "Create Trip" : "Continue"}</Text>
                  <Feather name={step === 3 ? "check" : "arrow-right"} size={16} color="#fff" />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 4,
    marginBottom: 6,
  },
  stepDot: {
    height: 4,
    width: 4,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  phraseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  navRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 28,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  backText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
});
