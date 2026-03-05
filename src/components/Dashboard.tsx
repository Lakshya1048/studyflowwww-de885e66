import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Timer, TrendingUp, ArrowRight, FileText, Bell, X } from 'lucide-react';
import type { TabId, StudyTask, StudySession } from '@/lib/types';
import { getLocalDateStr } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Profile } from '@/hooks/useProfile';
import type { RankInfo, Achievement } from '@/hooks/useGamification';
import GamificationCard from '@/components/GamificationCard';
import AchievementsGrid from '@/components/AchievementsGrid';

interface DashboardProps {
  onNavigate: (tab: TabId) => void;
  profile: Profile;
  gamification: {
    rank: RankInfo;
    nextRank: RankInfo | null;
    streak: number;
    progressPercent: number;
    achievements: Achievement[];
  };
}

const Dashboard = ({ onNavigate, profile, gamification }: DashboardProps) => {
  const today = new Date().toISOString().split('T')[0];
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [notifOpen, setNotifOpen] = useState(false);

  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const pendingTasks = todayTasks.filter((t) => !t.completed);
  const overdueTasks = tasks.filter((t) => !t.completed && t.dueDate < today);
  const todaySessions = sessions.filter((s) => s.date === today);
  const todayMinutes = todaySessions.reduce((a, s) => a + s.duration, 0);
  const todaySubjects = [...new Set(todaySessions.map((s) => s.subject))].filter(Boolean);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const notifications = useMemo(() => {
    const items: { id: string; text: string; type: 'info' | 'warn' }[] = [];
    if (overdueTasks.length > 0) items.push({ id: 'overdue', text: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}!`, type: 'warn' });
    if (pendingTasks.length > 0) items.push({ id: 'pending', text: `${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} due today`, type: 'info' });
    if (todaySubjects.length > 0) items.push({ id: 'revise', text: `Revise: ${todaySubjects.join(', ')}`, type: 'info' });
    if (todayMinutes > 0) items.push({ id: 'studied', text: `You've studied ${todayMinutes}m today — keep it up!`, type: 'info' });
    if (items.length === 0) items.push({ id: 'empty', text: 'No notifications yet. Start studying!', type: 'info' });
    return items;
  }, [overdueTasks, pendingTasks, todaySubjects, todayMinutes]);

  const hasWarning = notifications.some((n) => n.type === 'warn');

  const quickCards = [
    { title: "Today's Tasks", subtitle: `${pendingTasks.length} pending${overdueTasks.length ? `, ${overdueTasks.length} overdue` : ''}`, icon: CheckSquare, tab: 'tasks' as TabId, gradient: 'gradient-accent' },
    { title: 'Focus Timer', subtitle: `${todayMinutes}m studied today`, icon: Timer, tab: 'timer' as TabId, gradient: 'gradient-primary' },
    { title: 'Study Materials', subtitle: 'Your study PDFs', icon: FileText, tab: 'pdfs' as TabId, gradient: 'gradient-accent' },
    { title: 'Progress', subtitle: `${todaySessions.length} sessions today`, icon: TrendingUp, tab: 'progress' as TabId, gradient: 'gradient-primary' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {greeting}{profile?.display_name ? `, ${profile.display_name}` : ''} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Ready to study? Here's your overview for today.</p>
        </div>
        <div className="relative">
          <button onClick={() => setNotifOpen((v) => !v)} className="relative p-2 rounded-xl bg-card border border-border hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
            {hasWarning && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 top-12 w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                  <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {notifications.map((n) => (
                    <div key={n.id} className="px-4 py-3 flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'warn' ? 'bg-destructive' : 'bg-primary'}`} />
                      <p className="text-xs text-foreground leading-relaxed">{n.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Rank Card */}
      <GamificationCard rank={gamification.rank} nextRank={gamification.nextRank} streak={gamification.streak} progressPercent={gamification.progressPercent} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickCards.map((card, i) => (
          <motion.button
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            onClick={() => onNavigate(card.tab)}
            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border card-shadow hover:card-shadow-hover transition-shadow text-left group active:scale-[0.98]"
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

      <AchievementsGrid achievements={gamification.achievements} />

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
