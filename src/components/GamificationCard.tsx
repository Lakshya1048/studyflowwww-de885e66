import { motion } from 'framer-motion';
import { Flame, Star, Zap } from 'lucide-react';

interface GamificationCardProps {
  level: number;
  totalXP: number;
  progressPercent: number;
  xpInLevel: number;
  xpNeeded: number;
  streak: number;
  compact?: boolean;
}

const GamificationCard = ({ level, totalXP, progressPercent, xpInLevel, xpNeeded, streak, compact }: GamificationCardProps) => {
  if (compact) {
    return (
      <div className="mx-3 mb-2 rounded-lg bg-sidebar-accent p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-sidebar-foreground">Lv.{level}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-streak" />
            <span className="text-xs font-bold text-sidebar-foreground">{streak}d</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          {xpInLevel} / {xpNeeded} XP
        </p>
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
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Star className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Level {level}</p>
            <p className="text-xs text-muted-foreground">{totalXP} total XP</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10">
          <Flame className="w-4 h-4 text-streak" />
          <span className="text-sm font-bold text-foreground">{streak}</span>
          <span className="text-xs text-muted-foreground">day streak</span>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3 text-accent" /> Level {level + 1}
          </span>
          <span className="text-muted-foreground">{xpInLevel}/{xpNeeded} XP</span>
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
    </motion.div>
  );
};

export default GamificationCard;
