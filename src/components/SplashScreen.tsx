import { motion } from 'framer-motion';

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
        <p className="text-sm text-muted-foreground mt-1">Your study companion</p>
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 1.2, ease: 'easeInOut' }}
        onAnimationComplete={onFinish}
        className="w-40 h-1 rounded-full gradient-primary origin-left"
      />
    </motion.div>
  );
};

export default SplashScreen;
