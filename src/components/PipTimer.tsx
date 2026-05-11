import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
      window: Window | null;
    };
  }
}

const isPipSupported = () =>
  typeof window !== 'undefined' && 'documentPictureInPicture' in window;

/**
 * Always-on-top floating timer using Document Picture-in-Picture.
 * - Opens automatically when a focus session starts
 * - Stays visible while paused
 * - Closes automatically when the timer is reset/finished, or when the app
 *   window itself becomes visible (user opened the app again)
 */
const PipTimer = () => {
  const [endTime] = useLocalStorage<number | null>('studyflow-timer-end', null);
  const [timerMode] = useLocalStorage<'focus' | 'break'>('studyflow-timer-mode', 'focus');
  const [timerSubject] = useLocalStorage<string>('studyflow-timer-active-subject', '');
  const [pauseStartTime] = useLocalStorage<number | null>('studyflow-pause-start', null);
  const [sessionStartTime] = useLocalStorage<number | null>('studyflow-session-start', null);
  const [focusDuration] = useLocalStorage<number>('studyflow-focus-duration', 25);
  const [breakDuration] = useLocalStorage<number>('studyflow-break-duration', 5);

  const [pipWin, setPipWin] = useState<Window | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [now, setNow] = useState(Date.now());
  const lastRemainingRef = useRef<number>(0);
  const triedRef = useRef(false);

  const isActive = !!(endTime || (sessionStartTime && pauseStartTime));
  const isPaused = !!pauseStartTime && !endTime;
  const isRunning = !!endTime;

  const totalSec = (timerMode === 'break' ? breakDuration : focusDuration) * 60;
  let remainingSec = lastRemainingRef.current;
  if (isRunning && endTime) {
    remainingSec = Math.max(0, Math.ceil((endTime - now) / 1000));
    lastRemainingRef.current = remainingSec;
  }
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const totalMins = Math.floor(totalSec / 60);
  const progress = totalSec > 0 ? ((totalSec - remainingSec) / totalSec) * 100 : 0;
  const displaySubject = timerSubject || (timerMode === 'break' ? 'Break' : 'Focus');

  // Tick
  useEffect(() => {
    if (!pipWin || !isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [pipWin, isRunning]);

  const open = useCallback(() => {
    if (!isPipSupported()) {
      console.warn('[PipTimer] Document Picture-in-Picture not supported in this browser. Use Chrome/Edge desktop, the Tauri build, or open the published URL in a new tab.');
      return;
    }
    if (window.self !== window.top) {
      console.warn('[PipTimer] Cannot open PiP inside an iframe (Lovable preview). Open the app in a new tab or run the desktop build.');
      return;
    }
    if (window.documentPictureInPicture!.window) return;
    // IMPORTANT: call requestWindow synchronously (no await before it) to keep
    // the user-gesture context alive.
    const p = window.documentPictureInPicture!.requestWindow({ width: 220, height: 96 });
    p.then((win) => {
      [...document.styleSheets].forEach((sheet) => {
        try {
          const css = [...sheet.cssRules].map((r) => r.cssText).join('');
          const style = win.document.createElement('style');
          style.textContent = css;
          win.document.head.appendChild(style);
        } catch {
          if (sheet.href) {
            const link = win.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            win.document.head.appendChild(link);
          }
        }
      });
      if (document.documentElement.classList.contains('dark')) {
        win.document.documentElement.classList.add('dark');
      }
      win.document.title = 'StudyFlow';
      win.document.body.style.margin = '0';
      win.document.body.style.overflow = 'hidden';

      const root = win.document.createElement('div');
      win.document.body.appendChild(root);

      win.addEventListener('pagehide', () => {
        setPipWin(null);
        setContainer(null);
        triedRef.current = false;
      });

      setPipWin(win);
      setContainer(root);
    }).catch(() => {
      triedRef.current = false;
    });
  }, []);

  // Listen for explicit open requests dispatched from the Start click handler.
  // This MUST run synchronously inside the gesture chain.
  useEffect(() => {
    const onOpen = () => {
      if (!triedRef.current && !pipWin) {
        triedRef.current = true;
        open();
      }
    };
    window.addEventListener('studyflow-pip-open', onOpen);
    return () => window.removeEventListener('studyflow-pip-open', onOpen);
  }, [open, pipWin]);

  // Reset gate when timer stops
  useEffect(() => {
    if (!isActive) triedRef.current = false;
  }, [isActive]);

  // Auto-close PiP when timer ends/cancels OR when the main app becomes visible
  useEffect(() => {
    if (pipWin && !isActive) {
      try { pipWin.close(); } catch {}
    }
  }, [isActive, pipWin]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && pipWin) {
        try { pipWin.close(); } catch {}
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [pipWin]);

  const handleToggle = () => {
    if (isRunning) window.dispatchEvent(new CustomEvent('studyflow-timer-pause'));
    else window.dispatchEvent(new CustomEvent('studyflow-timer-start'));
  };

  if (!container) return null;

  const ui = (
    <div className="bg-background text-foreground h-screen w-screen flex items-center gap-2.5 px-3 py-2 font-body select-none overflow-hidden">
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        isPaused ? 'bg-amber-400' : timerMode === 'break' ? 'bg-accent animate-pulse' : 'bg-primary animate-pulse'
      }`} />

      {/* Time + subject */}
      <div className="flex-1 min-w-0 flex flex-col leading-tight">
        <span className="font-display font-bold tabular-nums text-xl leading-none">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          <span className="text-[10px] text-muted-foreground font-normal ml-1">/{totalMins}m</span>
        </span>
        <span className="text-[10px] text-muted-foreground truncate mt-0.5">
          {isPaused ? 'Paused · ' : ''}{displaySubject}
        </span>
      </div>

      {/* Start/Pause */}
      <button
        onClick={handleToggle}
        className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition flex-shrink-0"
        title={isRunning ? 'Pause' : 'Start'}
      >
        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
    </div>
  );

  return createPortal(ui, container);
};

export default PipTimer;
