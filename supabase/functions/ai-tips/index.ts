import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scanHistory = [], points = 0, streak = 0 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const recentItems = scanHistory
      .slice(0, 10)
      .flatMap((r: { items: { displayName: string }[] }) => r.items.map((i) => i.displayName));

    const context = recentItems.length > 0
      ? `The user has recently scanned: ${recentItems.join(", ")}. They have ${points} points and a ${streak}-day streak.`
      : `The user is new and hasn't scanned items yet. They have ${points} points.`;

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
            content: `You are RecycleMate AI, a personalized sustainability coach. Generate daily eco-tips tailored to the user's recycling habits.
Make tips actionable, surprising, and motivating. Mix practical recycling advice with broader sustainability tips.`,
          },
          {
            role: "user",
            content: `${context}\n\nGenerate 5 personalized eco-tips for today.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_tips",
              description: "Generate personalized eco-tips",
              parameters: {
                type: "object",
                properties: {
                  tips: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short catchy title" },
                        tip: { type: "string", description: "2-3 sentence actionable tip" },
                        category: { type: "string", enum: ["recycling", "reduce", "reuse", "sustainability", "eco-hack"] },
                        emoji: { type: "string", description: "Single relevant emoji" },
                      },
                      required: ["title", "tip", "category", "emoji"],
                    },
                  },
                },
                required: ["tips"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_tips" } },
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
      throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed.tips), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No response from AI");
  } catch (e) {
    console.error("ai-tips error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
