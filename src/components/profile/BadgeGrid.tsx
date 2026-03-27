import { motion } from "framer-motion";
import { BADGES, type UserGamificationStats } from "@/services/gamificationEngine";

interface BadgeGridProps {
  unlockedBadges: string[];
  stats: UserGamificationStats;
}

const BadgeGrid = ({ unlockedBadges, stats }: BadgeGridProps) => {
  return (
    <div>
      <h3 className="text-label text-muted-foreground mb-4">
        Badges · {unlockedBadges.length}/{BADGES.length}
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {BADGES.map((badge, i) => {
          const unlocked = unlockedBadges.includes(badge.id);
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.03 }}
              className={`relative flex flex-col items-center p-2 rounded-xl border text-center ${
                unlocked
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card opacity-40 grayscale"
              }`}
              title={`${badge.label}: ${badge.description}`}
            >
              <span className="text-2xl mb-1">{badge.emoji}</span>
              <p className="text-[9px] font-medium leading-tight truncate w-full">
                {badge.label}
              </p>
              {unlocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-success rounded-full flex items-center justify-center"
                >
                  <span className="text-[8px] text-success-foreground">✓</span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgeGrid;
