import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, MapPin, Award, ChevronRight } from "lucide-react";

const brandSpring = { type: "spring" as const, stiffness: 500, damping: 30, mass: 1 };

const SLIDES = [
  {
    icon: <Scan className="w-12 h-12" />,
    title: "Scan Any Item",
    subtitle: "Point your camera at waste items — our on-device AI identifies them instantly.",
    accent: "text-primary",
  },
  {
    icon: <MapPin className="w-12 h-12" />,
    title: "Know Where to Dispose",
    subtitle: "Get localised recycling rules based on your GPS location. No more guessing.",
    accent: "text-success",
  },
  {
    icon: <Award className="w-12 h-12" />,
    title: "Earn Rewards",
    subtitle: "Collect points, unlock achievements, and build streaks for consistent sorting.",
    accent: "text-warning",
  },
];

interface OnboardingOverlayProps {
  onComplete: () => void;
}

const OnboardingOverlay = ({ onComplete }: OnboardingOverlayProps) => {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("recyclemate_onboarded", "true");
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("recyclemate_onboarded", "true");
    onComplete();
  };

  const slide = SLIDES[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-background flex flex-col"
    >
      {/* Skip button */}
      <div className="flex justify-end px-6 pt-6">
        <button onClick={handleSkip} className="text-sm text-muted-foreground active-press">
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={brandSpring}
            className="flex flex-col items-center text-center"
          >
            {/* Icon circle */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ ...brandSpring, delay: 0.1 }}
              className={`w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center mb-8 ${slide.accent}`}
            >
              {slide.icon}
            </motion.div>

            <h2 className="text-display mb-4">{slide.title}</h2>
            <p className="text-muted-foreground leading-relaxed max-w-[280px]">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-6 sm:px-8 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 24 : 8,
                backgroundColor: i === step ? "hsl(var(--primary))" : "hsl(var(--muted))",
              }}
              className="h-2 rounded-full"
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full py-4 bg-foreground text-background rounded-2xl font-medium active-press flex items-center justify-center gap-2"
        >
          {step < SLIDES.length - 1 ? (
            <>
              Next
              <ChevronRight className="w-4 h-4" />
            </>
          ) : (
            "Get Started"
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default OnboardingOverlay;
