import { useMemo } from "react";
import { motion } from "framer-motion";
import { Leaf, Droplets, TreePine, Recycle } from "lucide-react";
import { useUser } from "@/context/UserContext";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const CO2_PER_ITEM = 0.157;
const WATER_PER_ITEM = 7.6;
const TREES_PER_ITEM = 0.02;

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

const co2ChartConfig: ChartConfig = {
  co2: { label: "CO₂ Saved (kg)", color: "hsl(var(--success))" },
};

const weeklyChartConfig: ChartConfig = {
  items: { label: "Items Recycled", color: "hsl(var(--primary))" },
  water: { label: "Water Saved (L)", color: "hsl(142 71% 45%)" },
};

const ImpactPage = () => {
  const { scanHistory } = useUser();
  const totalItems = scanHistory.reduce((sum, r) => sum + r.items.length, 0);

  const co2Saved = (totalItems * CO2_PER_ITEM).toFixed(1);
  const waterSaved = Math.round(totalItems * WATER_PER_ITEM);
  const treesEquiv = (totalItems * TREES_PER_ITEM).toFixed(2);
  const monthlyGoal = 200;

  // Build daily CO₂ chart data from scan history (last 14 days)
  const co2DailyData = useMemo(() => {
    const now = new Date();
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    scanHistory.forEach((r) => {
      const key = new Date(r.timestamp).toISOString().slice(0, 10);
      if (key in days) {
        days[key] += r.items.length * CO2_PER_ITEM;
      }
    });
    // cumulative
    let cumulative = 0;
    return Object.entries(days).map(([date, val]) => {
      cumulative += val;
      return {
        date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
        co2: +cumulative.toFixed(2),
      };
    });
  }, [scanHistory]);

  // Build weekly bar chart data (last 7 days)
  const weeklyData = useMemo(() => {
    const now = new Date();
    const days: Record<string, { items: number; water: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
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
      items: val.items,
      water: +val.water.toFixed(1),
    }));
  }, [scanHistory]);

  // Material breakdown for pie chart
  const MATERIAL_COLORS = [
    "hsl(var(--primary))", "hsl(var(--success))", "hsl(32 95% 44%)",
    "hsl(var(--destructive))", "hsl(270 60% 55%)", "hsl(190 80% 42%)",
  ];

  const LABEL_NAMES: Record<string, string> = {
    plastic_bottle: "Plastic",
    aluminum_can: "Aluminum",
    cardboard: "Cardboard",
    glass_bottle: "Glass",
    newspaper: "Paper",
    styrofoam: "Styrofoam",
    battery: "Battery",
    food_waste: "Organic",
    electronic_waste: "E-Waste",
  };

  const materialData = useMemo(() => {
    const counts: Record<string, number> = {};
    scanHistory.forEach((r) => {
      r.items.forEach((item) => {
        const name = LABEL_NAMES[item.label] || item.displayName;
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [scanHistory]);

  const stats = [
    { icon: <Recycle className="w-5 h-5" />, value: totalItems, label: "Items Recycled", color: "text-primary" },
    { icon: <Leaf className="w-5 h-5" />, value: `${co2Saved} kg`, label: "CO₂ Saved", color: "text-success" },
    { icon: <Droplets className="w-5 h-5" />, value: `${waterSaved} L`, label: "Water Saved", color: "text-primary" },
    { icon: <TreePine className="w-5 h-5" />, value: treesEquiv, label: "Trees Equivalent", color: "text-success" },
  ];

  const hasData = scanHistory.length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-display mb-1">Your Impact</h1>
        <p className="text-sm text-muted-foreground">Environmental contribution tracker</p>
      </div>

      {/* Monthly goal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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

      {/* CO₂ Area Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
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
              <Area
                type="monotone"
                dataKey="co2"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#co2Gradient)"
              />
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
        transition={{ delay: 0.1 }}
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
        transition={{ delay: 0.15 }}
        className="p-5 rounded-3xl border border-border bg-card shadow-soft"
      >
        <h3 className="text-sm font-semibold mb-1">Material Breakdown</h3>
        <p className="text-xs text-muted-foreground mb-4">Items recycled by material type</p>
        {hasData && materialData.length > 0 ? (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={materialData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {materialData.map((_, idx) => (
                    <Cell key={idx} fill={MATERIAL_COLORS[idx % MATERIAL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} item${value !== 1 ? "s" : ""}`, name]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
              {materialData.map((entry, idx) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: MATERIAL_COLORS[idx % MATERIAL_COLORS.length] }}
                  />
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

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="p-5 rounded-2xl border border-border bg-card shadow-soft text-center"
          >
            <div className={`mx-auto mb-2 ${stat.color}`}>{stat.icon}</div>
            <p className={`font-mono text-2xl font-semibold tracking-tighter ${stat.color}`}>{stat.value}</p>
            <p className="text-label text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Info card */}
      <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
        <p className="text-sm text-foreground/80 leading-relaxed">
          <strong>How we calculate:</strong> Each correctly recycled item saves approximately 0.157 kg of CO₂,
          7.6 litres of water, and contributes to the equivalent of 0.02 trees preserved annually.
        </p>
      </div>
    </div>
  );
};

export default ImpactPage;
