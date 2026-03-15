import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Scan, User, Menu, X, Clock, Leaf, Settings, HelpCircle, Info,
  Star, Flame, Brain, Users, Target,
} from "lucide-react";
import ScannerView from "@/components/ScannerView";
import ResultsView from "@/components/ResultsView";
import ProfileView from "@/components/ProfileView";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import ErrorBoundary from "@/components/ErrorBoundary";
import HistoryPage from "@/components/app-pages/HistoryPage";
import ImpactPage from "@/components/app-pages/ImpactPage";
import SettingsPage from "@/components/app-pages/SettingsPage";
import HelpPage from "@/components/app-pages/HelpPage";
import AboutPage from "@/components/app-pages/AboutPage";
import QuizPage from "@/components/app-pages/QuizPage";
import CommunityPage from "@/components/app-pages/CommunityPage";
import ChallengesPage from "@/components/app-pages/ChallengesPage";
import type { DetectedItem } from "@/context/UserContext";
import { useUser } from "@/context/UserContext";

type AppView = "scanner" | "results" | "profile" | "history" | "impact" | "settings" | "help" | "about" | "quiz" | "community" | "challenges";

const NAV_ITEMS: { id: AppView; icon: React.ElementType; label: string; group: "main" | "engage" | "more" }[] = [
  { id: "scanner", icon: Scan, label: "Scanner", group: "main" },
  { id: "profile", icon: User, label: "Profile", group: "main" },
  { id: "challenges", icon: Target, label: "Challenges", group: "engage" },
  { id: "quiz", icon: Brain, label: "Quiz", group: "engage" },
  { id: "community", icon: Users, label: "Community", group: "engage" },
  { id: "history", icon: Clock, label: "History", group: "more" },
  { id: "impact", icon: Leaf, label: "Impact", group: "more" },
  { id: "settings", icon: Settings, label: "Settings", group: "more" },
  { id: "help", icon: HelpCircle, label: "Help & FAQ", group: "more" },
  { id: "about", icon: Info, label: "About", group: "more" },
];

const AppScreen = () => {
  const [view, setView] = useState<AppView>("scanner");
  const [detections, setDetections] = useState<DetectedItem[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [seenAchievements, setSeenAchievements] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("recyclemate_seen_achievements") || "[]");
    } catch { return []; }
  });
  const { points, streak, achievements } = useUser();

  const unseenCount = achievements.filter(a => !seenAchievements.includes(a)).length;

  const handleOpenDrawer = () => {
    setDrawerOpen(true);
    if (unseenCount > 0) {
      const updated = [...new Set([...seenAchievements, ...achievements])];
      setSeenAchievements(updated);
      localStorage.setItem("recyclemate_seen_achievements", JSON.stringify(updated));
    }
  };

  useEffect(() => {
    const onboarded = localStorage.getItem("recyclemate_onboarded");
    if (!onboarded) setShowOnboarding(true);
  }, []);

  const handleDetection = (items: DetectedItem[]) => {
    setDetections(items);
    setView("results");
  };

  const navigateTo = (target: AppView) => {
    setView(target);
    setDrawerOpen(false);
  };

  const mainItems = NAV_ITEMS.filter((n) => n.group === "main");
  const engageItems = NAV_ITEMS.filter((n) => n.group === "engage");
  const moreItems = NAV_ITEMS.filter((n) => n.group === "more");

  return (
    <div className="h-[100dvh] flex flex-col bg-background max-w-md mx-auto relative overflow-hidden">
      {/* Onboarding */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingOverlay onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>

      {/* Drawer overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 z-40 bg-foreground/30"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="absolute left-0 top-0 bottom-0 z-50 w-72 bg-background border-r border-border flex flex-col shadow-elevated"
            >
              {/* Drawer header */}
              <div className="p-6 bg-primary rounded-br-3xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">R</span>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center active-press">
                    <X className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>
                <p className="text-primary-foreground font-semibold">Eco Warrior</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-primary-foreground/70" />
                    <span className="text-primary-foreground/80 text-xs font-mono">{points} pts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-primary-foreground/70" />
                    <span className="text-primary-foreground/80 text-xs font-mono">{streak} days</span>
                  </div>
                </div>
              </div>

              {/* Nav items */}
              <div className="flex-1 overflow-y-auto py-4 px-3">
                <p className="text-label text-muted-foreground px-3 mb-2">Main</p>
                {mainItems.map((item) => {
                  const active = view === item.id || (view === "results" && item.id === "scanner");
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 active-press transition-colors ${
                        active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}

                <div className="my-3 h-px bg-border" />

                <p className="text-label text-muted-foreground px-3 mb-2">Engage</p>
                {engageItems.map((item) => {
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 active-press transition-colors ${
                        active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}

                <div className="my-3 h-px bg-border" />

                <p className="text-label text-muted-foreground px-3 mb-2">More</p>
                {moreItems.map((item) => {
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 active-press transition-colors ${
                        active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Drawer footer */}
              <div className="p-4 border-t border-border">
                <p className="font-mono text-[10px] text-muted-foreground text-center tracking-wider">
                  RECYCLEMATE V1.0 · SDG 12
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={handleOpenDrawer}
          className="relative w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active-press"
        >
          <Menu className="w-5 h-5 text-foreground" />
          {unseenCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {unseenCount}
            </motion.span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-[10px]">R</span>
          </div>
          <span className="font-semibold tracking-tight text-sm">RecycleMate</span>
        </div>
        <span className="text-label text-muted-foreground w-10 text-right text-[10px]">
          {view === "scanner" ? "SCAN" : view === "results" ? "RESULT" : view.toUpperCase().slice(0, 6)}
        </span>
      </div>

      {/* Content */}
      <ErrorBoundary fallbackMessage="This section encountered an error. Try navigating back or refreshing.">
        <div className="flex-1 flex flex-col px-4 pb-20 overflow-hidden">
          <AnimatePresence mode="wait">
            {view === "scanner" && <ScannerView key="scanner" onDetection={handleDetection} />}
            {view === "results" && (
              <ResultsView key="results" detections={detections} onBack={() => setView("scanner")} />
            )}
            {view === "profile" && <ProfileView key="profile" onBack={() => setView("scanner")} />}
            {view === "history" && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden -mx-6 -mt-2">
                <HistoryPage />
              </motion.div>
            )}
            {view === "impact" && (
              <motion.div key="impact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden -mx-6 -mt-2">
                <ImpactPage />
              </motion.div>
            )}
            {view === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden -mx-6 -mt-2">
                <SettingsPage />
              </motion.div>
            )}
            {view === "help" && (
              <motion.div key="help" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden -mx-6 -mt-2">
                <HelpPage />
              </motion.div>
            )}
            {view === "about" && (
              <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden -mx-6 -mt-2">
                <AboutPage />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ErrorBoundary>

      {/* Bottom tab bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-6 py-3 flex items-center justify-around">
        {[
          { id: "scanner" as const, icon: Scan, label: "Scan" },
          { id: "profile" as const, icon: User, label: "Profile" },
        ].map((tab) => {
          const active = view === tab.id || (view === "results" && tab.id === "scanner");
          return (
            <button
              key={tab.id}
              onClick={() => navigateTo(tab.id)}
              className={`flex flex-col items-center gap-1 active-press relative ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wider uppercase">{tab.label}</span>
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -bottom-3 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AppScreen;
