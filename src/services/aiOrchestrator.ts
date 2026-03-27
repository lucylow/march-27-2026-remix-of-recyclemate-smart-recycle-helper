/**
 * AI Orchestrator — centralized AI call router with:
 * - Task-based model selection
 * - Response caching (localStorage)
 * - Usage tracking
 * - Structured output via tool calling
 * - Fallback chains
 */

import { featherlessChat, visionFallback, translateText, calculateImpactAI, agentChat, type AgentMessage } from "@/services/featherless";
import { trackAIUsage, type AIUsageEvent } from "@/services/aiUsageTracker";
import { withRetry, withTimeout, isOnline, getOfflineCache, cacheForOffline } from "@/services/resilience";

// ─── Task types ───

export type AITask =
  | "vision"
  | "chat"
  | "agent"
  | "translation"
  | "impact"
  | "scan_instructions"
  | "daily_nudge"
  | "rag";

// ─── Model routing ───

const MODEL_ROUTING: Record<AITask, { featherless: string; description: string }> = {
  vision:            { featherless: "google/gemma-3-27b-it",                  description: "Vision model for waste identification" },
  chat:              { featherless: "meta-llama/Meta-Llama-3.1-8B-Instruct",  description: "Fast chat for general recycling Q&A" },
  agent:             { featherless: "Qwen/Qwen3-8B",                          description: "Tool-calling agent (Qwen3 native)" },
  translation:       { featherless: "Qwen/Qwen2.5-7B-Instruct",              description: "Multilingual translation specialist" },
  impact:            { featherless: "Qwen/Qwen2.5-7B-Instruct",              description: "Impact calculation" },
  scan_instructions: { featherless: "meta-llama/Meta-Llama-3.1-8B-Instruct",  description: "Disposal instruction generation" },
  daily_nudge:       { featherless: "meta-llama/Meta-Llama-3.1-8B-Instruct",  description: "Motivational nudge generation" },
  rag:               { featherless: "Qwen/Qwen3-8B",                          description: "RAG with tool calling for rule search" },
};

export function getModelForTask(task: AITask): string {
  // Check if user has a preferred model override
  const userModel = localStorage.getItem("recyclemate_model");
  if (userModel) return userModel;
  return MODEL_ROUTING[task]?.featherless || "meta-llama/Meta-Llama-3.1-8B-Instruct";
}

export function getModelRouting() {
  return MODEL_ROUTING;
}

// ─── Response caching ───

const CACHE_PREFIX = "recyclemate_ai_cache_";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 100;

interface CacheEntry {
  result: any;
  timestamp: number;
  task: AITask;
}

