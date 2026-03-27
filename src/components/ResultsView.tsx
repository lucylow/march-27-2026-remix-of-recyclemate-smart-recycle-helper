import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Award, CheckCircle2, Sparkles, Leaf, MessageCircle, Recycle, Clock, Lightbulb, BarChart3, Globe } from "lucide-react";
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

const CATEGORY_ICONS: Record<string, string> = {
  plastic: "♻️", metal: "🔩", paper: "📄", glass: "🫙",
  organic: "🌱", hazardous: "☠️", ewaste: "🔌", textile: "👕", other: "📦",
};

/** SDG micro-learning facts mapped by material category */
const SDG_FACTS: Record<string, { sdg: string; fact: string; icon: string }[]> = {
  plastic: [
    { sdg: "SDG 14", fact: "8M tons of plastic enter oceans yearly. Recycling this item helps protect marine life.", icon: "🐠" },
    { sdg: "SDG 13", fact: "Recycling 1 plastic bottle saves enough energy to power a 60W light bulb for 6 hours.", icon: "🌡️" },
  ],
  metal: [
    { sdg: "SDG 12", fact: "Recycling aluminum saves 95% of the energy needed to make new aluminum from raw materials.", icon: "♻️" },
    { sdg: "SDG 7", fact: "One recycled can saves enough energy to run a TV for 3 hours.", icon: "⚡" },
  ],
  paper: [
    { sdg: "SDG 15", fact: "Every ton of recycled paper saves 17 trees, 7,000 gallons of water, and 3 cubic yards of landfill space.", icon: "🌳" },
    { sdg: "SDG 6", fact: "Recycling paper uses 70% less water than making paper from virgin wood pulp.", icon: "💧" },
  ],
  glass: [
    { sdg: "SDG 12", fact: "Glass is 100% recyclable and can be recycled endlessly without loss in quality.", icon: "♻️" },
    { sdg: "SDG 13", fact: "Recycling glass reduces CO₂ emissions — every 6 tons recycled saves 1 ton of CO₂.", icon: "🌡️" },
  ],
  organic: [
    { sdg: "SDG 13", fact: "Composting food waste prevents methane emissions — 25x more potent than CO₂ as a greenhouse gas.", icon: "🌡️" },
    { sdg: "SDG 15", fact: "Compost enriches soil, reducing need for chemical fertilizers and supporting biodiversity.", icon: "🌳" },
  ],
  hazardous: [
    { sdg: "SDG 6", fact: "One improperly disposed battery can contaminate 600,000 litres of water.", icon: "💧" },
    { sdg: "SDG 3", fact: "Proper hazardous waste disposal protects communities from toxic exposure and health risks.", icon: "🏥" },
  ],
  ewaste: [
    { sdg: "SDG 12", fact: "Only 17% of e-waste is formally recycled globally. Each device contains valuable recoverable materials.", icon: "♻️" },
    { sdg: "SDG 8", fact: "The e-waste recycling industry creates green jobs — proper recycling supports decent work.", icon: "💼" },
  ],
  other: [
    { sdg: "SDG 12", fact: "Being unsure about disposal is normal — 85% of people feel the same. You're already making a difference by checking!", icon: "♻️" },
  ],
};

