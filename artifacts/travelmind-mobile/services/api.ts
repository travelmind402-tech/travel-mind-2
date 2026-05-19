const getBase = () =>
  `https://${process.env["EXPO_PUBLIC_DOMAIN"] ?? "localhost"}/api`;

async function req(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const startSession = (form: Record<string, unknown>) =>
  req(`${getBase()}/session/create`, "POST", form);

export const fetchWeather = (tripId: string) =>
  req(`${getBase()}/session/${tripId}/weather`, "POST");

export const fetchDisruption = (tripId: string) =>
  req(`${getBase()}/session/${tripId}/disruption`, "POST");

export const fetchDriving = (tripId: string) =>
  req(`${getBase()}/session/${tripId}/driving`, "POST");

export const fetchCuisine = (tripId: string) =>
  req(`${getBase()}/session/${tripId}/cuisine`, "POST");

export const fetchCulture = (tripId: string) =>
  req(`${getBase()}/session/${tripId}/culture`, "POST");

export const fetchBudget = (tripId: string) =>
  req(`${getBase()}/session/${tripId}/budget`, "POST");

export const fetchLanguage = async (tripId: string) => {
  const data = await req(`${getBase()}/session/${tripId}/language`, "POST");
  if (data?.error) {
    throw new Error(data.error_detail ? `${data.error}: ${data.error_detail}` : data.error);
  }
  return data;
};
