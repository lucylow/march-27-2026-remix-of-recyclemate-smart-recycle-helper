import { motion } from "framer-motion";

const stats = [
  { value: "2B+", label: "Tons of waste generated annually", source: "World Bank, 2018" },
  { value: "25%", label: "Average contamination rate in recycling", source: "EPA Data" },
  { value: "70%", label: "Of users admit to wishcycling", source: "RecycleMate Survey" },
  { value: "85%", label: "Unsure how to dispose certain items", source: "RecycleMate Survey" },
];

const Impact = () => {
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
