import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { getStreakFreezes } from "@/services/gamificationEngine";

const StreakShield = () => {
  const freezes = getStreakFreezes();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card/50"
    >
      <Shield className="w-4 h-4 text-primary" />
      <div className="flex-1">
        <p className="text-xs font-semibold">Streak Shields</p>
        <p className="text-[10px] text-muted-foreground">Protects your streak if you miss a day</p>
      </div>
      <div className="flex gap-1">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              i < freezes
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground/30"
            }`}
          >
            🛡️
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default StreakShield;
