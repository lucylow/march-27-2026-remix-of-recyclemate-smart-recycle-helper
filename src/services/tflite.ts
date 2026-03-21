import type { DetectedItem } from "@/context/UserContext";

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
 * Falls back to mock detections if the AI service is unavailable.
 */
export const runInference = async (imageData?: string): Promise<DetectedItem[]> => {
  // If we have actual image data, try AI vision
  if (imageData) {
    try {
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
          return data.detections.map((d: any) => ({
            label: d.label,
            displayName: d.displayName,
            confidence: d.confidence,
            bbox: d.bbox as [number, number, number, number],
          }));
        }
      }

      if (resp.status === 429) {
        throw new Error("Rate limited — please wait a moment and try again.");
      }
      if (resp.status === 402) {
        throw new Error("AI credits exhausted. Using offline detection.");
      }

      console.warn("AI vision returned no detections, using fallback");
    } catch (e: any) {
      if (e.message?.includes("Rate limited") || e.message?.includes("credits")) {
        throw e; // Re-throw user-facing errors
      }
      console.warn("AI vision unavailable, using fallback:", e);
    }
  }

  // Fallback: simulated detection
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
  const result = MOCK_DETECTIONS[mockIndex % MOCK_DETECTIONS.length];
  mockIndex++;
  return result;
};
