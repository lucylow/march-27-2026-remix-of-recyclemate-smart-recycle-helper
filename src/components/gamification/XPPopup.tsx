import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Zap } from "lucide-react";

interface XPEvent {
  id: string;
  amount: number;
  label?: string;
}

let _emitXP: ((event: XPEvent) => void) | null = null;

/** Call from anywhere to show an XP popup */
export function showXPPopup(amount: number, label?: string) {
  _emitXP?.({ id: `${Date.now()}_${Math.random()}`, amount, label });
}

const XPPopup = () => {
  const [events, setEvents] = useState<XPEvent[]>([]);

  const handleEvent = useCallback((event: XPEvent) => {
    setEvents((prev) => [...prev, event]);
    setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    }, 2000);
  }, []);

  useEffect(() => {
    _emitXP = handleEvent;
    return () => { _emitXP = null; };
  }, [handleEvent]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-none flex flex-col items-center gap-2">
      <AnimatePresence>
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 30, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground shadow-elevated"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Zap className="w-5 h-5 fill-current" />
            </motion.div>
            <span className="font-mono font-bold text-lg tracking-tight">
              +{event.amount} XP
            </span>
            {event.label && (
              <span className="text-xs text-primary-foreground/70 font-medium">
                {event.label}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default XPPopup;
