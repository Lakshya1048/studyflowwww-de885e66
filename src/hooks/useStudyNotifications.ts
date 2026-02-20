import { useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { StudySession, StudyTask } from '@/lib/types';

const IDLE_REMINDER_MINUTES = 60; // remind after 60 min of inactivity
const EVENING_HOUR = 21; // 9 PM revision reminder

function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

export function useStudyNotifications(displayName?: string | null) {
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const lastActivityRef = useRef(Date.now());
  const eveningSentRef = useRef(false);

  // Track user activity
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

  // Request notification permission on mount
  useEffect(() => { requestPermission(); }, []);

  const getRevisionSummary = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
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

      // Evening revision reminder (once per day at 9 PM)
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

      // Reset evening flag after midnight
      if (hour < EVENING_HOUR) {
        eveningSentRef.current = false;
      }

      // Idle reminder
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= IDLE_REMINDER_MINUTES * 60 * 1000) {
        const name = displayName || 'there';
        sendNotification(
          `Hey ${name}, time to study! 🎯`,
          "You've been away for a while. Open StudyFlow and get back on track!"
        );
        // Reset so we don't spam — only remind again after another idle period
        lastActivityRef.current = Date.now();
      }
    }, 60_000); // check every minute

    return () => clearInterval(interval);
  }, [displayName, getRevisionSummary]);
}
