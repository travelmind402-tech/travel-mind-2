import { useTrip } from "@/context/TripContext";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Wallet, Cloud, AlertTriangle, Car, Utensils,
  Globe, MessageSquare, MapPin, Users, Plane, Clock,
  ChevronRight, UtensilsCrossed, Languages, Sparkles,
} from "lucide-react";
import { useEffect } from "react";

const agents = [
  {
    name: "Weather Analysis",
    path: "/dashboard/weather",
    icon: Cloud,
    desc: "Forecast, health risks & packing list",
    color: "text-sky-500",
    bg: "bg-sky-500/10 group-hover:bg-sky-500/20",
  },
  {
    name: "Disruption Alerts",
    path: "/dashboard/disruption",
    icon: AlertTriangle,
    desc: "Road closures, scams & local strikes",
    color: "text-orange-500",
    bg: "bg-orange-500/10 group-hover:bg-orange-500/20",
  },
  {
    name: "Driving Intelligence",
    path: "/dashboard/driving",
    icon: Car,
    desc: "Daily road conditions & safety guide",
    color: "text-violet-500",
    bg: "bg-violet-500/10 group-hover:bg-violet-500/20",
  },
  {
    name: "Cuisine Guide",
    path: "/dashboard/cuisine",
    icon: Utensils,
    desc: "Must-try dishes & dietary-safe dining",
    color: "text-amber-500",
    bg: "bg-amber-500/10 group-hover:bg-amber-500/20",
  },
  {
    name: "Cultural Briefing",
    path: "/dashboard/culture",
    icon: Globe,
    desc: "Etiquette, dress codes & local laws",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
  },
  {
    name: "Budget Planner",
    path: "/dashboard/budget",
    icon: Wallet,
    desc: "Cost breakdown in local currency",
    color: "text-primary",
    bg: "bg-primary/10 group-hover:bg-primary/20",
  },
  {
    name: "Language Assistant",
    path: "/dashboard/language",
    icon: MessageSquare,
    desc: "Essential phrases with phonetics",
    color: "text-rose-500",
    bg: "bg-rose-500/10 group-hover:bg-rose-500/20",
  },
];

