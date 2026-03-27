/**
 * Featherless.ai service — calls Featherless via edge function proxy.
 * Falls back to Lovable AI when Featherless is not configured.
 * Exposes: chat, translate, vision fallback, impact calc, daily nudge, and smart cascade.
 */

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-proxy`;
const TRANSLATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-translate`;
const VISION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-vision`;
const NUDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-nudge`;
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

export interface VisionDetection {
  waste_type: string;
  confidence: number;
  recyclable: boolean;
  category: string;
  instruction: string;
  bin: string;
  material_detail: string;
}

export interface VisionResult {
  detections: VisionDetection[];
  provider: "featherless" | "lovable";
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
 * Vision fallback — send an image for AI-powered waste detection.
 * Uses Featherless vision models when available, falls back to Lovable AI.
 * Featherless docs: text prompt first, images after (for Gemma/Mistral vision models).
 */
export async function visionFallback(
  imageBase64: string,
  itemHint?: string,
): Promise<VisionResult> {
  const resp = await fetch(VISION_URL, {
    method: "POST",
    headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64, item_hint: itemHint }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Vision analysis failed");
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

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse impact data");

  return JSON.parse(jsonMatch[0]);
}

/**
 * Get a personalized daily nudge/motivation message
 */
export async function getDailyNudge(userStats: {
  points?: number;
  streak?: number;
  totalScans?: number;
  recentItems?: string[];
}): Promise<{ text: string; provider: string }> {
  try {
    const resp = await fetch(NUDGE_URL, {
      method: "POST",
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ userStats }),
    });

    if (!resp.ok) throw new Error("Nudge request failed");
    return resp.json();
  } catch {
    return {
      text: "Every item you recycle makes a difference! Keep going! ♻️",
      provider: "static",
    };
  }
}

/**
 * Smart AI Cascade — hybrid detection pipeline:
 * 1. Use existing on-device TFLite results (passed in)
 * 2. If confidence is low or no items detected, fall back to Featherless Vision API
 *
 * This implements the architecture:
 * Camera → TFLite (fast, 85% cases) → Featherless Vision (edge cases) → Results
 */
export async function smartDetectCascade(
  onDeviceDetections: Array<{ label: string; displayName: string; confidence: number; bbox: [number, number, number, number] }>,
  imageBase64?: string,
  confidenceThreshold = 0.72,
): Promise<{
  detections: Array<{ label: string; displayName: string; confidence: number; bbox: [number, number, number, number]; recyclable?: boolean; category?: string; materialDetail?: string; source: "tflite" | "featherless" | "lovable" }>;
  usedFallback: boolean;
}> {
  // Filter high-confidence on-device detections
  const highConfidence = onDeviceDetections.filter(d => d.confidence >= confidenceThreshold);

  if (highConfidence.length > 0) {
    return {
      detections: highConfidence.map(d => ({ ...d, source: "tflite" as const })),
      usedFallback: false,
    };
  }

  // No high-confidence detections — try vision fallback if image available
  if (!imageBase64) {
    // Return low-confidence results as-is
    return {
      detections: onDeviceDetections.map(d => ({ ...d, source: "tflite" as const })),
      usedFallback: false,
    };
  }

  try {
    const visionResult = await visionFallback(imageBase64);

    if (visionResult.detections.length > 0) {
      return {
        detections: visionResult.detections.map(d => ({
          label: d.waste_type.replace(/\s+/g, "_").toLowerCase(),
          displayName: d.waste_type.charAt(0).toUpperCase() + d.waste_type.slice(1),
          confidence: d.confidence,
          bbox: [0.15, 0.15, 0.7, 0.7] as [number, number, number, number],
          recyclable: d.recyclable,
          category: d.category,
          materialDetail: d.material_detail,
          source: (visionResult.provider === "featherless" ? "featherless" : "lovable") as "featherless" | "lovable",
        })),
        usedFallback: true,
      };
    }
  } catch (err) {
    console.warn("Vision fallback failed:", err);
  }

  // Return whatever on-device had, even if low confidence
  return {
    detections: onDeviceDetections.map(d => ({ ...d, source: "tflite" as const })),
    usedFallback: false,
  };
}
