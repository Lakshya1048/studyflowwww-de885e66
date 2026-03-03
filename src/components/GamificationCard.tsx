import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import type { RankInfo } from '@/hooks/useGamification';

interface GamificationCardProps {
  rank: RankInfo;
  nextRank: RankInfo | null;
  streak: number;
  progressPercent: number;
  compact?: boolean;
}

const GamificationCard = ({ rank, nextRank, streak, progressPercent, compact }: GamificationCardProps) => {
  if (compact) {
    return (
      <div className="mx-3 mb-2 rounded-lg bg-sidebar-accent p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{rank.icon}</span>
            <span className="text-xs font-bold text-sidebar-foreground">{rank.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-streak" />
            <span className="text-xs font-bold text-sidebar-foreground">{streak}d</span>
          </div>
        </div>
        {nextRank && (
          <>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Day {streak} / {nextRank.minStreak} → {nextRank.icon} {nextRank.name}
            </p>
          </>
        )}
        {!nextRank && (
          <p className="text-[10px] text-muted-foreground text-center">Max rank reached! 🔥</p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 rounded-xl bg-card border border-border card-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <span className="text-2xl">{rank.icon}</span>
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{rank.name}</p>
            <p className="text-xs text-muted-foreground">Current Rank</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10">
          <Flame className="w-4 h-4 text-streak" />
          <span className="text-sm font-bold text-foreground">{streak}</span>
          <span className="text-xs text-muted-foreground">day streak</span>
        </div>
      </div>

      {/* Rank progress bar */}
      {nextRank ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              {nextRank.icon} {nextRank.name}
            </span>
            <span className="text-muted-foreground">Day {streak} / {nextRank.minStreak}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-center text-muted-foreground font-medium">🔥 Max rank achieved — you're a Legend!</p>
      )}
    </motion.div>
  );
};

export default GamificationCard;
