import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Timer, TrendingUp, ArrowRight, StickyNote } from 'lucide-react';
import type { TabId, StudyTask, StudySession } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface DashboardProps {
  onNavigate: (tab: TabId) => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const today = new Date().toISOString().split('T')[0];
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);

  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const pendingTasks = todayTasks.filter((t) => !t.completed);
  const overdueTasks = tasks.filter((t) => !t.completed && t.dueDate < today);
  const todaySessions = sessions.filter((s) => s.date === today);
  const todayMinutes = todaySessions.reduce((a, s) => a + s.duration, 0);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const quickCards = [
    {
      title: "Today's Tasks",
      subtitle: `${pendingTasks.length} pending${overdueTasks.length ? `, ${overdueTasks.length} overdue` : ''}`,
      icon: CheckSquare,
      tab: 'tasks' as TabId,
      gradient: 'gradient-accent',
    },
    {
      title: 'Focus Timer',
      subtitle: `${todayMinutes}m studied today`,
      icon: Timer,
      tab: 'timer' as TabId,
      gradient: 'gradient-primary',
    },
    {
      title: 'Notes',
      subtitle: 'Your study notes',
      icon: StickyNote,
      tab: 'notes' as TabId,
      gradient: 'gradient-accent',
    },
    {
      title: 'Progress',
      subtitle: `${todaySessions.length} sessions today`,
      icon: TrendingUp,
      tab: 'progress' as TabId,
      gradient: 'gradient-primary',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-display text-3xl font-bold text-foreground">{greeting} 👋</h1>
        <p className="text-muted-foreground mt-1">Ready to study? Here's your overview for today.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickCards.map((card, i) => (
          <motion.button
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            onClick={() => onNavigate(card.tab)}
            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border card-shadow hover:card-shadow-hover transition-shadow text-left group"
          >
            <div className={`w-10 h-10 rounded-lg ${card.gradient} flex items-center justify-center flex-shrink-0`}>
              <card.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{card.title}</p>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </motion.button>
        ))}
      </div>

      {/* Today's pending tasks */}
      {pendingTasks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="p-4 rounded-xl bg-card border border-border card-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold text-foreground">Today's Tasks</h3>
            <button onClick={() => onNavigate('tasks')} className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {pendingTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-foreground font-medium truncate">{task.title}</span>
                <span className="text-xs text-muted-foreground ml-auto">{task.subject}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {overdueTasks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
          <h3 className="font-display text-sm font-semibold text-destructive mb-2">⚠️ Overdue Tasks</h3>
          <div className="space-y-1">
            {overdueTasks.slice(0, 3).map((task) => (
              <p key={task.id} className="text-xs text-foreground">• {task.title} <span className="text-muted-foreground">(due {task.dueDate})</span></p>
            ))}
          </div>
          <button onClick={() => onNavigate('tasks')} className="text-xs text-primary hover:underline mt-2">View all tasks →</button>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
