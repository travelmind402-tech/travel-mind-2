import asyncio
import json
import os
import aiohttp
from dotenv import load_dotenv
from datetime import datetime
from utils.cache import (
    build_cache_key,
    get_cache,
    set_cache,
    TTL
)
from utils.llm import (
    generate_content_with_timeout,
    is_retryable_model_error,
)

load_dotenv()

# ---------------------------------------------------------------------------
# Serper config
# ---------------------------------------------------------------------------
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
SERPER_ENDPOINT = "https://google.serper.dev/search"

MONTH_NAMES = {
    1: "January", 2: "February", 3: "March",
    4: "April", 5: "May", 6: "June",
    7: "July", 8: "August", 9: "September",
    10: "October", 11: "November", 12: "December"
}

# Must match SUPPORTED_GEMMA_MODELS in utils/llm.py
EXTRACT_MODELS = ["models/gemma-4-31b-it"]

MAX_SEARCHES     = 2
SEARCH_TIMEOUT   = 40    # seconds for Serper HTTP call
FALLBACK_TIMEOUT = 50
EXTRACT_TIMEOUT  = 180   # bumped: Gemma needs more time on rich Serper payloads

# Serper returns far more text than the old Gemma search tool did.
# Cap what we feed into extraction to keep Gemma fast and within limits.
MAX_FINDINGS_CHARS = 3_000

EXTRACTION_PROMPT = """
You are a travel disruption intelligence analyst.
You will receive raw text from traveler reports, Reddit posts,
and travel reviews about a specific destination.

Extract structured disruption events that would affect
a traveler visiting this destination.

If a pre-fetched weather advisory is present at the top
of the findings, use it to cross-reference disruptions.
For example: if calamity_status is CRITICAL and
predicted_events includes Flood, increase severity of
any road_flood disruption hotspots. If should_reconsider
is true, reflect that in overall_disruption_risk.

Respond ONLY in this JSON format, no other text:
{
  "destination": "...",
  "travel_month": "...",
  "data_quality": "high | medium | low",
  "total_reports_analyzed": 0,
  "disruption_hotspots": [
    {
      "location": "...",
      "disruption_type": "road_flood | trail_closure | activity_cancellation | power_outage | transport | accommodation | scam | network_failure",
      "frequency": "always | often | sometimes | rarely",
      "frequency_detail": "...",
      "typical_duration": "...",
      "trigger_condition": "...",
      "traveler_reports_count": 0,
      "last_reported": "...",
      "severity": "critical | high | medium | low",
      "advisory": "...",
      "source_types": ["reddit", "tripadvisor", "google_maps"]
    }
  ],
  "power_situation": {
    "outage_frequency": "daily | weekly | rarely | never",
    "typical_duration_hours": "...",
    "advisory": "..."
  },
  "transport_situation": {
    "local_transport_reliability": "high | medium | low",
    "surge_pricing_risk": true,
    "advisory": "..."
  },
  "connectivity_situation": {
    "mobile_network_risk": "high | medium | low",
    "atm_reliability": "high | medium | low",
    "advisory": "..."
  },
  "scam_alerts": [
    {
      "scam_type": "...",
      "location": "...",
      "how_to_avoid": "..."
    }
  ],
  "positive_notes": ["..."],
  "best_backup_plans": ["..."],
  "overall_disruption_risk": "high | medium | low",
  "confidence_level": "high | medium | low",
  "data_freshness": "recent | moderate | old"
}
"""


# ---------------------------------------------------------------------------
# Serper search — replaces the old Gemma google_search tool call
# ---------------------------------------------------------------------------

def _serper_snippets_to_text(data: dict, query: str) -> str:
    """
    Flatten Serper JSON response into a readable findings string
    that looks similar to what the Gemma search used to return,
    so the downstream extraction prompt receives consistent input.
    """
    lines = [f"Search query: {query}\n"]

    # Organic results
    for item in data.get("organic", [])[:6]:
        title   = item.get("title", "")
        snippet = item.get("snippet", "")
        link    = item.get("link", "")
        if snippet:
            lines.append(f"- {title}: {snippet} ({link})")

    # People-also-ask boxes often contain useful traveler Q&A
    for item in data.get("peopleAlsoAsk", [])[:3]:
        question = item.get("question", "")
        answer   = item.get("snippet", "")
        if question and answer:
            lines.append(f"Q: {question}\nA: {answer}")

    # Answer box / knowledge panel
    answer_box = data.get("answerBox", {})
    if answer_box.get("answer"):
        lines.append(f"Answer box: {answer_box['answer']}")
    elif answer_box.get("snippet"):
        lines.append(f"Answer box: {answer_box['snippet']}")

    return "\n".join(lines)