export default function DashboardHome() {
  const { tripForm, tripId } = useTrip();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!tripId) setLocation("/");
  }, [tripId, setLocation]);

  if (!tripForm || !tripId) return null;

  const startDate = new Date(tripForm.travel_start_date);
  const endDate = new Date(tripForm.travel_end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nights = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
  const daysUntil = Math.round((startDate.getTime() - today.getTime()) / 86400000);
  const totalBudget = tripForm.daily_budget * (nights || 1);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const travelerLabel =
    tripForm.traveler_type === "family" && tripForm.family_members > 0
      ? `Family (${tripForm.family_members + 1} members)`
      : tripForm.traveler_type === "solo"
      ? "Solo Traveler"
      : tripForm.group_size > 1
      ? `Group of ${tripForm.group_size}`
      : tripForm.traveler_type.charAt(0).toUpperCase() + tripForm.traveler_type.slice(1);

  const tripPrefs = [
    tripForm.travel_style && { label: "Style", value: tripForm.travel_style.replace(/_/g, " ") },
    tripForm.cuisine_preferences && { label: "Cuisine", value: tripForm.cuisine_preferences === "fine_dining" ? "Fine Dining" : tripForm.cuisine_preferences.replace(/_/g, " ") },
    tripForm.native_language && { label: "Language", value: tripForm.native_language },
    { label: "Budget tier", value: tripForm.budget_tier.replace(/_/g, " ") },
  ].filter(Boolean) as { label: string; value: string }[];

  const allTags = [
    ...tripForm.dietary_restrictions,
    ...tripForm.known_allergies,
    ...tripForm.known_sensitivities,
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Trip Overview
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Session <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{tripId.split("-")[0]}</span>
          </p>
        </div>
        {daysUntil > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl">
            <Clock className="w-4 h-4" />
            <span className="font-semibold text-sm">{daysUntil} days to go</span>
          </div>
        )}
        {daysUntil === 0 && (
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-xl">
            <Plane className="w-4 h-4" />
            <span className="font-semibold text-sm">Departing today!</span>
          </div>
        )}
        {daysUntil < 0 && nights + daysUntil > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 px-4 py-2 rounded-xl">
            <MapPin className="w-4 h-4" />
            <span className="font-semibold text-sm">Currently traveling</span>
          </div>
        )}
      </div>

      {/* Hero card */}
      <Card className="bg-primary text-primary-foreground border-transparent shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary-foreground/60 text-xs font-semibold uppercase tracking-widest">
                <Plane className="w-3.5 h-3.5" />
                Destination
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-4xl font-bold tracking-tight">{tripForm.city}</h2>
                <ChevronRight className="w-5 h-5 opacity-40" />
                <span className="text-2xl font-semibold opacity-80">{tripForm.country}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <MapPin className="w-3.5 h-3.5" />
                <span>{tripForm.transit_waypoints.length > 0 ? `Via ${tripForm.transit_waypoints.join(", ")}` : "Direct route"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex items-center gap-2 bg-primary-foreground/15 rounded-xl px-4 py-2">
                <Calendar className="w-4 h-4 text-primary-foreground/60" />
                <div className="text-sm">
                  <span className="font-semibold">{formatDate(startDate)}</span>
                  <span className="text-primary-foreground/60 mx-2">—</span>
                  <span className="font-semibold">{formatDate(endDate)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-primary-foreground/15 rounded-xl px-4 py-2">
                <Users className="w-4 h-4 text-primary-foreground/60" />
                <span className="text-sm font-medium">{travelerLabel}</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-primary-foreground/15">
            <div className="text-center">
              <p className="text-2xl font-bold">{nights}</p>
              <p className="text-xs text-primary-foreground/60 mt-0.5">Nights</p>
            </div>
            <div className="text-center border-x border-primary-foreground/15">
              <p className="text-2xl font-bold">{tripForm.daily_budget.toLocaleString()}</p>
              <p className="text-xs text-primary-foreground/60 mt-0.5">{tripForm.currency}/day</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{totalBudget.toLocaleString()}</p>
              <p className="text-xs text-primary-foreground/60 mt-0.5">Total budget ({tripForm.currency})</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-transparent capitalize">
              {tripForm.budget_tier.replace("_", " ")}
            </Badge>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-transparent capitalize">
              {tripForm.travel_style}
            </Badge>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-transparent capitalize">
              {tripForm.cuisine_preferences === "fine_dining" ? "Fine Dining" : tripForm.cuisine_preferences}
            </Badge>
            {tripForm.group_size > 1 && (
              <Badge className="bg-primary-foreground/15 text-primary-foreground border-transparent">
                {tripForm.group_size} travelers
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info row */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Preferences */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Trip Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tripPrefs.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium capitalize">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Dietary / health flags */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Dietary & Health Flags</CardTitle>
          </CardHeader>
          <CardContent>
            {allTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No restrictions flagged</p>
            )}
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Languages className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Language Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Native</span>
              <span className="font-medium">{tripForm.native_language}</span>
            </div>
            {tripForm.phrases_needed.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Phrases needed</p>
                <ul className="space-y-1">
                  {tripForm.phrases_needed.slice(0, 3).map((p) => (
                    <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>{p}
                    </li>
                  ))}
                  {tripForm.phrases_needed.length > 3 && (
                    <li className="text-xs text-muted-foreground">+{tripForm.phrases_needed.length - 3} more</li>
                  )}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No specific phrases requested</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agents grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold tracking-tight">AI Agents</h2>
          <span className="text-xs text-muted-foreground bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full font-medium">
            7 ready · Gemma 4
          </span>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {agents.map(({ name, path, icon: Icon, desc, color, bg }) => (
            <Link key={path} href={path}>
              <Card className="h-full hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-colors ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">{name}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Start all card */}
          <Link href="/dashboard/weather">
            <Card className="h-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center justify-center h-full text-center gap-2">
                <Sparkles className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors" />
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors font-medium">Start with Weather</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
