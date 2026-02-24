import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, X, GripHorizontal } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

/**
 * A small floating PiP-style timer that shows when the user navigates away from the timer tab
 * while a timer is running.
 */
const FloatingTimer = ({ visible, onGoToTimer }: { visible: boolean; onGoToTimer: () => void }) => {
  const [endTime] = useLocalStorage<number | null>('studyflow-timer-end', null);
  const [timerMode] = useLocalStorage<'focus' | 'break'>('studyflow-timer-mode', 'focus');
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!endTime || !visible) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const iv = setInterval(tick, 500);
    return () => clearInterval(iv);
  }, [endTime, visible]);

  // Reset dismissed when timer stops
  useEffect(() => {
    if (!endTime) setDismissed(false);
  }, [endTime]);

  if (!visible || !endTime || dismissed || timeLeft <= 0) return null;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <motion.div
      ref={dragRef}
      drag
      dragMomentum={false}
      dragConstraints={{ left: 0, top: 0, right: window.innerWidth - 180, bottom: window.innerHeight - 70 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ x: position.x, y: position.y }}
      onDragEnd={(_, info) => {
        setPosition((prev) => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }));
      }}
      className="fixed z-[60] flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shadow-lg cursor-grab active:cursor-grabbing select-none"
    >
      <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={onGoToTimer}
      >
        <div className={`w-2 h-2 rounded-full animate-pulse ${timerMode === 'break' ? 'bg-accent' : 'bg-primary'}`} />
        <span className="font-display font-bold text-foreground tabular-nums text-sm">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase">{timerMode}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

export default FloatingTimer;
