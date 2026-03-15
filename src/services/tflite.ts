import type { DetectedItem } from "@/context/UserContext";

// Simulated on-device inference — in production this would use TensorFlow.js or ONNX Runtime
const MOCK_DETECTIONS: DetectedItem[][] = [
  [
    { label: "plastic_bottle", displayName: "Plastic Bottle (PET 1)", confidence: 0.954, bbox: [0.25, 0.2, 0.3, 0.5] },
  ],
  [
    { label: "aluminum_can", displayName: "Aluminum Can", confidence: 0.912, bbox: [0.3, 0.25, 0.25, 0.4] },
    { label: "cardboard", displayName: "Cardboard Box", confidence: 0.874, bbox: [0.6, 0.3, 0.3, 0.35] },
  ],
  [
    { label: "glass_bottle", displayName: "Glass Bottle", confidence: 0.938, bbox: [0.2, 0.15, 0.2, 0.55] },
  ],
  [
    { label: "newspaper", displayName: "Newspaper / Paper", confidence: 0.891, bbox: [0.15, 0.3, 0.5, 0.3] },
  ],
  [
    { label: "styrofoam", displayName: "Styrofoam Container", confidence: 0.867, bbox: [0.3, 0.2, 0.35, 0.35] },
  ],
  [
    { label: "battery", displayName: "Battery (AA)", confidence: 0.943, bbox: [0.35, 0.35, 0.15, 0.2] },
  ],
];

let mockIndex = 0;

export const runInference = async (_imageData?: string): Promise<DetectedItem[]> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
  const result = MOCK_DETECTIONS[mockIndex % MOCK_DETECTIONS.length];
  mockIndex++;
  return result;
};
