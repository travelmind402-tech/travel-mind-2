const API = "/api";
const BACKEND_WARMUP_INTERVAL_MS = 10 * 60 * 1000;
const BACKEND_WARMUP_TIMEOUT_MS = 8000;

export async function startSession(form: Record<string, unknown>): Promise<{ user_id: string; trip_id: string }> {
  const res = await fetch(`${API}/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to start session");
  }
  return res.json();
}

export async function warmupBackend(): Promise<void> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), BACKEND_WARMUP_TIMEOUT_MS);

  try {
    await fetch(`${API}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    // Warmup is best-effort only; user workflows show their own API errors.
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function startBackendWarmup(): () => void {
  let intervalId: number | undefined;

  const pingIfVisible = () => {
    if (document.visibilityState === "visible") {
      void warmupBackend();
    }
  };

  pingIfVisible();
  intervalId = window.setInterval(pingIfVisible, BACKEND_WARMUP_INTERVAL_MS);
  document.addEventListener("visibilitychange", pingIfVisible);

  return () => {
    if (intervalId !== undefined) {
      window.clearInterval(intervalId);
    }
    document.removeEventListener("visibilitychange", pingIfVisible);
  };
}

export async function fetchWeather(tripId: string): Promise<any> {
  const res = await fetch(`${API}/session/${tripId}/weather`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch weather");
  return res.json();
}

export async function fetchDisruption(tripId: string): Promise<any> {
  const res = await fetch(`${API}/session/${tripId}/disruption`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch disruption info");
  return res.json();
}

export async function fetchDriving(tripId: string): Promise<any> {
  const res = await fetch(`${API}/session/${tripId}/driving`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch driving info");
  return res.json();
}

export async function fetchCuisine(tripId: string): Promise<any> {
  const res = await fetch(`${API}/session/${tripId}/cuisine`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch cuisine info");
  return res.json();
}

export async function fetchCulture(tripId: string): Promise<any> {
  const res = await fetch(`${API}/session/${tripId}/culture`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch culture info");
  return res.json();
}

export async function fetchBudget(tripId: string): Promise<any> {
  const res = await fetch(`${API}/session/${tripId}/budget`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch budget info");
  return res.json();
}

export async function fetchLanguage(tripId: string): Promise<any> {
  const res = await fetch(`${API}/session/${tripId}/language`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch language info");
  const data = await res.json();
  if (data?.error) {
    throw new Error(data.error_detail ? `${data.error}: ${data.error_detail}` : data.error);
  }
  return data;
}

export async function getTrip(tripId: string): Promise<any> {
  const res = await fetch(`${API}/session/${tripId}`);
  if (!res.ok) throw new Error("Failed to fetch trip");
  return res.json();
}

export async function getUserTrips(userId: string): Promise<any[]> {
  const res = await fetch(`${API}/session/user/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch user trips");
  return res.json();
}
