/**
 * Featherless.ai service — calls Featherless via edge function proxy.
 * Falls back to Lovable AI when Featherless is not configured.
 */

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-proxy`;
const TRANSLATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-translate`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English", fr: "Français", es: "Español", zh: "中文",
  hi: "हिन्दी", pa: "ਪੰਜਾਬੀ", ar: "العربية", pt: "Português",
  de: "Deutsch", ko: "한국어", ja: "日本語", ur: "اردو",
  ta: "தமிழ்", tl: "Filipino", it: "Italiano",
};

export interface FeatherlessResponse {
  choices: Array<{
    message: { content: string; role: string };
  }>;
}

/**
 * General-purpose Featherless chat completion
 */
export async function featherlessChat(opts: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}): Promise<Response> {
  return fetch(PROXY_URL, {
    method: "POST",
    headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: opts.messages,
      model: opts.model,
      temperature: opts.temperature,
      max_tokens: opts.max_tokens,
      stream: opts.stream ?? false,
    }),
  });
}

/**
 * Translate recycling text to target language
 */
export async function translateText(
  text: string,
  targetLang: string,
): Promise<{ translated: string; lang: string; provider: string }> {
  const resp = await fetch(TRANSLATE_URL, {
    method: "POST",
    headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
    body: JSON.stringify({ text, targetLang }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Translation failed");
  }

  return resp.json();
}

/**
 * Get environmental impact calculation using Featherless LLM
 */
export async function calculateImpactAI(items: Array<{ name: string; weight?: number }>): Promise<{
  co2SavedKg: number;
  treesSaved: number;
  waterSavedLiters: number;
  energySavedKwh: number;
}> {
  const itemList = items.map((i) => `${i.name}${i.weight ? `: ${i.weight}g` : ""}`).join(", ");

  const resp = await fetch(PROXY_URL, {
    method: "POST",
    headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are an environmental impact calculator. Return ONLY valid JSON with no extra text.",
        },
        {
          role: "user",
          content: `Calculate environmental impact of properly recycling: ${itemList}. Return JSON: {"co2SavedKg": number, "treesSaved": number, "waterSavedLiters": number, "energySavedKwh": number}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 256,
    }),
  });

  if (!resp.ok) throw new Error("Impact calculation failed");

  const data: FeatherlessResponse = await resp.json();
  const content = data.choices?.[0]?.message?.content || "{}";

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse impact data");

  return JSON.parse(jsonMatch[0]);
}
