/**
 * RecycleMate Gamification Engine
 * Handles XP, levels, streaks (with freeze), daily challenges, impact XP, and motivation.
 */

// ─── XP & Levels ────────────────────────────────────────────
export type ActionType =
  | "scan_item"
  | "correct_sort"
  | "streak_bonus"
  | "challenge_complete"
  | "quiz_correct"
  | "community_help"
  | "first_daily_scan";

const XP_TABLE: Record<ActionType, number> = {
  scan_item: 10,
  correct_sort: 20,
  streak_bonus: 50,
  challenge_complete: 75,
  quiz_correct: 15,
  community_help: 25,
  first_daily_scan: 30,
};

export function calculateXP(action: ActionType): number {
  return XP_TABLE[action] ?? 5;
}

export interface LevelInfo {
  level: number;
  title: string;
  xpForCurrent: number;
  xpForNext: number;
  progressPct: number;
  emoji: string;
}

const LEVEL_TITLES: { minLevel: number; title: string; emoji: string }[] = [
  { minLevel: 0, title: "Seedling", emoji: "🌱" },
  { minLevel: 3, title: "Sprout", emoji: "🌿" },
  { minLevel: 6, title: "Sapling", emoji: "🌳" },
  { minLevel: 10, title: "Eco Warrior", emoji: "⚔️" },
  { minLevel: 15, title: "Planet Protector", emoji: "🛡️" },
  { minLevel: 20, title: "Forest Guardian", emoji: "🏔️" },
  { minLevel: 30, title: "Earth Champion", emoji: "🌍" },
  { minLevel: 50, title: "Legend", emoji: "👑" },
];

export function getLevel(points: number): LevelInfo {
  const level = Math.floor(points / 100);
  const xpForCurrent = level * 100;
  const xpForNext = (level + 1) * 100;
  const progressPct = ((points - xpForCurrent) / 100) * 100;

  const tier = [...LEVEL_TITLES].reverse().find((t) => level >= t.minLevel) ?? LEVEL_TITLES[0];

  return {
    level,
    title: tier.title,
    xpForCurrent,
    xpForNext,
    progressPct: Math.min(progressPct, 100),
    emoji: tier.emoji,
  };
}

// ─── Streak System ──────────────────────────────────────────
export type StreakAction = "no_change" | "increment" | "reset" | "freeze_used";

const STREAK_STORAGE_KEY = "recyclemate_streak_freezes";

export function getStreakFreezes(): number {
  try {
    return parseInt(localStorage.getItem(STREAK_STORAGE_KEY) || "2", 10);
  } catch {
    return 2;
  }
}

export function setStreakFreezes(count: number) {
  localStorage.setItem(STREAK_STORAGE_KEY, String(Math.max(0, count)));
}

export function updateStreak(lastActiveDate: string | null): StreakAction {
  if (!lastActiveDate) return "increment";
  const today = new Date().toDateString();
  const last = new Date(lastActiveDate).toDateString();

  if (last === today) return "no_change";

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (last === yesterday) return "increment";

  // Missed a day — try freeze
  const freezes = getStreakFreezes();
  if (freezes > 0) {
    setStreakFreezes(freezes - 1);
    return "freeze_used";
  }

  return "reset";
}

export function resetWeeklyFreezes() {
  setStreakFreezes(2);
}

// ─── Badges ─────────────────────────────────────────────────
export interface Badge {
  id: string;
  label: string;
  description: string;
  emoji: string;
  requirement: string;
  checkUnlocked: (stats: UserGamificationStats) => boolean;
}

export interface UserGamificationStats {
  points: number;
  streak: number;
  totalScans: number;
  totalItems: number;
  uniqueMaterials: number;
  challengesCompleted: number;
}

