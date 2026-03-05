import { motion } from 'framer-motion';
import { getRank, getNextRank, RANKS } from '@/hooks/useGamification';
import { Flame } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  streak?: number;
}

const SplashScreen = ({ onFinish, streak = 0 }: SplashScreenProps) => {
  const rank = getRank(streak);
  const nextRank = getNextRank(streak);
  const progressPercent = nextRank
    ? ((streak - rank.minStreak) / (nextRank.minStreak - rank.minStreak)) * 100
    : 100;

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center gap-6"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onAnimationComplete={onFinish}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-lg"
      >
        <span className="text-primary-foreground text-3xl font-bold font-display">S</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <h1 className="font-display text-2xl font-bold text-foreground">StudyFlow</h1>
      </motion.div>

      {/* Current rank showcase */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45, type: 'spring', stiffness: 200 }}
        className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm min-w-[220px]"
      >
        <div className="flex items-center gap-2">
          <span className="text-3xl">{rank.icon}</span>
          <span className="font-display text-lg font-bold text-foreground">{rank.name}</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Flame className="w-4 h-4 text-streak" />
          <span className="font-semibold text-foreground">{streak}</span>
          <span>day streak</span>
        </div>

        {nextRank ? (
          <div className="w-full space-y-1.5">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ delay: 0.7, duration: 0.8 }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              {nextRank.icon} {nextRank.name} in {nextRank.minStreak - streak} days
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">🔥 Max rank achieved!</p>
        )}
      </motion.div>

      {/* Rank badges row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-2"
      >
        {RANKS.map((r, i) => {
          const isActive = streak >= r.minStreak;
          return (
            <motion.span
              key={r.name}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: isActive ? 1 : 0.3 }}
              transition={{ delay: 0.7 + i * 0.06, type: 'spring', stiffness: 300 }}
              className="text-xl"
              title={r.name}
            >
              {r.icon}
            </motion.span>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.9, duration: 1.2, ease: 'easeInOut' }}
        onAnimationComplete={onFinish}
        className="w-40 h-1 rounded-full gradient-primary origin-left"
      />
    </motion.div>
  );
};

export default SplashScreen;
