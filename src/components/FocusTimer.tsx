import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings, Maximize2, Minimize2, X } from 'lucide-react';
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
  const [taskModeEnabled, setTaskModeEnabled] = useLocalStorage<boolean>('studyflow-task-mode', true);
  // taskMinutes: record of taskId -> total minutes spent
  const [taskMinutes, setTaskMinutes] = useLocalStorage<Record<string, number>>('studyflow-task-minutes', {});

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

  const today = new Date().toISOString().split('T')[0];

  // Show today's AND overdue pending tasks, labeled clearly
  const todayPending = tasks.filter((t) => !t.completed && t.dueDate === today);
  const overduePending = tasks.filter((t) => !t.completed && t.dueDate < today);

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

  // Listen for native fullscreen exit (Esc key)
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

      // Track time per task
      if (selectedTaskId) {
        setTaskMinutes((prev) => ({
          ...prev,
          [selectedTaskId]: (prev[selectedTaskId] || 0) + focusDuration,
        }));
      }
    }
    const nextIsBreak = !isBreak;
    setIsBreak(nextIsBreak);
    const nextTime = nextIsBreak ? breakDuration * 60 : focusDuration * 60;
    setTimeLeft(nextTime);
    setIsRunning(false);
    setEndTime(null);
    setTimerMode(nextIsBreak ? 'break' : 'focus');
  }, [isBreak, subject, setSessions, focusDuration, breakDuration, setEndTime, setTimerMode, selectedTaskId, setTaskMinutes]);

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

  const toggleFullscreen = () => {
    setIsFullscreen((v) => !v);
  };

  const todaySessions = sessions.filter((s) => s.date === today);
  const todayMinutes = todaySessions.reduce((acc, s) => acc + s.duration, 0);
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;
  const spentOnTask = selectedTaskId ? (taskMinutes[selectedTaskId] || 0) : 0;

  // Shared timer ring component
  const TimerRing = ({ size = 208 }: { size?: number }) => {
    const r = 90;
    const c = 2 * Math.PI * r;
    const offset = c - (progress / 100) * c;
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--timer-ring-inactive))" strokeWidth="6" />
          <motion.circle
            cx="100" cy="100" r={r} fill="none"
            stroke="hsl(var(--timer-ring))" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.5 }}
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
  };

  // Fullscreen overlay
  const FullscreenTimer = () => (
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-8"
        >
          {/* Close button */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-6 right-6 p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Mode label */}
          <p className="font-display text-2xl font-semibold text-muted-foreground">
            {isBreak ? '☕ Break Time' : '🎯 Focus Mode'}
          </p>

          {/* Task / subject */}
          {selectedTask && (
            <p className="text-lg text-foreground font-medium">{selectedTask.title}</p>
          )}

          <TimerRing size={400} />

          {/* Controls */}
          <div className="flex gap-4">
            <Button size="lg" onClick={() => (isRunning ? pauseTimer() : startTimer())} className="gap-2 px-10 py-4 text-lg">
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
            <Button size="lg" variant="outline" onClick={reset} className="px-6 py-4">
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats */}
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
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <FullscreenTimer />

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

            {/* Task mode toggle */}
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

            {/* Task dropdown (shown only when task mode is on) */}
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

                {/* Time spent on selected task */}
                {selectedTaskId && spentOnTask > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    ⏱ {spentOnTask} min spent on this task so far
                  </p>
                )}
              </div>
            )}

            {/* Manual subject (shown when task mode is off) */}
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
          <TimerRing size={208} />
        </div>

        {/* Time spent on task (always visible when task selected) */}
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
            <p className="text-2xl font-display font-bold text-foreground">{todayMinutes}</p>
            <p className="text-xs text-muted-foreground">Minutes Studied</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default FocusTimer;
