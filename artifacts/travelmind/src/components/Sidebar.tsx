import { Link, useLocation } from "wouter";
import { useTrip } from "@/context/TripContext";
import {
  Cloud, AlertTriangle, Car, Utensils, Globe, Wallet, MessageSquare, Home, Plus, PlaneTakeoff
} from "lucide-react";
import { Button } from "./ui/button";

const links = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/weather", label: "Weather", icon: Cloud },
  { href: "/dashboard/disruption", label: "Disruptions", icon: AlertTriangle },
  { href: "/dashboard/driving", label: "Driving", icon: Car },
  { href: "/dashboard/cuisine", label: "Cuisine", icon: Utensils },
  { href: "/dashboard/culture", label: "Culture", icon: Globe },
  { href: "/dashboard/budget", label: "Budget", icon: Wallet },
  { href: "/dashboard/language", label: "Language", icon: MessageSquare },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { tripForm, tripId, clearSession } = useTrip();

  return (
    <div className="w-60 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col h-[100dvh] flex-shrink-0">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight" style={{ color: "hsl(var(--sidebar-accent-foreground))" }}>
          <PlaneTakeoff className="w-5 h-5 text-sidebar-primary" />
          TravelMind
        </div>
        {tripForm && (
          <div className="mt-2 text-xs text-sidebar-foreground/60 space-y-0.5">
            <div className="font-medium truncate">{tripForm.city}, {tripForm.country}</div>
            {tripId && (
              <div className="font-mono text-[10px] bg-sidebar-accent/50 px-1.5 py-0.5 rounded inline-block">
                {tripId.split("-")[0]}
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Button
          onClick={() => { clearSession(); setLocation("/"); }}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground bg-transparent hover:bg-sidebar-accent"
        >
          <Plus className="w-4 h-4" />
          New Trip
        </Button>
      </div>
    </div>
  );
}
