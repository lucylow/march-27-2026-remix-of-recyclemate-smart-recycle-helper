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

    const scanHistory = Array.isArray(body.scanHistory) ? body.scanHistory.slice(0, 15) : [];
    const points = Math.max(Number(body.points) || 0, 0);
    const streak = Math.max(Number(body.streak) || 0, 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[ai-tips] LOVABLE_API_KEY not configured");
      return errorResponse("AI service not configured", 500);
    }

    // Build rich user profile context
    const recentItems = scanHistory
      .flatMap((r: { items: { displayName: string; label: string }[] }) =>
        r.items.map((i) => i.displayName || i.label)
      );

    const materialCounts: Record<string, number> = {};
    scanHistory.forEach((r: { items: { label: string }[] }) =>
      r.items.forEach((i) => {
        const mat = i.label?.replace(/_/g, " ") || "unknown";
        materialCounts[mat] = (materialCounts[mat] || 0) + 1;
      })
    );

    const topMaterials = Object.entries(materialCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([mat, count]) => `${mat} (${count}x)`)
      .join(", ");

    let userProfile: string;
    if (recentItems.length > 0) {
      userProfile = `User profile:
- Points: ${points} | Streak: ${streak} day(s)
- Recently scanned: ${recentItems.slice(0, 8).join(", ")}
- Most recycled materials: ${topMaterials || "varied"}
- Total scans: ${scanHistory.length}`;
    } else {
      userProfile = `User profile:
- New user (no scan history yet)
- Points: ${points} | Streak: ${streak} day(s)
- Focus on beginner-friendly, motivating tips to get them started`;
    }

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
            content: `You are **RecycleMate Sustainability Coach** — you generate personalized, actionable eco-tips tailored to each user's recycling habits.

Tip quality standards:
- Each tip must be **specific and actionable** (not generic advice like "reduce waste")
- Reference the user's actual habits when possible (e.g., "Since you recycle a lot of plastic bottles, try...")
- Mix categories: recycling technique, waste reduction, reuse ideas, sustainability lifestyle, surprising eco-hacks
- Titles should be catchy and concise (3-6 words)
- Tips should be 2-3 sentences, practical, and include a specific action the user can take today
- Include a relevant single emoji for each tip
- For new users: focus on quick wins and motivating facts

Categories to use: "recycling", "reduce", "reuse", "sustainability", "eco-hack"`,
          },
          {
            role: "user",
            content: `${userProfile}\n\nGenerate 5 personalized eco-tips for today. Make them relevant to my recycling habits and progress level.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_tips",
              description: "Generate personalized sustainability tips",
              parameters: {
                type: "object",
                properties: {
                  tips: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Catchy 3-6 word title" },
                        tip: { type: "string", description: "2-3 sentence actionable tip" },
                        category: { type: "string", enum: ["recycling", "reduce", "reuse", "sustainability", "eco-hack"] },
                        emoji: { type: "string", description: "Single relevant emoji" },
                      },
                      required: ["title", "tip", "category", "emoji"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_tips" } },
      }),
    }, TIMEOUT_MS);

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 429) return errorResponse("Rate limited. Please try again shortly.", 429);
      if (response.status === 402) return errorResponse("AI credits exhausted.", 402);
      console.error(`[ai-tips] Gateway ${response.status}:`, errBody.slice(0, 500));
      return errorResponse("AI service temporarily unavailable", 502);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        const tips = parsed.tips || [];
        console.log(`[ai-tips] Generated ${tips.length} tips in ${Date.now() - start}ms (user: ${points}pts, ${streak}d streak)`);
        return new Response(JSON.stringify(tips), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseErr) {
        console.error("[ai-tips] Failed to parse tool call:", parseErr);
        return errorResponse("AI returned invalid tips format", 502);
      }
    }

    console.error("[ai-tips] No tool call in response");
    return errorResponse("AI did not return tips", 502);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.error(`[ai-tips] Timed out after ${TIMEOUT_MS}ms`);
      return errorResponse("Tips generation timed out. Please try again.", 504);
    }
    console.error(`[ai-tips] Error after ${Date.now() - start}ms:`, e);
    return errorResponse(e instanceof Error ? e.message : "Internal error", 500);
  }
});
