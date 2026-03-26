import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf, Droplets, TreePine, Recycle, Loader2, Sparkles, Target, TrendingUp,
  Award, ChevronRight, RefreshCw, Zap, Share2, Globe, Fuel, GraduationCap,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { toast } from "sonner";

// --- Constants ---
const CO2_PER_ITEM = 0.157;
const WATER_PER_ITEM = 7.6;
const TREES_PER_ITEM = 0.02;
const ENERGY_PER_ITEM_KWH = 0.5;
const OIL_PER_ITEM_L = 0.1;
const REPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-impact-report`;

// --- Types ---
interface ImpactReport {
  headline: string;
  summary: string;
  grade: string;
  co2Equivalency: string;
  strengths: string[];
  improvements: string[];
  challengeOfTheWeek: string;
  funStats: string[];
  nextMilestone: string;
  stats: {
    totalScans: number;
    totalItems: number;
    recyclableCount: number;
    recyclingRate: number;
    totalCo2: number;
    points: number;
    streak: number;
  };
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-success", A: "text-success", "A-": "text-success",
  "B+": "text-primary", B: "text-primary", "B-": "text-primary",
  "C+": "text-warning", C: "text-warning", "C-": "text-warning",
  D: "text-destructive", F: "text-destructive",
};

const SDG_TARGETS = [
  { sdg: "SDG 4.7", label: "Education", icon: <GraduationCap className="w-3.5 h-3.5" />, desc: "Sustainability literacy through quizzes & micro-learning" },
  { sdg: "SDG 6", label: "Clean Water", icon: <Droplets className="w-3.5 h-3.5" />, desc: "Water saved by recycling materials instead of producing new" },
  { sdg: "SDG 12.5", label: "Waste Reduction", icon: <Recycle className="w-3.5 h-3.5" />, desc: "Correctly sorted items reduce contamination & landfill" },
  { sdg: "SDG 13", label: "Climate Action", icon: <Leaf className="w-3.5 h-3.5" />, desc: "CO₂ emissions avoided through proper recycling" },
  { sdg: "SDG 15", label: "Life on Land", icon: <TreePine className="w-3.5 h-3.5" />, desc: "Trees preserved by recycling paper & cardboard" },
];

// --- Sub-components ---
const ProgressBar = ({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
};

/** Animated mini-tree SVG for virtual forest */
const MiniTree = ({ index, grown }: { index: number; grown: boolean }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={grown ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0.2 }}
    transition={{ delay: index * 0.04, type: "spring", stiffness: 200 }}
    className="flex flex-col items-center"
  >
    <svg width="28" height="36" viewBox="0 0 28 36">
      <motion.path
        d="M14 4 L6 16 L10 16 L4 26 L24 26 L18 16 L22 16 Z"
        fill={grown ? "hsl(var(--success))" : "hsl(var(--muted))"}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: index * 0.04 }}
      />
      <rect x="12" y="26" width="4" height="8" rx="1" fill={grown ? "hsl(32 95% 44%)" : "hsl(var(--muted))"} />
    </svg>
  </motion.div>
);

const co2ChartConfig: ChartConfig = {
  co2: { label: "CO₂ Saved (kg)", color: "hsl(var(--success))" },
};

const weeklyChartConfig: ChartConfig = {
  items: { label: "Items Recycled", color: "hsl(var(--primary))" },
  water: { label: "Water Saved (L)", color: "hsl(142 71% 45%)" },
};

const MATERIAL_COLORS = [
  "hsl(var(--primary))", "hsl(var(--success))", "hsl(32 95% 44%)",
  "hsl(var(--destructive))", "hsl(270 60% 55%)", "hsl(190 80% 42%)",
];

const LABEL_NAMES: Record<string, string> = {
  plastic_bottle: "Plastic", aluminum_can: "Aluminum", cardboard: "Cardboard",
  glass_bottle: "Glass", newspaper: "Paper", styrofoam: "Styrofoam",
  battery: "Battery", food_waste: "Organic", electronic_waste: "E-Waste",
};

// --- Main Component ---
const ImpactPage = () => {
  const { scanHistory, points, streak } = useUser();
  const [report, setReport] = useState<ImpactReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const totalItems = scanHistory.reduce((sum, r) => sum + r.items.length, 0);
  const co2Saved = (totalItems * CO2_PER_ITEM).toFixed(1);
  const waterSaved = Math.round(totalItems * WATER_PER_ITEM);
  const treesEquiv = (totalItems * TREES_PER_ITEM).toFixed(2);
  const energySaved = (totalItems * ENERGY_PER_ITEM_KWH).toFixed(1);
  const oilSaved = (totalItems * OIL_PER_ITEM_L).toFixed(1);
  const monthlyGoal = 200;
  const hasData = scanHistory.length > 0;

  // Virtual forest: 1 tree per 5 items, max 30 trees shown
  const grownTrees = Math.min(Math.floor(totalItems / 5), 30);
  const totalTreeSlots = Math.max(grownTrees, 12);

  const recyclableCount = scanHistory.reduce(
    (sum, r) => sum + r.items.filter((i) => i.recyclable !== false).length, 0
  );
  const recyclingRate = totalItems > 0 ? ((recyclableCount / totalItems) * 100).toFixed(0) : "0";

  const fetchReport = async () => {
    setReportLoading(true);
    try {
      const resp = await fetch(REPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          scanHistory: scanHistory.slice(0, 30).map((r) => ({
            items: r.items.map((i) => ({
              displayName: i.displayName, label: i.label,
              recyclable: i.recyclable, category: i.category,
              co2SavedGrams: i.co2SavedGrams,
            })),
          })),
          points, streak, totalScans: scanHistory.length,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error("Rate limited — try again shortly");
        else if (resp.status === 402) toast.error("AI credits exhausted");
        throw new Error(err.error || "Failed to generate report");
      }
      setReport(await resp.json());
    } catch (e) {
      console.error("Impact report error:", e);
      toast.error("Couldn't generate report. Try again.");
    } finally {
      setReportLoading(false);
    }
  };

  const shareImpact = async () => {
    const text = `🌍 I've recycled ${totalItems} items with RecycleMate!\n♻️ ${co2Saved} kg CO₂ saved\n💧 ${waterSaved} L water conserved\n🌳 ${treesEquiv} trees equivalent preserved\n\nJoin me: ${window.location.origin}`;
    if (navigator.share) {
      try { await navigator.share({ title: "My RecycleMate Impact", text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Impact summary copied to clipboard!");
    }
  };

  // Chart data
  const co2DailyData = useMemo(() => {
    const now = new Date();
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    scanHistory.forEach((r) => {
      const key = new Date(r.timestamp).toISOString().slice(0, 10);
      if (key in days) days[key] += r.items.length * CO2_PER_ITEM;
    });
    let cumulative = 0;
    return Object.entries(days).map(([date, val]) => {
      cumulative += val;
      return { date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }), co2: +cumulative.toFixed(2) };
    });
  }, [scanHistory]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const days: Record<string, { items: number; water: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = { items: 0, water: 0 };
    }
    scanHistory.forEach((r) => {
      const key = new Date(r.timestamp).toISOString().slice(0, 10);
      if (key in days) {
        const count = r.items.length;
        days[key].items += count;
        days[key].water += count * WATER_PER_ITEM;
      }
    });
    return Object.entries(days).map(([date, val]) => ({
      date: new Date(date).toLocaleDateString("en", { weekday: "short" }),
      items: val.items, water: +val.water.toFixed(1),
    }));
  }, [scanHistory]);

  const materialData = useMemo(() => {
    const counts: Record<string, number> = {};
    scanHistory.forEach((r) => {
      r.items.forEach((item) => {
        const name = LABEL_NAMES[item.label] || item.displayName;
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [scanHistory]);

  const stats = [
    { icon: <Recycle className="w-5 h-5" />, value: totalItems, label: "Items Recycled", color: "text-primary" },
    { icon: <Leaf className="w-5 h-5" />, value: `${co2Saved} kg`, label: "CO₂ Saved", color: "text-success" },
    { icon: <Droplets className="w-5 h-5" />, value: `${waterSaved} L`, label: "Water Saved", color: "text-primary" },
    { icon: <TreePine className="w-5 h-5" />, value: treesEquiv, label: "Trees Equiv.", color: "text-success" },
    { icon: <Zap className="w-5 h-5" />, value: `${energySaved} kWh`, label: "Energy Saved", color: "text-warning" },
    { icon: <Fuel className="w-5 h-5" />, value: `${oilSaved} L`, label: "Oil Saved", color: "text-destructive" },
  ];

  // Equivalencies
  const equivalencies = useMemo(() => {
    const co2Num = parseFloat(co2Saved);
    return [
      { emoji: "🚗", text: `${(co2Num / 0.21).toFixed(0)} fewer km driven` },
      { emoji: "💡", text: `${(parseFloat(energySaved) / 0.1).toFixed(0)} hours of LED light` },
      { emoji: "🚿", text: `${(waterSaved / 70).toFixed(0)} showers worth of water` },
      { emoji: "📱", text: `${(parseFloat(energySaved) / 0.012).toFixed(0)} phone charges` },
    ];
  }, [co2Saved, energySaved, waterSaved]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header with share */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display mb-1">Your Impact</h1>
          <p className="text-sm text-muted-foreground">Environmental contribution tracker</p>
        </div>
        {hasData && (
          <button
            onClick={shareImpact}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium active-press"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        )}
      </div>

      {/* 🌳 Virtual Forest */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-3xl border border-success/20 bg-gradient-to-br from-success/5 to-success/10"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <TreePine className="w-4 h-4 text-success" /> Your Forest
          </h3>
          <span className="font-mono text-xs text-success font-medium">
            {grownTrees} tree{grownTrees !== 1 ? "s" : ""} grown
          </span>
        </div>
        <div className="flex flex-wrap gap-1 justify-center min-h-[48px]">
          {Array.from({ length: totalTreeSlots }).map((_, i) => (
            <MiniTree key={i} index={i} grown={i < grownTrees} />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          {grownTrees < 30
            ? `Recycle ${(grownTrees + 1) * 5 - totalItems} more items to grow your next tree!`
            : "🎉 Maximum forest reached! You're a true eco champion!"}
        </p>
      </motion.div>

      {/* Real-world equivalencies */}
      {hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="p-5 rounded-3xl border border-border bg-card shadow-soft"
        >
          <h3 className="text-sm font-semibold mb-3">Real-World Equivalencies</h3>
          <div className="grid grid-cols-2 gap-2">
            {equivalencies.map((eq, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50">
                <span className="text-lg">{eq.emoji}</span>
                <span className="text-xs text-foreground leading-tight">{eq.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recycling rate ring */}
      {hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-3xl border border-border bg-card shadow-soft flex items-center gap-5"
        >
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
              <motion.circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke="hsl(var(--success))" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${97.4}`}
                initial={{ strokeDashoffset: 97.4 }}
                animate={{ strokeDashoffset: 97.4 - (97.4 * parseFloat(recyclingRate)) / 100 }}
                transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-lg font-bold text-success">{recyclingRate}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">Recycling Rate</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {recyclableCount} of {totalItems} items correctly recyclable
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              Average contamination rate is 25% — you're {parseFloat(recyclingRate) > 75 ? "beating" : "near"} the average!
            </p>
          </div>
        </motion.div>
      )}

      {/* AI Impact Report */}
      {hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden"
        >
          {!report && !reportLoading && (
            <button onClick={fetchReport} className="w-full p-6 flex items-center gap-4 active-press">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-foreground">Generate AI Impact Report</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get a personalized sustainability grade, insights & challenges
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          )}
          {reportLoading && (
            <div className="p-8 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your recycling data...</p>
            </div>
          )}
          {report && (
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-foreground">{report.headline}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{report.summary}</p>
                </div>
                <div className="ml-3 flex flex-col items-center">
                  <div className={`text-3xl font-black ${GRADE_COLORS[report.grade] || "text-foreground"}`}>
                    {report.grade}
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">Grade</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20">
                <Leaf className="w-4 h-4 text-success shrink-0" />
                <p className="text-xs text-foreground">{report.co2Equivalency}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-success uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Strengths
                  </p>
                  {report.strengths.map((s, i) => (
                    <p key={i} className="text-[11px] text-foreground leading-relaxed">✓ {s}</p>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-warning uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-3 h-3" /> Improve
                  </p>
                  {report.improvements.map((s, i) => (
                    <p key={i} className="text-[11px] text-foreground leading-relaxed">→ {s}</p>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono text-primary uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Fun Facts
                </p>
                {report.funStats.map((s, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">📊 {s}</p>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-[10px] font-mono text-warning uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Award className="w-3 h-3" /> Weekly Challenge
                </p>
                <p className="text-xs text-foreground">{report.challengeOfTheWeek}</p>
              </div>
              <p className="text-xs text-primary font-medium text-center">{report.nextMilestone}</p>
              <button
                onClick={fetchReport}
                disabled={reportLoading}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate report
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Monthly goal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.09 }}
        className="p-6 rounded-3xl border border-border bg-card shadow-soft"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Monthly Goal</span>
          <span className="font-mono text-xs text-muted-foreground">{totalItems} / {monthlyGoal} items</span>
        </div>
        <ProgressBar value={totalItems} max={monthlyGoal} />
        <p className="text-xs text-muted-foreground mt-2">
          {monthlyGoal - totalItems > 0
            ? `${monthlyGoal - totalItems} more items to reach your monthly goal`
            : "Monthly goal achieved! 🎉"}
        </p>
      </motion.div>

      {/* Stats grid (6 metrics) */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            className="p-4 rounded-2xl border border-border bg-card shadow-soft text-center"
          >
            <div className={`mx-auto mb-1.5 ${stat.color}`}>{stat.icon}</div>
            <p className={`font-mono text-lg font-semibold tracking-tighter ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* CO₂ Area Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="p-5 rounded-3xl border border-border bg-card shadow-soft"
      >
        <h3 className="text-sm font-semibold mb-1">CO₂ Savings Over Time</h3>
        <p className="text-xs text-muted-foreground mb-4">Cumulative CO₂ saved (last 14 days)</p>
        {hasData ? (
          <ChartContainer config={co2ChartConfig} className="aspect-[2/1] w-full">
            <AreaChart data={co2DailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit=" kg" />
              <Tooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="co2" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#co2Gradient)" />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
            Start scanning to see your CO₂ impact here
          </div>
        )}
      </motion.div>

      {/* Weekly Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="p-5 rounded-3xl border border-border bg-card shadow-soft"
      >
        <h3 className="text-sm font-semibold mb-1">Weekly Activity</h3>
        <p className="text-xs text-muted-foreground mb-4">Items recycled per day (last 7 days)</p>
        {hasData ? (
          <ChartContainer config={weeklyChartConfig} className="aspect-[2/1] w-full">
            <BarChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="items" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
            Start scanning to see weekly activity
          </div>
        )}
      </motion.div>

      {/* Material Breakdown Pie Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="p-5 rounded-3xl border border-border bg-card shadow-soft"
      >
        <h3 className="text-sm font-semibold mb-1">Material Breakdown</h3>
        <p className="text-xs text-muted-foreground mb-4">Items recycled by material type</p>
        {hasData && materialData.length > 0 ? (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={materialData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                  {materialData.map((_, idx) => (
                    <Cell key={idx} fill={MATERIAL_COLORS[idx % MATERIAL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} item${value !== 1 ? "s" : ""}`, name]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
              {materialData.map((entry, idx) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MATERIAL_COLORS[idx % MATERIAL_COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{entry.name}</span>
                  <span className="font-mono text-[10px] text-foreground font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
            Start scanning to see material breakdown
          </div>
        )}
      </motion.div>

      {/* SDG Alignment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="p-5 rounded-3xl border border-border bg-card shadow-soft"
      >
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">UN SDG Alignment</h3>
        </div>
        <div className="space-y-2.5">
          {SDG_TARGETS.map((sdg) => (
            <div key={sdg.sdg} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-secondary/40">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary mt-0.5">
                {sdg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-primary font-medium">{sdg.sdg}</span>
                  <span className="text-xs font-medium text-foreground">{sdg.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{sdg.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* How we calculate */}
      <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
        <p className="text-sm text-foreground/80 leading-relaxed">
          <strong>How we calculate:</strong> Each recycled item saves ~0.157 kg CO₂, 7.6 L water, 0.5 kWh energy,
          0.1 L oil, and contributes to 0.02 trees preserved annually. Equivalencies use EPA & UNEP conversion factors.
        </p>
      </div>
    </div>
  );
};

export default ImpactPage;
