import { motion } from "framer-motion";
import { Star, Flame, Target, Zap } from "lucide-react";
import { getStreakMultiplier } from "@/services/gamificationEngine";

interface StatsRowProps {
  points: number;
  streak: number;
  totalScans: number;
}

const StatsRow = ({ points, streak, totalScans }: StatsRowProps) => {
  const multiplier = getStreakMultiplier(streak);

  const stats = [
    { icon: <Star className="w-5 h-5 text-primary" />, value: points, label: "XP", color: "text-primary" },
    {
      icon: <Flame className="w-5 h-5 text-warning" />,
      value: streak,
      label: "Streak",
      color: "text-warning",
      extra: multiplier > 1 ? `${multiplier}x` : undefined,
    },
    { icon: <Target className="w-5 h-5 text-success" />, value: totalScans, label: "Scans", color: "text-success" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="p-3 sm:p-4 rounded-2xl border border-border bg-card shadow-soft text-center relative overflow-hidden"
        >
          {/* Streak flame animation */}
          {stat.label === "Streak" && streak >= 7 && (
            <motion.div
              animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-t from-warning/20 to-transparent rounded-2xl"
            />
          )}
          <div className="mx-auto mb-2 relative">{stat.icon}</div>
          <p className={`font-mono text-xl sm:text-2xl font-semibold tracking-tighter ${stat.color}`}>
            {stat.value}
          </p>
          <p className="text-label text-muted-foreground mt-1">{stat.label}</p>
          {stat.extra && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full"
            >
              <Zap className="w-2.5 h-2.5" />
              {stat.extra}
            </motion.span>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default StatsRow;
