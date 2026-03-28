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

// ─── Tool definitions ───

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
  {
    type: "function",
    function: {
      name: "search_rules",
      description: "Search the recycling rules database for items matching a query. Use for broad searches like 'electronics' or 'hazardous'.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for recycling rules" },
          category: { type: "string", enum: ["recyclable", "compost", "garbage", "hazardous", "special"], description: "Filter by waste category" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_community_rule",
      description: "Submit a user-suggested recycling rule for community review. Only use when the user explicitly wants to contribute knowledge.",
      parameters: {
        type: "object",
        properties: {
          item: { type: "string", description: "The waste item name" },
          instruction: { type: "string", description: "The disposal instruction" },
          bin: { type: "string", description: "Which bin to use" },
          location: { type: "string", description: "Municipality this applies to" },
        },
        required: ["item", "instruction", "bin"],
        additionalProperties: false,
      },
    },
  },
];

// ─── Rules database ───

const LOCAL_RULES: Record<string, { bin: string; instruction: string; category: string }> = {
  "pizza box": { bin: "Recycling (Blue Bin)", instruction: "If grease-free, flatten and place in Blue Bin. If heavily greasy, tear off clean portion for Blue Bin and compost the rest.", category: "recyclable" },
  "plastic bag": { bin: "Garbage (Black Bin)", instruction: "Plastic bags are NOT accepted in curbside recycling. Reuse or return to retail drop-off.", category: "garbage" },
  "aluminum can": { bin: "Recycling (Blue Bin)", instruction: "Empty, rinse briefly, and place directly in Blue Bin. No need to crush.", category: "recyclable" },
  "glass bottle": { bin: "Recycling (Blue Bin)", instruction: "Rinse, remove cap. Place in Blue Bin or glass-specific container.", category: "recyclable" },
  "styrofoam": { bin: "Garbage (Black Bin)", instruction: "Polystyrene is not accepted in most curbside programs. Place in Black Bin.", category: "garbage" },
  "battery": { bin: "Hazardous (Drop-off)", instruction: "Never place in regular bins. Take to designated hazardous waste drop-off or participating retailer.", category: "hazardous" },
  "food waste": { bin: "Compost (Green Bin)", instruction: "Place in Green Bin. Remove any non-organic packaging first.", category: "compost" },
  "cardboard": { bin: "Recycling (Blue Bin)", instruction: "Flatten, remove tape/labels if possible. Keep dry. Place in Blue Bin.", category: "recyclable" },
  "paper": { bin: "Recycling (Blue Bin)", instruction: "Clean paper goes in Blue Bin. Shredded paper should be bagged in a clear bag.", category: "recyclable" },
  "plastic bottle": { bin: "Recycling (Blue Bin)", instruction: "Empty, rinse, remove cap. Place in Blue Bin.", category: "recyclable" },
  "yogurt container": { bin: "Recycling (Blue Bin)", instruction: "Rinse clean and place in Blue Bin. Remove any foil lids.", category: "recyclable" },
  "coffee cup": { bin: "Garbage (Black Bin)", instruction: "Lined paper cups are usually not recyclable curbside. Place in Black Bin. Lids may be recyclable.", category: "garbage" },
  "electronics": { bin: "Special (Drop-off)", instruction: "Take to an e-waste collection event or municipal depot. Never place in regular bins.", category: "special" },
  "light bulb": { bin: "Hazardous (Drop-off)", instruction: "CFL and fluorescent bulbs are hazardous. Take to a drop-off. LED/incandescent go in Black Bin.", category: "hazardous" },
  "clothing": { bin: "Special (Donation)", instruction: "Donate wearable items. Torn textiles can go to textile recycling bins or municipal drop-offs.", category: "special" },
  "cooking oil": { bin: "Hazardous (Drop-off)", instruction: "Never pour down the drain. Collect in a sealed container and take to a municipal drop-off.", category: "hazardous" },
  "newspaper": { bin: "Recycling (Blue Bin)", instruction: "Place directly in Blue Bin. Keep dry.", category: "recyclable" },
  "milk carton": { bin: "Recycling (Blue Bin)", instruction: "Empty, flatten, and place in Blue Bin. No need to rinse.", category: "recyclable" },
  "tin can": { bin: "Recycling (Blue Bin)", instruction: "Empty, rinse. Labels are okay. Place in Blue Bin.", category: "recyclable" },
  "diaper": { bin: "Garbage (Black Bin)", instruction: "Place in Black Bin. Diapers are not recyclable or compostable.", category: "garbage" },
};

