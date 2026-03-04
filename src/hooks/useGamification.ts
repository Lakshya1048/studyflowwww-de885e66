import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { StudySession, StudyTask } from '@/lib/types';
import confetti from 'canvas-confetti';

export interface RankInfo {
  name: string;
  icon: string;
  minStreak: number;
}

export const RANKS: RankInfo[] = [
  { name: 'Rookie', icon: '🌱', minStreak: 0 },
  { name: 'Bronze', icon: '🥉', minStreak: 3 },
  { name: 'Silver', icon: '🥈', minStreak: 7 },
  { name: 'Gold', icon: '🥇', minStreak: 14 },
  { name: 'Platinum', icon: '💎', minStreak: 21 },
  { name: 'Diamond', icon: '👑', minStreak: 30 },
  { name: 'Legend', icon: '🔥', minStreak: 60 },
];

export function getRank(streak: number): RankInfo {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (streak >= r.minStreak) rank = r;
  }
  return rank;
}

export function getNextRank(streak: number): RankInfo | null {
  for (const r of RANKS) {
    if (streak < r.minStreak) return r;
  }
  return null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

const BADGE_DEFINITIONS: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first-session', title: 'First Step', description: 'Complete your first study session', icon: '🎯' },
  { id: 'streak-3', title: 'On Fire', description: 'Reach a 3-day streak', icon: '🔥' },
  { id: 'streak-7', title: 'Week Warrior', description: '7-day study streak', icon: '⚡' },
  { id: 'streak-14', title: 'Unstoppable', description: '14-day study streak', icon: '🏆' },
  { id: 'sessions-10', title: 'Getting Serious', description: 'Complete 10 sessions', icon: '📚' },
  { id: 'sessions-50', title: 'Grindmaster', description: 'Complete 50 sessions', icon: '💪' },
  { id: 'sessions-100', title: 'Centurion', description: '100 sessions completed', icon: '🏅' },
  { id: 'tasks-5', title: 'Task Slayer', description: 'Complete 5 tasks', icon: '✅' },
  { id: 'tasks-25', title: 'Productivity Pro', description: 'Complete 25 tasks', icon: '🌟' },
  { id: 'tasks-50', title: 'Half Century', description: '50 tasks completed', icon: '💎' },
  { id: 'hours-1', title: 'First Hour', description: 'Study for 1 hour total', icon: '⏰' },
  { id: 'hours-10', title: 'Dedicated', description: '10 hours of total study', icon: '📖' },
  { id: 'hours-50', title: 'Scholar', description: '50 hours of total study', icon: '🎓' },
  { id: 'rank-silver', title: 'Rising Star', description: 'Reach Silver rank', icon: '⭐' },
  { id: 'rank-diamond', title: 'Elite', description: 'Reach Diamond rank', icon: '👑' },
];

export function useGamification() {
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [activeDays] = useLocalStorage<string[]>('studyflow-active-days', []);
  const [unlockedBadges, setUnlockedBadges] = useLocalStorage<Record<string, string>>('studyflow-badges', {});
  const [newBadge, setNewBadge] = useLocalStorage<Achievement | null>('studyflow-new-badge', null);
  const [lastRankName, setLastRankName] = useLocalStorage<string>('studyflow-last-rank', 'Rookie');

  const badgesRef = useRef(unlockedBadges);
  badgesRef.current = unlockedBadges;

  const sessionCount = sessions.length;

  const streak = useMemo(() => {
    // Merge session dates and task-completion active days
    const sessionDates = sessions.map(s => s.date);
    const allDates = [...new Set([...sessionDates, ...activeDays])].sort().reverse();
    let currentStreak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const activeToday = allDates.includes(todayStr);
    const startOffset = activeToday ? 0 : 1;
    for (let i = startOffset; ; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkStr = checkDate.toISOString().split('T')[0];
      if (allDates.includes(checkStr)) currentStreak++;
      else break;
    }
    return currentStreak;
  }, [sessions, activeDays]);

  const totalMinutes = useMemo(() => sessions.reduce((a, s) => a + s.duration, 0), [sessions]);
  const completedTasks = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);

  const rank = getRank(streak);
  const nextRank = getNextRank(streak);
  const progressPercent = nextRank
    ? ((streak - rank.minStreak) / (nextRank.minStreak - rank.minStreak)) * 100
    : 100;

  // Celebrate rank-ups
  useEffect(() => {
    if (rank.name !== lastRankName && rank.name !== 'Rookie') {
      setLastRankName(rank.name);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#10b981', '#f59e0b', '#6366f1', '#ec4899'],
      });
    } else if (rank.name !== lastRankName) {
      setLastRankName(rank.name);
    }
  }, [rank.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Badge checks
  const fingerprint = `${sessionCount}-${streak}-${completedTasks}-${Math.floor(totalMinutes)}`;
  const lastFingerprint = useRef('');

  useEffect(() => {
    if (fingerprint === lastFingerprint.current) return;
    lastFingerprint.current = fingerprint;

    const currentBadges = badgesRef.current;
    const checks: Record<string, boolean> = {
      'first-session': sessionCount >= 1,
      'streak-3': streak >= 3,
      'streak-7': streak >= 7,
      'streak-14': streak >= 14,
      'sessions-10': sessionCount >= 10,
      'sessions-50': sessionCount >= 50,
      'sessions-100': sessionCount >= 100,
      'tasks-5': completedTasks >= 5,
      'tasks-25': completedTasks >= 25,
      'tasks-50': completedTasks >= 50,
      'hours-1': totalMinutes >= 60,
      'hours-10': totalMinutes >= 600,
      'hours-50': totalMinutes >= 3000,
      'rank-silver': streak >= 7,
      'rank-diamond': streak >= 30,
    };

    let updated = false;
    const newUnlocked = { ...currentBadges };
    let latestBadge: Achievement | null = null;

    for (const [id, earned] of Object.entries(checks)) {
      if (earned && !newUnlocked[id]) {
        newUnlocked[id] = new Date().toISOString();
        updated = true;
        const def = BADGE_DEFINITIONS.find(b => b.id === id);
        if (def) latestBadge = { ...def, unlockedAt: newUnlocked[id] };
      }
    }

    if (updated) {
      setUnlockedBadges(newUnlocked);
      if (latestBadge) {
        setNewBadge(latestBadge);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#f59e0b', '#6366f1', '#ec4899'],
        });
      }
    }
  }, [fingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  const achievements: Achievement[] = useMemo(() =>
    BADGE_DEFINITIONS.map(b => ({
      ...b,
      unlockedAt: unlockedBadges[b.id],
    })),
    [unlockedBadges]
  );

  const dismissNewBadge = useCallback(() => setNewBadge(null), [setNewBadge]);

  return {
    rank,
    nextRank,
    streak,
    progressPercent,
    achievements,
    newBadge,
    dismissNewBadge,
    totalMinutes,
    completedTasks,
  };
}
