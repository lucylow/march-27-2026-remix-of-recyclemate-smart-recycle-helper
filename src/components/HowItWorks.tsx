import { motion } from "framer-motion";
import { Scan, MapPin, Recycle } from "lucide-react";

const steps = [
  {
    icon: Scan,
    label: "STEP 01",
    title: "Scan Any Item",
    description: "Point your camera at any waste item. Our MobileNetV2 model detects and classifies it in under 2 seconds.",
  },
  {
    icon: MapPin,
    label: "STEP 02",
    title: "Get Local Rules",
    description: "GPS-based location matching delivers your municipality's exact disposal instructions. No guesswork.",
  },
  {
    icon: Recycle,
    label: "STEP 03",
    title: "Sort Correctly",
    description: "Follow clear, color-coded bin assignments. Earn points and build streaks for consistent sorting.",
  },
];

const transition = { type: "spring" as const, stiffness: 500, damping: 30, mass: 1 };

const HowItWorks = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-label text-muted-foreground">How It Works</span>
          <h2 className="text-display-xl mt-3">
            Scan. Learn. Act.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...transition, delay: index * 0.1 }}
              className="relative p-8 rounded-3xl border border-border bg-card shadow-soft"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-label text-muted-foreground">{step.label}</span>
              <h3 className="text-xl font-semibold tracking-tight mt-2 mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
