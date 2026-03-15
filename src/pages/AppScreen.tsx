import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Scan, User } from "lucide-react";
import ScannerView from "@/components/ScannerView";
import ResultsView from "@/components/ResultsView";
import ProfileView from "@/components/ProfileView";
import type { DetectedItem } from "@/context/UserContext";

type AppView = "scanner" | "results" | "profile";

const AppScreen = () => {
  const [view, setView] = useState<AppView>("scanner");
  const [detections, setDetections] = useState<DetectedItem[]>([]);

  const handleDetection = (items: DetectedItem[]) => {
    setDetections(items);
    setView("results");
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background max-w-md mx-auto relative overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-xs">R</span>
          </div>
          <span className="font-semibold tracking-tight">RecycleMate</span>
        </div>
        <span className="text-label text-muted-foreground">
          {view === "scanner" ? "Scanner" : view === "results" ? "Results" : "Profile"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 pb-20 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === "scanner" && (
            <ScannerView key="scanner" onDetection={handleDetection} />
          )}
          {view === "results" && (
            <ResultsView
              key="results"
              detections={detections}
              onBack={() => setView("scanner")}
            />
          )}
          {view === "profile" && (
            <ProfileView key="profile" onBack={() => setView("scanner")} />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom tab bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-3 flex items-center justify-around">
        <button
          onClick={() => setView("scanner")}
          className={`flex flex-col items-center gap-1 active-press ${view === "scanner" ? "text-primary" : "text-muted-foreground"}`}
        >
          <Scan className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-wider uppercase">Scan</span>
        </button>
        <button
          onClick={() => setView("profile")}
          className={`flex flex-col items-center gap-1 active-press ${view === "profile" ? "text-primary" : "text-muted-foreground"}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-wider uppercase">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default AppScreen;
