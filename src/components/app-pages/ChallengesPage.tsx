import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Trophy, Clock, CheckCircle2, Flame, Sparkles, ChevronRight } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  reward: number;
  badge: string;
  type: "items" | "scans" | "streak" | "materials";
  duration: string;
}

const WEEKLY_CHALLENGES: Challenge[] = [
  {
    id: "plastic_buster",
    title: "Plastic Buster",
    description: "Scan 10 plastic items this week",
    target: 10,
    unit: "plastic items",
    reward: 50,
    badge: "🧴",
    type: "items",
    duration: "This Week",
  },
  {
    id: "daily_scanner",
    title: "Daily Scanner",
    description: "Scan items for 5 days in a row",
    target: 5,
    unit: "days",
    reward: 75,
    badge: "📅",
    type: "streak",
    duration: "This Week",
  },
  {
    id: "material_explorer",
    title: "Material Explorer",
    description: "Recycle 3 different material types",
    target: 3,
    unit: "materials",
    reward: 40,
    badge: "🔬",
    type: "materials",
    duration: "This Week",
  },
  {
    id: "recycling_marathon",
    title: "Recycling Marathon",
    description: "Complete 15 scans this week",
    target: 15,
    unit: "scans",
    reward: 60,
    badge: "🏃",
    type: "scans",
    duration: "This Week",
  },
];

const COMPLETED_CHALLENGES = [
  { title: "First Steps", badge: "🎯", reward: 20, date: "Mar 10" },
  { title: "Can Crusher", badge: "🥫", reward: 30, date: "Mar 8" },
];

const ChallengesPage = () => {
  const { scanHistory, streak, addPoints } = useUser();
  const [claimedIds, setClaimedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("recyclemate_claimed_challenges") || "[]");
    } catch { return []; }
  });

  // Calculate progress for each challenge
  const getProgress = (challenge: Challenge): number => {
    switch (challenge.type) {
      case "scans":
        return scanHistory.length;
      case "streak":
        return streak;
      case "materials": {
        const materials = new Set(scanHistory.flatMap((r) => r.items.map((i) => i.label)));
        return materials.size;
      }
      case "items":
        return scanHistory.reduce((sum, r) => sum + r.items.length, 0);
      default:
        return 0;
    }
  };

  const handleClaim = (challenge: Challenge) => {
    if (claimedIds.includes(challenge.id)) return;
    addPoints(challenge.reward);
    const updated = [...claimedIds, challenge.id];
    setClaimedIds(updated);
    localStorage.setItem("recyclemate_claimed_challenges", JSON.stringify(updated));
    toast.success(`Challenge complete! +${challenge.reward} points ${challenge.badge}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-display mb-1">Eco-Challenges</h1>
        <p className="text-sm text-muted-foreground">Complete challenges to earn bonus rewards</p>
      </div>

      {/* Active challenges */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Active Challenges</h2>
          <span className="ml-auto text-label text-muted-foreground">THIS WEEK</span>
        </div>

        <div className="space-y-3">
          {WEEKLY_CHALLENGES.map((challenge, i) => {
            const progress = getProgress(challenge);
            const pct = Math.min(progress / challenge.target, 1);
            const complete = pct >= 1;
            const claimed = claimedIds.includes(challenge.id);

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-4 rounded-2xl border shadow-soft ${
                  complete ? "border-success/30 bg-success/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{challenge.badge}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-sm font-semibold">{challenge.title}</h3>
                      <span className="flex items-center gap-1 text-xs font-semibold text-warning">
                        <Sparkles className="w-3 h-3" />
                        +{challenge.reward}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{challenge.description}</p>

                    {/* Progress bar */}
                    <div className="h-2 bg-secondary rounded-full overflow-hidden mb-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                        className={`h-full rounded-full ${complete ? "bg-success" : "bg-primary"}`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {Math.min(progress, challenge.target)} / {challenge.target} {challenge.unit}
                      </span>
                      {complete && !claimed && (
                        <motion.button
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          onClick={() => handleClaim(challenge)}
                          className="px-3 py-1 bg-success text-success-foreground rounded-lg text-xs font-semibold active-press"
                        >
                          Claim Reward
                        </motion.button>
                      )}
                      {claimed && (
                        <span className="flex items-center gap-1 text-xs text-success font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Claimed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Completed challenges */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-warning" />
          <h2 className="text-sm font-semibold">Completed</h2>
        </div>
        <div className="space-y-2">
          {COMPLETED_CHALLENGES.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50"
            >
              <span className="text-lg">{c.badge}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.title}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{c.date}</p>
              </div>
              <span className="text-xs font-semibold text-success">+{c.reward}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
        <p className="text-sm text-foreground/80 leading-relaxed">
          <strong>How challenges work:</strong> New challenges appear every week. Complete them by scanning and recycling items correctly. Claim your rewards before the week ends!
        </p>
      </div>
    </div>
  );
};

export default ChallengesPage;
