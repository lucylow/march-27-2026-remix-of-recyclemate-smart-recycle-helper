import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="py-24 px-6 bg-secondary/50">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-label text-primary mb-4 block">Join the Movement</span>
          <h2 className="text-display-xl mb-6">
            Recycling Shouldn't<br />Require a Manual
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
            RecycleMate turns complex municipal rules into instant, actionable answers.
            Be part of the solution to the 2 billion ton waste crisis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate("/auth")} className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-medium text-base active-press shadow-soft">
              Get Started Free
            </button>
            <button onClick={() => navigate("/app")} className="px-8 py-4 bg-foreground text-background rounded-2xl font-medium text-base active-press">
              Try as Guest
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
