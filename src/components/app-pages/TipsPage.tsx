import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb, RefreshCw, Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";

interface EcoTip {
  title: string;
  tip: string;
  category: string;
  emoji: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  recycling: "bg-primary/10 text-primary",
  reduce: "bg-destructive/10 text-destructive",
  reuse: "bg-success/10 text-success",
  sustainability: "bg-accent text-accent-foreground",
  "eco-hack": "bg-warning/10 text-warning",
};

const TIPS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tips`;

const TipsPage = () => {
  const { scanHistory, points, streak } = useUser();
  const [tips, setTips] = useState<EcoTip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTips = async () => {
    setLoading(true);
    try {
      const resp = await fetch(TIPS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          scanHistory: scanHistory.slice(0, 10).map((r) => ({
            items: r.items.map((i) => ({ displayName: i.displayName })),
          })),
          points,
          streak,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch tips");
      }

      const data = await resp.json();
      setTips(data);
    } catch (e) {
      console.error("Tips error:", e);
      toast.error("Couldn't load tips. Try again!");
      setTips([
        { title: "Start Scanning!", tip: "Use the scanner to identify items and get personalized tips based on your habits.", category: "recycling", emoji: "📸" },
        { title: "Rinse Before Recycling", tip: "A quick rinse removes food residue and prevents contamination of recyclable materials.", category: "recycling", emoji: "💧" },
        { title: "Reduce First", tip: "Before recycling, consider if you can reduce consumption. The best waste is the waste you never create.", category: "reduce", emoji: "🎯" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTips(); }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display mb-1">Daily Tips</h1>
          <p className="text-sm text-muted-foreground">AI-personalized for your habits</p>
        </div>
        <button
          onClick={fetchTips}
          disabled={loading}
          className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active-press disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Generating your personalized tips...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tips.map((tip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-5 rounded-2xl border border-border bg-card shadow-soft"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tip.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold">{tip.title}</h3>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium uppercase tracking-wider ${CATEGORY_COLORS[tip.category] || "bg-secondary text-muted-foreground"}`}>
                      {tip.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip.tip}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tips are personalized using AI based on your scan history. The more you scan, the smarter your tips become!
        </p>
      </div>
    </div>
  );
};

export default TipsPage;
