import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { getLevel } from "@/services/gamificationEngine";

interface LevelProgressProps {
  points: number;
}

const LevelProgress = ({ points }: LevelProgressProps) => {
  const level = getLevel(points);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="p-5 rounded-2xl border border-border bg-card shadow-soft"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            Level {level.level} · {level.emoji} {level.title}
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {points} / {level.xpForNext} XP
        </span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${level.progressPct}%` }}
          transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
        />
        {/* Shimmer */}
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {level.xpForNext - points > 0
          ? `${level.xpForNext - points} XP to Level ${level.level + 1}`
          : "Level complete! 🎉"}
      </p>
    </motion.div>
  );
};

export default LevelProgress;
