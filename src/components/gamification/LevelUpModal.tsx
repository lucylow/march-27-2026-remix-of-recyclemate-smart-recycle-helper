import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Trophy, ArrowUp, Sparkles } from "lucide-react";

interface LevelUpData {
  level: number;
  title: string;
  emoji: string;
}

let _triggerLevelUp: ((data: LevelUpData) => void) | null = null;

export function showLevelUp(level: number, title: string, emoji: string) {
  _triggerLevelUp?.({ level, title, emoji });
}

const LevelUpModal = () => {
  const [data, setData] = useState<LevelUpData | null>(null);

  const handleTrigger = useCallback((d: LevelUpData) => {
    setData(d);
  }, []);

  useEffect(() => {
    _triggerLevelUp = handleTrigger;
    return () => { _triggerLevelUp = null; };
  }, [handleTrigger]);

  if (!data) return null;

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/50 backdrop-blur-sm"
          onClick={() => setData(null)}
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[85vw] max-w-xs p-8 rounded-3xl bg-card border border-border shadow-elevated text-center relative overflow-hidden"
          >
            {/* Particle effects */}
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 200,
                }}
                transition={{ duration: 1.5, delay: i * 0.05 }}
                className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
                style={{
                  background: i % 3 === 0
                    ? "hsl(var(--primary))"
                    : i % 3 === 1
                    ? "hsl(var(--warning))"
                    : "hsl(var(--success))",
                }}
              />
            ))}

            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-6xl mb-4"
            >
              {data.emoji}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <ArrowUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">Level Up!</span>
              </div>
              <h2 className="text-3xl font-bold mb-1">Level {data.level}</h2>
              <p className="text-muted-foreground font-medium">{data.title}</p>
            </motion.div>

            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={() => setData(null)}
              className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm active-press flex items-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              Awesome!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LevelUpModal;