const ResultsView = ({ detections, onBack, onNavigate }: ResultsViewProps) => {
  const [instructions, setInstructions] = useState<DisposalInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const { addPoints, incrementStreak, addScanRecord } = useUser();

  const totalCo2 = detections.reduce((sum, d) => sum + (d.co2SavedGrams || 0), 0);
  const recyclableCount = detections.filter(d => d.recyclable !== false).length;

  // Compute SDG contributions from this scan
  const sdgContributions = (() => {
    const contribs: Record<string, number> = {};
    detections.forEach(d => {
      const cat = d.category || "other";
      const facts = SDG_FACTS[cat] || SDG_FACTS.other;
      facts.forEach(f => {
        contribs[f.sdg] = (contribs[f.sdg] || 0) + 1;
      });
    });
    return Object.entries(contribs).sort(([, a], [, b]) => b - a).slice(0, 4);
  })();

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

  /** Get a random SDG fact for a given category */
  const getRandomFact = (category: string) => {
    const facts = SDG_FACTS[category] || SDG_FACTS.other;
    return facts[Math.floor(Math.random() * facts.length)];
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
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active-press">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="text-center">
          <span className="text-label text-muted-foreground block">
            {detections.length} Item{detections.length > 1 ? "s" : ""} Detected
          </span>
          <span className="text-[10px] text-primary font-mono">AI VISION v3</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Impact summary banner */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-4 sm:mx-6 mb-3 p-2.5 sm:p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-around gap-1"
        >
          <div className="flex items-center gap-1.5">
            <Recycle className="w-4 h-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase">Recyclable</p>
              <p className="text-sm font-bold text-foreground">{recyclableCount}/{detections.length}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex items-center gap-1.5">
            <Leaf className="w-4 h-4 text-success" />
            <div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase">CO₂ Saved</p>
              <p className="text-sm font-bold text-success">{totalCo2 >= 1000 ? `${(totalCo2/1000).toFixed(1)}kg` : `${totalCo2}g`}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-warning" />
            <div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase">Points</p>
              <p className="text-sm font-bold text-warning">+{detections.length * 10}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* SDG contribution badges */}
      {!loading && !error && sdgContributions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-4 sm:mx-6 mb-3 flex items-center gap-1.5 sm:gap-2 flex-wrap"
        >
          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground font-mono uppercase">SDGs impacted:</span>
          {sdgContributions.map(([sdg]) => (
            <span key={sdg} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
              {sdg}
            </span>
          ))}
        </motion.div>
      )}

      {/* Scrollable results */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 space-y-4">
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
            const det = detections[i];
            const style = BIN_STYLES[inst.binColor] || BIN_STYLES.foreground;
            const isExpanded = expandedCard === i;
            const catIcon = CATEGORY_ICONS[det?.category || "other"] || "📦";
            const sdgFact = getRandomFact(det?.category || "other");

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, ...brandSpring }}
                className={`rounded-3xl border bg-card shadow-soft ${style.border} overflow-hidden`}
              >
                {/* Main content */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{catIcon}</span>
                      <span className="text-label text-muted-foreground">{inst.material}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {det?.recyclable === false ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive">NOT RECYCLABLE</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success">RECYCLABLE</span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                        {inst.bin.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold tracking-tight mb-2">{inst.item}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{inst.instruction}</p>

                  {/* Confidence bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">Confidence</span>
                      <span className="font-mono text-xs text-foreground font-medium">
                        {((det?.confidence || 0.95) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(det?.confidence || 0.95) * 100}%` }}
                        transition={{ delay: i * 0.12 + 0.3, duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>

                  {/* Environmental impact mini-stats */}
                  {(det?.co2SavedGrams || det?.decompositionYears) && (
                    <div className="flex gap-3 mt-3">
                      {det.co2SavedGrams ? (
                        <div className="flex-1 p-2 rounded-xl bg-success/5 border border-success/10 text-center">
                          <Leaf className="w-3.5 h-3.5 text-success mx-auto mb-0.5" />
                          <p className="text-xs font-bold text-success">{det.co2SavedGrams}g</p>
                          <p className="text-[9px] text-muted-foreground">CO₂ saved</p>
                        </div>
                      ) : null}
                      {det.decompositionYears ? (
                        <div className="flex-1 p-2 rounded-xl bg-warning/5 border border-warning/10 text-center">
                          <Clock className="w-3.5 h-3.5 text-warning mx-auto mb-0.5" />
                          <p className="text-xs font-bold text-warning">{det.decompositionYears >= 1000 ? `${(det.decompositionYears/1000).toFixed(0)}k` : det.decompositionYears}yr</p>
                          <p className="text-[9px] text-muted-foreground">to decompose</p>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* 🌍 "Did You Know?" SDG micro-learning */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.12 + 0.5 }}
                    className="mt-3 p-3 rounded-xl bg-accent/50 border border-accent-foreground/5"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0">{sdgFact.icon}</span>
                      <div>
                        <p className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider mb-0.5">
                          Did You Know? · {sdgFact.sdg}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{sdgFact.fact}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Expandable details */}
                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : i)}
                    className="w-full mt-3 pt-2 border-t border-border flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Lightbulb className="w-3 h-3" />
                    {isExpanded ? "Less details" : "More details"}
                  </button>
                </div>

                {/* Expanded section */}
                <AnimatePresenceWrapper show={isExpanded}>
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-3 border-t border-border pt-3">
                      {det?.materialDetail && (
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Material</p>
                          <p className="text-xs text-foreground">{det.materialDetail}</p>
                        </div>
                      )}
                      {det?.funFact && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                          <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-xs text-foreground leading-relaxed">{det.funFact}</p>
                        </div>
                      )}
                      {inst.ecoTip && (
                        <div className="flex items-start gap-2">
                          <Leaf className="w-4 h-4 text-success mt-0.5 shrink-0" />
                          <p className="text-xs text-success font-medium">{inst.ecoTip}</p>
                        </div>
                      )}
                      {inst.ecoAlternative && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-accent border border-accent-foreground/10">
                          <Recycle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Eco Alternative</p>
                            <p className="text-xs text-foreground leading-relaxed">{inst.ecoAlternative}</p>
                          </div>
                        </div>
                      )}
                      {inst.dropoff && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                          <p className="font-mono text-xs text-muted-foreground">{inst.dropoff}</p>
                        </div>
                      )}
                      {onNavigate && (
                        <button
                          onClick={() => handleAskAI(inst.item)}
                          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors active-press py-2"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Ask AI more about this item
                        </button>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresenceWrapper>
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

// Simple wrapper for AnimatePresence on a single conditional child
import { AnimatePresence } from "framer-motion";
function AnimatePresenceWrapper({ show, children }: { show: boolean; children: React.ReactNode }) {
  return <AnimatePresence>{show ? children : null}</AnimatePresence>;
}

export default ResultsView;
