import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Strip data URI prefix if present
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are RecycleMate Vision AI — an expert waste item detection system.
Analyze the image and identify ALL recyclable, compostable, or disposable items visible.
For each item, estimate:
- A precise label (snake_case, e.g. plastic_bottle, aluminum_can, cardboard_box)
- A human-friendly display name
- A confidence score between 0.70 and 0.99
- An approximate bounding box [x, y, width, height] as fractions of image dimensions (0-1)

Common waste categories you can detect:
plastic_bottle, aluminum_can, glass_bottle, cardboard, newspaper, styrofoam,
food_waste, battery, electronic_waste, plastic_bag, paper_cup, tin_can,
milk_carton, pizza_box, egg_carton, yogurt_container, chip_bag, water_jug,
light_bulb, medication_bottle, aerosol_can, clothing, shoe, tire, wood_scrap

If no waste items are clearly visible, return an empty array.
Return ONLY valid JSON using the tool call.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify all waste/recyclable items in this image. Return detected items with labels, display names, confidence scores, and bounding boxes.",
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
              description: "Report all waste items detected in the image",
              parameters: {
                type: "object",
                properties: {
                  detections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: {
                          type: "string",
                          description: "Snake_case identifier e.g. plastic_bottle",
                        },
                        displayName: {
                          type: "string",
                          description: "Human readable name e.g. Plastic Bottle (PET 1)",
                        },
                        confidence: {
                          type: "number",
                          description: "Detection confidence 0.0-1.0",
                        },
                        bbox: {
                          type: "array",
                          items: { type: "number" },
                          description: "[x, y, width, height] as fractions of image (0-1)",
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
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Vision API error:", response.status, errorText);
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      const detections = parsed.detections || [];

      // Validate and clamp bounding boxes
      const validated = detections.map((d: any) => ({
        label: String(d.label || "unknown"),
        displayName: String(d.displayName || d.label || "Unknown Item"),
        confidence: Math.min(Math.max(Number(d.confidence) || 0.75, 0), 1),
        bbox: Array.isArray(d.bbox) && d.bbox.length === 4
          ? d.bbox.map((v: number) => Math.min(Math.max(Number(v) || 0, 0), 1))
          : [0.2, 0.2, 0.4, 0.4],
      }));

      return new Response(JSON.stringify({ detections: validated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try parsing content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify({ detections: parsed.detections || parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        // ignore
      }
    }

    return new Response(JSON.stringify({ detections: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-vision error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Vision analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
