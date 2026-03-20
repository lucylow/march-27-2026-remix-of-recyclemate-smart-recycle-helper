import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { items } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const itemList = items.map((i: { displayName: string; label: string; confidence: number }) =>
      `- ${i.displayName} (detected as: ${i.label}, confidence: ${(i.confidence * 100).toFixed(1)}%)`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are RecycleMate AI, a recycling disposal expert. Given scanned items, return disposal instructions as JSON.
Return ONLY a valid JSON array with objects containing these fields:
- item: string (display name)
- material: string (material type)
- instruction: string (2-3 sentence disposal instruction, specific and actionable)
- bin: one of "Recycling", "Garbage", "Compost", "Hazardous", "Drop-off"
- binColor: one of "primary" (recycling), "foreground" (garbage), "success" (compost), "warning" (hazardous/drop-off)
- ecoTip: string (a fun eco-fact about this material, 1 sentence)
- dropoff: string or null (drop-off location suggestion if applicable)

Be specific with instructions (e.g. "rinse container", "remove cap", "flatten box").`,
          },
          {
            role: "user",
            content: `I scanned these items:\n${itemList}\n\nProvide disposal instructions as a JSON array.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_disposal_instructions",
              description: "Return disposal instructions for scanned items",
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
                    },
                  },
                },
                required: ["instructions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_disposal_instructions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI scan error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed.instructions), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No tool call response from AI");
  } catch (e) {
    console.error("ai-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