function getCacheKey(task: AITask, input: string): string {
  // Simple hash for cache key
  let hash = 0;
  const str = `${task}:${input}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `${CACHE_PREFIX}${Math.abs(hash).toString(36)}`;
}

function getCached(task: AITask, input: string): any | null {
  try {
    const key = getCacheKey(task, input);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

function setCache(task: AITask, input: string, result: any): void {
  try {
    const key = getCacheKey(task, input);
    const entry: CacheEntry = { result, timestamp: Date.now(), task };
    localStorage.setItem(key, JSON.stringify(entry));
    pruneCache();
  } catch {
    // localStorage full — ignore
  }
}

function pruneCache(): void {
  try {
    const cacheKeys: { key: string; timestamp: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const entry: CacheEntry = JSON.parse(localStorage.getItem(key) || "{}");
          cacheKeys.push({ key, timestamp: entry.timestamp || 0 });
        } catch {
          localStorage.removeItem(key!);
        }
      }
    }
    if (cacheKeys.length > MAX_CACHE_ENTRIES) {
      cacheKeys.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = cacheKeys.slice(0, cacheKeys.length - MAX_CACHE_ENTRIES);
      toRemove.forEach(e => localStorage.removeItem(e.key));
    }
  } catch {
    // ignore
  }
}

// ─── Orchestrator ───

export interface OrchestratorResult<T = any> {
  data: T;
  task: AITask;
  model: string;
  cached: boolean;
  durationMs: number;
  tokensEstimated: number;
}

/**
 * Run an AI task through the orchestrator.
 * Handles model routing, caching, usage tracking, and fallback chains.
 */
export async function runAI<T = any>(
  task: AITask,
  payload: any,
  options?: {
    skipCache?: boolean;
    model?: string;
    demoMode?: boolean;
  }
): Promise<OrchestratorResult<T>> {
  const start = Date.now();
  const model = options?.model || getModelForTask(task);

  // Check cache for deterministic tasks
  const cacheableTasks: AITask[] = ["translation", "impact", "scan_instructions"];
  const cacheInput = JSON.stringify(payload);

  if (!options?.skipCache && cacheableTasks.includes(task)) {
    const cached = getCached(task, cacheInput);
    if (cached) {
      return {
        data: cached as T,
        task,
        model,
        cached: true,
        durationMs: Date.now() - start,
        tokensEstimated: 0,
      };
    }
  }

  // Execute task
  let result: any;

  switch (task) {
    case "vision":
      result = await visionFallback(payload.image, payload.hint);
      break;

    case "chat": {
      const resp = await featherlessChat({
        messages: payload.messages,
        model,
        temperature: payload.temperature ?? 0.3,
        max_tokens: payload.max_tokens ?? 1024,
        stream: payload.stream ?? false,
      });
      if (payload.stream) {
        // Return raw response for streaming
        result = resp;
      } else {
        if (!resp.ok) throw new Error("Chat request failed");
        result = await resp.json();
      }
      break;
    }

    case "agent":
      result = await agentChat(
        payload.messages as AgentMessage[],
        payload.userContext,
        model,
      );
      break;

    case "translation":
      result = await translateText(payload.text, payload.targetLang);
      break;

    case "impact":
      result = await calculateImpactAI(payload.items);
      break;

    case "scan_instructions": {
      const resp = await featherlessChat({
        messages: payload.messages,
        model,
        temperature: 0.1,
        max_tokens: 512,
      });
      if (!resp.ok) throw new Error("Scan instruction request failed");
      result = await resp.json();
      break;
    }

    case "daily_nudge": {
      const resp = await featherlessChat({
        messages: [
          { role: "system", content: "Write one encouraging recycling nudge in one sentence. Positive, short, action-oriented." },
          { role: "user", content: `User stats: ${JSON.stringify(payload.userStats)}` },
        ],
        model,
        temperature: 0.7,
        max_tokens: 60,
      });
      if (!resp.ok) throw new Error("Nudge request failed");
      result = await resp.json();
      break;
    }

    case "rag":
      result = await agentChat(
        payload.messages as AgentMessage[],
        payload.userContext,
        model,
      );
      break;

    default:
      throw new Error(`Unknown AI task: ${task}`);
  }

  const durationMs = Date.now() - start;
  const tokensEstimated = Math.ceil(cacheInput.length / 4) + 200; // rough estimate

  // Cache result
  if (!options?.skipCache && cacheableTasks.includes(task)) {
    setCache(task, cacheInput, result);
  }

  // Track usage
  trackAIUsage({
    task,
    model,
    tokensEstimated,
    durationMs,
    cached: false,
    timestamp: Date.now(),
  });

  return {
    data: result as T,
    task,
    model,
    cached: false,
    durationMs,
    tokensEstimated,
  };
}

/**
 * Intelligent detection cascade:
 * 1. On-device TFLite (fast path)
 * 2. Featherless Vision (unknown items)
 * 3. Agent RAG query (complex cases)
 * 4. Static fallback (offline)
 */
export async function smartDetectPipeline(
  imageBase64: string,
  onDeviceResults: Array<{ label: string; displayName: string; confidence: number; bbox: [number, number, number, number] }>,
  location?: string,
): Promise<OrchestratorResult> {
  // Step 1: Check on-device results
  const highConfidence = onDeviceResults.filter(d => d.confidence >= 0.72);
  if (highConfidence.length > 0) {
    return {
      data: { detections: highConfidence, source: "tflite" },
      task: "vision",
      model: "tflite-on-device",
      cached: false,
      durationMs: 0,
      tokensEstimated: 0,
    };
  }

  // Step 2: Featherless Vision fallback
  try {
    const visionResult = await runAI("vision", { image: imageBase64 });
    if (visionResult.data?.detections?.length > 0) {
      return visionResult;
    }
  } catch (err) {
    console.warn("[orchestrator] Vision fallback failed:", err);
  }

  // Step 3: Agent RAG query for complex items
  if (location && onDeviceResults.length > 0) {
    try {
      const itemNames = onDeviceResults.map(d => d.displayName).join(", ");
      const ragResult = await runAI("rag", {
        messages: [{ role: "user", content: `How should I dispose of: ${itemNames} in ${location}?` }],
      });
      if (ragResult.data?.text) {
        return {
          ...ragResult,
          data: {
            detections: onDeviceResults.map(d => ({ ...d, agentAdvice: ragResult.data.text })),
            source: "agent-rag",
          },
        };
      }
    } catch (err) {
      console.warn("[orchestrator] RAG fallback failed:", err);
    }
  }

  // Step 4: Return on-device results as-is
  return {
    data: { detections: onDeviceResults, source: "fallback" },
    task: "vision",
    model: "none",
    cached: false,
    durationMs: 0,
    tokensEstimated: 0,
  };
}

// ─── Prompt templates ───

export const PROMPTS = {
  vision: (hint?: string) => ({
    system: "Identify waste items in this image. Return structured analysis with waste_type, confidence, recyclable status, category, and disposal instructions.",
    user: hint
      ? `Identify this waste item (hint: ${hint}). What is it and how should I dispose of it?`
      : "Identify all waste/recyclable items in this image and provide disposal guidance.",
  }),

  translation: (text: string, lang: string) => ({
    system: "You are a recycling terminology translator. Translate precisely. Preserve bin names, local terms, and waste categories.",
    user: `Translate this recycling instruction to ${lang}:\n\n"${text}"`,
  }),

  impact: (items: string) => ({
    system: "You are an environmental impact calculator. Return ONLY valid JSON.",
    user: `Calculate environmental impact of properly recycling: ${items}. Return JSON: {"co2SavedKg": number, "treesSaved": number, "waterSavedLiters": number, "energySavedKwh": number}`,
  }),

  nudge: (stats: any) => ({
    system: "Write one encouraging recycling nudge in one sentence. Positive, short, action-oriented, not cheesy.",
    user: `User stats: ${JSON.stringify(stats)}`,
  }),

  chat: (context?: string) => ({
    system: `You are RecycleMate AI — a friendly, expert recycling assistant.${context ? `\n\nUser context: ${context}` : ""}
Keep answers concise (2-4 paragraphs). Use markdown. Use emoji sparingly (1-2 per response).`,
  }),
} as const;
