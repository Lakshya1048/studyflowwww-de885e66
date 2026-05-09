import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Maximize2, GripHorizontal } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const FloatingTimer = ({ visible, onGoToTimer }: { visible: boolean; onGoToTimer: () => void }) => {
  const [endTime] = useLocalStorage<number | null>('studyflow-timer-end', null);
  const [timerMode] = useLocalStorage<'focus' | 'break'>('studyflow-timer-mode', 'focus');
  const [timerSubject] = useLocalStorage<string>('studyflow-timer-active-subject', '');
  const [pauseStartTime] = useLocalStorage<number | null>('studyflow-pause-start', null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  // Determine if timer is active (either running or paused mid-session)
  const [sessionStartTime] = useLocalStorage<number | null>('studyflow-session-start', null);
  const isTimerActive = !!(endTime || (sessionStartTime && pauseStartTime));
  const isPaused = !!pauseStartTime && !endTime;

  // Read the paused timeLeft from localStorage for display when paused
  const [focusDuration] = useLocalStorage<number>('studyflow-focus-duration', 25);

  useEffect(() => {
    if (!visible || !isTimerActive) return;
    if (isPaused) {
      // When paused, we don't have endTime. Calculate from what was remaining.
      // The FocusTimer stores remaining seconds in timeLeft state, but we can't access it.
      // We'll show a static "PAUSED" indicator instead.
      return;
    }
    if (!endTime) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const iv = setInterval(tick, 500);
    return () => clearInterval(iv);
  }, [endTime, visible, isTimerActive, isPaused]);

  if (!visible || !isTimerActive) return null;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  const displaySubject = timerSubject || (timerMode === 'break' ? 'Break' : 'Focus');

  return (
    <motion.div
      ref={dragRef}
      drag
      dragMomentum={false}
      dragConstraints={{ left: -300, top: -500, right: 50, bottom: 0 }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[55] flex items-center gap-2.5 pl-2.5 pr-1.5 py-2 rounded-2xl bg-card border border-border shadow-xl cursor-grab active:cursor-grabbing select-none"
    >
      <GripHorizontal className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />

      {/* Pulsing dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isPaused ? 'bg-amber-400' : 'animate-pulse'} ${
        timerMode === 'break' ? 'bg-accent' : isPaused ? '' : 'bg-primary'
      }`} />

      {/* Time & subject */}
      <div className="flex flex-col min-w-0" onClick={onGoToTimer}>
        <span className="font-display font-bold text-foreground tabular-nums text-sm leading-tight cursor-pointer">
          {isPaused ? 'PAUSED' : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
        </span>
        <span className="text-[10px] text-muted-foreground truncate max-w-[80px] leading-tight">
          {displaySubject}
        </span>
      </div>

      {/* Expand button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onGoToTimer();
        }}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Open Timer"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

export default FloatingTimer;
