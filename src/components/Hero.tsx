import { motion } from "framer-motion";
import heroPhone from "@/assets/hero-phone.png";

const Hero = () => {
  return (
    <section className="relative overflow-hidden pt-8 pb-20 px-6">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between mb-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-sm">R</span>
          </div>
          <span className="font-semibold tracking-tight text-lg">RecycleMate</span>
        </div>
        <div className="hidden sm:flex items-center gap-8">
          <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#impact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Impact</a>
        </div>
        <button className="px-5 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium active-press">
          Get Early Access
        </button>
      </nav>

      {/* Hero Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
        >
          <span className="text-label text-primary mb-4 block">AI-Powered Waste Sorting</span>
          <h1 className="text-display-xl !text-[clamp(2.5rem,7vw,4rem)] mb-6">
            Stop Guessing.<br />
            Start Sorting.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-8">
            Point. Scan. Know exactly which bin. RecycleMate uses on-device computer vision
            and your local municipal rules to eliminate recycling confusion in under 3 seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-medium text-base active-press shadow-soft">
              Download the App
            </button>
            <button className="px-8 py-4 bg-secondary text-secondary-foreground rounded-2xl font-medium text-base active-press">
              Watch Demo
            </button>
          </div>

          <div className="flex items-center gap-8 mt-10">
            <div>
              <p className="font-mono text-2xl font-semibold tracking-tight">98.4%</p>
              <p className="text-label text-muted-foreground mt-1">Accuracy</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="font-mono text-2xl font-semibold tracking-tight">&lt;2s</p>
              <p className="text-label text-muted-foreground mt-1">Detection</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="font-mono text-2xl font-semibold tracking-tight">10+</p>
              <p className="text-label text-muted-foreground mt-1">Categories</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1], delay: 0.2 }}
          className="flex justify-center lg:justify-end"
        >
          <img
            src={heroPhone}
            alt="RecycleMate app scanning a plastic bottle with AI detection bounding box"
            className="w-[320px] lg:w-[400px] drop-shadow-2xl"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
