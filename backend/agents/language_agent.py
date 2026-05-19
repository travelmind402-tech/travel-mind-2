import asyncio
import json
from datetime import datetime

from utils.cache import TTL, build_cache_key, get_cache, set_cache
from utils.llm import (
    SUPPORTED_GEMMA_MODELS,
    generate_content_with_timeout,
    is_retryable_model_error,
)


LANGUAGE_SYSTEM_PROMPT = """
You are an expert linguist and cultural etiquette advisor for travelers.

You receive a destination city, country, traveler type, native language, and
optional phrases to translate.

Respond ONLY in this JSON format, no other text:
{
  "destination": "...",
  "local_language": "...",
  "script": "Latin | Devanagari | Arabic | Kanji | Hangul | Cyrillic | Thai | etc",
  "english_proficiency_locals": "High | Medium | Low",
  "translation_difficulty": "Easy | Moderate | Hard",
  "essential_phrases": [
    {
      "native": "Hello (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "Thank you (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "Please (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "Excuse me / Sorry (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "Where is...? (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "How much does this cost? (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "I don't understand (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "Do you speak [native language]? (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "I need a doctor (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "Call the police (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "Help! (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    },
    {
      "native": "Where is the toilet? (in traveler's native language)",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    }
  ],
  "custom_translations": [
    {
      "native": "...",
      "local": "...",
      "phonetic": "...",
      "usage_tip": "..."
    }
  ],
  "numbers": {
    "1": "...",
    "2": "...",
    "3": "...",
    "4": "...",
    "5": "...",
    "10": "...",
    "100": "...",
    "1000": "...",
    "tip": "how locals count/gesture numbers"
  },
  "etiquette_rules": {
    "greeting_style": "...",
    "physical_contact": "...",
    "eye_contact": "...",
    "gift_giving": "...",
    "dining_table": "...",
    "religious_spaces": "...",
    "photography": "...",
    "bargaining": "..."
  },
  "language_hacks": [
    "practical tip for communicating without fluency"
  ],
  "translation_apps_recommended": [
    {
      "app": "...",
      "best_for": "...",
      "works_offline": true
    }
  ],
  "script_reading_guide": {
    "need_to_learn": true,
    "key_signs_to_recognize": ["...", "..."],
    "tip": "..."
  },
  "traveler_type_tips": "...",
  "overall_language_difficulty": "Easy | Moderate | Hard | Very Hard"
}

Rules:
1. Always provide accurate phonetic pronunciation in Roman script.
2. For non-Latin scripts, always show both local script and phonetic text.
3. If phrases_needed is provided, translate all of them in custom_translations.
4. Tailor traveler_type_tips to the specific traveler type.
5. Fill the numbers section because it is useful for bargaining and transport.
6. language_hacks must be practical, such as gestures or translation camera use.
7. Use the traveler's native_language as the source for all phrase translations.
   The "native" field must always contain the phrase written in the traveler's
   native language and script, for example Bengali in Bangla script.
8. For the "Do you speak...?" phrase, substitute [native language] with the
   actual native language name in that phrase.
"""


def _language_fallback(
    *,
    city: str,
    native_language: str,
    phrases_needed: list,
    error_detail: str | None,
) -> dict:
    return {
        "error": "Language guide generation failed",
        "error_detail": error_detail or "unknown",
        "destination": city,
        "local_language": "unknown",
        "script": "unknown",
        "english_proficiency_locals": "unknown",
        "translation_difficulty": "unknown",
        "essential_phrases": [],
        "custom_translations": [],
        "numbers": {},
        "etiquette_rules": {},
        "language_hacks": [
            "Download an offline translation pack before travel.",
            "Keep destination names and hotel addresses saved as text and screenshots.",
        ],
        "translation_apps_recommended": [
            {
                "app": "Google Translate",
                "best_for": "Offline text and camera translation",
                "works_offline": True,
            }
        ],
        "script_reading_guide": {
            "need_to_learn": False,
            "key_signs_to_recognize": [],
            "tip": "Use a translation camera for signs until the guide can be generated.",
        },
        "overall_language_difficulty": "unknown",
        "_fallback_used": True,
        "_metadata": {
            "native_language": native_language,
            "custom_phrases_requested": len(phrases_needed),
            "custom_phrases_translated": 0,
            "generated_at": datetime.now().isoformat(),
        },
    }


