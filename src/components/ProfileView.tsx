import { motion } from "framer-motion";
import { ArrowLeft, Flame, Star, Clock } from "lucide-react";
import { useUser } from "@/context/UserContext";

interface ProfileViewProps {
  onBack: () => void;
}

const BADGES: Record<string, { name: string; description: string; icon: string }> = {
  first_scan: { name: "First Scan", description: "Completed your first scan", icon: "🎯" },
  eco_starter: { name: "Eco Starter", description: "Earned 50 points", icon: "🌱" },
  planet_protector: { name: "Planet Protector", description: "Earned 100 points", icon: "🛡️" },
  sorting_master: { name: "Sorting Master", description: "Earned 500 points", icon: "🏆" },
};

const ProfileView = ({ onBack }: ProfileViewProps) => {
  const { points, streak, achievements, scanHistory } = useUser();

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
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl border border-border bg-card shadow-soft text-center"
          >
            <Star className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-mono text-3xl font-semibold tracking-tighter text-primary">{points}</p>
            <p className="text-label text-muted-foreground mt-1">Total Points</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 rounded-3xl border border-border bg-card shadow-soft text-center"
          >
            <Flame className="w-6 h-6 text-warning mx-auto mb-2" />
            <p className="font-mono text-3xl font-semibold tracking-tighter text-warning">{streak}</p>
            <p className="text-label text-muted-foreground mt-1">Day Streak</p>
          </motion.div>
        </div>

        {/* Achievements */}
        <div>
          <h3 className="text-label text-muted-foreground mb-4">Achievements</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(BADGES).map(([key, badge]) => {
              const unlocked = achievements.includes(key);
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-2xl border ${unlocked ? "border-primary bg-primary/5" : "border-border bg-secondary/50 opacity-40"}`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <p className="font-semibold text-sm mt-2">{badge.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{badge.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Scan history */}
        <div>
          <h3 className="text-label text-muted-foreground mb-4">Recent Scans</h3>
          {scanHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No scans yet. Start scanning!</p>
          ) : (
            <div className="space-y-3">
              {scanHistory.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {record.items.map(i => i.displayName).join(", ")}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {record.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">+{record.pointsEarned}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
