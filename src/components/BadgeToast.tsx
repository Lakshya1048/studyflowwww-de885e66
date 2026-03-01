import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Achievement } from '@/hooks/useGamification';

interface BadgeToastProps {
  badge: Achievement | null;
  onDismiss: () => void;
}

const BadgeToast = ({ badge, onDismiss }: BadgeToastProps) => {
  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.9 }}
          transition={{ type: 'spring', bounce: 0.3 }}
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[90] bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-4 max-w-xs"
        >
          <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center text-3xl flex-shrink-0">
            {badge.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-semibold uppercase tracking-wider">Badge Unlocked!</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{badge.title}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
          </div>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BadgeToast;
