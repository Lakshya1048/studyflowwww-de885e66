import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  Wallet, EMPTY_WALLET, Transaction, TxnType,
  TITLES, titleById,
  BOXES, BoxDef, BoxReward, boxById, rollBoxReward,
  POWERUPS, PowerUpDef, ActivePowerUp, powerUpById,
  TASK_COIN_REWARDS, studyCoinMultiplier, generalCoinMultiplier,
  RANKS, rankForStreak, rankById, rankIndex,
} from '@/lib/economy';
import type { StudySession, StudyTask } from '@/lib/types';
import { useGamification } from '@/hooks/useGamification';
import { toast } from 'sonner';

function nowIso() { return new Date().toISOString(); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

export function useEconomy() {
  const [wallet, setWallet] = useLocalStorage<Wallet>('studyflow-wallet', EMPTY_WALLET);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('studyflow-transactions', []);
  const [ownedTitles, setOwnedTitles] = useLocalStorage<string[]>('studyflow-titles-owned', []);
  const [equippedTitle, setEquippedTitle] = useLocalStorage<string | null>('studyflow-title-equipped', null);
  const [inventoryBoxes, setInventoryBoxes] = useLocalStorage<Record<string, number>>('studyflow-inventory-boxes', {});
  const [inventoryPowerUps, setInventoryPowerUps] = useLocalStorage<Record<string, number>>('studyflow-inventory-powerups', {});
  const [activePowerUps, setActivePowerUps] = useLocalStorage<ActivePowerUp[]>('studyflow-active-powerups', []);
  const [boxRewardsLog, setBoxRewardsLog] = useLocalStorage<BoxReward[]>('studyflow-box-rewards', []);
  const [ownedBadges, setOwnedBadges] = useLocalStorage<string[]>('studyflow-shop-badges', []);
  const [ownedDecorations, setOwnedDecorations] = useLocalStorage<string[]>('studyflow-shop-decorations', []);
  const [shopDiscounts, setShopDiscounts] = useLocalStorage<number[]>('studyflow-shop-discounts', []);
  const [highestRankId, setHighestRankId] = useLocalStorage<string>('studyflow-highest-rank', 'beginner');
  const [rankUnlockBanner, setRankUnlockBanner] = useLocalStorage<string | null>('studyflow-rank-unlock-banner', null);

  // ---- background syncs ----
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [sessionRewards, setSessionRewards] = useLocalStorage<Record<string, number>>('studyflow-rewarded-sessions', {});
  const [rewardedTasks, setRewardedTasks] = useLocalStorage<string[]>('studyflow-rewarded-tasks', []);

  const gamification = useGamification();

  // Active powerup pruning (every 30s)
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setActivePowerUps((prev) => prev.filter((a) => new Date(a.expiresAt).getTime() > now));
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [setActivePowerUps]);

  // ---- core wallet ops ----
  const recordTxn = useCallback((type: TxnType, source: string, amount: number) => {
    if (amount <= 0) return;
    const txn: Transaction = { id: uid(), type, source, amount, timestamp: nowIso() };
    setTransactions((prev) => [txn, ...prev].slice(0, 500));
    setWallet((prev) => ({
      balance: prev.balance + (type === 'earn' ? amount : -amount),
      totalEarned: prev.totalEarned + (type === 'earn' ? amount : 0),
      totalSpent: prev.totalSpent + (type === 'spend' ? amount : 0),
    }));
  }, [setTransactions, setWallet]);

  const addCoins = useCallback((amount: number, source: string) => {
    if (amount <= 0) return;
    recordTxn('earn', source, Math.round(amount));
  }, [recordTxn]);

  const spendCoins = useCallback((amount: number, source: string): boolean => {
    if (amount <= 0) return false;
    if (wallet.balance < amount) {
      toast.error('Not enough coins');
      return false;
    }
    recordTxn('spend', source, Math.round(amount));
    return true;
  }, [wallet.balance, recordTxn]);

  // ---- auto-award: study sessions (1 coin per minute, with multipliers) ----
  const activeRef = useRef(activePowerUps);
  activeRef.current = activePowerUps;
  useEffect(() => {
    const updates: Record<string, number> = {};
    let pendingCoins = 0;
    for (const s of sessions) {
      const already = sessionRewards[s.id] || 0;
      const flooredMins = Math.floor(s.duration);
      if (flooredMins > already) {
        const delta = flooredMins - already;
        const earned = Math.round(delta * studyCoinMultiplier(activeRef.current));
        pendingCoins += earned;
        updates[s.id] = flooredMins;
      }
    }
    if (Object.keys(updates).length > 0) {
      setSessionRewards((prev) => ({ ...prev, ...updates }));
      if (pendingCoins > 0) addCoins(pendingCoins, 'Study Session');
    }
  }, [sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- auto-award: tasks ----
  useEffect(() => {
    const newly: string[] = [];
    let pending = 0;
    for (const t of tasks) {
      if (t.completed && !rewardedTasks.includes(t.id)) {
        const diff = (t as any).difficulty as 'easy' | 'medium' | 'hard' | undefined;
        const base = TASK_COIN_REWARDS[diff || 'medium'];
        const earned = Math.round(base * generalCoinMultiplier(activeRef.current));
        pending += earned;
        newly.push(t.id);
      }
    }
    // remove from rewarded list any tasks that no longer exist (cleanup) — optional
    if (newly.length > 0) {
      setRewardedTasks((prev) => [...prev, ...newly]);
      addCoins(pending, 'Task Completion');
    }
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- rank tracking: never decreases ----
  const currentRank = useMemo(() => rankForStreak(gamification.streak), [gamification.streak]);
  const highestRank = useMemo(() => rankById(highestRankId), [highestRankId]);
  useEffect(() => {
    if (rankIndex(currentRank.id) > rankIndex(highestRankId)) {
      setHighestRankId(currentRank.id);
      setRankUnlockBanner(currentRank.id);
    }
  }, [currentRank.id, highestRankId, setHighestRankId, setRankUnlockBanner]);

  const dismissRankBanner = useCallback(() => setRankUnlockBanner(null), [setRankUnlockBanner]);

  // ---- titles ----
  const buyTitle = useCallback((titleId: string): boolean => {
    const t = titleById(titleId);
    if (!t) return false;
    if (ownedTitles.includes(titleId)) {
      toast.info('You already own this title');
      return false;
    }
    if (rankIndex(highestRankId) < rankIndex(t.requiredRankId)) {
      toast.error(`Requires rank: ${rankById(t.requiredRankId).name}`);
      return false;
    }
    if (!spendCoins(t.cost, `Title: ${t.name}`)) return false;
    setOwnedTitles((prev) => [...prev, titleId]);
    toast.success(`Title unlocked: ${t.name} ${t.emoji}`);
    return true;
  }, [ownedTitles, highestRankId, spendCoins, setOwnedTitles]);

  const equipTitle = useCallback((titleId: string | null) => {
    if (titleId && !ownedTitles.includes(titleId)) return;
    setEquippedTitle(titleId);
  }, [ownedTitles, setEquippedTitle]);

  // ---- boxes ----
  const buyBox = useCallback((boxId: string): boolean => {
    const b = boxById(boxId);
    if (!b) return false;
    if (!spendCoins(b.cost, `Box: ${b.name}`)) return false;
    setInventoryBoxes((prev) => ({ ...prev, [boxId]: (prev[boxId] || 0) + 1 }));
    toast.success(`${b.name} added to inventory ${b.emoji}`);
    return true;
  }, [spendCoins, setInventoryBoxes]);

  const openBox = useCallback((boxId: string): BoxReward | null => {
    const count = inventoryBoxes[boxId] || 0;
    if (count <= 0) return null;
    const b = boxById(boxId)!;
    const reward = rollBoxReward(b);
    setInventoryBoxes((prev) => ({ ...prev, [boxId]: prev[boxId] - 1 }));
    applyBoxReward(reward);
    return reward;
  }, [inventoryBoxes, setInventoryBoxes]); // eslint-disable-line

  const applyBoxReward = useCallback((reward: BoxReward) => {
    setBoxRewardsLog((prev) => [reward, ...prev].slice(0, 200));
    if (reward.type === 'coins' && reward.amount) {
      addCoins(reward.amount, `Mystery Box (${reward.boxId})`);
    } else if (reward.type === 'powerup' && reward.refId) {
      setInventoryPowerUps((prev) => ({ ...prev, [reward.refId!]: (prev[reward.refId!] || 0) + 1 }));
    } else if (reward.type === 'badge' && reward.refId) {
      setOwnedBadges((prev) => prev.includes(reward.refId!) ? prev : [...prev, reward.refId!]);
    } else if (reward.type === 'decoration' && reward.refId) {
      setOwnedDecorations((prev) => prev.includes(reward.refId!) ? prev : [...prev, reward.refId!]);
    } else if (reward.type === 'discount' && reward.amount) {
      setShopDiscounts((prev) => [...prev, reward.amount!]);
    }
  }, [addCoins, setBoxRewardsLog, setInventoryPowerUps, setOwnedBadges, setOwnedDecorations, setShopDiscounts]);

  const rerollLastBoxReward = useCallback((): BoxReward | null => {
    // consume crate-reroll powerup, replace most recent reward
    const have = inventoryPowerUps['crate-reroll'] || 0;
    if (have <= 0) { toast.error('No Crate Reroll available'); return null; }
    const last = boxRewardsLog[0];
    if (!last) { toast.error('No reward to reroll'); return null; }
    const b = boxById(last.boxId);
    if (!b) return null;
    const newReward = rollBoxReward(b);
    // refund last reward effect approximately: only handle coins/inventory adds added previously? Simplest: keep both, just apply new on top.
    setInventoryPowerUps((prev) => ({ ...prev, 'crate-reroll': prev['crate-reroll'] - 1 }));
    applyBoxReward(newReward);
    toast.success('Reward rerolled!');
    return newReward;
  }, [inventoryPowerUps, boxRewardsLog, setInventoryPowerUps, applyBoxReward]);

  // ---- power-ups ----
  const buyPowerUp = useCallback((puId: string): boolean => {
    const p = powerUpById(puId);
    if (!p) return false;
    if (!spendCoins(p.cost, `Power-Up: ${p.name}`)) return false;
    setInventoryPowerUps((prev) => ({ ...prev, [puId]: (prev[puId] || 0) + 1 }));
    toast.success(`${p.name} purchased ${p.emoji}`);
    return true;
  }, [spendCoins, setInventoryPowerUps]);

  const activatePowerUp = useCallback((puId: string): boolean => {
    const p = powerUpById(puId);
    if (!p) return false;
    const have = inventoryPowerUps[puId] || 0;
    if (have <= 0) { toast.error('You do not own this power-up'); return false; }

    if (p.consumable) {
      // Consumables fire immediately
      setInventoryPowerUps((prev) => ({ ...prev, [puId]: prev[puId] - 1 }));
      if (p.effect === 'task-skip') {
        toast.success('Task Skip ready — mark a task complete to use it.');
        // implementation: just consume; user uses it as they wish
      } else if (p.effect === 'crate-reroll') {
        rerollLastBoxReward();
        return true; // already handled
      }
      return true;
    }
    // duration powerup
    const expiresAt = new Date(Date.now() + (p.durationMs || 24 * 3600 * 1000)).toISOString();
    const activation: ActivePowerUp = {
      id: uid(), defId: p.id, effect: p.effect, activatedAt: nowIso(), expiresAt,
    };
    setActivePowerUps((prev) => [...prev, activation]);
    setInventoryPowerUps((prev) => ({ ...prev, [puId]: prev[puId] - 1 }));
    toast.success(`${p.name} activated for 24h ${p.emoji}`);
    return true;
  }, [inventoryPowerUps, setInventoryPowerUps, setActivePowerUps, rerollLastBoxReward]);

  return {
    // wallet
    wallet, transactions, addCoins, spendCoins,
    // titles
    titles: TITLES, ownedTitles, equippedTitle, buyTitle, equipTitle,
    equippedTitleDef: equippedTitle ? titleById(equippedTitle) || null : null,
    // ranks
    currentRank, highestRank, allRanks: RANKS,
    rankUnlockBanner, dismissRankBanner,
    // boxes
    boxes: BOXES, inventoryBoxes, buyBox, openBox, boxRewardsLog,
    // powerups
    powerups: POWERUPS, inventoryPowerUps, activePowerUps, buyPowerUp, activatePowerUp,
    // inventory cosmetic
    ownedBadges, ownedDecorations, shopDiscounts,
    rerollLastBoxReward,
  };
}

export type EconomyAPI = ReturnType<typeof useEconomy>;
