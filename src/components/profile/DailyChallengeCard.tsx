import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, CheckCircle2 } from "lucide-react";
import { getDailyChallenge } from "@/services/gamificationEngine";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";

const DailyChallengeCard = () => {
  const { scanHistory, streak, addPoints } = useUser();
  const challenge = getDailyChallenge();

  const [claimed, setClaimed] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem("recyclemate_daily_claimed") || "{}");
      return data.id === challenge.id;
    } catch {
      return false;
    }
  });

  const getProgress = (): number => {
    const todayStr = new Date().toDateString();
    const todayScans = scanHistory.filter(
      (r) => new Date(r.timestamp).toDateString() === todayStr
    );
    switch (challenge.type) {
      case "scans":
        return todayScans.length;
      case "items":
        return todayScans.reduce((sum, r) => sum + r.items.length, 0);
      case "streak":
        return streak >= 1 ? 1 : 0;
      default:
        return 0;
    }
  };

  const progress = getProgress();
  const pct = Math.min(progress / challenge.target, 1);
  const complete = pct >= 1;

  const handleClaim = () => {
    if (claimed) return;
    addPoints(challenge.reward);
    setClaimed(true);
    localStorage.setItem(
      "recyclemate_daily_claimed",
      JSON.stringify({ id: challenge.id })
    );
    toast.success(`Daily challenge complete! +${challenge.reward} XP ${challenge.emoji}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl border ${
        complete && !claimed
          ? "border-warning/40 bg-warning/5"
          : "border-border bg-card"
      } shadow-soft`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{challenge.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-warning" />
              <h3 className="text-sm font-semibold">Daily: {challenge.title}</h3>
            </div>
            <span className="text-xs font-semibold text-warning">+{challenge.reward}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{challenge.description}</p>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.6 }}
              className={`h-full rounded-full ${complete ? "bg-warning" : "bg-primary"}`}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground">
              {Math.min(progress, challenge.target)}/{challenge.target}
            </span>
            {complete && !claimed && (
              <motion.button
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                onClick={handleClaim}
                className="px-3 py-1 bg-warning text-warning-foreground rounded-lg text-xs font-semibold active-press"
              >
                Claim!
              </motion.button>
            )}
            {claimed && (
              <span className="flex items-center gap-1 text-xs text-success font-medium">
                <CheckCircle2 className="w-3 h-3" /> Done
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DailyChallengeCard;
