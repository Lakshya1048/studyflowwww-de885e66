import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudySession, StudyTask } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const PRESET_TIMES = [15, 25, 30, 45, 60];

const FocusTimer = () => {
  const [sessions, setSessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [focusDuration, setFocusDuration] = useLocalStorage<number>('studyflow-focus-duration', 25);
  const [breakDuration, setBreakDuration] = useLocalStorage<number>('studyflow-break-duration', 5);
  const [subject, setSubject] = useLocalStorage<string>('studyflow-timer-subject', '');
  const [selectedTaskId, setSelectedTaskId] = useLocalStorage<string | null>('studyflow-timer-task', null);

  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');

  const [endTime, setEndTime] = useLocalStorage<number | null>('studyflow-timer-end', null);
  const [timerMode, setTimerMode] = useLocalStorage<'focus' | 'break'>('studyflow-timer-mode', 'focus');
  const [timerSubject, setTimerSubject] = useLocalStorage<string>('studyflow-timer-active-subject', '');

  const [timeLeft, setTimeLeft] = useState(() => {
    if (endTime && endTime > Date.now()) {
      return Math.ceil((endTime - Date.now()) / 1000);
    }
    return focusDuration * 60;
  });

  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Get pending tasks for today
  const today = new Date().toISOString().split('T')[0];
  const pendingTasks = tasks.filter((t) => !t.completed && t.dueDate === today);

  // When selecting a task, update subject
  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task) setSubject(task.subject);
  };

  useEffect(() => {
    if (endTime && endTime > Date.now()) {
      setIsRunning(true);
      setIsBreak(timerMode === 'break');
      setSubject(timerSubject);
    } else if (endTime && endTime <= Date.now()) {
      setEndTime(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalTime = isBreak ? breakDuration * 60 : focusDuration * 60;
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
        duration: focusDuration,
        subject: subject || 'General',
      };
      setSessions((prev) => [session, ...prev]);
    }
    const nextIsBreak = !isBreak;
    setIsBreak(nextIsBreak);
    const nextTime = nextIsBreak ? breakDuration * 60 : focusDuration * 60;
    setTimeLeft(nextTime);
    setIsRunning(false);
    setEndTime(null);
    setTimerMode(nextIsBreak ? 'break' : 'focus');
  }, [isBreak, subject, setSessions, focusDuration, breakDuration, setEndTime, setTimerMode]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (endTime) {
          const remaining = Math.ceil((endTime - Date.now()) / 1000);
          if (remaining <= 0) {
            clearInterval(intervalRef.current);
            setTimeLeft(0);
            finishSession();
          } else {
            setTimeLeft(remaining);
          }
        }
      }, 500);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, endTime, finishSession]);

  const startTimer = () => {
    const end = Date.now() + timeLeft * 1000;
    setEndTime(end);
    setTimerMode(isBreak ? 'break' : 'focus');
    setTimerSubject(subject);
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    if (endTime) {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    }
    setEndTime(null);
    clearInterval(intervalRef.current);
  };

  const reset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(focusDuration * 60);
    setEndTime(null);
    clearInterval(intervalRef.current);
  };

  const setCustomTime = (mins: number) => {
    setFocusDuration(mins);
    if (!isRunning && !isBreak) {
      setTimeLeft(mins * 60);
    }
  };

  const todaySessions = sessions.filter((s) => s.date === today);
  const todayMinutes = todaySessions.reduce((acc, s) => acc + s.duration, 0);

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {isBreak ? '☕ Break Time' : '🎯 Focus Mode'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isBreak ? 'Rest your mind' : selectedTask ? `Task: ${selectedTask.title}` : subject ? `Studying: ${subject}` : 'Select a task or subject'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowSettings(!showSettings)}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Settings panel */}
      {showSettings && !isRunning && (
        <div className="p-4 rounded-lg bg-card border border-border card-shadow space-y-4">
          {/* Task selection */}
          {pendingTasks.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Select Task</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {pendingTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => selectTask(task.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedTaskId === task.id
                        ? 'bg-primary/10 border border-primary/30 text-foreground'
                        : 'bg-secondary/50 hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span className="font-medium">{task.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">({task.subject})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Or type subject</label>
            <input
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setSelectedTaskId(null); }}
              placeholder="e.g. Mathematics"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Focus Duration</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TIMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setCustomTime(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    focusDuration === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {t}m
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="1"
                max="180"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="Custom (min)"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const val = parseInt(customMinutes);
                  if (val > 0 && val <= 180) {
                    setCustomTime(val);
                    setCustomMinutes('');
                  }
                }}
              >
                Set
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Break Duration</label>
            <div className="flex gap-2">
              {[3, 5, 10, 15].map((t) => (
                <button
                  key={t}
                  onClick={() => setBreakDuration(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    breakDuration === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {t}m
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timer ring */}
      <div className="flex justify-center">
        <div className="relative w-52 h-52">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--timer-ring-inactive))" strokeWidth="6" />
            <motion.circle
              cx="100" cy="100" r="90" fill="none"
              stroke="hsl(var(--timer-ring))" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-bold text-foreground tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-muted-foreground mt-1">{isBreak ? 'break' : 'focus'}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <Button size="lg" onClick={() => (isRunning ? pauseTimer() : startTimer())} className="gap-2 min-w-[120px]">
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
