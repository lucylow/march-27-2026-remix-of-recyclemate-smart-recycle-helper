import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions";
const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TIMEOUT_MS = 45_000;
const MAX_TOOL_ROUNDS = 5;

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

// ─── Tool definitions for the RecycleMate agent ───

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "lookup_local_rules",
      description: "Look up local recycling/disposal rules for a waste item in a specific municipality or region.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Municipality or region name (e.g. 'Peel Region', 'Toronto')" },
          waste_type: { type: "string", description: "The waste item or material (e.g. 'pizza box', 'plastic bag')" },
        },
        required: ["location", "waste_type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "translate_instruction",
      description: "Translate a recycling instruction to another language while keeping bin names and recycling terminology precise.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "The instruction text to translate" },
          target_lang: { type: "string", description: "Target language code (en, fr, es, zh, hi, pa, ar, pt, de, ko, ja, ur, ta, tl, it)" },
        },
        required: ["text", "target_lang"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_impact",
      description: "Calculate the environmental impact of recycling specific items. Returns CO2 saved, trees saved, water saved, energy saved.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                weight_g: { type: "number", description: "Weight in grams" },
              },
              required: ["name"],
            },
            description: "List of items to calculate impact for",
          },
        },
        required: ["items"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_stats",
      description: "Get the current user's recycling stats including points, streak, and recent scan history.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

// ─── Tool execution (server-side) ───

const LOCAL_RULES: Record<string, Record<string, { bin: string; instruction: string }>> = {
  default: {
    "pizza box": { bin: "Recycling (Blue Bin)", instruction: "If grease-free, flatten and place in Blue Bin. If heavily greasy, tear off clean portion for Blue Bin and compost the rest." },
    "plastic bag": { bin: "Garbage (Black Bin)", instruction: "Plastic bags are NOT accepted in curbside recycling. Reuse or return to retail drop-off." },
    "aluminum can": { bin: "Recycling (Blue Bin)", instruction: "Empty, rinse briefly, and place directly in Blue Bin. No need to crush." },
    "glass bottle": { bin: "Recycling (Blue Bin)", instruction: "Rinse, remove cap. Place in Blue Bin or glass-specific container." },
    "styrofoam": { bin: "Garbage (Black Bin)", instruction: "Polystyrene is not accepted in most curbside programs. Place in Black Bin." },
    "battery": { bin: "Hazardous (Drop-off)", instruction: "Never place in regular bins. Take to designated hazardous waste drop-off or participating retailer." },
    "food waste": { bin: "Compost (Green Bin)", instruction: "Place in Green Bin. Remove any non-organic packaging first." },
    "cardboard": { bin: "Recycling (Blue Bin)", instruction: "Flatten, remove tape/labels if possible. Keep dry. Place in Blue Bin." },
  },
};

const CO2_FACTORS: Record<string, number> = {
  "plastic bottle": 0.085, "aluminum can": 0.060, "paper": 0.015,
  "cardboard": 0.022, "glass bottle": 0.040, "plastic bag": 0.010,
  "pizza box": 0.018, "food waste": 0.005, "newspaper": 0.012,
};

function executeTool(name: string, args: any, userContext: any): string {
  switch (name) {
    case "lookup_local_rules": {
      const rules = LOCAL_RULES.default;
      const key = (args.waste_type || "").toLowerCase();
      const match = Object.entries(rules).find(([k]) => key.includes(k) || k.includes(key));
      if (match) {
        return JSON.stringify({
          item: match[0],
          bin: match[1].bin,
          instruction: match[1].instruction,
          location: args.location || "General",
          source: "RecycleMate local rules database",
        });
      }
      return JSON.stringify({
        item: args.waste_type,
        bin: "Unknown",
        instruction: `No specific rule found for "${args.waste_type}" in ${args.location || "your area"}. Check your local municipal website for guidance.`,
        location: args.location || "General",
      });
    }

    case "translate_instruction": {
      // For server-side, return a marker — the LLM will do the actual translation
      return JSON.stringify({
        original: args.text,
        target_lang: args.target_lang,
        note: "Translation will be provided by the model in its final response.",
      });
    }

    case "calculate_impact": {
      const items = args.items || [];
      let totalCo2 = 0;
      const breakdown = items.map((item: any) => {
        const factor = CO2_FACTORS[item.name?.toLowerCase()] || 0.02;
        const weight = item.weight_g || 200;
        const co2 = (weight / 1000) * factor;
        totalCo2 += co2;
        return { name: item.name, weight_g: weight, co2_saved_kg: Math.round(co2 * 10000) / 10000 };
      });
      return JSON.stringify({
        items: breakdown,
        co2SavedKg: Math.round(totalCo2 * 10000) / 10000,
        treesSaved: Math.round((totalCo2 / 21.77) * 10000) / 10000,
        waterSavedLiters: Math.round(items.length * 12.5 * 10) / 10,
        energySavedKwh: Math.round(totalCo2 * 2.1 * 100) / 100,
      });
    }

    case "get_user_stats": {
      return JSON.stringify({
        points: userContext?.points ?? 0,
        streak: userContext?.streak ?? 0,
        totalScans: userContext?.totalScans ?? 0,
        recentScans: userContext?.recentScans ?? [],
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── AI provider call with retry for cold models ───

async function callProvider(
  messages: any[],
  tools: any[],
  apiKey: string,
  url: string,
  model: string,
  retries = 2,
): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        temperature: 0.1,
        max_tokens: 1024,
      }),
    }, TIMEOUT_MS);

    if (resp.status === 503 && attempt < retries) {
      console.log(`[featherless-agent] 503 (cold model?), retry ${attempt + 1}/${retries} in 2s`);
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Provider ${resp.status}: ${body.slice(0, 300)}`);
    }

    return resp.json();
  }
  throw new Error("Max retries exceeded");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  try {
    let body: any;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { messages, userContext, model } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse("'messages' must be a non-empty array", 400);
    }
    if (messages.length > 50) {
      return errorResponse("Too many messages (max 50)", 400);
    }

    // Build system prompt
    const systemPrompt = `You are **RecycleMate AI Agent** — an expert recycling assistant with access to tools.

IMPORTANT RULES:
- When a user asks about disposing of an item, ALWAYS call lookup_local_rules first to get accurate local rules.
- When a user asks in a non-English language or requests translation, call translate_instruction.
- When a user asks about environmental impact, call calculate_impact with the items.
- When you need the user's stats for personalization, call get_user_stats.
- You may call multiple tools in sequence if needed.
- After receiving tool results, give a concise, friendly answer.
- Use emoji sparingly (1-2 per response).
- Format with markdown for readability.
- Keep answers to 2-4 short paragraphs max.

${userContext ? `User context: Points=${userContext.points ?? 0}, Streak=${userContext.streak ?? 0}, Scans=${userContext.totalScans ?? 0}` : ""}`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // Determine provider
    const FEATHERLESS_API_KEY = Deno.env.get("FEATHERLESS_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let providerUrl: string;
    let providerKey: string;
    let providerModel: string;

    if (FEATHERLESS_API_KEY) {
      providerUrl = FEATHERLESS_URL;
      providerKey = FEATHERLESS_API_KEY;
      // Qwen 3 and Kimi-K2 support tool calling natively on Featherless
      providerModel = model || "Qwen/Qwen3-8B";
    } else if (LOVABLE_API_KEY) {
      providerUrl = LOVABLE_GATEWAY;
      providerKey = LOVABLE_API_KEY;
      providerModel = "google/gemini-3-flash-preview";
    } else {
      return errorResponse("No AI service configured", 500);
    }

    // ─── Agent loop: call model → execute tools → call model again ───
    let currentMessages = [...apiMessages];
    let finalContent = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const data = await callProvider(
        currentMessages,
        AGENT_TOOLS,
        providerKey,
        providerUrl,
        providerModel,
      );

      const choice = data.choices?.[0];
      if (!choice) {
        return errorResponse("No response from AI", 502);
      }

      const msg = choice.message;

      // If no tool calls, we have our final answer
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        finalContent = msg.content || "";
        break;
      }

      // Execute each tool call
      currentMessages.push(msg); // Add assistant message with tool_calls

      for (const toolCall of msg.tool_calls) {
        const fnName = toolCall.function?.name;
        let fnArgs: any = {};
        try {
          fnArgs = JSON.parse(toolCall.function?.arguments || "{}");
        } catch {
          fnArgs = {};
        }

        console.log(`[featherless-agent] Tool call: ${fnName}(${JSON.stringify(fnArgs).slice(0, 200)})`);
        const result = executeTool(fnName, fnArgs, userContext);

        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // If this was the last round, the next iteration will get the final answer
    }

    // If we exhausted rounds without a final text answer, try one more without tools
    if (!finalContent) {
      const fallbackData = await callProvider(
        currentMessages,
        [], // no tools — force a text answer
        providerKey,
        providerUrl,
        providerModel,
        0,
      );
      finalContent = fallbackData.choices?.[0]?.message?.content || "I wasn't able to complete the analysis. Please try again.";
    }

    console.log(`[featherless-agent] Done in ${Date.now() - start}ms, ${currentMessages.length} messages`);

    return new Response(JSON.stringify({ text: finalContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return errorResponse("Agent request timed out.", 504);
    }
    console.error(`[featherless-agent] Error after ${Date.now() - start}ms:`, e);
    return errorResponse(e instanceof Error ? e.message : "Agent error", 500);
  }
});
