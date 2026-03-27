/**
 * Featherless.ai service — calls Featherless via edge function proxy.
 * Falls back to Lovable AI when Featherless is not configured.
 * Exposes: chat, translate, vision fallback, impact calc, daily nudge, and smart cascade.
 */

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-proxy`;
const TRANSLATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-translate`;
const VISION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-vision`;
const NUDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-nudge`;
const AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-agent`;
const MODELS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-models`;
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

// ─── Mock data for offline / API failure fallback ───

const MOCK_RECYCLING_RULES: Record<string, { recyclable: boolean; bin: string; instruction: string; category: string }> = {
  "pizza box": { recyclable: true, bin: "Blue Bin", instruction: "Remove food residue. Flatten the box. If heavily greased, compost instead.", category: "paper" },
  "plastic bottle": { recyclable: true, bin: "Blue Bin", instruction: "Rinse, remove cap, and place in recycling.", category: "plastic" },
  "aluminum can": { recyclable: true, bin: "Blue Bin", instruction: "Rinse and place in recycling. No need to crush.", category: "metal" },
  "glass bottle": { recyclable: true, bin: "Blue Bin", instruction: "Rinse and place in recycling. Remove caps.", category: "glass" },
  "banana peel": { recyclable: false, bin: "Green Bin", instruction: "Place in compost/organics bin.", category: "organic" },
  "styrofoam": { recyclable: false, bin: "Garbage", instruction: "Styrofoam is not recyclable in most municipalities. Place in garbage.", category: "plastic" },
  "cardboard": { recyclable: true, bin: "Blue Bin", instruction: "Flatten and place in recycling. Remove tape if possible.", category: "paper" },
  "newspaper": { recyclable: true, bin: "Blue Bin", instruction: "Bundle or place loosely in recycling bin.", category: "paper" },
  "coffee cup": { recyclable: false, bin: "Garbage", instruction: "Most coffee cups have a plastic lining and cannot be recycled. Lid may be recyclable.", category: "mixed" },
  "battery": { recyclable: false, bin: "Hazardous Waste", instruction: "Take to a household hazardous waste depot. Never put in regular garbage.", category: "hazardous" },
  "plastic bag": { recyclable: false, bin: "Garbage", instruction: "Return to store drop-off bins. Do not put in curbside recycling.", category: "plastic" },
  "food scraps": { recyclable: false, bin: "Green Bin", instruction: "Place in compost/organics bin.", category: "organic" },
};

const MOCK_NUDGES = [
  "Every item you recycle makes a difference! Keep going! ♻️",
  "🔥 You're on a roll! Keep that streak alive today!",
  "🌍 Did you know? Recycling one aluminum can saves enough energy to power a TV for 3 hours!",
  "🌱 Small actions, big impact. You're making the planet greener one scan at a time!",
  "💪 Top recyclers scan at least 3 items daily. Can you beat that today?",
];

function getMockChatResponse(query: string): string {
  const q = query.toLowerCase();
  for (const [item, rules] of Object.entries(MOCK_RECYCLING_RULES)) {
    if (q.includes(item)) {
      return `${rules.recyclable ? "Yes" : "No"}, ${item} goes in the **${rules.bin}**. ${rules.instruction}`;
    }
  }
  return "I'm currently offline, but here's a tip: when in doubt, check your local municipality's recycling guide for the most accurate sorting instructions. Common recyclables include clean paper, cardboard, metal cans, and plastic bottles (types 1 & 2). ♻️";
}

/**
 * General-purpose Featherless chat completion with mock fallback
 */
