// Coin Economy / Shop / Titles / Power-Ups / Mystery Boxes
// Pure data + types. All persistence handled via useLocalStorage in useEconomy.

export type TaskDifficulty = 'easy' | 'medium' | 'hard';

export const TASK_COIN_REWARDS: Record<TaskDifficulty, number> = {
  easy: 20,
  medium: 50,
  hard: 100,
};

export interface Wallet {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

export const EMPTY_WALLET: Wallet = { balance: 0, totalEarned: 0, totalSpent: 0 };

export type TxnType = 'earn' | 'spend';

export interface Transaction {
  id: string;
  type: TxnType;
  source: string;
  amount: number;
  timestamp: string;
}

// ============ RANKS (auto from streak, never decrease) ============
export interface RankDef {
  id: string;
  name: string;
  minStreak: number;
  icon: string;
  color: string;
}

export const RANKS: RankDef[] = [
  { id: 'beginner', name: 'Beginner', minStreak: 0, icon: '🌱', color: 'text-slate-400' },
  { id: 'learner', name: 'Learner', minStreak: 7, icon: '📘', color: 'text-emerald-500' },
  { id: 'scholar', name: 'Scholar', minStreak: 15, icon: '🎓', color: 'text-sky-500' },
  { id: 'elite-scholar', name: 'Elite Scholar', minStreak: 30, icon: '🏅', color: 'text-indigo-500' },
  { id: 'academic-master', name: 'Academic Master', minStreak: 60, icon: '🏆', color: 'text-amber-500' },
  { id: 'grandmaster', name: 'Grandmaster', minStreak: 100, icon: '👑', color: 'text-rose-500' },
  { id: 'legend', name: 'Legend', minStreak: 180, icon: '🔥', color: 'text-orange-500' },
];

export function rankForStreak(streak: number): RankDef {
  let cur = RANKS[0];
  for (const r of RANKS) if (streak >= r.minStreak) cur = r;
  return cur;
}

export function rankById(id: string): RankDef {
  return RANKS.find((r) => r.id === id) || RANKS[0];
}

export function rankIndex(id: string): number {
  const i = RANKS.findIndex((r) => r.id === id);
  return i < 0 ? 0 : i;
}

// ============ TITLES ============
export interface TitleDef {
  id: string;
  name: string;
  cost: number;
  requiredRankId: string;
  emoji: string;
  description: string;
}

export const TITLES: TitleDef[] = [
  { id: 'topper', name: 'The Topper', cost: 5000, requiredRankId: 'scholar', emoji: '🥇', description: 'Show your top performance.' },
  { id: 'grind-king', name: 'Grind King', cost: 15000, requiredRankId: 'elite-scholar', emoji: '⚔️', description: 'For those who never stop.' },
  { id: 'master-scholar', name: 'Master Scholar', cost: 40000, requiredRankId: 'academic-master', emoji: '📚', description: 'Mastery achieved.' },
  { id: 'focus-titan', name: 'Focus Titan', cost: 100000, requiredRankId: 'grandmaster', emoji: '🧠', description: 'Unbreakable focus.' },
  { id: 'studyflow-legend', name: 'StudyFlow Legend', cost: 250000, requiredRankId: 'legend', emoji: '🌟', description: 'A legend among scholars.' },
];

export function titleById(id: string): TitleDef | undefined {
  return TITLES.find((t) => t.id === id);
}

// ============ MYSTERY BOXES ============
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const RARITY_STYLE: Record<Rarity, { label: string; color: string; ring: string }> = {
  common: { label: 'Common', color: 'text-slate-500', ring: 'ring-slate-400' },
  rare: { label: 'Rare', color: 'text-sky-500', ring: 'ring-sky-400' },
  epic: { label: 'Epic', color: 'text-violet-500', ring: 'ring-violet-400' },
  legendary: { label: 'Legendary', color: 'text-amber-500', ring: 'ring-amber-400' },
  mythic: { label: 'Mythic', color: 'text-rose-500', ring: 'ring-rose-400' },
};

export interface BoxDef {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  // weight per rarity (must sum to 100)
  weights: Record<Rarity, number>;
  // coin reward range per rarity
  coinRange: Record<Rarity, [number, number]>;
}

export const BOXES: BoxDef[] = [
  {
    id: 'bronze', name: 'Bronze Crate', cost: 500, emoji: '🥉',
    weights: { common: 70, rare: 25, epic: 4, legendary: 1, mythic: 0 },
    coinRange: { common: [50, 200], rare: [200, 500], epic: [500, 1000], legendary: [1000, 2500], mythic: [2500, 5000] },
  },
  {
    id: 'silver', name: 'Silver Crate', cost: 2000, emoji: '🥈',
    weights: { common: 50, rare: 35, epic: 12, legendary: 3, mythic: 0 },
    coinRange: { common: [300, 800], rare: [800, 1800], epic: [1800, 3500], legendary: [3500, 7000], mythic: [7000, 12000] },
  },
  {
    id: 'gold', name: 'Gold Crate', cost: 5000, emoji: '🥇',
    weights: { common: 35, rare: 40, epic: 18, legendary: 6, mythic: 1 },
    coinRange: { common: [800, 2000], rare: [2000, 4000], epic: [4000, 8000], legendary: [8000, 15000], mythic: [15000, 25000] },
  },
  {
    id: 'mythic', name: 'Mythic Crate', cost: 15000, emoji: '💎',
    weights: { common: 20, rare: 35, epic: 28, legendary: 13, mythic: 4 },
    coinRange: { common: [2500, 6000], rare: [6000, 12000], epic: [12000, 22000], legendary: [22000, 40000], mythic: [40000, 70000] },
  },
  {
    id: 'divine', name: 'Divine Crate', cost: 50000, emoji: '🔮',
    weights: { common: 10, rare: 25, epic: 35, legendary: 22, mythic: 8 },
    coinRange: { common: [10000, 25000], rare: [25000, 50000], epic: [50000, 90000], legendary: [90000, 150000], mythic: [150000, 250000] },
  },
];

export function boxById(id: string): BoxDef | undefined {
  return BOXES.find((b) => b.id === id);
}

export type BoxRewardType = 'coins' | 'powerup' | 'badge' | 'decoration' | 'discount';

export interface BoxReward {
  id: string;
  boxId: string;
  rarity: Rarity;
  type: BoxRewardType;
  amount?: number;
  refId?: string; // powerup id, badge name, decoration name
  label: string;
  emoji: string;
  timestamp: string;
}

const BADGE_POOL = [
  { id: 'badge-night-owl', label: 'Night Owl', emoji: '🦉' },
  { id: 'badge-early-bird', label: 'Early Bird', emoji: '🐤' },
  { id: 'badge-bookworm', label: 'Bookworm', emoji: '🐛' },
  { id: 'badge-comet', label: 'Comet', emoji: '☄️' },
];

const DECORATION_POOL = [
  { id: 'deco-aurora', label: 'Aurora Frame', emoji: '🌌' },
  { id: 'deco-flame', label: 'Flame Border', emoji: '🔥' },
  { id: 'deco-gold', label: 'Golden Frame', emoji: '✨' },
  { id: 'deco-sakura', label: 'Sakura Frame', emoji: '🌸' },
];

function pickRarity(weights: Record<Rarity, number>): Rarity {
  const entries = Object.entries(weights) as [Rarity, number][];
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let roll = Math.random() * total;
  for (const [r, w] of entries) {
    roll -= w;
    if (roll <= 0) return r;
  }
  return entries[0][0];
}

function randInRange([min, max]: [number, number]): number {
  return Math.round(min + Math.random() * (max - min));
}

/** Generate a random reward when opening a box. */
export function rollBoxReward(box: BoxDef): BoxReward {
  const rarity = pickRarity(box.weights);
  // 60% coins, 20% powerup, 10% badge, 7% decoration, 3% discount
  const typeRoll = Math.random() * 100;
  const ts = new Date().toISOString();
  const id = `${box.id}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

  if (typeRoll < 60) {
    const amount = randInRange(box.coinRange[rarity]);
    return { id, boxId: box.id, rarity, type: 'coins', amount, label: `${amount.toLocaleString()} Coins`, emoji: '🪙', timestamp: ts };
  }
  if (typeRoll < 80) {
    // power-up
    const pool = POWERUPS.filter((p) => (rarity === 'mythic' || rarity === 'legendary') || p.cost <= 3000);
    const pu = pool[Math.floor(Math.random() * pool.length)] || POWERUPS[0];
    return { id, boxId: box.id, rarity, type: 'powerup', refId: pu.id, label: pu.name, emoji: pu.emoji, timestamp: ts };
  }
  if (typeRoll < 90) {
    const b = BADGE_POOL[Math.floor(Math.random() * BADGE_POOL.length)];
    return { id, boxId: box.id, rarity, type: 'badge', refId: b.id, label: b.label, emoji: b.emoji, timestamp: ts };
  }
  if (typeRoll < 97) {
    const d = DECORATION_POOL[Math.floor(Math.random() * DECORATION_POOL.length)];
    return { id, boxId: box.id, rarity, type: 'decoration', refId: d.id, label: d.label, emoji: d.emoji, timestamp: ts };
  }
  const percent = rarity === 'mythic' ? 50 : rarity === 'legendary' ? 30 : rarity === 'epic' ? 20 : 10;
  return { id, boxId: box.id, rarity, type: 'discount', amount: percent, label: `${percent}% Shop Discount`, emoji: '🏷️', timestamp: ts };
}

// ============ POWER-UPS ============
export type PowerUpEffect =
  | 'focus-boost'      // +10% coin rewards for study sessions
  | 'double-coins'     // 2x study coins
  | 'task-skip'        // skip one daily task (consumable)
  | 'coin-magnet'      // +20% coins earned (all sources)
  | 'crate-reroll';    // reroll mystery box reward once (consumable)

export interface PowerUpDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  description: string;
  effect: PowerUpEffect;
  durationMs?: number; // undefined => consumable on use
  consumable?: boolean;
}

export const POWERUPS: PowerUpDef[] = [
  { id: 'focus-boost', name: 'Focus Boost', emoji: '⚡', cost: 1000, effect: 'focus-boost', durationMs: 24 * 3600 * 1000, description: '+10% coin rewards for study sessions (24h)' },
  { id: 'double-coins', name: 'Double Coins', emoji: '✨', cost: 3000, effect: 'double-coins', durationMs: 24 * 3600 * 1000, description: '2x study coins (24h)' },
  { id: 'task-skip', name: 'Task Skip', emoji: '⏭️', cost: 5000, effect: 'task-skip', consumable: true, description: 'Skip one daily task. One-time use.' },
  { id: 'coin-magnet', name: 'Coin Magnet', emoji: '🧲', cost: 4000, effect: 'coin-magnet', durationMs: 24 * 3600 * 1000, description: '+20% coins earned from all sources (24h)' },
  { id: 'crate-reroll', name: 'Instant Crate Reroll', emoji: '🎲', cost: 2500, effect: 'crate-reroll', consumable: true, description: 'Reroll a mystery box reward once.' },
];

export function powerUpById(id: string): PowerUpDef | undefined {
  return POWERUPS.find((p) => p.id === id);
}

export interface ActivePowerUp {
  id: string;            // unique activation id
  defId: string;         // powerup def id
  effect: PowerUpEffect;
  activatedAt: string;
  expiresAt: string;     // ISO timestamp
}

/** Compute multiplier from active power-ups for session coin rewards. */
export function studyCoinMultiplier(active: ActivePowerUp[]): number {
  const now = Date.now();
  let mult = 1;
  for (const a of active) {
    if (new Date(a.expiresAt).getTime() < now) continue;
    if (a.effect === 'focus-boost') mult *= 1.10;
    if (a.effect === 'double-coins') mult *= 2;
    if (a.effect === 'coin-magnet') mult *= 1.20;
  }
  return mult;
}

/** Multiplier for non-session coin earning (tasks, achievements). */
export function generalCoinMultiplier(active: ActivePowerUp[]): number {
  const now = Date.now();
  let mult = 1;
  for (const a of active) {
    if (new Date(a.expiresAt).getTime() < now) continue;
    if (a.effect === 'coin-magnet') mult *= 1.20;
  }
  return mult;
}
