export type TaskCategory = 'Coaching' | 'Arjuna Batch' | 'School' | 'Self Study';

export const TASK_CATEGORIES: TaskCategory[] = ['Coaching', 'Arjuna Batch', 'School', 'Self Study'];

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  completed: boolean;
  dueDate: string;
  createdAt: string;
  needsRevision?: boolean;
  category?: TaskCategory;
}

export interface TimeSlot {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  completed: boolean;
}

export interface DailyPlan {
  date: string;
  slots: TimeSlot[];
}

export interface StudySession {
  id: string;
  date: string;
  duration: number; // minutes
  subject: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
  totalStudyMinutes: number;
  totalTasksCompleted: number;
}

export type TabId = 'dashboard' | 'tasks' | 'timer' | 'progress' | 'notes' | 'pdfs' | 'doubts' | 'calendar';
