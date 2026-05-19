import { useState } from "react";
import { useLocation } from "wouter";
import { useTrip } from "@/context/TripContext";
import { startSession } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlaneTakeoff, Loader2, X, Plus, ChevronRight, ChevronLeft } from "lucide-react";

const TRAVELER_TYPES = ["solo", "family", "elderly", "student"];
const CUISINE_PREFS = ["all", "local", "street", "fine_dining"];
const BUDGET_TIERS = ["budget", "mid_range", "luxury"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD"];
const TRAVEL_STYLES = ["general", "adventure", "cultural", "relaxation", "business"];
const COMMON_ALLERGIES = ["Peanuts", "Shellfish", "Dairy", "Gluten", "Eggs", "Soy"];
const COMMON_DIETS = ["Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free"];

function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
  onPendingChange,
  placeholder,
  suggestions,
}: {
  label: string;
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  onPendingChange?: (v: string) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [val, setVal] = useState("");

  const add = (v: string) => {
    const trimmed = v.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
    }
    setVal("");
    onPendingChange?.("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {suggestions && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                tags.includes(s)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            onPendingChange?.(e.target.value);
          }}
          placeholder={placeholder || "Type and press Enter"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(val);
            }
          }}
          className="flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={() => add(val)}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1">
              {t}
              <button type="button" onClick={() => onRemove(t)} className="ml-0.5 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

const STEPS = ["Destination", "Traveler", "Preferences", "Budget & Language"];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { setSession } = useTrip();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPhrase, setPendingPhrase] = useState("");

  const [form, setForm] = useState({
    city: "",
    country: "",
    travel_start_date: "",
    travel_end_date: "",
    traveler_type: "solo",
    family_members: 0,
    group_size: 1,
    known_allergies: [] as string[],
    known_sensitivities: [] as string[],
    transit_waypoints: [] as string[],
    dietary_restrictions: [] as string[],
    cuisine_preferences: "all",
    travel_style: "general",
    daily_budget: 3000,
    currency: "INR",
    budget_tier: "mid_range",
    native_language: "English",
    phrases_needed: [] as string[],
  });

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));
  const addTag = (key: string) => (v: string) => set(key, [...(form as any)[key], v]);
  const removeTag = (key: string) => (v: string) =>
    set(key, (form as any)[key].filter((t: string) => t !== v));

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const trimmedPendingPhrase = pendingPhrase.trim();
      const phrasesNeeded = trimmedPendingPhrase && !form.phrases_needed.includes(trimmedPendingPhrase)
        ? [...form.phrases_needed, trimmedPendingPhrase]
        : form.phrases_needed;
      const payload = {
        ...form,
        phrases_needed: phrasesNeeded.length ? phrasesNeeded : null,
      };
      const { user_id, trip_id } = await startSession(payload);
      setSession(user_id, trip_id, { ...form, phrases_needed: phrasesNeeded });
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create trip session");
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.city && form.country && form.travel_start_date && form.travel_end_date;
    if (step === 1) return !!form.traveler_type;
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <PlaneTakeoff className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TravelMind</h1>
        </div>

        <div className="flex items-center gap-1.5 mb-6 justify-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 rounded-full ${i < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && "Where are you heading and when?"}
              {step === 1 && "Tell us about your travel group"}
              {step === 2 && "Your food preferences and travel style"}
              {step === 3 && "Budget details and language preferences"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="e.g. Tokyo"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      placeholder="e.g. Japan"
                      value={form.country}
                      onChange={(e) => set("country", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Date *</Label>
                    <Input
                      id="start"
                      type="date"
                      value={form.travel_start_date}
                      onChange={(e) => set("travel_start_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Date *</Label>
                    <Input
                      id="end"
                      type="date"
                      value={form.travel_end_date}
                      onChange={(e) => set("travel_end_date", e.target.value)}
                    />
                  </div>
                </div>
                <TagInput
                  label="Transit Waypoints (optional)"
                  tags={form.transit_waypoints}
                  onAdd={addTag("transit_waypoints")}
                  onRemove={removeTag("transit_waypoints")}
                  placeholder="e.g. Dubai, Singapore"
                />
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Traveler Type *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRAVELER_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set("traveler_type", t)}
                        className={`px-4 py-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                          form.traveler_type === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        {t === "solo" && "Solo"}
                        {t === "family" && "Family"}
                        {t === "elderly" && "Senior"}
                        {t === "student" && "Student"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group_size">Group Size</Label>
                    <Input
                      id="group_size"
                      type="number"
                      min={1}
                      value={form.group_size}
                      onChange={(e) => set("group_size", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  {form.traveler_type === "family" && (
                    <div className="space-y-2">
                      <Label htmlFor="family_members">Family Members</Label>
                      <Input
                        id="family_members"
                        type="number"
                        min={0}
                        value={form.family_members}
                        onChange={(e) => set("family_members", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Cuisine Preference</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CUISINE_PREFS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => set("cuisine_preferences", c)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                          form.cuisine_preferences === c
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        {c === "fine_dining" ? "Fine Dining" : c.charAt(0).toUpperCase() + c.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Travel Style</Label>
                  <Select value={form.travel_style} onValueChange={(v) => set("travel_style", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAVEL_STYLES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <TagInput
                  label="Dietary Restrictions"
                  tags={form.dietary_restrictions}
                  onAdd={addTag("dietary_restrictions")}
                  onRemove={removeTag("dietary_restrictions")}
                  placeholder="Add restriction"
                  suggestions={COMMON_DIETS}
                />
                <TagInput
                  label="Known Allergies"
                  tags={form.known_allergies}
                  onAdd={addTag("known_allergies")}
                  onRemove={removeTag("known_allergies")}
                  placeholder="Add allergy"
                  suggestions={COMMON_ALLERGIES}
                />
                <TagInput
                  label="Known Sensitivities"
                  tags={form.known_sensitivities}
                  onAdd={addTag("known_sensitivities")}
                  onRemove={removeTag("known_sensitivities")}
                  placeholder="e.g. strong spices, loud environments"
                />
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="budget">Daily Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      min={0}
                      value={form.daily_budget}
                      onChange={(e) => set("daily_budget", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Budget Tier</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {BUDGET_TIERS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => set("budget_tier", b)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                          form.budget_tier === b
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        {b === "mid_range" ? "Mid-Range" : b.charAt(0).toUpperCase() + b.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lang">Native Language</Label>
                  <Input
                    id="lang"
                    placeholder="e.g. English, Hindi, Spanish"
                    value={form.native_language}
                    onChange={(e) => set("native_language", e.target.value)}
                  />
                </div>
                <TagInput
                  label="Phrases You Need Help With (optional)"
                  tags={form.phrases_needed}
                  onAdd={addTag("phrases_needed")}
                  onRemove={removeTag("phrases_needed")}
                  onPendingChange={setPendingPhrase}
                  placeholder="e.g. Where is the hospital?"
                />
              </>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext()}
                  className="flex-1"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Trip...
                    </>
                  ) : (
                    "Create My Trip"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
