import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const stats = [
  { value: "2B+", label: "Tons of waste generated annually", source: "World Bank, 2018" },
  { value: "25%", label: "Average contamination rate in recycling", source: "EPA Data" },
  { value: "70%", label: "Of users admit to wishcycling", source: "RecycleMate Survey" },
  { value: "85%", label: "Unsure how to dispose certain items", source: "RecycleMate Survey" },
];

const SDG_GOALS = [
  { num: 4, name: "Quality Education", color: "hsl(0 68% 53%)", icon: "🎓", alignment: "AI-powered quizzes & micro-learning moments teach sustainable practices after every scan.", direct: true },
  { num: 6, name: "Clean Water", color: "hsl(38 92% 50%)", icon: "💧", alignment: "Every recycled item saves ~7.6L of water compared to virgin material production.", direct: true },
  { num: 11, name: "Sustainable Cities", color: "hsl(35 80% 60%)", icon: "🏙️", alignment: "Reduces urban waste contamination, supporting smarter municipal waste management.", direct: true },
  { num: 12, name: "Responsible Consumption", color: "hsl(33 75% 49%)", icon: "♻️", alignment: "Core mission: AI vision identifies materials and provides correct disposal instructions, reducing contamination by up to 30%.", direct: true, primary: true },
  { num: 13, name: "Climate Action", color: "hsl(52 70% 48%)", icon: "🌡️", alignment: "Each correctly recycled item avoids ~0.157kg CO₂. Reduced landfill waste means less methane emissions.", direct: true },
  { num: 14, name: "Life Below Water", color: "hsl(200 70% 50%)", icon: "🐠", alignment: "Preventing plastic from entering oceans — 8M tons of plastic enter oceans yearly. Better sorting = less marine pollution.", direct: false },
  { num: 15, name: "Life on Land", color: "hsl(120 45% 45%)", icon: "🌳", alignment: "Recycling paper saves trees — every ton recycled saves ~17 trees. Our virtual forest tracks this impact.", direct: true },
  { num: 17, name: "Partnerships", color: "hsl(19 56% 40%)", icon: "🤝", alignment: "Open platform designed for municipal partnerships, community engagement, and global expansion.", direct: false },
];

const Impact = () => {
  const [expandedSdg, setExpandedSdg] = useState<number | null>(null);

  return (
    <section id="impact" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-label text-muted-foreground">SDG 12 — Responsible Consumption</span>
          <h2 className="text-display-xl mt-3">The Problem Is<br />Measurable</h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="p-6 rounded-3xl border border-border bg-card text-center"
            >
              <p className="font-mono text-3xl lg:text-4xl font-semibold tracking-tighter text-primary">{stat.value}</p>
              <p className="text-sm text-foreground mt-3 leading-snug">{stat.label}</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-2 tracking-wider uppercase">{stat.source}</p>
            </motion.div>
          ))}
        </div>

        {/* SDG Alignment Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <div className="text-center mb-10">
            <span className="text-label text-muted-foreground">United Nations Sustainable Development Goals</span>
            <h2 className="text-display-xl mt-3">Aligned With<br />Global Goals</h2>
            <p className="text-muted-foreground mt-4 max-w-lg mx-auto leading-relaxed">
              RecycleMate directly addresses 6 UN SDGs and indirectly supports 2 more through AI-powered waste sorting, education, and community engagement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SDG_GOALS.map((sdg, i) => (
              <motion.div
                key={sdg.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 ${
                  sdg.primary ? "border-primary/30 ring-2 ring-primary/10" : "border-border"
                } bg-card hover:shadow-elevated`}
                onClick={() => setExpandedSdg(expandedSdg === sdg.num ? null : sdg.num)}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${sdg.color}20` }}
                    >
                      {sdg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-semibold" style={{ color: sdg.color }}>
                          SDG {sdg.num}
                        </span>
                        {sdg.direct && (
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-success/10 text-success uppercase">Direct</span>
                        )}
                        {!sdg.direct && (
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-muted text-muted-foreground uppercase">Indirect</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate">{sdg.name}</p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                        expandedSdg === sdg.num ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {expandedSdg === sdg.num && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-border">
                        <p className="text-xs text-muted-foreground leading-relaxed">{sdg.alignment}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* SDG 12 highlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 p-6 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">♻️</span>
              <div>
                <span className="font-mono text-xs text-primary font-semibold">PRIMARY ALIGNMENT</span>
                <h3 className="text-lg font-bold text-foreground">SDG 12.5 — Substantially reduce waste generation</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="p-3 rounded-xl bg-background/60 text-center">
                <p className="font-mono text-2xl font-bold text-primary">30%</p>
                <p className="text-[11px] text-muted-foreground mt-1">Contamination reduction potential</p>
              </div>
              <div className="p-3 rounded-xl bg-background/60 text-center">
                <p className="font-mono text-2xl font-bold text-success">12.8</p>
                <p className="text-[11px] text-muted-foreground mt-1">SDG Target: Awareness for sustainable lifestyles</p>
              </div>
              <div className="p-3 rounded-xl bg-background/60 text-center">
                <p className="font-mono text-2xl font-bold text-warning">5</p>
                <p className="text-[11px] text-muted-foreground mt-1">AI features aligned with SDG targets</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Result Card Demo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 p-8 rounded-3xl bg-foreground text-background shadow-elevated"
        >
          <div className="flex items-center justify-between mb-6">
            <span className="font-mono text-xs tracking-widest opacity-60 uppercase">
              Detected: PET 1 Plastic
            </span>
            <span className="font-mono text-xs tracking-widest opacity-60">
              Confidence: 98.4%
            </span>
          </div>
          <h3 className="text-3xl lg:text-4xl font-semibold tracking-tighter mb-4">
            Place in <span className="text-primary">Blue Bin</span>
          </h3>
          <p className="text-lg opacity-80 leading-relaxed max-w-lg mb-8">
            Rinse container, remove cap and label. Place in your curbside recycling bin. No bag required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="px-6 py-3.5 bg-background text-foreground rounded-2xl font-medium active-press">
              Confirm & Earn +10 pts
            </button>
            <button className="px-6 py-3.5 border border-background/20 rounded-2xl font-medium opacity-60 active-press">
              Find Drop-off Location
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Impact;
