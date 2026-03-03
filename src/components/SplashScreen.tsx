import { motion } from 'framer-motion';
import { RANKS } from '@/hooks/useGamification';

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
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
        <p className="text-sm text-muted-foreground mt-1">Rise through the ranks</p>
      </motion.div>

      {/* Rank badges row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-2"
      >
        {RANKS.map((r, i) => (
          <motion.span
            key={r.name}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.08, type: 'spring', stiffness: 300 }}
            className="text-xl"
            title={r.name}
          >
            {r.icon}
          </motion.span>
        ))}
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 1.2, ease: 'easeInOut' }}
        onAnimationComplete={onFinish}
        className="w-40 h-1 rounded-full gradient-primary origin-left"
      />
    </motion.div>
  );
};

export default SplashScreen;
