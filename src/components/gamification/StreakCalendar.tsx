import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useUser } from "@/context/UserContext";

const StreakCalendar = () => {
  const { scanHistory, streak } = useUser();

  // Build last 7 days activity
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toDateString();
    const hadActivity = scanHistory.some(
      (r) => new Date(r.timestamp).toDateString() === dateStr
    );
    const isToday = i === 6;
    return {
      label: date.toLocaleDateString("en", { weekday: "narrow" }),
      active: hadActivity,
      isToday,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl border border-border bg-card shadow-soft"
    >
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-warning" />
        <span className="text-sm font-semibold">This Week</span>
        {streak > 0 && (
          <span className="ml-auto text-xs font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
            {streak} day streak 🔥
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-[10px] text-muted-foreground font-medium">{day.label}</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                day.active
                  ? "bg-success/15 text-success border border-success/30"
                  : day.isToday
                  ? "bg-primary/10 text-primary border border-primary/30 border-dashed"
                  : "bg-secondary text-muted-foreground/30"
              }`}
            >
              {day.active ? "✓" : day.isToday ? "•" : ""}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default StreakCalendar;