async def _single_search(
    query: str,
    city: str,
    month_name: str,
    index: int,
) -> str:
    """
    Performs a single web search via Serper API and returns a
    flattened text string of the results.
    """
    if not SERPER_API_KEY:
        print("[DisruptionAgent] SERPER_API_KEY not set — skipping search")
        return ""

    if index > 0:
        await asyncio.sleep(index * 2)

    full_query = (
        f"{city} {month_name} {query} "
        f"travel disruption road closure flood problems"
    )

    payload = {
        "q":   full_query,
        "num": 8,           # up to 8 organic results
        "hl":  "en",
        "gl":  "us",
    }
    headers = {
        "X-API-KEY":    SERPER_API_KEY,
        "Content-Type": "application/json",
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                SERPER_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=SEARCH_TIMEOUT),
            ) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    print(
                        f"[DisruptionAgent] Serper search {index+1} "
                        f"HTTP {resp.status}: {body[:120]}"
                    )
                    return ""

                data = await resp.json()
                text = _serper_snippets_to_text(data, full_query)

                if text.strip():
                    print(f"[DisruptionAgent] ✓ Serper search {index+1} OK "
                          f"({len(data.get('organic', []))} organic results)")
                return text

    except asyncio.TimeoutError:
        print(f"[DisruptionAgent] Serper search {index+1} timed out")
        return ""
    except Exception as e:
        print(
            f"[DisruptionAgent] Serper search {index+1} failed "
            f"({type(e).__name__}): {str(e)[:120]}"
        )
        return ""


# ---------------------------------------------------------------------------
# Knowledge fallback (unchanged — still uses Gemma inference, not search)
# ---------------------------------------------------------------------------

async def _knowledge_fallback(
    city: str,
    country: str,
    month_name: str,
) -> str:
    print(f"[DisruptionAgent] Trying knowledge fallback...")
    prompt = (
        f"You are a travel disruption expert. "
        f"Based on your training knowledge, provide a "
        f"detailed report of travel disruptions for "
        f"{city}, {country} in {month_name}.\n\n"
        f"Include ALL of the following:\n"
        f"1. Specific road names or routes that flood or get blocked\n"
        f"2. Tourist attractions that close seasonally\n"
        f"3. Power outage patterns and frequency\n"
        f"4. Mobile network dead zones\n"
        f"5. Local transport reliability issues\n"
        f"6. Known scams targeting tourists\n"
        f"7. Weather-related activity cancellations\n"
        f"8. Positive things that still work well\n\n"
        f"Be specific with place names, route numbers, "
        f"and practical advice."
    )

    for model in EXTRACT_MODELS:
        for attempt in range(3):
            try:
                if attempt > 0:
                    await asyncio.sleep(2 ** attempt)
                response = await generate_content_with_timeout(
                    model=model,
                    contents=prompt,
                    temperature=0.2,
                    max_output_tokens=1000,
                    timeout_seconds=FALLBACK_TIMEOUT,
                )
                text = response.text or ""
                if text:
                    print(f"[DisruptionAgent] ✓ Knowledge fallback OK ({model})")
                    return text
            except Exception as e:
                print(f"[DisruptionAgent] Fallback failed "
                      f"({model}): {str(e)[:80]}")
                if "503" in str(e) or "UNAVAILABLE" in str(e):
                    await asyncio.sleep(5)
    return ""


# ---------------------------------------------------------------------------
# Empty / error response helpers (unchanged)
# ---------------------------------------------------------------------------

def _empty_response(
    city: str, country: str, month_name: str,
    travel_year: int, traveler_type: str, weather_context
) -> dict:
    return {
        "destination":             f"{city}, {country}",
        "travel_month":            month_name,
        "data_quality":            "low",
        "total_reports_analyzed":  0,
        "disruption_hotspots":     [],
        "power_situation": {
            "outage_frequency":       "unknown",
            "typical_duration_hours": "unknown",
            "advisory":               "Data unavailable — check local sources before travel."
        },
        "transport_situation": {
            "local_transport_reliability": "unknown",
            "surge_pricing_risk":           False,
            "advisory":                    "Check local transport apps before travel."
        },
        "connectivity_situation": {
            "mobile_network_risk": "unknown",
            "atm_reliability":     "unknown",
            "advisory":            "Carry cash as backup."
        },
        "scam_alerts":             [],
        "positive_notes":          ["Disruption data temporarily unavailable — please retry."],
        "best_backup_plans":       ["Check Google Maps reviews for recent disruption reports."],
        "overall_disruption_risk": "unknown",
        "confidence_level":        "low",
        "data_freshness":          "old",
        "_metadata": {
            "searches_performed":   0,
            "city":                 city,
            "country":              country,
            "travel_month":         month_name,
            "travel_year":          travel_year,
            "traveler_type":        traveler_type,
            "generated_at":         datetime.now().isoformat(),
            "approach":             "api_unavailable",
            "weather_context_used": weather_context is not None,
        }
    }


# ---------------------------------------------------------------------------
# Main agent entry point
# ---------------------------------------------------------------------------

