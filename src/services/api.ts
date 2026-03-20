import type { DetectedItem } from "@/context/UserContext";

export interface DisposalInstruction {
  item: string;
  material: string;
  instruction: string;
  bin: "Recycling" | "Garbage" | "Compost" | "Hazardous" | "Drop-off";
  binColor: string;
  ecoTip?: string;
  dropoff?: string;
}

const AI_SCAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-scan`;

const FALLBACK_RULES: Record<string, Omit<DisposalInstruction, "item">> = {
  plastic_bottle: { material: "PET 1 Plastic", instruction: "Rinse container, remove cap and label. Place in your curbside recycling bin.", bin: "Recycling", binColor: "primary" },
  aluminum_can: { material: "Aluminum", instruction: "Rinse can. Crush if possible. Place directly in recycling bin.", bin: "Recycling", binColor: "primary" },
  cardboard: { material: "Corrugated Cardboard", instruction: "Flatten and remove any tape or labels. Keep dry. Place in recycling bin.", bin: "Recycling", binColor: "primary" },
  glass_bottle: { material: "Glass (Clear)", instruction: "Rinse and remove cap. Place in glass recycling container.", bin: "Recycling", binColor: "primary" },
  newspaper: { material: "Mixed Paper", instruction: "Keep dry and clean. Stack neatly. Place in recycling bin.", bin: "Recycling", binColor: "primary" },
  styrofoam: { material: "Polystyrene (PS 6)", instruction: "Not accepted in curbside recycling. Place in garbage bin.", bin: "Garbage", binColor: "foreground" },
  food_waste: { material: "Organic Waste", instruction: "Place in compost bin. Remove any non-organic packaging first.", bin: "Compost", binColor: "success" },
  battery: { material: "Alkaline Battery", instruction: "Do not place in regular bins. Take to designated drop-off.", bin: "Hazardous", binColor: "warning", dropoff: "Brooklyn Household Hazardous Waste Center" },
  electronic_waste: { material: "Electronic / E-Waste", instruction: "Do not dispose in regular bins. Take to certified e-waste recycler.", bin: "Drop-off", binColor: "warning", dropoff: "City E-Waste Collection Center" },
};

export const getDisposalInstructions = async (
  detections: DetectedItem[],
): Promise<DisposalInstruction[]> => {
  // Try AI-powered instructions first
  try {
    const resp = await fetch(AI_SCAN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        items: detections.map((d) => ({
          displayName: d.displayName,
          label: d.label,
          confidence: d.confidence,
        })),
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
    console.warn("AI scan returned non-ok, falling back to local rules");
  } catch (e) {
    console.warn("AI scan failed, using local fallback:", e);
  }

  // Fallback to hardcoded rules
  return detections.map((det) => {
    const rule = FALLBACK_RULES[det.label];
    if (rule) return { item: det.displayName, ...rule };
    return {
      item: det.displayName,
      material: "Unknown Material",
      instruction: "Unable to determine disposal method. Check your local municipal website.",
      bin: "Garbage" as const,
      binColor: "foreground",
    };
  });
};
