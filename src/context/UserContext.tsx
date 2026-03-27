import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface UserContextType {
  points: number;
  streak: number;
  achievements: string[];
  scanHistory: ScanRecord[];
  displayName: string;
  loading: boolean;
  addPoints: (pts: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  addScanRecord: (record: ScanRecord) => void;
  saveScanToCloud: (items: DetectedItem[], pointsEarned: number) => Promise<void>;
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
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  // Load user data from DB when authenticated
  useEffect(() => {
    if (!user) {
      setPoints(0);
      setStreak(0);
      setAchievements([]);
      setScanHistory([]);
      setDisplayName("");
      setLoading(false);
      return;
    }

    const loadUserData = async () => {
      setLoading(true);
      try {
        // Load profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          setPoints(profile.points);
          setStreak(profile.streak);
          setDisplayName(profile.display_name || "");
        }

        // Load achievements
        const { data: achData } = await supabase
          .from("achievements")
          .select("achievement_key")
          .eq("user_id", user.id);

        if (achData) {
          setAchievements(achData.map((a: any) => a.achievement_key));
        }

        // Load scan history (last 50)
        const { data: scans } = await supabase
          .from("scan_history")
          .select("*")
          .eq("user_id", user.id)
          .order("scanned_at", { ascending: false })
          .limit(50);

        if (scans) {
          setScanHistory(
            scans.map((s: any) => ({
              id: s.id,
              timestamp: new Date(s.scanned_at),
              items: s.items as DetectedItem[],
              pointsEarned: s.points_earned,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load user data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const checkAchievements = useCallback(
    async (totalPoints: number) => {
      const newAchievements: string[] = [];
      Object.entries(ACHIEVEMENT_THRESHOLDS).forEach(([key, { threshold }]) => {
        if (totalPoints >= threshold && !achievements.includes(key)) {
          newAchievements.push(key);
        }
      });
      if (newAchievements.length > 0) {
        setAchievements((prev) => [...prev, ...newAchievements]);

        // Persist to DB
        if (user) {
          for (const key of newAchievements) {
            await supabase.from("achievements").insert({ user_id: user.id, achievement_key: key });
          }
        }
      }
    },
    [achievements, user]
  );

  const addPoints = useCallback(
    (pts: number) => {
      setPoints((prev) => {
        const newTotal = prev + pts;
        checkAchievements(newTotal);

        // Persist to DB
        if (user) {
          supabase.from("profiles").update({ points: newTotal, updated_at: new Date().toISOString() }).eq("id", user.id).then();
        }

        return newTotal;
      });
    },
    [checkAchievements, user]
  );

  const incrementStreak = useCallback(() => {
    setStreak((prev) => {
      const newStreak = prev + 1;
      if (user) {
        supabase
          .from("profiles")
          .update({ streak: newStreak, last_scan_date: new Date().toISOString().split("T")[0] })
          .eq("id", user.id)
          .then();
      }
      return newStreak;
    });
  }, [user]);

  const resetStreak = useCallback(() => {
    setStreak(0);
    if (user) {
      supabase.from("profiles").update({ streak: 0 }).eq("id", user.id).then();
    }
  }, [user]);

  const addScanRecord = useCallback((record: ScanRecord) => {
    setScanHistory((prev) => [record, ...prev]);
  }, []);

  const saveScanToCloud = useCallback(
    async (items: DetectedItem[], pointsEarned: number) => {
      if (!user) return;
      try {
        await supabase.from("scan_history").insert({
          user_id: user.id,
          items: items as any,
          points_earned: pointsEarned,
        });
      } catch (err) {
        console.error("Failed to save scan:", err);
      }
    },
    [user]
  );

  return (
    <UserContext.Provider
      value={{
        points,
        streak,
        achievements,
        scanHistory,
        displayName,
        loading,
        addPoints,
        incrementStreak,
        resetStreak,
        addScanRecord,
        saveScanToCloud,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
