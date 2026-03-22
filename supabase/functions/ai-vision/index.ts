import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TIMEOUT_MS = 45_000; // Vision needs more time
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // ~5MB base64

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { image } = body;
    if (!image || typeof image !== "string") {
      return errorResponse("'image' field is required and must be a base64 string", 400);
    }

    // Check image size
    const base64Data = image.replace(/^data:image\/[a-z+]+;base64,/, "");
    if (base64Data.length > MAX_IMAGE_SIZE) {
      return errorResponse("Image too large. Maximum 5MB. Try a lower quality photo.", 413);
    }

    // Basic format validation
    if (!/^[A-Za-z0-9+/=\s]+$/.test(base64Data.slice(0, 100))) {
      return errorResponse("Invalid base64 image data", 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[ai-vision] LOVABLE_API_KEY not configured");
      return errorResponse("AI service not configured", 500);
    }

    console.log(`[ai-vision] Processing image (${(base64Data.length / 1024).toFixed(0)}KB)`);

    const response = await fetchWithTimeout(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are **RecycleMate Vision AI** — a state-of-the-art waste detection system that identifies recyclable, compostable, and disposable items in photographs.

Detection guidelines:
1. Identify ALL distinct waste/recyclable items visible in the image
2. For each item provide:
   - **label**: snake_case identifier (e.g., plastic_bottle, aluminum_can)
   - **displayName**: Human-friendly name with material detail (e.g., "Plastic Bottle (PET #1)", "Corrugated Cardboard Box")
   - **confidence**: Realistic score between 0.70-0.99 based on image clarity and item visibility
   - **bbox**: [x, y, width, height] as fractions of image dimensions (0.0-1.0)

Supported item categories:
- Plastics: plastic_bottle, plastic_bag, yogurt_container, plastic_cup, plastic_wrap, chip_bag, styrofoam
- Metals: aluminum_can, tin_can, aerosol_can, foil
- Paper: newspaper, cardboard, paper_cup, paper_bag, magazine, pizza_box, egg_carton, milk_carton
- Glass: glass_bottle, glass_jar
- Organic: food_waste, fruit_peel, coffee_grounds
- Hazardous: battery, light_bulb, medication_bottle, paint_can
- E-waste: electronic_waste, phone, cable, charger
- Other: clothing, shoe, tire, wood_scrap, water_jug

Rules:
- Only report items you can clearly identify — no guessing
- If the image shows no waste items (e.g., landscape, person, text), return an EMPTY array
- Bounding boxes should tightly surround each item
- Lower confidence for partially obscured or blurry items
- Maximum 15 items per image`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image. Identify and locate all waste, recyclable, or disposable items. Return precise detections with bounding boxes.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_detections",
              description: "Report all waste items detected in the image with bounding boxes",
              parameters: {
                type: "object",
                properties: {
                  detections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Snake_case item identifier" },
                        displayName: { type: "string", description: "Human-readable name with material detail" },
                        confidence: { type: "number", description: "Detection confidence 0.0-1.0" },
                        bbox: {
                          type: "array",
                          items: { type: "number" },
                          description: "[x, y, width, height] as fractions of image dimensions (0-1)",
                        },
                      },
                      required: ["label", "displayName", "confidence", "bbox"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["detections"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_detections" } },
      }),
    }, TIMEOUT_MS);

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 429) return errorResponse("Rate limited. Please wait a moment and try again.", 429);
      if (response.status === 402) return errorResponse("AI credits exhausted. Please add funds.", 402);
      console.error(`[ai-vision] Gateway ${response.status}:`, errBody.slice(0, 500));
      return errorResponse("Vision AI temporarily unavailable", 502);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        const detections = (parsed.detections || [])
          .slice(0, 15) // Cap at 15 items
          .map((d: any) => ({
            label: String(d.label || "unknown").replace(/\s+/g, "_").toLowerCase(),
            displayName: String(d.displayName || d.label || "Unknown Item"),
            confidence: Math.min(Math.max(Number(d.confidence) || 0.75, 0), 1),
            bbox: Array.isArray(d.bbox) && d.bbox.length === 4
              ? d.bbox.map((v: number) => Math.min(Math.max(Number(v) || 0, 0), 1))
              : [0.2, 0.2, 0.4, 0.4],
          }));

        console.log(`[ai-vision] Detected ${detections.length} items in ${Date.now() - start}ms`);

        return new Response(JSON.stringify({ detections }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseErr) {
        console.error("[ai-vision] Failed to parse tool call:", parseErr);
        return errorResponse("AI returned invalid detection format", 502);
      }
    }

    // Fallback: try parsing content
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        const detections = parsed.detections || (Array.isArray(parsed) ? parsed : []);
        console.log(`[ai-vision] Parsed ${detections.length} items from content fallback in ${Date.now() - start}ms`);
        return new Response(JSON.stringify({ detections }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        // Content wasn't JSON
      }
    }

    console.log(`[ai-vision] No detections found in ${Date.now() - start}ms`);
    return new Response(JSON.stringify({ detections: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.error(`[ai-vision] Timed out after ${TIMEOUT_MS}ms`);
      return errorResponse("Vision analysis timed out. Try a smaller or clearer image.", 504);
    }
    console.error(`[ai-vision] Error after ${Date.now() - start}ms:`, e);
    return errorResponse(e instanceof Error ? e.message : "Vision analysis failed", 500);
  }
});
