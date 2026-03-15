import type { DetectedItem } from "@/context/UserContext";

export interface DisposalInstruction {
  item: string;
  material: string;
  instruction: string;
  bin: "Recycling" | "Garbage" | "Compost" | "Hazardous" | "Drop-off";
  binColor: string;
  dropoff?: string;
}

const DISPOSAL_RULES: Record<string, Omit<DisposalInstruction, "item">> = {
  plastic_bottle: {
    material: "PET 1 Plastic",
    instruction: "Rinse container, remove cap and label. Place in your curbside recycling bin. No bag required.",
    bin: "Recycling",
    binColor: "primary",
  },
  aluminum_can: {
    material: "Aluminum",
    instruction: "Rinse can. Crush if possible. Place directly in recycling bin.",
    bin: "Recycling",
    binColor: "primary",
  },
  cardboard: {
    material: "Corrugated Cardboard",
    instruction: "Flatten and remove any tape or labels. Keep dry. Place in recycling bin.",
    bin: "Recycling",
    binColor: "primary",
  },
  glass_bottle: {
    material: "Glass (Clear)",
    instruction: "Rinse and remove cap. Place in glass recycling container. Do not break.",
    bin: "Recycling",
    binColor: "primary",
  },
  newspaper: {
    material: "Mixed Paper",
    instruction: "Keep dry and clean. Stack neatly. Place in recycling bin.",
    bin: "Recycling",
    binColor: "primary",
  },
  styrofoam: {
    material: "Polystyrene (PS 6)",
    instruction: "Not accepted in curbside recycling. Place in garbage bin.",
    bin: "Garbage",
    binColor: "foreground",
  },
  food_waste: {
    material: "Organic Waste",
    instruction: "Place in compost bin. Remove any non-organic packaging first.",
    bin: "Compost",
    binColor: "success",
  },
  battery: {
    material: "Alkaline Battery",
    instruction: "Do not place in regular bins. Take to designated drop-off location.",
    bin: "Hazardous",
    binColor: "warning",
    dropoff: "Brooklyn Household Hazardous Waste Center, 123 Main St",
  },
  electronic_waste: {
    material: "Electronic / E-Waste",
    instruction: "Do not dispose in regular bins. Take to certified e-waste recycler.",
    bin: "Drop-off",
    binColor: "warning",
    dropoff: "City E-Waste Collection Center, 456 Elm Ave",
  },
};

export const getDisposalInstructions = async (
  detections: DetectedItem[],
  _location?: { latitude: number; longitude: number }
): Promise<DisposalInstruction[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));

  return detections.map(det => {
    const rule = DISPOSAL_RULES[det.label];
    if (rule) {
      return { item: det.displayName, ...rule };
    }
    return {
      item: det.displayName,
      material: "Unknown Material",
      instruction: "Unable to determine disposal method. Check your local municipal website.",
      bin: "Garbage" as const,
      binColor: "foreground",
    };
  });
};