async def run_disruption_agent(
    city: str,
    country: str,
    travel_month: int,
    travel_year: int,
    traveler_type: str,
    weather_context: dict | None = None,
) -> dict:

    month_name = MONTH_NAMES.get(travel_month, "June")

    cache_key = build_cache_key(
        "disruption",
        city=city,
        month=travel_month,
        year=travel_year
    )
    cached = await get_cache(cache_key)
    if cached:
        print(f"[DisruptionAgent] Serving from cache")
        return cached

    print(f"[DisruptionAgent] Starting scan for {city} "
          f"in {month_name} [search=serper, extract={EXTRACT_MODELS[0]}]...")

    # Two focused queries — Serper handles the actual web retrieval
    queries = [
        f"road closure flood landslide travel disruption",
        f"travel problems warnings tips reddit tripadvisor",
    ][:MAX_SEARCHES]

    search_results = []
    data_source    = "serper_web_search"

    for i, query in enumerate(queries):
        print(f"[DisruptionAgent] Search ({i+1}/{len(queries)}): "
              f"{city} {month_name} {query[:50]}...")
        result = await _single_search(query, city, month_name, index=i)
        if result:
            search_results.append({"query": query, "findings": result})
        if i < len(queries) - 1:
            await asyncio.sleep(1)

    # Fall back to Gemma knowledge if Serper returned nothing
    if not search_results:
        print(f"[DisruptionAgent] Serper returned nothing — trying knowledge fallback...")
        fallback_text = await _knowledge_fallback(city, country, month_name)
        if fallback_text:
            search_results = [{
                "query":    f"Knowledge: {city} {month_name} disruptions",
                "findings": fallback_text
            }]
            data_source = "gemma_knowledge"
        else:
            return _empty_response(
                city, country, month_name,
                travel_year, traveler_type, weather_context
            )

    print(f"[DisruptionAgent] {len(search_results)} result(s) — extracting...")

    combined_findings = "\n\n---\n\n".join([
        f"Query: {r['query']}\nFindings:\n{r['findings']}"
        for r in search_results
    ])

    # Trim to avoid overloading Gemma — Serper results are verbose
    if len(combined_findings) > MAX_FINDINGS_CHARS:
        combined_findings = combined_findings[:MAX_FINDINGS_CHARS]
        print(f"[DisruptionAgent] Findings trimmed to {MAX_FINDINGS_CHARS} chars for extraction")

    if weather_context:
        combined_findings = (
            f"=== WEATHER ADVISORY ===\n"
            f"Calamity Status: {weather_context.get('calamity_prediction_alert', {}).get('status', 'N/A')}\n"
            f"Predicted Events: {weather_context.get('calamity_prediction_alert', {}).get('predicted_events', [])}\n"
            f"Should Reconsider: {weather_context.get('should_reconsider_travel', False)}\n"
            f"========================\n\n"
            + combined_findings
        )
        print(f"[DisruptionAgent] Weather context injected")

    # ------------------------------------------------------------------
    # Extraction — Gemma unchanged, same retry logic as before
    # ------------------------------------------------------------------
    parsed     = None
    last_error = None
    raw        = ""

    for model in EXTRACT_MODELS:
        for attempt in range(3):
            try:
                if attempt > 0:
                    await asyncio.sleep(2 ** attempt)

                print(f"[DisruptionAgent] Extraction: {model} attempt {attempt+1}...")
                resp = await generate_content_with_timeout(
                    model=model,
                    contents=(
                        f"Extract travel disruption events for "
                        f"{city}, {country} in {month_name}:\n\n"
                        f"{combined_findings}"
                    ),
                    system_instruction=EXTRACTION_PROMPT,
                    temperature=0.1,
                    max_output_tokens=1800,
                    timeout_seconds=EXTRACT_TIMEOUT,
                )
                raw    = (resp.text or "").strip()
                text   = raw.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(text)
                print(f"[DisruptionAgent] ✓ {model} extraction OK")
                break

            except json.JSONDecodeError as exc:
                last_error = f"JSON parse failed ({model}): {exc}"
                print(f"[DisruptionAgent] {last_error}")
                print(f"[DisruptionAgent] Raw output: {raw[:300]}")
                break
            except asyncio.TimeoutError:
                last_error = f"{model} timed out"
                print(f"[DisruptionAgent] {last_error}")
                break
            except Exception as exc:
                last_error = str(exc)
                if is_retryable_model_error(last_error):
                    print(f"[DisruptionAgent] {model} retryable — retrying")
                else:
                    print(f"[DisruptionAgent] {model} failed: {last_error[:80]}")
                    break
        if parsed:
            break

    if parsed is None:
        return {
            "error":                   "Disruption extraction failed",
            "error_detail":            last_error,
            "destination":             f"{city}, {country}",
            "disruption_hotspots":     [],
            "overall_disruption_risk": "unknown",
            "confidence_level":        "low",
            "_fallback_used":          True,
        }

    parsed["_metadata"] = {
        "searches_performed":   len(search_results),
        "city":                 city,
        "country":              country,
        "travel_month":         month_name,
        "travel_year":          travel_year,
        "traveler_type":        traveler_type,
        "generated_at":         datetime.now().isoformat(),
        "approach":             data_source,
        "search_provider":      "serper",
        "extract_model":        EXTRACT_MODELS[0],
        "weather_context_used": weather_context is not None,
    }

    await set_cache(cache_key, parsed, TTL["disruption"])
    print(f"[DisruptionAgent] ✓ Done — "
          f"{len(parsed.get('disruption_hotspots', []))} hotspots "
          f"| source: {data_source}")
    return parsed
