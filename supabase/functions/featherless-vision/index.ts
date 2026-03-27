import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions";
const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TIMEOUT_MS = 40_000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractJSON(text: string): any {
  // Try direct parse
  try { return JSON.parse(text.trim()); } catch {}
  // Fenced block
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  // First object/array
  const obj = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (obj) { try { return JSON.parse(obj[1]); } catch {} }
  return null;
}

const VISION_PROMPT = `Identify ALL waste/recyclable items in this image.

For EACH item return:
- waste_type: short name (e.g. "plastic bottle", "pizza box", "aluminum can")
- confidence: 0.0–1.0
- recyclable: boolean
- category: one of plastic, metal, paper, glass, organic, hazardous, ewaste, textile, other
- instruction: 1-2 sentence disposal instruction
- bin: one of Recycling, Garbage, Compost, Hazardous, Drop-off
- material_detail: specific material info

Return ONLY valid JSON array. Example:
[{"waste_type":"plastic bottle","confidence":0.92,"recyclable":true,"category":"plastic","instruction":"Rinse and place in recycling bin.","bin":"Recycling","material_detail":"PET #1"}]

If no waste items visible, return empty array: []`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  try {
    let body: any;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { image, item_hint } = body;
    if (!image || typeof image !== "string") {
      return errorResponse("'image' field is required (base64 string)", 400);
    }

    const base64Data = image.replace(/^data:image\/[a-z+]+;base64,/, "");
    if (base64Data.length > MAX_IMAGE_SIZE) {
      return errorResponse("Image too large. Maximum 5MB.", 413);
    }

    const imageUrl = `data:image/jpeg;base64,${base64Data}`;
    const prompt = item_hint
      ? `${VISION_PROMPT}\n\nHint: The user thinks this might be "${item_hint}".`
      : VISION_PROMPT;

    // Build messages with text-first ordering (Featherless docs recommend text before images)
    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: prompt },
          { type: "image_url" as const, image_url: { url: imageUrl } },
        ],
      },
    ];

    // Try Featherless first if API key is available
    const FEATHERLESS_API_KEY = Deno.env.get("FEATHERLESS_API_KEY");
    if (FEATHERLESS_API_KEY) {
      try {
        console.log(`[featherless-vision] Trying Featherless (${(base64Data.length / 1024).toFixed(0)}KB)`);
        const resp = await fetchWithTimeout(FEATHERLESS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FEATHERLESS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemma-3-27b-it",
            messages,
            temperature: 0.0,
            max_tokens: 600,
          }),
        }, TIMEOUT_MS);

        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content || "";
          const parsed = extractJSON(content);
          if (parsed) {
            const detections = (Array.isArray(parsed) ? parsed : parsed.detections || [parsed])
              .slice(0, 15)
              .map((d: any) => ({
                waste_type: String(d.waste_type || d.item || "unknown"),
                confidence: Math.min(Math.max(Number(d.confidence) || 0.75, 0), 1),
                recyclable: typeof d.recyclable === "boolean" ? d.recyclable : true,
                category: String(d.category || "other"),
                instruction: String(d.instruction || "Check local guidelines."),
                bin: String(d.bin || "Garbage"),
                material_detail: String(d.material_detail || d.materialDetail || ""),
              }));

            console.log(`[featherless-vision] Featherless detected ${detections.length} items in ${Date.now() - start}ms`);
            return new Response(
              JSON.stringify({ detections, provider: "featherless" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        } else {
          console.warn(`[featherless-vision] Featherless returned ${resp.status}, falling back to Lovable AI`);
        }
      } catch (e) {
        console.warn(`[featherless-vision] Featherless error, falling back:`, e instanceof Error ? e.message : e);
      }
    }

    // Fallback to Lovable AI gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return errorResponse("No AI service configured for vision", 500);
    }

    console.log(`[featherless-vision] Using Lovable AI fallback`);
    const resp = await fetchWithTimeout(LOVABLE_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.0,
        max_tokens: 600,
      }),
    }, TIMEOUT_MS);

    if (!resp.ok) {
      if (resp.status === 429) return errorResponse("Rate limited. Please wait.", 429);
      if (resp.status === 402) return errorResponse("AI credits exhausted.", 402);
      const errBody = await resp.text();
      console.error(`[featherless-vision] Lovable ${resp.status}:`, errBody.slice(0, 500));
      return errorResponse("Vision AI temporarily unavailable", 502);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = extractJSON(content);

    if (parsed) {
      const detections = (Array.isArray(parsed) ? parsed : parsed.detections || [parsed])
        .slice(0, 15)
        .map((d: any) => ({
          waste_type: String(d.waste_type || d.item || "unknown"),
          confidence: Math.min(Math.max(Number(d.confidence) || 0.75, 0), 1),
          recyclable: typeof d.recyclable === "boolean" ? d.recyclable : true,
          category: String(d.category || "other"),
          instruction: String(d.instruction || "Check local guidelines."),
          bin: String(d.bin || "Garbage"),
          material_detail: String(d.material_detail || d.materialDetail || ""),
        }));

      console.log(`[featherless-vision] Lovable detected ${detections.length} items in ${Date.now() - start}ms`);
      return new Response(
        JSON.stringify({ detections, provider: "lovable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ detections: [], provider: "lovable" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return errorResponse("Vision analysis timed out.", 504);
    }
    console.error(`[featherless-vision] Error after ${Date.now() - start}ms:`, e);
    return errorResponse(e instanceof Error ? e.message : "Vision analysis failed", 500);
  }
});
