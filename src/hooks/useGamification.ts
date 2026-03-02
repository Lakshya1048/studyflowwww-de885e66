import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { StudySession, StudyTask } from '@/lib/types';
import confetti from 'canvas-confetti';

const LEVEL_THRESHOLDS = [
  0, 50, 150, 300, 500, 800, 1200, 1700, 2400, 3200, 4200, 5500, 7000, 9000, 12000
];

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
  { id: 'level-5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'level-10', title: 'Elite', description: 'Reach level 10', icon: '👑' },
];

export function useGamification() {
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [unlockedBadges, setUnlockedBadges] = useLocalStorage<Record<string, string>>('studyflow-badges', {});
  const [newBadge, setNewBadge] = useLocalStorage<Achievement | null>('studyflow-new-badge', null);
  
  // Use refs to track previous values and avoid re-render loops
  const badgesRef = useRef(unlockedBadges);
  badgesRef.current = unlockedBadges;

  const sessionCount = sessions.length;
  
  const streak = useMemo(() => {
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    let currentStreak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const studiedToday = dates.includes(todayStr);
    const startOffset = studiedToday ? 0 : 1;
    for (let i = startOffset; ; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(checkStr)) currentStreak++;
      else break;
    }
    return currentStreak;
  }, [sessions]);

  const totalMinutes = useMemo(() => sessions.reduce((a, s) => a + s.duration, 0), [sessions]);
  const completedTasks = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const totalXP = useMemo(() => Math.round(totalMinutes) + completedTasks * 50, [totalMinutes, completedTasks]);

  const level = useMemo(() => {
    let lvl = 0;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXP >= LEVEL_THRESHOLDS[i]) { lvl = i + 1; break; }
    }
    return lvl;
  }, [totalXP]);

  const currentLevelXP = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXP = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 2000;
  const xpInLevel = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progressPercent = Math.min(100, (xpInLevel / xpNeeded) * 100);

  // Check badges - use a fingerprint to avoid running on every render
  const fingerprint = `${sessionCount}-${streak}-${completedTasks}-${Math.floor(totalMinutes)}-${level}`;
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
      'level-5': level >= 5,
      'level-10': level >= 10,
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
    totalXP,
    level,
    progressPercent,
    xpInLevel,
    xpNeeded,
    streak,
    achievements,
    newBadge,
    dismissNewBadge,
    totalMinutes,
    completedTasks,
  };
}
