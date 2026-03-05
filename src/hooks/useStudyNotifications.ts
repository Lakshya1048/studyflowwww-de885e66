import { useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { StudySession, StudyTask } from '@/lib/types';
import { getLocalDateStr } from '@/lib/utils';

const IDLE_REMINDER_MINUTES = 60;
const EVENING_HOUR = 21; // 9 PM

function isQuietHours(): boolean {
  try {
    const raw = localStorage.getItem('studyflow-settings');
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings.quietHoursEnabled) {
        const now = new Date().getHours();
        const start = settings.quietHoursStart ?? 22;
        const end = settings.quietHoursEnd ?? 7;
        if (start > end) {
          return now >= start || now < end;
        }
        return now >= start && now < end;
      }
    }
  } catch { /* ignore */ }
  return false;
}

function notificationsEnabled(): boolean {
  try {
    const raw = localStorage.getItem('studyflow-settings');
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings.notificationsEnabled === false) return false;
    }
  } catch { /* ignore */ }
  return true;
}

function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string) {
  if (!notificationsEnabled()) return;
  if (isQuietHours()) return;
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

export function useStudyNotifications(displayName?: string | null) {
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const lastActivityRef = useRef(Date.now());
  const eveningSentRef = useRef(false);

  useEffect(() => {
    const update = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('click', update);
    window.addEventListener('keydown', update);
    window.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('click', update);
      window.removeEventListener('keydown', update);
      window.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => { requestPermission(); }, []);

  const getRevisionSummary = useCallback(() => {
    const today = getLocalDateStr();
    const todaySessions = sessions.filter((s) => s.date === today);
    const todayCompleted = tasks.filter((t) => t.completed && t.dueDate === today);
    const subjects = [...new Set([
      ...todaySessions.map((s) => s.subject),
      ...todayCompleted.map((t) => t.subject),
    ])].filter(Boolean);
    return subjects;
  }, [sessions, tasks]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();

      if (hour >= EVENING_HOUR && !eveningSentRef.current) {
        const subjects = getRevisionSummary();
        if (subjects.length > 0) {
          const name = displayName ? `, ${displayName}` : '';
          sendNotification(
            `Revision time${name}! 📖`,
            `You studied: ${subjects.join(', ')}.\nRevise them before sleeping!`
          );
        }
        eveningSentRef.current = true;
      }

      if (hour < EVENING_HOUR) {
        eveningSentRef.current = false;
      }

      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= IDLE_REMINDER_MINUTES * 60 * 1000) {
        const name = displayName || 'there';
        sendNotification(
          `Hey ${name}, time to study! 🎯`,
          "You've been away for a while. Open StudyFlow and get back on track!"
        );
        lastActivityRef.current = Date.now();
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [displayName, getRevisionSummary]);
}
