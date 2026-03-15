import { motion } from "framer-motion";
import { ArrowLeft, Flame, Star, Clock, Trophy, Target } from "lucide-react";
import { useUser } from "@/context/UserContext";
import EcoAvatar from "@/components/EcoAvatar";

interface ProfileViewProps {
  onBack: () => void;
}

const BADGES: Record<string, { name: string; description: string; icon: string; threshold: number }> = {
  first_scan: { name: "First Scan", description: "Complete your first scan", icon: "🎯", threshold: 10 },
  eco_starter: { name: "Eco Starter", description: "Earn 50 points", icon: "🌱", threshold: 50 },
  planet_protector: { name: "Planet Protector", description: "Earn 100 points", icon: "🛡️", threshold: 100 },
  sorting_master: { name: "Sorting Master", description: "Earn 500 points", icon: "🏆", threshold: 500 },
};

const NEXT_LEVEL = 500;

const ProgressBar = ({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 bg-secondary rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
};

const ProfileView = ({ onBack }: ProfileViewProps) => {
  const { points, streak, achievements, scanHistory } = useUser();
  const totalScans = scanHistory.length;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active-press">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="text-label text-muted-foreground">Profile</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
        {/* Eco Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center py-2"
        >
          <EcoAvatar points={points} size={90} />
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Star className="w-5 h-5 text-primary" />, value: points, label: "Points", color: "text-primary" },
            { icon: <Flame className="w-5 h-5 text-warning" />, value: streak, label: "Streak", color: "text-warning" },
            { icon: <Target className="w-5 h-5 text-success" />, value: totalScans, label: "Scans", color: "text-success" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl border border-border bg-card shadow-soft text-center"
            >
              <div className="mx-auto mb-2">{stat.icon}</div>
              <p className={`font-mono text-2xl font-semibold tracking-tighter ${stat.color}`}>{stat.value}</p>
              <p className="text-label text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Level progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl border border-border bg-card shadow-soft"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Level Progress</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{points} / {NEXT_LEVEL}</span>
          </div>
          <ProgressBar value={points} max={NEXT_LEVEL} />
          <p className="text-xs text-muted-foreground mt-2">
            {NEXT_LEVEL - points > 0 ? `${NEXT_LEVEL - points} points to next level` : "Level complete! 🎉"}
          </p>
        </motion.div>

        {/* Achievements */}
        <div>
          <h3 className="text-label text-muted-foreground mb-4">Achievements</h3>
          <div className="space-y-3">
            {Object.entries(BADGES).map(([key, badge], i) => {
              const unlocked = achievements.includes(key);
              const progress = Math.min(points / badge.threshold, 1);
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className={`p-4 rounded-2xl border flex items-center gap-4 ${
                    unlocked ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <span className={`text-2xl ${!unlocked && "grayscale opacity-40"}`}>{badge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`font-semibold text-sm ${!unlocked && "text-muted-foreground"}`}>{badge.name}</p>
                      {unlocked && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">UNLOCKED</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
                    <ProgressBar
                      value={points}
                      max={badge.threshold}
                      color={unlocked ? "bg-primary" : "bg-muted-foreground/30"}
                    />
                    <p className="font-mono text-[10px] text-muted-foreground mt-1">
                      {Math.min(points, badge.threshold)} / {badge.threshold}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Scan history */}
        <div>
          <h3 className="text-label text-muted-foreground mb-4">Recent Scans</h3>
          {scanHistory.length === 0 ? (
            <div className="text-center py-10">
              <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No scans yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Start scanning to build your history</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scanHistory.slice(0, 10).map((record, i) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {record.items.map(i => i.displayName).join(", ")}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {record.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-lg">
                    +{record.pointsEarned}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
