import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions";
const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TIMEOUT_MS = 15_000;

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const FALLBACK_NUDGES = [
  "Your recycling streak is growing — keep the momentum going! 🌿",
  "Every scan counts. You're making a real difference for the planet. 🌍",
  "Small habits, big impact. Ready to sort something today? ♻️",
  "You're ahead of 90% of people just by caring about recycling! 🏆",
  "One more scan and you'll hit a new milestone! 🎯",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: any;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { userStats } = body;
    if (!userStats || typeof userStats !== "object") {
      return errorResponse("'userStats' object is required", 400);
    }

    const prompt = `Write one short, encouraging recycling nudge message (max 20 words).
Be positive, action-oriented, not cheesy. Use at most 1 emoji.

User stats:
- Points: ${userStats.points ?? 0}
- Streak: ${userStats.streak ?? 0} days
- Total scans: ${userStats.totalScans ?? 0}
- Recent items: ${userStats.recentItems?.join(", ") || "none yet"}

Return ONLY the nudge text, nothing else.`;

    const messages = [
      { role: "system", content: "Write a short encouraging gamification message for a recycling app user." },
      { role: "user", content: prompt },
    ];

    // Try Featherless first
    const FEATHERLESS_API_KEY = Deno.env.get("FEATHERLESS_API_KEY");
    if (FEATHERLESS_API_KEY) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          const resp = await fetch(FEATHERLESS_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FEATHERLESS_API_KEY}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
              messages,
              temperature: 0.7,
              max_tokens: 60,
            }),
          });

          if (resp.ok) {
            const data = await resp.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (text) {
              return new Response(
                JSON.stringify({ text, provider: "featherless" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
          }
        } finally {
          clearTimeout(timer);
        }
      } catch (e) {
        console.warn("[daily-nudge] Featherless failed, trying fallback:", e instanceof Error ? e.message : e);
      }
    }

    // Fallback to Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          const resp = await fetch(LOVABLE_GATEWAY, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages,
            }),
          });

          if (resp.ok) {
            const data = await resp.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (text) {
              return new Response(
                JSON.stringify({ text, provider: "lovable" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
          }
        } finally {
          clearTimeout(timer);
        }
      } catch {
        // fall through to static fallback
      }
    }

    // Static fallback
    const text = FALLBACK_NUDGES[Math.floor(Math.random() * FALLBACK_NUDGES.length)];
    return new Response(
      JSON.stringify({ text, provider: "static" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[daily-nudge] Error:", e);
    return errorResponse(e instanceof Error ? e.message : "Internal error", 500);
  }
});
