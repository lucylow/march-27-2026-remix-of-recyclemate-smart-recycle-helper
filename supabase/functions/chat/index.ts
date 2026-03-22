import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
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

function handleGatewayError(status: number, body: string): Response {
  if (status === 429) return errorResponse("Rate limit exceeded. Please wait a moment and try again.", 429);
  if (status === 402) return errorResponse("AI credits exhausted. Please add funds to continue.", 402);
  console.error(`[chat] Gateway ${status}:`, body.slice(0, 500));
  return errorResponse("AI service temporarily unavailable. Please try again.", 502);
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

    const { messages, userContext } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse("'messages' must be a non-empty array", 400);
    }
    if (messages.length > 50) {
      return errorResponse("Too many messages. Maximum 50 allowed.", 400);
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return errorResponse("Each message must have 'role' and 'content'", 400);
      }
      if (typeof msg.content === "string" && msg.content.length > 10_000) {
        return errorResponse("Message content too long. Maximum 10,000 characters.", 400);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[chat] LOVABLE_API_KEY not configured");
      return errorResponse("AI service not configured", 500);
    }

    // Build contextual system prompt with user data
    let contextBlock = "";
    if (userContext) {
      const parts: string[] = [];
      if (userContext.points != null) parts.push(`Points: ${userContext.points}`);
      if (userContext.streak != null) parts.push(`Streak: ${userContext.streak} days`);
      if (Array.isArray(userContext.recentScans) && userContext.recentScans.length > 0) {
        parts.push(`Recently scanned: ${userContext.recentScans.slice(0, 10).join(", ")}`);
      }
      if (parts.length > 0) {
        contextBlock = `\n\nUser context (use to personalize answers):\n${parts.join("\n")}`;
      }
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
            content: `You are **RecycleMate AI** — a friendly, expert recycling and sustainability assistant built into the RecycleMate app.

Your capabilities:
- Identify how to properly dispose of any item (plastic types, metals, glass, organics, e-waste, hazardous materials)
- Explain recycling processes and why certain materials can/cannot be recycled
- Provide location-aware advice (when the user mentions their area)
- Share surprising eco-facts and practical sustainability tips
- Debunk common recycling myths
- Analyze the user's scan history to give personalized advice

Guidelines:
- Keep answers concise: 2-4 short paragraphs max
- Use **bold** for key terms and bullet points for lists
- Use emoji sparingly (1-2 per response) for warmth
- If unsure about local regulations, clearly state that and suggest checking the local municipal website
- Always be encouraging — celebrate good recycling habits
- When discussing materials, mention the resin code (e.g., PET #1, HDPE #2) when relevant
- If the user has scan history, reference it to make answers personal
- Format with markdown for readability${contextBlock}`,
          },
          ...messages,
        ],
        stream: true,
      }),
    }, TIMEOUT_MS);

    if (!response.ok) {
      const body = await response.text();
      return handleGatewayError(response.status, body);
    }

    console.log(`[chat] Stream started in ${Date.now() - start}ms, ${messages.length} messages`);

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.error(`[chat] Request timed out after ${TIMEOUT_MS}ms`);
      return errorResponse("Request timed out. Please try a shorter question.", 504);
    }
    console.error(`[chat] Error after ${Date.now() - start}ms:`, e);
    return errorResponse(e instanceof Error ? e.message : "Internal error", 500);
  }
});
