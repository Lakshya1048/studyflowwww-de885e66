import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudySession, StudyTask } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getLocalDateStr } from '@/lib/utils';

// Extracted outside to prevent remounting on parent re-renders
const TimerRing = memo(({ size = 208, progress, minutes, seconds, isBreak }: {
  size?: number; progress: number; minutes: number; seconds: number; isBreak: boolean;
}) => {
  const r = 90;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--timer-ring-inactive))" strokeWidth="6" />
        <circle
          cx="100" cy="100" r={r} fill="none"
          stroke="hsl(var(--timer-ring))" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-foreground tabular-nums" style={{ fontSize: size > 300 ? '5rem' : '2.5rem' }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <span className="text-muted-foreground mt-1" style={{ fontSize: size > 300 ? '1.1rem' : '0.75rem' }}>
          {isBreak ? 'break' : 'focus'}
        </span>
      </div>
    </div>
  );
});

const PRESET_TIMES = [15, 25, 30, 45, 60];
const SAVE_INTERVAL_MS = 30_000; // save progress every 30 seconds

const FocusTimer = () => {
  const [sessions, setSessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [focusDuration, setFocusDuration] = useLocalStorage<number>('studyflow-focus-duration', 25);
  const [breakDuration, setBreakDuration] = useLocalStorage<number>('studyflow-break-duration', 5);
  const [subject, setSubject] = useLocalStorage<string>('studyflow-timer-subject', '');
  const [selectedTaskId, setSelectedTaskId] = useLocalStorage<string | null>('studyflow-timer-task', null);
  const [taskModeEnabled, setTaskModeEnabled] = useLocalStorage<boolean>('studyflow-task-mode', true);
  const [taskMinutes, setTaskMinutes] = useLocalStorage<Record<string, number>>('studyflow-task-minutes', {});

  // Realtime tracking: when the current session started
  const [sessionStartTime, setSessionStartTime] = useLocalStorage<number | null>('studyflow-session-start', null);
  // Total milliseconds spent paused during this session
  const [totalPausedMs, setTotalPausedMs] = useLocalStorage<number>('studyflow-total-paused', 0);
  // When the current pause started (null if not paused)
  const [pauseStartTime, setPauseStartTime] = useLocalStorage<number | null>('studyflow-pause-start', null);
  // The ID of the current running session (so we update it instead of creating duplicates)
  const [activeSessionId, setActiveSessionId] = useLocalStorage<string | null>('studyflow-active-session-id', null);

  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const saveIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const today = getLocalDateStr();

  const todayPending = tasks.filter((t) => !t.completed && t.dueDate === today);
  const overduePending = tasks.filter((t) => !t.completed && t.dueDate < today);

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task) setSubject(task.subject);
  };

  // Restore running state on mount
  useEffect(() => {
    if (endTime && endTime > Date.now()) {
      setIsRunning(true);
      setIsBreak(timerMode === 'break');
      setSubject(timerSubject);
    } else if (endTime && endTime <= Date.now()) {
      // Timer expired while closed — save the accumulated time
      if (sessionStartTime && timerMode !== 'break') {
        const actualStudyMs = (Date.now() - sessionStartTime) - (totalPausedMs || 0);
        const totalElapsed = Math.max(0, actualStudyMs / 60000);
        if (totalElapsed >= 0.1) {
          saveOrUpdateSession(totalElapsed);
        }
      }
      setEndTime(null);
      setSessionStartTime(null);
      setActiveSessionId(null);
      setTotalPausedMs(0);
      setPauseStartTime(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fullscreen exit listener
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const totalTime = isBreak ? breakDuration * 60 : focusDuration * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Save or update the current session (single session per timer run)
  const saveOrUpdateSession = useCallback((totalMins: number) => {
    if (totalMins <= 0) return;
    const rounded = Math.round(totalMins * 10) / 10;
    const today = getLocalDateStr();

    if (activeSessionId) {
      // Update existing session
      setSessions((prev) => prev.map((s) =>
        s.id === activeSessionId ? { ...s, duration: rounded } : s
      ));
    } else {
      // Create new session
      const id = Date.now().toString();
      const session: StudySession = {
        id,
        date: today,
        duration: rounded,
        subject: subject || 'General',
      };
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(id);
    }

    if (selectedTaskId) {
      setTaskMinutes((prev) => ({
        ...prev,
        [selectedTaskId]: rounded, // total for this timer run
      }));
    }
  }, [subject, setSessions, selectedTaskId, setTaskMinutes, activeSessionId, setActiveSessionId]);

  // Periodic save while running (realtime counting) — updates the SAME session
  useEffect(() => {
    if (isRunning && !isBreak && sessionStartTime) {
      saveIntervalRef.current = setInterval(() => {
        const totalElapsedMins = (Date.now() - sessionStartTime) / 60000;
        if (totalElapsedMins >= 0.1) {
          saveOrUpdateSession(totalElapsedMins);
        }
      }, SAVE_INTERVAL_MS);
    }
    return () => clearInterval(saveIntervalRef.current);
  }, [isRunning, isBreak, sessionStartTime, saveOrUpdateSession]);

  const finishSession = useCallback(() => {
    if (!isBreak && sessionStartTime) {
      const totalElapsed = (Date.now() - sessionStartTime) / 60000;
      if (totalElapsed > 0) {
        saveOrUpdateSession(totalElapsed);
      }
    }
    setSessionStartTime(null);
    setActiveSessionId(null);

    const nextIsBreak = !isBreak;
    setIsBreak(nextIsBreak);
    const nextTime = nextIsBreak ? breakDuration * 60 : focusDuration * 60;
    setTimeLeft(nextTime);
    setIsRunning(false);
    setEndTime(null);
    setTimerMode(nextIsBreak ? 'break' : 'focus');
  }, [isBreak, sessionStartTime, saveOrUpdateSession, breakDuration, focusDuration, setEndTime, setTimerMode, setSessionStartTime, setActiveSessionId]);

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
    if (!isBreak && !sessionStartTime) {
      setSessionStartTime(Date.now());
      setActiveSessionId(null); // will be created on first save
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
    if (endTime) {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    }
    setEndTime(null);
    clearInterval(intervalRef.current);
    // Save progress on pause
    if (!isBreak && sessionStartTime) {
      const totalElapsed = (Date.now() - sessionStartTime) / 60000;
      if (totalElapsed >= 0.1) {
        saveOrUpdateSession(totalElapsed);
      }
    }
  };

  const reset = () => {
    // Save any progress before resetting
    if (isRunning && !isBreak && sessionStartTime) {
      const totalElapsed = (Date.now() - sessionStartTime) / 60000;
      if (totalElapsed >= 0.1) {
        saveOrUpdateSession(totalElapsed);
      }
    }
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(focusDuration * 60);
    setEndTime(null);
    setSessionStartTime(null);
    setActiveSessionId(null);
    clearInterval(intervalRef.current);
  };

  const setCustomTime = (mins: number) => {
    setFocusDuration(mins);
    if (!isRunning && !isBreak) {
      setTimeLeft(mins * 60);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen((v) => !v);
  };

  const todaySessions = sessions.filter((s) => s.date === today);
  const todayMinutes = todaySessions.reduce((acc, s) => acc + s.duration, 0);
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;
  const spentOnTask = selectedTaskId ? (taskMinutes[selectedTaskId] || 0) : 0;

  // TimerRing is now a top-level memo component

  // Fullscreen overlay — rendered inline, NOT inside AnimatePresence to prevent re-mount flicker
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-8">
        <button
          onClick={toggleFullscreen}
          className="absolute top-6 right-6 p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <p className="font-display text-2xl font-semibold text-muted-foreground">
          {isBreak ? '☕ Break Time' : '🎯 Focus Mode'}
        </p>

        {selectedTask && (
          <p className="text-lg text-foreground font-medium">{selectedTask.title}</p>
        )}

        <TimerRing size={400} progress={progress} minutes={minutes} seconds={seconds} isBreak={isBreak} />

        <div className="flex gap-4">
          <Button size="lg" onClick={() => (isRunning ? pauseTimer() : startTimer())} className="gap-2 px-10 py-4 text-lg">
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          <Button size="lg" variant="outline" onClick={reset} className="px-6 py-4">
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-6 text-center">
          <div>
            <p className="text-3xl font-display font-bold text-foreground">{todaySessions.length}</p>
            <p className="text-sm text-muted-foreground">Sessions Today</p>
          </div>
          <div>
            <p className="text-3xl font-display font-bold text-foreground">{todayMinutes}m</p>
            <p className="text-sm text-muted-foreground">Minutes Studied</p>
          </div>
          {selectedTask && spentOnTask > 0 && (
            <div>
              <p className="text-3xl font-display font-bold text-foreground">{spentOnTask}m</p>
              <p className="text-sm text-muted-foreground">On This Task</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {isBreak ? '☕ Break Time' : '🎯 Focus Mode'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isBreak
              ? 'Rest your mind'
              : selectedTask
              ? `Task: ${selectedTask.title}`
              : subject
              ? `Studying: ${subject}`
              : 'Set up your session below'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <Button size="sm" variant="outline" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && !isRunning && (
        <div className="p-4 rounded-lg bg-card border border-border card-shadow space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Study a Task</label>
            <button
              onClick={() => {
                setTaskModeEnabled(!taskModeEnabled);
                if (taskModeEnabled) { setSelectedTaskId(null); }
              }}
              className={`relative w-11 h-6 rounded-full transition-colors ${taskModeEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${taskModeEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {taskModeEnabled && (todayPending.length > 0 || overduePending.length > 0) && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Select Task</label>
              <select
                value={selectedTaskId || ''}
                onChange={(e) => {
                  if (e.target.value) selectTask(e.target.value);
                  else setSelectedTaskId(null);
                }}
                className="w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">— Pick a task —</option>
                {todayPending.length > 0 && (
                  <optgroup label="Today">
                    {todayPending.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title} ({task.subject})
                      </option>
                    ))}
                  </optgroup>
                )}
                {overduePending.length > 0 && (
                  <optgroup label="Overdue">
                    {overduePending.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title} ({task.subject}) — due {task.dueDate}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {selectedTaskId && spentOnTask > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  ⏱ {spentOnTask} min spent on this task so far
                </p>
              )}
            </div>
          )}

          {!taskModeEnabled && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

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
                max="600"
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
                  if (val > 0 && val <= 600) {
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
        <TimerRing size={208} progress={progress} minutes={minutes} seconds={seconds} isBreak={isBreak} />
      </div>

      {selectedTask && spentOnTask > 0 && !showSettings && (
        <p className="text-center text-xs text-muted-foreground">
          ⏱ {spentOnTask} min spent on "<span className="font-medium text-foreground">{selectedTask.title}</span>"
        </p>
      )}

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
          <p className="text-2xl font-display font-bold text-foreground">{Math.round(todayMinutes)}</p>
          <p className="text-xs text-muted-foreground">Minutes Studied</p>
        </div>
      </div>
    </div>
  );
};

export default FocusTimer;
