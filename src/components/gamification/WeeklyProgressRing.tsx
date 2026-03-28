import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useUser } from "@/context/UserContext";

const WEEKLY_GOAL = 10; // items per week

const WeeklyProgressRing = () => {
  const { scanHistory } = useUser();

  // Count items scanned this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weeklyItems = scanHistory
    .filter((r) => new Date(r.timestamp) >= weekStart)
    .reduce((sum, r) => sum + r.items.length, 0);

  const pct = Math.min(weeklyItems / WEEKLY_GOAL, 1);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl border border-border bg-card shadow-soft flex items-center gap-4"
    >
      <div className="relative w-[90px] h-[90px] shrink-0">
        <svg viewBox="0 0 90 90" className="w-full h-full -rotate-90">
          <circle
            cx="45" cy="45" r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="6"
          />
          <motion.circle
            cx="45" cy="45" r={radius}
            fill="none"
            stroke={pct >= 1 ? "hsl(var(--success))" : "hsl(var(--primary))"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-bold">{weeklyItems}</span>
          <span className="text-[9px] text-muted-foreground">/{WEEKLY_GOAL}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-semibold">Weekly Goal</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {pct >= 1
            ? "Goal reached! Amazing work! 🎉"
            : `${WEEKLY_GOAL - weeklyItems} more items to hit your goal`}
        </p>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.8 }}
            className={`h-full rounded-full ${pct >= 1 ? "bg-success" : "bg-primary"}`}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default WeeklyProgressRing;
