import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATHERLESS_URL = "https://api.featherless.ai/v1";
const TIMEOUT_MS = 15_000;

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FEATHERLESS_API_KEY = Deno.env.get("FEATHERLESS_API_KEY");
    if (!FEATHERLESS_API_KEY) {
      // Return a curated list of models when Featherless is not configured
      return new Response(JSON.stringify({
        models: [
          { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", name: "Llama 3.1 8B", tier: "fast", status: "available", vision: false, tools: false },
          { id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B", tier: "heavy", status: "available", vision: false, tools: false },
          { id: "Qwen/Qwen3-8B", name: "Qwen 3 8B", tier: "fast", status: "available", vision: false, tools: true },
          { id: "google/gemma-3-27b-it", name: "Gemma 3 27B", tier: "heavy", status: "available", vision: true, tools: false },
          { id: "Qwen/Qwen2.5-7B-Instruct", name: "Qwen 2.5 7B", tier: "fast", status: "available", vision: false, tools: false },
        ],
        source: "static",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = req.url;
    const action = new URL(url).searchParams.get("action") || "list";

    if (action === "tokenize") {
      // Tokenize endpoint
      let body: any;
      try { body = await req.json(); } catch {
        return errorResponse("Invalid JSON body", 400);
      }

      const { text, model } = body;
      if (!text || typeof text !== "string") {
        return errorResponse("'text' is required", 400);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const resp = await fetch(`${FEATHERLESS_URL}/tokenize`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FEATHERLESS_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: model || "meta-llama/Meta-Llama-3.1-8B-Instruct",
            text,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Fallback: estimate tokens roughly (1 token ≈ 4 chars)
        const estimatedTokens = Math.ceil(text.length / 4);
        return new Response(JSON.stringify({
          tokens: estimatedTokens,
          estimated: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } finally {
        clearTimeout(timer);
      }
    }

    // List models
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(`${FEATHERLESS_URL}/models`, {
        headers: {
          Authorization: `Bearer ${FEATHERLESS_API_KEY}`,
        },
        signal: controller.signal,
      });

      if (!resp.ok) {
        console.error(`[featherless-models] ${resp.status}`);
        return errorResponse("Could not fetch models", 502);
      }

      const data = await resp.json();
      const allModels = data.data || data || [];

      // Filter and categorize relevant models
      const RELEVANT_PREFIXES = [
        "meta-llama/", "Qwen/", "google/", "mistralai/",
        "microsoft/", "deepseek-ai/", "moonshotai/",
      ];

      const VISION_PATTERNS = ["vision", "gemma-3", "llava", "pixtral"];
      const TOOL_PATTERNS = ["qwen3", "kimi-k2", "Qwen3"];

      const models = allModels
        .filter((m: any) => RELEVANT_PREFIXES.some(p => m.id?.startsWith(p)))
        .slice(0, 50)
        .map((m: any) => {
          const id = m.id || "";
          const isVision = VISION_PATTERNS.some(p => id.toLowerCase().includes(p));
          const isTools = TOOL_PATTERNS.some(p => id.includes(p));
          const isHeavy = id.includes("70B") || id.includes("72B") || id.includes("27b");
          return {
            id,
            name: id.split("/").pop() || id,
            tier: isHeavy ? "heavy" : "fast",
            status: m.status || "available",
            vision: isVision,
            tools: isTools,
          };
        });

      return new Response(JSON.stringify({ models, source: "featherless" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return errorResponse("Request timed out", 504);
    }
    console.error("[featherless-models] Error:", e);
    return errorResponse(e instanceof Error ? e.message : "Internal error", 500);
  }
});
