import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Award } from "lucide-react";
import type { DetectedItem } from "@/context/UserContext";
import { useUser } from "@/context/UserContext";
import { getDisposalInstructions, type DisposalInstruction } from "@/services/api";

interface ResultsViewProps {
  detections: DetectedItem[];
  onBack: () => void;
}

const brandSpring = { type: "spring" as const, stiffness: 500, damping: 30, mass: 1 };

const BIN_STYLES: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary", text: "text-primary-foreground" },
  foreground: { bg: "bg-foreground", text: "text-background" },
  success: { bg: "bg-success", text: "text-success-foreground" },
  warning: { bg: "bg-warning", text: "text-warning-foreground" },
};

const ResultsView = ({ detections, onBack }: ResultsViewProps) => {
  const [instructions, setInstructions] = useState<DisposalInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const { addPoints, incrementStreak, addScanRecord } = useUser();

  useEffect(() => {
    const fetch = async () => {
      const data = await getDisposalInstructions(detections);
      setInstructions(data);
      setLoading(false);
    };
    fetch();
  }, [detections]);

  const handleConfirm = () => {
    const pts = detections.length * 10;
    addPoints(pts);
    incrementStreak();
    addScanRecord({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      items: detections,
      pointsEarned: pts,
    });
    setConfirmed(true);
    setTimeout(onBack, 1500);
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={brandSpring}
      className="flex-1 flex flex-col bg-background rounded-t-[32px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active-press">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="text-label text-muted-foreground">
          {detections.length} Item{detections.length > 1 ? "s" : ""} Detected
        </span>
        <div className="w-10" />
      </div>

      {/* Scrollable results */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          instructions.map((inst, i) => {
            const style = BIN_STYLES[inst.binColor] || BIN_STYLES.foreground;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-3xl border border-border bg-card shadow-soft"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-label text-muted-foreground">{inst.material}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                    {inst.bin.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight mb-2">{inst.item}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{inst.instruction}</p>
                {inst.dropoff && (
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border">
                    <MapPin className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                    <p className="font-mono text-xs text-muted-foreground">{inst.dropoff}</p>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Confirm button */}
      {!loading && (
        <div className="px-6 pb-6 pt-2">
          {confirmed ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-3 py-4 bg-success text-success-foreground rounded-2xl font-medium"
            >
              <Award className="w-5 h-5" />
              +{detections.length * 10} Points Earned!
            </motion.div>
          ) : (
            <button
              onClick={handleConfirm}
              className="w-full py-4 bg-foreground text-background rounded-2xl font-medium active-press"
            >
              Confirm & Earn +{detections.length * 10} pts
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ResultsView;
