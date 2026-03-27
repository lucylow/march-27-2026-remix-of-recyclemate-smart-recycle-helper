/**
 * Network & Resilience Utilities
 * - Online/offline detection
 * - Timeout wrapper
 * - Retry with exponential backoff
 * - Safe JSON parsing
 */

// ─── Network awareness ─────────────────────────────────────

let _isOnline = navigator.onLine;
const _listeners = new Set<(online: boolean) => void>();

window.addEventListener("online", () => {
  _isOnline = true;
  _listeners.forEach((fn) => fn(true));
});

window.addEventListener("offline", () => {
  _isOnline = false;
  _listeners.forEach((fn) => fn(false));
});

export function isOnline(): boolean {
  return _isOnline;
}

export function onConnectivityChange(fn: (online: boolean) => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ─── Timeout wrapper ────────────────────────────────────────

export function withTimeout<T>(promise: Promise<T>, ms: number, label = "Request"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// ─── Retry with exponential backoff ─────────────────────────

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  retryOn?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 1500, retryOn, onRetry } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isLast = attempt === maxRetries;
      const shouldRetry = !isLast && (retryOn ? retryOn(err) : isRetryableError(err));

      if (!shouldRetry) throw err;

      onRetry?.(attempt + 1, err);
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Retry exhausted"); // unreachable
}

function isRetryableError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode;
  if (status === 503 || status === 502 || status === 429) return true;
  if (err.message?.includes("timed out")) return true;
  if (err.message?.includes("Failed to fetch")) return true;
  if (err.message?.includes("NetworkError")) return true;
  return false;
}

// ─── Safe JSON parsing ──────────────────────────────────────

export function safeJSONParse<T = any>(text: string): T | null {
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from mixed content
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ─── Input validation ───────────────────────────────────────

export function validateImageInput(imageBase64: string): { valid: boolean; error?: string } {
  if (!imageBase64) return { valid: false, error: "No image provided" };
  if (imageBase64.length < 100) return { valid: false, error: "Image data too small — likely corrupt" };
  if (!imageBase64.startsWith("data:image/")) return { valid: false, error: "Invalid image format" };
  return { valid: true };
}

// ─── Offline cache helper ───────────────────────────────────

const OFFLINE_CACHE_KEY = "recyclemate_offline_cache";

export function cacheForOffline(key: string, data: any): void {
  try {
    const cache = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || "{}");
    cache[key] = { data, ts: Date.now() };
    // Keep max 50 entries
    const keys = Object.keys(cache);
    if (keys.length > 50) {
      const sorted = keys.sort((a, b) => cache[a].ts - cache[b].ts);
      sorted.slice(0, keys.length - 50).forEach((k) => delete cache[k]);
    }
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function getOfflineCache(key: string, maxAgeMs = 24 * 60 * 60 * 1000): any | null {
  try {
    const cache = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || "{}");
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > maxAgeMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}
