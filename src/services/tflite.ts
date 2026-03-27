import type { DetectedItem } from "@/context/UserContext";
import { smartDetectCascade } from "@/services/featherless";

const AI_VISION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-vision`;

// Fallback mock detections for when AI is unavailable
const MOCK_DETECTIONS: DetectedItem[][] = [
  [{ label: "plastic_bottle", displayName: "Plastic Bottle (PET 1)", confidence: 0.954, bbox: [0.25, 0.2, 0.3, 0.5] }],
  [
    { label: "aluminum_can", displayName: "Aluminum Can", confidence: 0.912, bbox: [0.3, 0.25, 0.25, 0.4] },
    { label: "cardboard", displayName: "Cardboard Box", confidence: 0.874, bbox: [0.6, 0.3, 0.3, 0.35] },
  ],
  [{ label: "glass_bottle", displayName: "Glass Bottle", confidence: 0.938, bbox: [0.2, 0.15, 0.2, 0.55] }],
  [{ label: "newspaper", displayName: "Newspaper / Paper", confidence: 0.891, bbox: [0.15, 0.3, 0.5, 0.3] }],
  [{ label: "styrofoam", displayName: "Styrofoam Container", confidence: 0.867, bbox: [0.3, 0.2, 0.35, 0.35] }],
  [{ label: "battery", displayName: "Battery (AA)", confidence: 0.943, bbox: [0.35, 0.35, 0.15, 0.2] }],
];
let mockIndex = 0;

/**
 * Capture a frame from a video element as a base64 JPEG
 */
export const captureFrame = (video: HTMLVideoElement, quality = 0.7): string | null => {
  if (!video || video.videoWidth === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(video.videoWidth, 640);
  canvas.height = Math.min(video.videoHeight, 480);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
};

/**
 * Convert a File to base64 data URI
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Run AI vision analysis on a base64 image.
 * Uses a hybrid cascade: primary AI vision → Featherless vision fallback → mock detections.
 */
export const runInference = async (imageData?: string): Promise<DetectedItem[]> => {
  if (imageData) {
    try {
      // Step 1: Try primary AI vision (Lovable AI)
      const resp = await fetch(AI_VISION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ image: imageData }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.detections && data.detections.length > 0) {
          const primaryResults: DetectedItem[] = data.detections.map((d: any) => ({
            label: d.label,
            displayName: d.displayName,
            confidence: d.confidence,
            bbox: d.bbox as [number, number, number, number],
            recyclable: d.recyclable,
            category: d.category,
            materialDetail: d.materialDetail,
            co2SavedGrams: d.co2SavedGrams,
            decompositionYears: d.decompositionYears,
            funFact: d.funFact,
          }));

          // Step 2: Smart cascade — if confidence is low, try Featherless vision fallback
          const cascadeResult = await smartDetectCascade(primaryResults, imageData, 0.72);

          if (cascadeResult.usedFallback) {
            console.log("[tflite] Used Featherless vision fallback for low-confidence items");
            return cascadeResult.detections.map(d => ({
              label: d.label,
              displayName: d.displayName,
              confidence: d.confidence,
              bbox: d.bbox,
              recyclable: d.recyclable,
              category: d.category,
              materialDetail: d.materialDetail,
            }));
          }

          return primaryResults;
        }
      }

      if (resp.status === 429) {
        throw new Error("Rate limited — please wait a moment and try again.");
      }
      if (resp.status === 402) {
        throw new Error("AI credits exhausted. Using offline detection.");
      }

      // Step 3: Primary returned nothing — try Featherless vision as standalone fallback
      console.warn("Primary AI vision returned no detections, trying Featherless fallback");
      try {
        const cascadeResult = await smartDetectCascade([], imageData, 0.72);
        if (cascadeResult.detections.length > 0) {
          console.log("[tflite] Featherless standalone fallback detected items");
          return cascadeResult.detections.map(d => ({
            label: d.label,
            displayName: d.displayName,
            confidence: d.confidence,
            bbox: d.bbox,
            recyclable: d.recyclable,
            category: d.category,
            materialDetail: d.materialDetail,
          }));
        }
      } catch (cascadeErr) {
        console.warn("Featherless fallback also failed:", cascadeErr);
      }
    } catch (e: any) {
      if (e.message?.includes("Rate limited") || e.message?.includes("credits")) {
        throw e;
      }
      console.warn("AI vision unavailable, using mock fallback:", e);
    }
  }

  // Final fallback: simulated detection
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
  const result = MOCK_DETECTIONS[mockIndex % MOCK_DETECTIONS.length];
  mockIndex++;
  return result;
};