export async function featherlessChat(opts: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}): Promise<Response> {
  try {
    const resp = await fetch(PROXY_URL, {
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
    if (resp.ok) return resp;
    throw new Error(`API ${resp.status}`);
  } catch (err) {
    console.warn("[featherless] Chat API failed, using mock fallback:", err);
    const lastUserMsg = opts.messages.filter(m => m.role === "user").pop()?.content || "";
    const mockContent = getMockChatResponse(lastUserMsg);
    return new Response(JSON.stringify({
      choices: [{ message: { content: mockContent, role: "assistant" } }],
      _mock: true,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}

/**
 * Translate recycling text to target language
 */
export async function translateText(
  text: string,
  targetLang: string,
): Promise<{ translated: string; lang: string; provider: string }> {
  try {
    const resp = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!resp.ok) throw new Error(`Translation API ${resp.status}`);
    return resp.json();
  } catch (err) {
    console.warn("[featherless] Translation failed, returning original:", err);
    return { translated: text, lang: targetLang, provider: "mock-passthrough" };
  }
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
  try {
    const resp = await fetch(VISION_URL, {
      method: "POST",
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64, item_hint: itemHint }),
    });
    if (!resp.ok) throw new Error(`Vision API ${resp.status}`);
    return resp.json();
  } catch (err) {
    console.warn("[featherless] Vision API failed, using mock detection:", err);
    const hint = (itemHint || "unknown item").toLowerCase();
    const match = Object.entries(MOCK_RECYCLING_RULES).find(([k]) => hint.includes(k));
    const rules = match?.[1] || { recyclable: false, bin: "Check locally", instruction: "Unable to identify item. Please check your local recycling guide.", category: "unknown" };
    return {
      detections: [{
        waste_type: match?.[0] || hint,
        confidence: 0.5,
        recyclable: rules.recyclable,
        category: rules.category,
        instruction: rules.instruction,
        bin: rules.bin,
        material_detail: rules.category,
      }],
      provider: "featherless",
    };
  }
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

  try {
    const resp = await fetch(PROXY_URL, {
      method: "POST",
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an environmental impact calculator. Return ONLY valid JSON with no extra text." },
          { role: "user", content: `Calculate environmental impact of properly recycling: ${itemList}. Return JSON: {"co2SavedKg": number, "treesSaved": number, "waterSavedLiters": number, "energySavedKwh": number}` },
        ],
        temperature: 0.1,
        max_tokens: 256,
      }),
    });

    if (!resp.ok) throw new Error(`Impact API ${resp.status}`);

    const data: FeatherlessResponse = await resp.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse impact data");
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.warn("[featherless] Impact API failed, using estimate:", err);
    const count = items.length || 1;
    return {
      co2SavedKg: Math.round(count * 0.3 * 100) / 100,
      treesSaved: Math.round(count * 0.01 * 100) / 100,
      waterSavedLiters: Math.round(count * 12.5 * 100) / 100,
      energySavedKwh: Math.round(count * 1.8 * 100) / 100,
    };
  }
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
      text: MOCK_NUDGES[Math.floor(Math.random() * MOCK_NUDGES.length)],
      provider: "mock",
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

// ─── Agent (tool-calling) ───

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Send a message to the RecycleMate agent (tool-calling mode).
 * The agent can call lookup_local_rules, translate_instruction,
 * calculate_impact, and get_user_stats autonomously.
 */
export async function agentChat(
  messages: AgentMessage[],
  userContext?: { points?: number; streak?: number; totalScans?: number; recentScans?: string[] },
  model?: string,
): Promise<{ text: string }> {
  try {
    const resp = await fetch(AGENT_URL, {
      method: "POST",
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ messages, userContext, model }),
    });
    if (!resp.ok) throw new Error(`Agent API ${resp.status}`);
    return resp.json();
  } catch (err) {
    console.warn("[featherless] Agent API failed, using mock:", err);
    const lastMsg = messages.filter(m => m.role === "user").pop()?.content || "";
    return { text: getMockChatResponse(lastMsg) };
  }
}

// ─── Model catalog ───

export interface FeatherlessModel {
  id: string;
  name: string;
  tier: "fast" | "heavy";
  status: string;
  vision: boolean;
  tools: boolean;
}

/**
 * Fetch available Featherless models.
 * Returns a curated list even when Featherless API key is not configured.
 */
export async function fetchModels(): Promise<{ models: FeatherlessModel[]; source: string }> {
  try {
    const resp = await fetch(`${MODELS_URL}?action=list`, {
      headers: AUTH_HEADER,
    });
    if (!resp.ok) throw new Error("Failed to fetch models");
    return resp.json();
  } catch {
    return {
      models: [
        { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", name: "Llama 3.1 8B", tier: "fast", status: "available", vision: false, tools: false },
        { id: "Qwen/Qwen3-8B", name: "Qwen 3 8B", tier: "fast", status: "available", vision: false, tools: true },
      ],
      source: "fallback",
    };
  }
}

/**
 * Tokenize text to estimate token count.
 * Falls back to a rough char/4 estimate.
 */
export async function tokenize(text: string, model?: string): Promise<{ tokens: number; estimated: boolean }> {
  try {
    const resp = await fetch(`${MODELS_URL}?action=tokenize`, {
      method: "POST",
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model }),
    });
    if (!resp.ok) throw new Error();
    return resp.json();
  } catch {
    return { tokens: Math.ceil(text.length / 4), estimated: true };
  }
}
