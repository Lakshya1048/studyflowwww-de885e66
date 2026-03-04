import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Trophy } from 'lucide-react';
import type { Achievement } from '@/hooks/useGamification';

interface AchievementsGridProps {
  achievements: Achievement[];
  streak?: number;
  sessionCount?: number;
  completedTasks?: number;
  totalMinutes?: number;
}

// Maps badge IDs to their target values for progress calculation
const BADGE_TARGETS: Record<string, { target: number; stat: 'streak' | 'sessions' | 'tasks' | 'hours' }> = {
  'first-session': { target: 1, stat: 'sessions' },
  'streak-3': { target: 3, stat: 'streak' },
  'streak-7': { target: 7, stat: 'streak' },
  'streak-14': { target: 14, stat: 'streak' },
  'sessions-10': { target: 10, stat: 'sessions' },
  'sessions-50': { target: 50, stat: 'sessions' },
  'sessions-100': { target: 100, stat: 'sessions' },
  'tasks-5': { target: 5, stat: 'tasks' },
  'tasks-25': { target: 25, stat: 'tasks' },
  'tasks-50': { target: 50, stat: 'tasks' },
  'hours-1': { target: 60, stat: 'hours' },
  'hours-10': { target: 600, stat: 'hours' },
  'hours-50': { target: 3000, stat: 'hours' },
  'rank-silver': { target: 7, stat: 'streak' },
  'rank-diamond': { target: 30, stat: 'streak' },
};

const getStatLabel = (stat: string) => {
  switch (stat) {
    case 'streak': return 'day streak';
    case 'sessions': return 'sessions';
    case 'tasks': return 'tasks done';
    case 'hours': return 'min studied';
    default: return '';
  }
};

const AchievementsGrid = ({ achievements, streak = 0, sessionCount = 0, completedTasks = 0, totalMinutes = 0 }: AchievementsGridProps) => {
  const unlocked = achievements.filter(a => a.unlockedAt);
  const locked = achievements.filter(a => !a.unlockedAt);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getProgress = (id: string) => {
    const info = BADGE_TARGETS[id];
    if (!info) return { current: 0, target: 1, pct: 0, label: '' };
    let current = 0;
    switch (info.stat) {
      case 'streak': current = streak; break;
      case 'sessions': current = sessionCount; break;
      case 'tasks': current = completedTasks; break;
      case 'hours': current = totalMinutes; break;
    }
    const pct = Math.min(100, (current / info.target) * 100);
    const remaining = Math.max(0, info.target - current);
    const label = `${remaining} ${getStatLabel(info.stat)} to go`;
    return { current, target: info.target, pct, label };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Achievements</h3>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {unlocked.length}/{achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {achievements.map((badge, i) => {
          const isUnlocked = !!badge.unlockedAt;
          const progress = !isUnlocked ? getProgress(badge.id) : null;
          const isHovered = hoveredId === badge.id;

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="relative"
              onMouseEnter={() => setHoveredId(badge.id)}
              onMouseLeave={() => setHoveredId(null)}
              onTouchStart={() => setHoveredId(badge.id)}
              onTouchEnd={() => setTimeout(() => setHoveredId(null), 2000)}
            >
              <div
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-default ${
                  isUnlocked
                    ? 'bg-card border-border card-shadow hover:border-primary/40 hover:shadow-md'
                    : 'bg-muted/40 border-border/50 hover:bg-muted/70 hover:border-border'
                }`}
              >
                <div className={`text-2xl transition-transform duration-200 ${isHovered ? 'scale-125' : ''}`}>
                  {isUnlocked ? badge.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
                </div>
                <p className="text-[10px] font-medium text-foreground text-center leading-tight">{badge.title}</p>

                {/* Mini progress bar for locked badges */}
                {!isUnlocked && progress && (
                  <div className="w-full h-1 rounded-full bg-border overflow-hidden mt-0.5">
                    <motion.div
                      className="h-full rounded-full bg-primary/60"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                    />
                  </div>
                )}
              </div>

              {/* Hover tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-44 p-3 rounded-xl bg-popover border border-border shadow-lg"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{isUnlocked ? badge.icon : '🔒'}</span>
                      <p className="text-xs font-bold text-foreground">{badge.title}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug mb-2">
                      {badge.description}
                    </p>

                    {isUnlocked ? (
                      <p className="text-[10px] text-primary font-medium">
                        ✅ Unlocked {new Date(badge.unlockedAt!).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </p>
                    ) : progress ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">{Math.round(progress.pct)}%</span>
                          <span className="text-muted-foreground">
                            {progress.current}/{progress.target}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                          <motion.div
                            className="h-full rounded-full gradient-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress.pct}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{progress.label}</p>
                      </div>
                    ) : null}

                    {/* Arrow */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 bg-popover border-r border-b border-border" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsGrid;
