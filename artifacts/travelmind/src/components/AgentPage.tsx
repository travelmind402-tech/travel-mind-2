import { ReactNode, useState, useEffect } from "react";
import { useTrip } from "@/context/TripContext";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { RefreshCw, LucideIcon, Zap } from "lucide-react";

interface AgentPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  fetchData: (tripId: string) => Promise<any>;
  formatData?: (data: any) => ReactNode;
}

export function AgentPage({ title, description, icon: Icon, fetchData, formatData }: AgentPageProps) {
  const { tripId } = useTrip();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) setLocation("/");
  }, [tripId, setLocation]);

  if (!tripId) return null;

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchData(tripId);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>
        <p className="text-muted-foreground ml-12">{description}</p>
      </div>

      <div className="min-h-[400px]">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping [animation-delay:0.5s]" />
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center relative z-10">
                <Icon className="w-7 h-7 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground">Analyzing with Gemma 4...</p>
              <p className="text-sm text-muted-foreground">This may take up to 30 seconds</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Analysis Failed</p>
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
            </div>
            <Button variant="outline" onClick={handleAnalyze}>Try Again</Button>
          </div>
        )}

        {!loading && !error && data && (
          formatData ? formatData(data) : (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )
        )}

        {!loading && !error && !data && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
              <Icon className="w-10 h-10 text-primary/30" />
            </div>
            <div className="space-y-2 max-w-xs">
              <p className="font-medium text-foreground">Ready to analyze</p>
              <p className="text-sm text-muted-foreground">
                Gemma 4 will analyze your trip details and generate personalized insights.
              </p>
            </div>
            <Button onClick={handleAnalyze} size="lg" className="gap-2 px-8">
              <Zap className="w-4 h-4" />
              Run Analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
