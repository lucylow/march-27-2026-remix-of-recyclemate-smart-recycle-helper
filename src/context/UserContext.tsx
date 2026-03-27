import React, { createContext, useContext, useState, useCallback } from "react";

interface UserContextType {
  points: number;
  streak: number;
  achievements: string[];
  scanHistory: ScanRecord[];
  addPoints: (pts: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  addScanRecord: (record: ScanRecord) => void;
}

export interface ScanRecord {
  id: string;
  timestamp: Date;
  items: DetectedItem[];
  pointsEarned: number;
}

export interface DetectedItem {
  label: string;
  displayName: string;
  confidence: number;
  bbox: [number, number, number, number];
  recyclable?: boolean;
  category?: string;
  materialDetail?: string;
  co2SavedGrams?: number;
  decompositionYears?: number;
  funFact?: string;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};

const ACHIEVEMENT_THRESHOLDS: Record<string, { name: string; threshold: number }> = {
  first_scan: { name: "First Scan", threshold: 1 },
  eco_starter: { name: "Eco Starter", threshold: 50 },
  planet_protector: { name: "Planet Protector", threshold: 100 },
  sorting_master: { name: "Sorting Master", threshold: 500 },
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);

  const checkAchievements = useCallback((totalPoints: number) => {
    try {
      const newAchievements: string[] = [];
      Object.entries(ACHIEVEMENT_THRESHOLDS).forEach(([key, { threshold }]) => {
        if (totalPoints >= threshold && !achievements.includes(key)) {
          newAchievements.push(key);
        }
      });
      if (newAchievements.length > 0) {
        setAchievements(prev => [...prev, ...newAchievements]);
      }
    } catch (e) {
      console.error("Achievement check failed:", e);
    }
  }, [achievements]);

  const addPoints = useCallback((pts: number) => {
    setPoints(prev => {
      const newTotal = prev + pts;
      checkAchievements(newTotal);
      return newTotal;
    });
  }, [checkAchievements]);

  const incrementStreak = useCallback(() => setStreak(prev => prev + 1), []);
  const resetStreak = useCallback(() => setStreak(0), []);

  const addScanRecord = useCallback((record: ScanRecord) => {
    setScanHistory(prev => [record, ...prev]);
  }, []);

  return (
    <UserContext.Provider value={{ points, streak, achievements, scanHistory, addPoints, incrementStreak, resetStreak, addScanRecord }}>
      {children}
    </UserContext.Provider>
  );
};
