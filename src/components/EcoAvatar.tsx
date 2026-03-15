import { motion } from "framer-motion";

interface EcoAvatarProps {
  points: number;
  size?: number;
}

const STAGES = [
  { name: "Seedling", minPoints: 0, emoji: "🌱", color: "hsl(var(--success))" },
  { name: "Sprout", minPoints: 30, emoji: "🌿", color: "hsl(142 60% 50%)" },
  { name: "Sapling", minPoints: 100, emoji: "🌳", color: "hsl(142 71% 40%)" },
  { name: "Tree", minPoints: 300, emoji: "🏔️", color: "hsl(142 71% 35%)" },
  { name: "Forest Guardian", minPoints: 500, emoji: "🌍", color: "hsl(142 80% 30%)" },
];

const getStage = (points: number) => {
  let current = STAGES[0];
  for (const stage of STAGES) {
    if (points >= stage.minPoints) current = stage;
  }
  return current;
};

const getNextStage = (points: number) => {
  for (const stage of STAGES) {
    if (points < stage.minPoints) return stage;
  }
  return null;
};

const EcoAvatar = ({ points, size = 80 }: EcoAvatarProps) => {
  const stage = getStage(points);
  const next = getNextStage(points);
  const stageIdx = STAGES.indexOf(stage);
  const progress = next ? (points - stage.minPoints) / (next.minPoints - stage.minPoints) : 1;

  // Rings grow with stage
  const ringCount = stageIdx + 1;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Animated rings */}
        {Array.from({ length: ringCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.15 - i * 0.03 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 20 }}
            className="absolute rounded-full"
            style={{
              width: size + i * 16,
              height: size + i * 16,
              backgroundColor: stage.color,
            }}
          />
        ))}
        {/* Core circle */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative rounded-full flex items-center justify-center z-10"
          style={{
            width: size * 0.85,
            height: size * 0.85,
            background: `radial-gradient(circle, ${stage.color}22, ${stage.color}44)`,
            border: `2px solid ${stage.color}`,
          }}
        >
          <span style={{ fontSize: size * 0.4 }}>{stage.emoji}</span>
        </motion.div>
      </motion.div>
      <div className="text-center">
        <p className="text-sm font-semibold">{stage.name}</p>
        {next && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {next.minPoints - points} pts to {next.name}
          </p>
        )}
      </div>
    </div>
  );
};

export { EcoAvatar, getStage, getNextStage, STAGES };
export default EcoAvatar;
