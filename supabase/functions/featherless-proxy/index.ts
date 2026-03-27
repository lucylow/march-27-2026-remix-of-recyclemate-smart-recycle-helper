import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions";
const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

// ─── In-memory cache (per isolate lifetime) ───
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

function getCacheKey(model: string, messages: any[]): string {
  // Only cache deterministic requests (low temperature)
  const key = JSON.stringify({ model, messages: messages.slice(-3) });
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash));
}

function getCached(key: string): any | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any): void {
  // Prune if too large
  if (responseCache.size > 200) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
}

// ─── Model routing by task ───
const TASK_MODELS: Record<string, string> = {
  vision: "google/gemma-3-27b-it",
  chat: "meta-llama/Meta-Llama-3.1-8B-Instruct",
  translation: "Qwen/Qwen2.5-7B-Instruct",
  impact: "Qwen/Qwen2.5-7B-Instruct",
  agent: "Qwen/Qwen3-8B",
  demo: "meta-llama/Meta-Llama-3.1-70B-Instruct",
};

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

    const { messages, model, temperature, max_tokens, stream, tools, tool_choice, task } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse("'messages' must be a non-empty array", 400);
    }
    if (messages.length > 50) {
      return errorResponse("Too many messages. Maximum 50 allowed.", 400);
    }

    // Determine provider and model
    const FEATHERLESS_API_KEY = Deno.env.get("FEATHERLESS_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let providerUrl: string;
    let providerKey: string;

    if (FEATHERLESS_API_KEY) {
      providerUrl = FEATHERLESS_URL;
      providerKey = FEATHERLESS_API_KEY;
    } else if (LOVABLE_API_KEY) {
      providerUrl = LOVABLE_GATEWAY;
      providerKey = LOVABLE_API_KEY;
    } else {
      return errorResponse("No AI service configured. Add FEATHERLESS_API_KEY or ensure Lovable AI is enabled.", 500);
    }

    // Task-based model selection with explicit override support
    let selectedModel = model;
    if (!selectedModel && task && TASK_MODELS[task]) {
      selectedModel = TASK_MODELS[task];
    }
    if (!selectedModel) {
      selectedModel = "meta-llama/Meta-Llama-3.1-8B-Instruct";
    }

    // If using Lovable AI gateway, override to compatible model
    if (!FEATHERLESS_API_KEY && LOVABLE_API_KEY) {
      selectedModel = "google/gemini-3-flash-preview";
    }

    // Vision auto-detect: switch model for multimodal content
    const hasVision = messages.some((m: any) =>
      Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url")
    );
    if (hasVision && !model && FEATHERLESS_API_KEY) {
      selectedModel = "google/gemma-3-27b-it";
    }

    const payload: Record<string, unknown> = {
      model: selectedModel,
      messages,
      temperature: temperature ?? 0.3,
      max_tokens: max_tokens ?? 1024,
      stream: stream ?? false,
    };

    if (tools) payload.tools = tools;
    if (tool_choice) payload.tool_choice = tool_choice;

    // Cache check for non-streaming, low-temperature requests
    const isCacheable = !stream && (temperature ?? 0.3) <= 0.2 && !tools;
    let cacheKey = "";
    if (isCacheable) {
      cacheKey = getCacheKey(selectedModel, messages);
      const cached = getCached(cacheKey);
      if (cached) {
        console.log(`[featherless-proxy] Cache HIT in ${Date.now() - start}ms`);
        return new Response(JSON.stringify({ ...cached, _cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Retry logic for cold models (503) and transient errors
    let response: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await fetchWithTimeout(
          providerUrl,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${providerKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
          TIMEOUT_MS,
        );

        if (response.status === 503 && attempt < MAX_RETRIES) {
          console.log(`[featherless-proxy] 503 (cold model?), retry ${attempt + 1}/${MAX_RETRIES} in ${2 * (attempt + 1)}s`);
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          console.log(`[featherless-proxy] ${response.status}, retry ${attempt + 1}`);
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        break;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError" && attempt < MAX_RETRIES) {
          console.log(`[featherless-proxy] Timeout, retry ${attempt + 1}`);
          continue;
        }
        throw e;
      }
    }

    if (!response) {
      // If Featherless failed, try Lovable AI as ultimate fallback
      if (FEATHERLESS_API_KEY && LOVABLE_API_KEY) {
        console.log("[featherless-proxy] Featherless exhausted, falling back to Lovable AI");
        payload.model = "google/gemini-3-flash-preview";
        response = await fetchWithTimeout(
          LOVABLE_GATEWAY,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
          TIMEOUT_MS,
        );
      }
      if (!response) {
        return errorResponse("Failed to reach AI provider after retries", 502);
      }
    }

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 429)
        return errorResponse("Rate limit exceeded. Please wait a moment.", 429);
      if (response.status === 402)
        return errorResponse("AI credits exhausted. Please add funds.", 402);
      if (response.status === 401 || response.status === 403)
        return errorResponse("Invalid API key. Check your configuration.", 401);
      console.error(`[featherless-proxy] ${response.status}:`, errBody.slice(0, 500));

      // Cross-provider fallback on error
      if (FEATHERLESS_API_KEY && LOVABLE_API_KEY && providerUrl === FEATHERLESS_URL) {
        console.log("[featherless-proxy] Featherless error, trying Lovable AI fallback");
        payload.model = "google/gemini-3-flash-preview";
        const fallbackResp = await fetchWithTimeout(
          LOVABLE_GATEWAY,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
          TIMEOUT_MS,
        );
        if (fallbackResp.ok) {
          console.log(`[featherless-proxy] Lovable AI fallback OK in ${Date.now() - start}ms`);
          if (stream) {
            return new Response(fallbackResp.body, {
              headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
            });
          }
          const data = await fallbackResp.json();
          return new Response(JSON.stringify({ ...data, _fallback: "lovable" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return errorResponse("AI service temporarily unavailable.", 502);
    }

    console.log(`[featherless-proxy] OK in ${Date.now() - start}ms, model=${selectedModel}, stream=${!!stream}, task=${task || "default"}`);

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();

    // Cache the result
    if (isCacheable && cacheKey) {
      setCache(cacheKey, data);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.error(`[featherless-proxy] Timed out after ${TIMEOUT_MS}ms`);
      return errorResponse("Request timed out.", 504);
    }
    console.error(`[featherless-proxy] Error after ${Date.now() - start}ms:`, e);
    return errorResponse(e instanceof Error ? e.message : "Internal error", 500);
  }
});