async def run_language_agent(
    city: str,
    country: str,
    traveler_type: str,
    native_language: str = "English",
    phrases_needed: list | None = None,
) -> dict:
    if phrases_needed is None:
        phrases_needed = []
    phrases_needed = [
        str(phrase).strip()
        for phrase in phrases_needed
        if str(phrase).strip()
    ]
    phrases_cache_value = json.dumps(phrases_needed, ensure_ascii=False)

    cache_key = build_cache_key(
        "language",
        city=city,
        country=country,
        traveler_type=traveler_type,
        native=native_language,
        phrases=phrases_cache_value,
    )
    cached = await get_cache(cache_key)
    if cached:
        print("[LanguageAgent] Serving from cache")
        return cached

    print(f"[LanguageAgent] Generating language guide for {city}...")

    phrases_text = (
        f"Also translate these specific phrases: {phrases_cache_value}"
        if phrases_needed
        else "No custom phrases requested."
    )
    prompt = (
        f"Generate a complete language and etiquette guide for a "
        f"{traveler_type} traveler whose native language is {native_language}, "
        f"visiting {city}, {country}. All 'native' fields in essential_phrases "
        f"and custom_translations must be written in {native_language}. "
        f"{phrases_text}"
    )

    parsed = None
    last_error = None
    last_raw = ""

    for model in SUPPORTED_GEMMA_MODELS:
        for attempt in range(3):
            try:
                print(f"[LanguageAgent] {model} attempt {attempt + 1}...")
                response = await generate_content_with_timeout(
                    model=model,
                    contents=prompt,
                    system_instruction=LANGUAGE_SYSTEM_PROMPT,
                    temperature=0.2,
                    max_output_tokens=2200,
                    timeout_seconds=180,
                )

                last_raw = (response.text or "").strip()
                text = last_raw.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(text)
                print(f"[LanguageAgent] {model} OK")
                break

            except json.JSONDecodeError as exc:
                last_error = f"JSON parse failed on {model}: {exc}"
                print(
                    f"[LanguageAgent] {last_error} | raw[:200]={last_raw[:200]}"
                )
                break
            except asyncio.TimeoutError:
                last_error = f"{model} timed out after 180s"
                print(f"[LanguageAgent] {last_error}")
                break
            except Exception as exc:
                last_error = str(exc)
                if is_retryable_model_error(last_error):
                    wait = 2 ** attempt
                    print(
                        f"[LanguageAgent] {model} server error, retry in {wait}s..."
                    )
                    await asyncio.sleep(wait)
                else:
                    print(f"[LanguageAgent] {model} failed: {last_error[:120]}")
                    break

        if parsed:
            break

    if parsed is None:
        print(
            "[LanguageAgent] All models failed - returning structured fallback. "
            f"Error: {last_error}"
        )
        return _language_fallback(
            city=city,
            native_language=native_language,
            phrases_needed=phrases_needed,
            error_detail=last_error,
        )

    custom_translations = parsed.get("custom_translations")
    if not isinstance(custom_translations, list):
        custom_translations = []
        parsed["custom_translations"] = custom_translations

    parsed["_metadata"] = {
        "native_language": native_language,
        "custom_phrases_requested": len(phrases_needed),
        "custom_phrases_translated": len(custom_translations),
        "generated_at": datetime.now().isoformat(),
    }

    await set_cache(cache_key, parsed, TTL["culture"])
    return parsed
