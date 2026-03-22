import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Award, CheckCircle2, Sparkles, Leaf, MessageCircle } from "lucide-react";
import type { DetectedItem } from "@/context/UserContext";
import { useUser } from "@/context/UserContext";
import { getDisposalInstructions, type DisposalInstruction } from "@/services/api";
import { toast } from "sonner";

interface ResultsViewProps {
  detections: DetectedItem[];
  onBack: () => void;
  onNavigate?: (page: string, prefill?: string) => void;
}

const brandSpring = { type: "spring" as const, stiffness: 500, damping: 30, mass: 1 };

const BIN_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: "bg-primary", text: "text-primary-foreground", border: "border-primary/20" },
  foreground: { bg: "bg-foreground", text: "text-background", border: "border-foreground/20" },
  success: { bg: "bg-success", text: "text-success-foreground", border: "border-success/20" },
  warning: { bg: "bg-warning", text: "text-warning-foreground", border: "border-warning/20" },
};

const ResultsView = ({ detections, onBack, onNavigate }: ResultsViewProps) => {
  const [instructions, setInstructions] = useState<DisposalInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const { addPoints, incrementStreak, addScanRecord } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const data = await getDisposalInstructions(detections);
        setInstructions(data);
      } catch (err) {
        console.error("Failed to fetch disposal instructions:", err);
        setError("Could not load recycling rules. Please try again.");
        toast.error("Failed to load disposal instructions");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
    toast.success(`+${pts} points earned! Keep sorting! 🌍`);
    setTimeout(onBack, 1800);
  };

  const handleAskAI = (itemName: string) => {
    if (onNavigate) {
      onNavigate("chat", `Tell me more about recycling ${itemName}. What are some creative ways to reuse it?`);
    }
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
        <div className="text-center">
          <span className="text-label text-muted-foreground block">
            {detections.length} Item{detections.length > 1 ? "s" : ""} Detected
          </span>
          <span className="text-[10px] text-primary font-mono">AI-POWERED</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Scrollable results */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">AI is analyzing your items...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-[250px]">{error}</p>
            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium active-press"
            >
              Go Back & Retry
            </button>
          </div>
        ) : (
          instructions.map((inst, i) => {
            const style = BIN_STYLES[inst.binColor] || BIN_STYLES.foreground;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, ...brandSpring }}
                className={`p-6 rounded-3xl border bg-card shadow-soft ${style.border}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-label text-muted-foreground">{inst.material}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                    {inst.bin.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight mb-2">{inst.item}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{inst.instruction}</p>

                {/* AI Eco Tip */}
                {inst.ecoTip && (
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border">
                    <Leaf className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <p className="text-xs text-success font-medium">{inst.ecoTip}</p>
                  </div>
                )}

                {/* Confidence bar */}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">Confidence</span>
                    <span className="font-mono text-xs text-foreground font-medium">
                      {(detections[i]?.confidence * 100 || 95).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(detections[i]?.confidence || 0.95) * 100}%` }}
                      transition={{ delay: i * 0.12 + 0.3, duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>

                {inst.dropoff && (
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border">
                    <MapPin className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                    <p className="font-mono text-xs text-muted-foreground">{inst.dropoff}</p>
                  </div>
                )}

                {/* Ask AI button */}
                {onNavigate && (
                  <button
                    onClick={() => handleAskAI(inst.item)}
                    className="mt-3 pt-3 border-t border-border w-full flex items-center justify-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors active-press"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Ask AI more about this item
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Confirm button */}
      {!loading && !error && (
        <div className="px-6 pb-6 pt-2">
          {confirmed ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={brandSpring}
              className="flex items-center justify-center gap-3 py-4 bg-success text-success-foreground rounded-2xl font-medium"
            >
              <Sparkles className="w-5 h-5" />
              +{detections.length * 10} Points Earned!
              <CheckCircle2 className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.button
              onClick={handleConfirm}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 bg-foreground text-background rounded-2xl font-medium flex items-center justify-center gap-2"
            >
              <Award className="w-5 h-5" />
              Confirm & Earn +{detections.length * 10} pts
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ResultsView;
