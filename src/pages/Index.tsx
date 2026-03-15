import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Impact from "@/components/Impact";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero />
      <div id="how">
        <HowItWorks />
      </div>
      <Features />
      <Impact />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
