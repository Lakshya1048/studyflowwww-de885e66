import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, PictureInPicture2 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Document Picture-in-Picture API typings (not yet in TS lib)
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
 * Floating "always on top" timer powered by the Document Picture-in-Picture API.
 * Shows remaining time / total, subject, and a start–pause button.
 * Auto-closes when the timer is reset or finished.
 */
const PipTimer = ({ onRequestStart, onRequestPause }: {
  onRequestStart: () => void;
  onRequestPause: () => void;
}) => {
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

  // Tick while the PiP is open and timer running
  useEffect(() => {
    if (!pipWin || !isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [pipWin, isRunning]);

  // Auto-close PiP when timer is no longer active
  useEffect(() => {
    if (pipWin && !isActive) {
      try { pipWin.close(); } catch {}
    }
  }, [isActive, pipWin]);

  const open = useCallback(async () => {
    if (!isPipSupported()) {
      alert('Floating timer requires Chrome/Edge 116+ on desktop.');
      return;
    }
    try {
      const win = await window.documentPictureInPicture!.requestWindow({
        width: 280,
        height: 140,
      });
      // Copy parent stylesheets so Tailwind / tokens work in the PiP doc
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
      // Inherit dark mode
      if (document.documentElement.classList.contains('dark')) {
        win.document.documentElement.classList.add('dark');
      }
      win.document.title = 'StudyFlow Timer';

      const root = win.document.createElement('div');
      win.document.body.appendChild(root);
      win.document.body.style.margin = '0';

      win.addEventListener('pagehide', () => {
        setPipWin(null);
        setContainer(null);
      });

      setPipWin(win);
      setContainer(root);
    } catch (e) {
      console.error('Failed to open PiP', e);
    }
  }, []);

  const close = useCallback(() => {
    if (pipWin) try { pipWin.close(); } catch {}
  }, [pipWin]);

  const displaySubject = timerSubject || (timerMode === 'break' ? 'Break' : 'Focus');
  const progress = totalSec > 0 ? ((totalSec - remainingSec) / totalSec) * 100 : 0;

  const pipContent = container && (
    <div className="bg-background text-foreground h-screen w-screen flex flex-col justify-between p-3 font-body select-none">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isPaused ? 'bg-amber-400' : timerMode === 'break' ? 'bg-accent animate-pulse' : 'bg-primary animate-pulse'
          }`} />
          <span className="text-xs font-medium text-muted-foreground truncate">{displaySubject}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex-shrink-0">
          {isPaused ? 'Paused' : timerMode === 'break' ? 'Break' : 'Focus'}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-display font-bold tabular-nums text-3xl leading-none">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">/ {totalMins}m</span>
        </div>
        <button
          onClick={() => (isRunning ? onRequestPause() : onRequestStart())}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition flex-shrink-0"
          title={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
      </div>

      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${timerMode === 'break' ? 'bg-accent' : 'bg-primary'} transition-all`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  if (!isActive) return null;

  return (
    <>
      <button
        onClick={pipWin ? close : open}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title={pipWin ? 'Close floating timer' : 'Open floating timer (above all apps)'}
      >
        <PictureInPicture2 className="w-3.5 h-3.5" />
      </button>
      {container && pipContent && createPortal(pipContent, container)}
    </>
  );
};

export default PipTimer;
