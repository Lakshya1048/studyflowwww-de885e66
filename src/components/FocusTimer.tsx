import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudySession } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const FOCUS_TIME = 25 * 60; // 25 min
const BREAK_TIME = 5 * 60;  // 5 min

const FocusTimer = () => {
  const [sessions, setSessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [subject, setSubject] = useState('Study');
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const totalTime = isBreak ? BREAK_TIME : FOCUS_TIME;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const finishSession = useCallback(() => {
    if (!isBreak) {
      const session: StudySession = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        duration: FOCUS_TIME / 60,
        subject,
      };
      setSessions((prev) => [session, ...prev]);
    }
    setIsBreak(!isBreak);
    setTimeLeft(isBreak ? FOCUS_TIME : BREAK_TIME);
    setIsRunning(false);
  }, [isBreak, subject, setSessions]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            finishSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, finishSession]);

  const reset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(FOCUS_TIME);
    clearInterval(intervalRef.current);
  };

  const todaySessions = sessions.filter((s) => s.date === new Date().toISOString().split('T')[0]);
  const todayMinutes = todaySessions.reduce((acc, s) => acc + s.duration, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-foreground">
          {isBreak ? '☕ Break Time' : '🎯 Focus Mode'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isBreak ? 'Rest your mind' : `Studying: ${subject}`}
        </p>
      </div>

      {/* Subject selector */}
      {!isRunning && !isBreak && (
        <div className="flex justify-center">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What are you studying?"
            className="text-center text-sm border border-input rounded-lg px-4 py-2 bg-background text-foreground w-52"
          />
        </div>
      )}

      {/* Timer ring */}
      <div className="flex justify-center">
        <div className="relative w-52 h-52">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="hsl(var(--timer-ring-inactive))"
              strokeWidth="6"
            />
            <motion.circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="hsl(var(--timer-ring))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-bold text-foreground tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {isBreak ? 'break' : 'focus'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <Button
          size="lg"
          onClick={() => setIsRunning(!isRunning)}
          className="gap-2 min-w-[120px]"
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button size="lg" variant="outline" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-card border border-border card-shadow text-center">
          <p className="text-2xl font-display font-bold text-foreground">{todaySessions.length}</p>
          <p className="text-xs text-muted-foreground">Sessions Today</p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border card-shadow text-center">
          <p className="text-2xl font-display font-bold text-foreground">{todayMinutes}</p>
          <p className="text-xs text-muted-foreground">Minutes Studied</p>
        </div>
      </div>
    </div>
  );
};

export default FocusTimer;
