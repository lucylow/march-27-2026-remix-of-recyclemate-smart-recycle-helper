import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions";
const TIMEOUT_MS = 30_000;

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

    const { messages, model, temperature, max_tokens, stream, tools, tool_choice } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse("'messages' must be a non-empty array", 400);
    }
    if (messages.length > 50) {
      return errorResponse("Too many messages. Maximum 50 allowed.", 400);
    }

    const FEATHERLESS_API_KEY = Deno.env.get("FEATHERLESS_API_KEY");
    if (!FEATHERLESS_API_KEY) {
      console.error("[featherless-proxy] FEATHERLESS_API_KEY not configured");
      return errorResponse(
        "Featherless.ai not configured. Please add your API key in project settings.",
        500,
      );
    }

    const payload: Record<string, unknown> = {
      model: model || "accounts/fireworks/models/llama-v3p1-8b-instruct",
      messages,
      temperature: temperature ?? 0.3,
      max_tokens: max_tokens ?? 1024,
      stream: stream ?? false,
    };

    if (tools) payload.tools = tools;
    if (tool_choice) payload.tool_choice = tool_choice;

    const response = await fetchWithTimeout(
      FEATHERLESS_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FEATHERLESS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      TIMEOUT_MS,
    );

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 429)
        return errorResponse("Featherless rate limit exceeded. Please wait.", 429);
      if (response.status === 401 || response.status === 403)
        return errorResponse("Invalid Featherless API key. Check your configuration.", 401);
      console.error(`[featherless-proxy] ${response.status}:`, errBody.slice(0, 500));
      return errorResponse("Featherless AI temporarily unavailable.", 502);
    }

    console.log(`[featherless-proxy] OK in ${Date.now() - start}ms, stream=${!!stream}`);

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
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
