import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Globe, TreePine, Leaf, Droplets, MapPin } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// Simulated community data
const COMMUNITY_STATS = {
  totalUsers: 2_847,
  totalItems: 156_432,
  co2Saved: 24_560,
  treesSaved: 3_129,
  waterSaved: 1_188_883,
};

const NEIGHBOURHOOD_DATA = [
  { name: "Downtown", items: 24_310, users: 412 },
  { name: "Westside", items: 18_920, users: 298 },
  { name: "Harbour", items: 15_440, users: 231 },
  { name: "Northgate", items: 12_870, users: 189 },
  { name: "Eastpark", items: 11_230, users: 167 },
  { name: "Southvale", items: 9_540, users: 142 },
];

const LEADERBOARD = [
  { rank: 1, name: "GreenMachine42", points: 4_820, avatar: "🌍" },
  { rank: 2, name: "EcoWarrior_X", points: 3_950, avatar: "🌳" },
  { rank: 3, name: "RecycleQueen", points: 3_410, avatar: "♻️" },
  { rank: 4, name: "PlanetFirst", points: 2_890, avatar: "🌿" },
  { rank: 5, name: "ZeroWasteZoe", points: 2_340, avatar: "🌱" },
];

const communityChartConfig: ChartConfig = {
  items: { label: "Items Recycled", color: "hsl(var(--primary))" },
};

const CommunityPage = () => {
  const { points, scanHistory } = useUser();
  const userItems = scanHistory.reduce((sum, r) => sum + r.items.length, 0);

  // Find user's rank position (simulated)
  const userRank = useMemo(() => {
    const idx = LEADERBOARD.findIndex((l) => points >= l.points);
    return idx === -1 ? LEADERBOARD.length + 1 : idx + 1;
  }, [points]);

  const heroStats = [
    { icon: <Users className="w-5 h-5" />, value: COMMUNITY_STATS.totalUsers.toLocaleString(), label: "Active Users", color: "text-primary" },
    { icon: <Globe className="w-5 h-5" />, value: COMMUNITY_STATS.totalItems.toLocaleString(), label: "Items Recycled", color: "text-success" },
    { icon: <Leaf className="w-5 h-5" />, value: `${(COMMUNITY_STATS.co2Saved / 1000).toFixed(1)}t`, label: "CO₂ Saved", color: "text-success" },
    { icon: <TreePine className="w-5 h-5" />, value: COMMUNITY_STATS.treesSaved.toLocaleString(), label: "Trees Saved", color: "text-primary" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-display mb-1">Community Impact</h1>
        <p className="text-sm text-muted-foreground">Together we make a difference</p>
      </div>

      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-primary text-primary-foreground"
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-semibold">This Month</span>
        </div>
        <p className="text-3xl font-bold tracking-tight mb-1">
          {COMMUNITY_STATS.totalItems.toLocaleString()}
        </p>
        <p className="text-primary-foreground/70 text-sm">items recycled by our community</p>
      </motion.div>

      {/* Community stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {heroStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-2xl border border-border bg-card shadow-soft text-center"
          >
            <div className={`mx-auto mb-1.5 ${stat.color}`}>{stat.icon}</div>
            <p className={`font-mono text-xl font-semibold tracking-tighter ${stat.color}`}>{stat.value}</p>
            <p className="text-label text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Neighbourhood chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-3xl border border-border bg-card shadow-soft"
      >
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">By Neighbourhood</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Items recycled this month</p>
        <ChartContainer config={communityChartConfig} className="aspect-[2/1] w-full">
          <BarChart data={NEIGHBOURHOOD_DATA} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="items" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-3xl border border-border bg-card shadow-soft overflow-hidden"
      >
        <div className="p-5 pb-3">
          <h3 className="text-sm font-semibold mb-0.5">City Leaderboard</h3>
          <p className="text-xs text-muted-foreground">Top recyclers this month</p>
        </div>
        <div className="divide-y divide-border">
          {LEADERBOARD.map((user, i) => (
            <motion.div
              key={user.rank}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              className="flex items-center gap-3 px-5 py-3"
            >
              <span className={`font-mono text-sm font-bold w-6 text-center ${
                user.rank === 1 ? "text-warning" : user.rank === 2 ? "text-muted-foreground" : user.rank === 3 ? "text-warning/60" : "text-muted-foreground/60"
              }`}>
                {user.rank <= 3 ? ["🥇", "🥈", "🥉"][user.rank - 1] : `#${user.rank}`}
              </span>
              <span className="text-lg">{user.avatar}</span>
              <span className="flex-1 text-sm font-medium truncate">{user.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{user.points.toLocaleString()} pts</span>
            </motion.div>
          ))}
          {/* User's position */}
          <div className="flex items-center gap-3 px-5 py-3 bg-primary/5">
            <span className="font-mono text-sm font-bold w-6 text-center text-primary">#{userRank}</span>
            <span className="text-lg">🌱</span>
            <span className="flex-1 text-sm font-medium text-primary">You</span>
            <span className="font-mono text-xs text-primary">{points.toLocaleString()} pts</span>
          </div>
        </div>
      </motion.div>

      {/* Your contribution */}
      <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
        <p className="text-sm text-foreground/80 leading-relaxed">
          <strong>Your contribution:</strong> You've recycled <strong>{userItems}</strong> items, making up{" "}
          <strong>{((userItems / COMMUNITY_STATS.totalItems) * 100).toFixed(3)}%</strong> of the city's total. Every item counts!
        </p>
      </div>
    </div>
  );
};

export default CommunityPage;
