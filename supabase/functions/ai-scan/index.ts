import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TIMEOUT_MS = 25_000;

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

    const { items } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse("'items' must be a non-empty array of detected items", 400);
    }
    if (items.length > 20) {
      return errorResponse("Too many items. Maximum 20 per scan.", 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[ai-scan] LOVABLE_API_KEY not configured");
      return errorResponse("AI service not configured", 500);
    }

    const itemList = items.map((i: { displayName: string; label: string; confidence: number }) =>
      `- ${i.displayName} (material ID: ${i.label}, AI confidence: ${(i.confidence * 100).toFixed(1)}%)`
    ).join("\n");

    const response = await fetchWithTimeout(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are **RecycleMate Disposal Expert** — you provide precise, actionable recycling instructions for detected waste items.

For each item you MUST provide:
- **item**: The display name of the item
- **material**: Specific material type with resin code if applicable (e.g., "PET #1 Plastic", "Corrugated Cardboard", "Borosilicate Glass")
- **instruction**: 2-3 actionable sentences. Include preparation steps (rinse, remove cap, flatten, etc.), and which bin to use. Be specific — don't just say "recycle it"
- **bin**: Exactly one of: "Recycling", "Garbage", "Compost", "Hazardous", "Drop-off"
- **binColor**: Map to UI colors — "primary" (recycling/blue), "foreground" (garbage/black), "success" (compost/green), "warning" (hazardous/drop-off/orange)
- **ecoTip**: A surprising, memorable eco-fact about this material (e.g., "Recycling one aluminum can saves enough energy to run a TV for 3 hours!")
- **dropoff**: Only if bin is "Hazardous" or "Drop-off" — suggest a generic facility type (e.g., "Local household hazardous waste facility")

Quality standards:
- Instructions must be specific: mention cap removal, rinsing, label removal, flattening where appropriate
- Eco-tips should be factual, surprising, and motivating
- If confidence is low (<80%), mention the item may need visual verification`,
          },
          {
            role: "user",
            content: `I scanned these items. Provide disposal instructions for each:\n\n${itemList}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_disposal_instructions",
              description: "Return structured disposal instructions for scanned waste items",
              parameters: {
                type: "object",
                properties: {
                  instructions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        material: { type: "string" },
                        instruction: { type: "string" },
                        bin: { type: "string", enum: ["Recycling", "Garbage", "Compost", "Hazardous", "Drop-off"] },
                        binColor: { type: "string", enum: ["primary", "foreground", "success", "warning"] },
                        ecoTip: { type: "string" },
                        dropoff: { type: "string" },
                      },
                      required: ["item", "material", "instruction", "bin", "binColor", "ecoTip"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["instructions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_disposal_instructions" } },
      }),
    }, TIMEOUT_MS);

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 429) return errorResponse("Rate limited. Please try again in a moment.", 429);
      if (response.status === 402) return errorResponse("AI credits exhausted.", 402);
      console.error(`[ai-scan] Gateway ${response.status}:`, errBody.slice(0, 500));
      return errorResponse("AI service temporarily unavailable", 502);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        const instructions = parsed.instructions || [];
        console.log(`[ai-scan] Success: ${instructions.length} instructions in ${Date.now() - start}ms`);
        return new Response(JSON.stringify(instructions), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseErr) {
        console.error("[ai-scan] Failed to parse tool call arguments:", parseErr);
        return errorResponse("AI returned invalid response format", 502);
      }
    }

    console.error("[ai-scan] No tool call in response");
    return errorResponse("AI did not return structured instructions", 502);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.error(`[ai-scan] Timed out after ${TIMEOUT_MS}ms`);
      return errorResponse("Analysis timed out. Please try again.", 504);
    }
    console.error(`[ai-scan] Error after ${Date.now() - start}ms:`, e);
    return errorResponse(e instanceof Error ? e.message : "Internal error", 500);
  }
});