export const BADGES: Badge[] = [
  {
    id: "first_scan",
    label: "First Step",
    emoji: "🎯",
    description: "Complete your first scan",
    requirement: "1 scan",
    checkUnlocked: (s) => s.totalScans >= 1,
  },
  {
    id: "10_items",
    label: "Recycler Rookie",
    emoji: "♻️",
    description: "Recycle 10 items",
    requirement: "10 items",
    checkUnlocked: (s) => s.totalItems >= 10,
  },
  {
    id: "50_items",
    label: "Eco Starter",
    emoji: "🌱",
    description: "Recycle 50 items",
    requirement: "50 items",
    checkUnlocked: (s) => s.totalItems >= 50,
  },
  {
    id: "100_items",
    label: "Eco Warrior",
    emoji: "🌍",
    description: "Recycle 100 items",
    requirement: "100 items",
    checkUnlocked: (s) => s.totalItems >= 100,
  },
  {
    id: "7_day_streak",
    label: "Consistency King",
    emoji: "🔥",
    description: "Maintain a 7-day streak",
    requirement: "7-day streak",
    checkUnlocked: (s) => s.streak >= 7,
  },
  {
    id: "30_day_streak",
    label: "Unstoppable",
    emoji: "💎",
    description: "Maintain a 30-day streak",
    requirement: "30-day streak",
    checkUnlocked: (s) => s.streak >= 30,
  },
  {
    id: "5_materials",
    label: "Material Explorer",
    emoji: "🔬",
    description: "Recycle 5 different materials",
    requirement: "5 materials",
    checkUnlocked: (s) => s.uniqueMaterials >= 5,
  },
  {
    id: "level_10",
    label: "Double Digits",
    emoji: "🏅",
    description: "Reach Level 10",
    requirement: "Level 10",
    checkUnlocked: (s) => s.points >= 1000,
  },
  {
    id: "3_challenges",
    label: "Challenge Chaser",
    emoji: "🏆",
    description: "Complete 3 challenges",
    requirement: "3 challenges",
    checkUnlocked: (s) => s.challengesCompleted >= 3,
  },
  {
    id: "500_points",
    label: "Sorting Master",
    emoji: "👑",
    description: "Earn 500 points",
    requirement: "500 points",
    checkUnlocked: (s) => s.points >= 500,
  },
];

export function checkNewBadges(
  stats: UserGamificationStats,
  existingBadges: string[]
): string[] {
  return BADGES
    .filter((b) => !existingBadges.includes(b.id) && b.checkUnlocked(stats))
    .map((b) => b.id);
}

// ─── Daily Challenges ───────────────────────────────────────
export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  emoji: string;
  type: "scans" | "items" | "streak";
}

const CHALLENGE_POOL: Omit<DailyChallenge, "id">[] = [
  { title: "Quick Scanner", description: "Complete 2 scans today", target: 2, reward: 30, emoji: "⚡", type: "scans" },
  { title: "Recycle Rush", description: "Recycle 5 items today", target: 5, reward: 40, emoji: "🏃", type: "items" },
  { title: "Triple Threat", description: "Complete 3 scans today", target: 3, reward: 45, emoji: "🎯", type: "scans" },
  { title: "Item Hunter", description: "Find and recycle 8 items", target: 8, reward: 60, emoji: "🔍", type: "items" },
  { title: "Streak Keeper", description: "Keep your streak alive!", target: 1, reward: 25, emoji: "🔥", type: "streak" },
  { title: "Eco Burst", description: "Recycle 3 items in one scan", target: 3, reward: 35, emoji: "💥", type: "items" },
];

export function getDailyChallenge(): DailyChallenge {
  // Deterministic daily pick based on date
  const dayIndex = Math.floor(Date.now() / 86400000) % CHALLENGE_POOL.length;
  const challenge = CHALLENGE_POOL[dayIndex];
  return { ...challenge, id: `daily_${dayIndex}` };
}

// ─── Impact XP ──────────────────────────────────────────────
const CO2_PER_ITEM_KG = 0.157;

export function calculateImpactXP(itemCount: number): number {
  const co2Saved = itemCount * CO2_PER_ITEM_KG;
  return Math.round(co2Saved * 10);
}

export function getImpactEquivalencies(itemCount: number) {
  const co2 = itemCount * CO2_PER_ITEM_KG;
  return {
    co2Kg: parseFloat(co2.toFixed(2)),
    treesEquiv: parseFloat((co2 / 21.77).toFixed(2)), // avg tree absorbs 21.77kg/year
    showers: Math.round((itemCount * 7.6) / 65), // 65L per shower
    phoneCharges: Math.round((itemCount * 0.5) / 0.012), // 0.012 kWh per charge
  };
}

// ─── Streak Multiplier ──────────────────────────────────────
export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 3.0;
  if (streak >= 14) return 2.0;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

// ─── AI Motivation (prompt helper) ──────────────────────────
export function buildMotivationContext(stats: UserGamificationStats): string {
  const level = getLevel(stats.points);
  const multiplier = getStreakMultiplier(stats.streak);
  return `User is Level ${level.level} "${level.title}" ${level.emoji} with ${stats.points} XP, ${stats.streak}-day streak (${multiplier}x multiplier), ${stats.totalScans} scans, ${stats.totalItems} items recycled. Encourage them in 1-2 sentences. Be warm and specific.`;
}
