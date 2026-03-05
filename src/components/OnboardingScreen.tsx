import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Timer, TrendingUp, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: BookOpen,
    emoji: '📝',
    title: 'Plan your study',
    description: 'Add tasks, set due dates, and auto-schedule revisions. Stay organized with a daily planner.',
    gradient: 'gradient-primary',
  },
  {
    icon: Timer,
    emoji: '🎯',
    title: 'Focus & Rank Up',
    description: 'Use the Pomodoro timer to stay focused. Build daily streaks to climb ranks — from Rookie 🌱 all the way to Legend 🔥.',
    gradient: 'gradient-accent',
  },
  {
    icon: TrendingUp,
    emoji: '📊',
    title: 'Track progress',
    description: 'See your streaks, rank up, unlock achievement badges, and watch your study hours grow over time.',
    gradient: 'gradient-primary',
  },
];

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete();
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
      {/* Skip */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          {/* Icon */}
          <div className={`w-24 h-24 rounded-2xl ${current.gradient} flex items-center justify-center mb-8 shadow-lg`}>
            <span className="text-5xl">{current.emoji}</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground mb-3">
            {current.title}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-10">
            {current.description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex gap-2 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-primary' : 'w-2 bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Action */}
      <Button onClick={next} size="lg" className="gap-2 px-8">
        {step < steps.length - 1 ? (
          <>
            Next <ChevronRight className="w-4 h-4" />
          </>
        ) : (
          <>
            Get Started <Sparkles className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  );
};

export default OnboardingScreen;
