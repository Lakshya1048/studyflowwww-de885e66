import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import type { Achievement } from '@/hooks/useGamification';

interface AchievementsGridProps {
  achievements: Achievement[];
}

const AchievementsGrid = ({ achievements }: AchievementsGridProps) => {
  const unlocked = achievements.filter(a => a.unlockedAt);
  const locked = achievements.filter(a => !a.unlockedAt);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">Achievements</h3>
        <span className="text-xs text-muted-foreground">{unlocked.length}/{achievements.length}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {achievements.map((badge, i) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
              badge.unlockedAt
                ? 'bg-card border-border card-shadow'
                : 'bg-muted/50 border-transparent opacity-50'
            }`}
          >
            <div className="text-2xl">
              {badge.unlockedAt ? badge.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
            </div>
            <p className="text-[10px] font-medium text-foreground text-center leading-tight">{badge.title}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsGrid;
