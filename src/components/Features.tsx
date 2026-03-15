import { motion } from "framer-motion";
import { Cpu, Wifi, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Cpu,
    title: "On-Device AI",
    description: "MobileNetV2 SSD runs directly on your phone. No cloud processing, no latency, complete privacy.",
    stat: "MobileNetV2 SSD",
  },
  {
    icon: Wifi,
    title: "Works Offline",
    description: "Core detection works without internet. Location rules sync when you reconnect.",
    stat: "Zero Connectivity",
  },
  {
    icon: Shield,
    title: "Location-Aware",
    description: "GPS-based municipal rule matching. What's recyclable in Brooklyn may be landfill in Queens.",
    stat: "PostGIS Spatial",
  },
  {
    icon: Zap,
    title: "Gamified Sorting",
    description: "Points, streaks, and achievements. Turn correct disposal into a daily habit.",
    stat: "+10 PTS / Scan",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 px-6 bg-secondary/50">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-label text-muted-foreground">Technical Capabilities</span>
          <h2 className="text-display-xl mt-3">A Sorting OS,<br />Not a Brochure</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="p-8 rounded-3xl bg-card border border-border shadow-soft group hover:shadow-elevated transition-shadow duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="font-mono text-xs text-muted-foreground tracking-wider">{feature.stat}</span>
              </div>
              <h3 className="text-xl font-semibold tracking-tight mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
