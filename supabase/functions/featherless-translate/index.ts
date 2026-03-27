import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions";
const TIMEOUT_MS = 20_000;

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English", fr: "French", es: "Spanish", zh: "Chinese (Simplified)",
  hi: "Hindi", pa: "Punjabi", ar: "Arabic", pt: "Portuguese",
  de: "German", ko: "Korean", ja: "Japanese", ur: "Urdu",
  ta: "Tamil", tl: "Filipino/Tagalog", it: "Italian",
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { text, targetLang } = body;
    if (!text || typeof text !== "string" || text.length > 5000) {
      return errorResponse("'text' must be a string under 5000 characters", 400);
    }
    if (!targetLang || !SUPPORTED_LANGUAGES[targetLang]) {
      return errorResponse(
        `'targetLang' must be one of: ${Object.keys(SUPPORTED_LANGUAGES).join(", ")}`,
        400,
      );
    }

    const FEATHERLESS_API_KEY = Deno.env.get("FEATHERLESS_API_KEY");
    if (!FEATHERLESS_API_KEY) {
      // Fallback to Lovable AI if Featherless not configured
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return errorResponse("No AI service configured for translation", 500);
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a precise translator specializing in recycling and environmental terminology. Translate to ${SUPPORTED_LANGUAGES[targetLang]}. Return ONLY the translated text, nothing else.`,
            },
            { role: "user", content: text },
          ],
        }),
      });

      if (!response.ok) {
        return errorResponse("Translation service temporarily unavailable", 502);
      }

      const data = await response.json();
      const translated = data.choices?.[0]?.message?.content || text;
      return new Response(
        JSON.stringify({ translated, lang: targetLang, provider: "lovable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use Featherless for translation
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(FEATHERLESS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FEATHERLESS_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "accounts/fireworks/models/qwen2p5-7b-instruct",
          messages: [
            {
              role: "system",
              content: `You are a precise translator specializing in recycling and environmental terminology. Translate the following text to ${SUPPORTED_LANGUAGES[targetLang]}. Keep recycling terms accurate. Return ONLY the translated text, nothing else.`,
            },
            { role: "user", content: text },
          ],
          temperature: 0.1,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[featherless-translate] ${response.status}:`, errBody.slice(0, 300));
        return errorResponse("Translation failed", 502);
      }

      const data = await response.json();
      const translated = data.choices?.[0]?.message?.content || text;

      return new Response(
        JSON.stringify({ translated, lang: targetLang, provider: "featherless" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return errorResponse("Translation timed out", 504);
    }
    console.error("[featherless-translate] Error:", e);
    return errorResponse(e instanceof Error ? e.message : "Internal error", 500);
  }
});