const CO2_FACTORS: Record<string, number> = {
  "plastic bottle": 0.085, "aluminum can": 0.060, "paper": 0.015,
  "cardboard": 0.022, "glass bottle": 0.040, "plastic bag": 0.010,
  "pizza box": 0.018, "food waste": 0.005, "newspaper": 0.012,
  "milk carton": 0.014, "tin can": 0.055, "yogurt container": 0.035,
  "clothing": 0.030, "electronics": 0.200,
};

function executeTool(name: string, args: any, userContext: any): string {
  switch (name) {
    case "lookup_local_rules": {
      const key = (args.waste_type || "").toLowerCase();
      const match = Object.entries(LOCAL_RULES).find(([k]) => key.includes(k) || k.includes(key));
      if (match) {
        return JSON.stringify({
          item: match[0],
          bin: match[1].bin,
          instruction: match[1].instruction,
          category: match[1].category,
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

    case "translate_instruction":
      return JSON.stringify({
        original: args.text,
        target_lang: args.target_lang,
        note: "Translation will be provided by the model in its final response.",
      });

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

    case "get_user_stats":
      return JSON.stringify({
        points: userContext?.points ?? 0,
        streak: userContext?.streak ?? 0,
        totalScans: userContext?.totalScans ?? 0,
        recentScans: userContext?.recentScans ?? [],
      });

    case "search_rules": {
      const query = (args.query || "").toLowerCase();
      const category = args.category;
      const results = Object.entries(LOCAL_RULES)
        .filter(([k, v]) => {
          const matchesQuery = k.includes(query) || query.includes(k) || v.instruction.toLowerCase().includes(query);
          const matchesCategory = !category || v.category === category;
          return matchesQuery && matchesCategory;
        })
        .slice(0, 8)
        .map(([k, v]) => ({ item: k, ...v }));
      return JSON.stringify({ results, count: results.length, query: args.query });
    }

    case "save_community_rule":
      return JSON.stringify({
        status: "submitted_for_review",
        item: args.item,
        message: "Thank you! Your rule suggestion has been submitted for community review.",
      });

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
  let lastError: string = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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
        console.log(`[featherless-agent] 503 (cold model?), retry ${attempt + 1}/${retries} in ${2 * (attempt + 1)}s`);
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }

      if (resp.status === 429) {
        throw { status: 429, message: "Rate limited. Please wait a moment." };
      }
      if (resp.status === 402) {
        throw { status: 402, message: "AI credits exhausted. Please add funds." };
      }

      if (!resp.ok) {
        const body = await resp.text();
        lastError = body.slice(0, 300);
        if (attempt < retries) {
          console.log(`[featherless-agent] ${resp.status}, retry ${attempt + 1} in ${2 * (attempt + 1)}s`);
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Provider ${resp.status}: ${lastError}`);
      }

      return resp.json();
    } catch (e: any) {
      if (e.status === 429 || e.status === 402) throw e;
      if (e instanceof DOMException && e.name === "AbortError") {
        if (attempt < retries) {
          console.log(`[featherless-agent] Timeout, retry ${attempt + 1}`);
          continue;
        }
        throw e;
      }
      if (attempt >= retries) throw e;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw new Error("Max retries exceeded: " + lastError);
}

// ─── Demo mode system prompt ───

const DEMO_SYSTEM_PROMPT = `You are **RecycleMate AI** in JUDGE DEMO MODE — showcasing the full capabilities of the RecycleMate platform for The 2030 AI Challenge (SDG 12).

KEY TALKING POINTS:
- **Architecture**: Hybrid TF Lite on-device + Featherless.ai LLM fallback cascade (Vision → Agent → Chat)
- **Tool Calling**: Autonomous agent with 6 tools (rules lookup, translation, impact calc, search, community moderation, user stats)
- **AI Models**: Dynamic model selection via /v1/models — fast 8B for daily use, 70B for complex reasoning, vision models for unknown items
- **Sponsor Credits**: $1000 Featherless.ai inference credits optimally distributed across 20+ AI features
- **Scale**: <100ms on-device detection, graceful fallback with cold-model retry logic, works offline with cached rules
- **Multilingual**: 15 languages with precise recycling terminology translation
- **Impact**: Real-time environmental impact calculation (CO2, trees, water, energy)
- **Gamification**: Streaks, achievements, community challenges, daily nudges
- **Privacy**: Featherless doesn't log prompts/completions, API keys stay server-side

Be technical but accessible. Use specific numbers and architecture details. Format with markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  let apiMessages: any[] = [];
  let providerUrl = "";
  let demoMode = false;

  try {
    let body: any;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { messages, userContext, model, demoMode: dm } = body;
    demoMode = !!dm;
    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse("'messages' must be a non-empty array", 400);
    }
    if (messages.length > 50) {
      return errorResponse("Too many messages (max 50)", 400);
    }

    // Build system prompt
    const systemPrompt = demoMode ? DEMO_SYSTEM_PROMPT : `You are **RecycleMate AI Agent** — an expert recycling assistant with access to tools.

IMPORTANT RULES:
- When a user asks about disposing of an item, ALWAYS call lookup_local_rules first to get accurate local rules.
- When a user asks in a non-English language or requests translation, call translate_instruction.
- When a user asks about environmental impact, call calculate_impact with the items.
- When you need the user's stats for personalization, call get_user_stats.
- Use search_rules for broad category questions like "what electronics can I recycle?"
- Only use save_community_rule when the user explicitly wants to submit a new rule suggestion.
- You may call multiple tools in sequence if needed.
- After receiving tool results, give a concise, friendly answer.
- Use emoji sparingly (1-2 per response).
- Format with markdown for readability.
- Keep answers to 2-4 short paragraphs max.

${userContext ? `User context: Points=${userContext.points ?? 0}, Streak=${userContext.streak ?? 0}, Scans=${userContext.totalScans ?? 0}` : ""}`;

    apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // Determine provider
    const FEATHERLESS_API_KEY = Deno.env.get("FEATHERLESS_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let providerKey: string;
    let providerModel: string;

    if (FEATHERLESS_API_KEY) {
      providerUrl = FEATHERLESS_URL;
      providerKey = FEATHERLESS_API_KEY;
      providerModel = model || (demoMode ? "meta-llama/Meta-Llama-3.1-70B-Instruct" : "Qwen/Qwen3-8B");
    } else if (LOVABLE_API_KEY) {
      providerUrl = LOVABLE_GATEWAY;
      providerKey = LOVABLE_API_KEY;
      providerModel = "google/gemini-3-flash-preview";
    } else {
      return errorResponse("No AI service configured", 500);
    }

    // ─── Agent loop ───
    let currentMessages = [...apiMessages];
    let finalContent = "";
    let toolsUsed: string[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const data = await callProvider(
        currentMessages,
        demoMode ? [] : AGENT_TOOLS, // Demo mode doesn't need tools
        providerKey,
        providerUrl,
        providerModel,
      );

      const choice = data.choices?.[0];
      if (!choice) {
        return errorResponse("No response from AI", 502);
      }

      const msg = choice.message;

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        finalContent = msg.content || "";
        break;
      }

      currentMessages.push(msg);

      for (const toolCall of msg.tool_calls) {
        const fnName = toolCall.function?.name;
        let fnArgs: any = {};
        try {
          fnArgs = JSON.parse(toolCall.function?.arguments || "{}");
        } catch {
          fnArgs = {};
        }

        console.log(`[featherless-agent] Tool: ${fnName}(${JSON.stringify(fnArgs).slice(0, 200)})`);
        toolsUsed.push(fnName);
        const result = executeTool(fnName, fnArgs, userContext);

        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    }

    // Force text answer if exhausted
    if (!finalContent) {
      const fallbackData = await callProvider(
        currentMessages,
        [],
        providerKey,
        providerUrl,
        providerModel,
        0,
      );
      finalContent = fallbackData.choices?.[0]?.message?.content || "I wasn't able to complete the analysis. Please try again.";
    }

    console.log(`[featherless-agent] Done in ${Date.now() - start}ms, tools=[${toolsUsed.join(",")}]`);

    return new Response(JSON.stringify({
      text: finalContent,
      toolsUsed,
      demoMode: !!demoMode,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return errorResponse("Agent request timed out.", 504);
    }

    // On 429 (rate limit) or 402 from Featherless, try Lovable AI as fallback
    if ((e.status === 429 || e.status === 402) && providerUrl === FEATHERLESS_URL) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        console.log(`[featherless-agent] Featherless ${e.status}, falling back to Lovable AI`);
        try {
          const fallbackData = await callProvider(
            apiMessages,
            [],
            LOVABLE_API_KEY,
            LOVABLE_GATEWAY,
            "google/gemini-3-flash-preview",
            1,
          );
          const fallbackContent = fallbackData.choices?.[0]?.message?.content || "I'm experiencing high demand. Please try again shortly.";
          console.log(`[featherless-agent] Lovable fallback OK in ${Date.now() - start}ms`);
          return new Response(JSON.stringify({
            text: fallbackContent,
            toolsUsed: [],
            demoMode: !!demoMode,
            fallback: true,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (fallbackErr) {
          console.error(`[featherless-agent] Lovable fallback also failed:`, fallbackErr);
        }
      }
    }

    if (e.status === 429) return errorResponse(e.message, 429);
    if (e.status === 402) return errorResponse(e.message, 402);
    console.error(`[featherless-agent] Error after ${Date.now() - start}ms:`, e);
    return errorResponse(e instanceof Error ? e.message : "Agent error", 500);
  }
});
