import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TIMEOUT_MS = 25_000;
const MAX_QUESTIONS = 10;

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

    const count = Math.min(Math.max(Number(body.count) || 5, 1), MAX_QUESTIONS);
    const difficulty = ["easy", "medium", "hard", "mixed"].includes(body.difficulty) ? body.difficulty : "mixed";
    const previousQuestions = Array.isArray(body.previousQuestions) ? body.previousQuestions.slice(0, 20) : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[ai-quiz] LOVABLE_API_KEY not configured");
      return errorResponse("AI service not configured", 500);
    }

    const avoidList = previousQuestions.length > 0
      ? `\n\nIMPORTANT: Do NOT repeat these previously asked topics:\n${previousQuestions.map((q: string) => `- ${q}`).join("\n")}`
      : "";

    const difficultyGuide = difficulty === "mixed"
      ? "Mix difficulties: include 2 easy, 2 medium, and 1 hard question."
      : `All questions should be ${difficulty} difficulty.`;

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
            content: `You are **RecycleMate Quiz Master** — you create engaging, educational multiple-choice quiz questions about recycling, waste management, and environmental sustainability.

Question quality guidelines:
- Questions should test practical knowledge users can apply in daily life
- Include a mix of: material identification, sorting rules, environmental impact facts, myth-busting
- Each question must have exactly 4 options with only 1 correct answer
- Wrong options should be plausible (not obviously silly)
- Explanations should be concise (1-2 sentences) and include a memorable fact
- ${difficultyGuide}

Difficulty definitions:
- **easy**: Common knowledge (e.g., "Can glass bottles be recycled?")
- **medium**: Requires specific knowledge (e.g., "What resin code is polypropylene?")
- **hard**: Nuanced or surprising facts (e.g., "Which of these cannot go in curbside recycling?")${avoidList}`,
          },
          {
            role: "user",
            content: `Generate ${count} unique, engaging recycling quiz questions. Make them educational and fun!`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_quiz",
              description: "Generate recycling quiz questions with multiple choice options",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string", description: "The quiz question" },
                        options: { type: "array", items: { type: "string" }, description: "Exactly 4 answer options" },
                        correct: { type: "number", description: "0-based index of the correct option" },
                        explanation: { type: "string", description: "Brief explanation with a fun fact" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                      },
                      required: ["question", "options", "correct", "explanation", "difficulty"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_quiz" } },
      }),
    }, TIMEOUT_MS);

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 429) return errorResponse("Rate limited. Please try again shortly.", 429);
      if (response.status === 402) return errorResponse("AI credits exhausted.", 402);
      console.error(`[ai-quiz] Gateway ${response.status}:`, errBody.slice(0, 500));
      return errorResponse("AI service temporarily unavailable", 502);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        const questions = (parsed.questions || []).map((q: any) => ({
          ...q,
          correct: Math.min(Math.max(Number(q.correct) || 0, 0), (q.options?.length || 4) - 1),
          options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
        }));
        console.log(`[ai-quiz] Generated ${questions.length} questions (${difficulty}) in ${Date.now() - start}ms`);
        return new Response(JSON.stringify(questions), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseErr) {
        console.error("[ai-quiz] Failed to parse tool call:", parseErr);
        return errorResponse("AI returned invalid quiz format", 502);
      }
    }

    console.error("[ai-quiz] No tool call in response");
    return errorResponse("AI did not return quiz questions", 502);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.error(`[ai-quiz] Timed out after ${TIMEOUT_MS}ms`);
      return errorResponse("Quiz generation timed out. Please try again.", 504);
    }
    console.error(`[ai-quiz] Error after ${Date.now() - start}ms:`, e);
    return errorResponse(e instanceof Error ? e.message : "Internal error", 500);
  }
});
