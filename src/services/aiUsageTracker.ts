/**
 * AI Usage Tracker — persists AI call metrics to localStorage.
 * Used by the orchestrator and displayed in the Settings dashboard.
 */

export interface AIUsageEvent {
  task: string;
  model: string;
  tokensEstimated: number;
  durationMs: number;
  cached: boolean;
  timestamp: number;
}

export interface AIUsageStats {
  totalCalls: number;
  totalTokens: number;
  cachedCalls: number;
  costEstimate: number;
  avgLatencyMs: number;
  callsByTask: Record<string, number>;
  callsByModel: Record<string, number>;
  recentEvents: AIUsageEvent[];
}

const STORAGE_KEY = "recyclemate_ai_usage";
const MAX_EVENTS = 500;
const COST_PER_TOKEN = 0.0001; // $0.0001/token estimate

function loadEvents(): AIUsageEvent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveEvents(events: AIUsageEvent[]): void {
  try {
    // Keep only recent events
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full — clear old events
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-50)));
    } catch {
      // ignore
    }
  }
}

/**
 * Track an AI usage event
 */
export function trackAIUsage(event: AIUsageEvent): void {
  const events = loadEvents();
  events.push(event);
  saveEvents(events);

  // Also update the legacy session stats for backward compat
  try {
    const sessionStats = JSON.parse(
      localStorage.getItem("recyclemate_session_stats") || '{"calls": 0, "tokens": 0}'
    );
    sessionStats.calls += 1;
    sessionStats.tokens += event.tokensEstimated;
    localStorage.setItem("recyclemate_session_stats", JSON.stringify(sessionStats));
  } catch {
    // ignore
  }
}

/**
 * Get aggregated usage statistics
 */
export function getUsageStats(): AIUsageStats {
  const events = loadEvents();

  const totalCalls = events.length;
  const cachedCalls = events.filter(e => e.cached).length;
  const totalTokens = events.reduce((sum, e) => sum + e.tokensEstimated, 0);
  const totalLatency = events.reduce((sum, e) => sum + e.durationMs, 0);

  const callsByTask: Record<string, number> = {};
  const callsByModel: Record<string, number> = {};

  for (const event of events) {
    callsByTask[event.task] = (callsByTask[event.task] || 0) + 1;
    callsByModel[event.model] = (callsByModel[event.model] || 0) + 1;
  }

  return {
    totalCalls,
    totalTokens,
    cachedCalls,
    costEstimate: totalTokens * COST_PER_TOKEN,
    avgLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
    callsByTask,
    callsByModel,
    recentEvents: events.slice(-20).reverse(),
  };
}

/**
 * Get today's usage only
 */
export function getTodayUsage(): { calls: number; tokens: number; cost: number } {
  const events = loadEvents();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const todayEvents = events.filter(e => e.timestamp >= todayMs);
  const tokens = todayEvents.reduce((sum, e) => sum + e.tokensEstimated, 0);

  return {
    calls: todayEvents.length,
    tokens,
    cost: tokens * COST_PER_TOKEN,
  };
}

/**
 * Clear all usage data
 */
export function clearUsageData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("recyclemate_session_stats");
}
