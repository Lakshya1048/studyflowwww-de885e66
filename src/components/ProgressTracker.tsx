import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, CheckCircle2, Target, Flame } from 'lucide-react';
import type { StudySession, StudyTask } from '@/lib/types';
import { getLocalDateStr } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import AchievementsGrid from '@/components/AchievementsGrid';
import type { Achievement, RankInfo } from '@/hooks/useGamification';
import { RANKS } from '@/hooks/useGamification';

interface ProgressTrackerProps {
  achievements: Achievement[];
  rank: RankInfo;
  streak: number;
}

const ProgressTracker = ({ achievements, rank, streak }: ProgressTrackerProps) => {
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);

  const stats = useMemo(() => {
    const today = getLocalDateStr();
    
    // Get Monday of the current week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = getLocalDateStr(monday);

    const todaySessions = sessions.filter((s) => s.date === today);
    const weekSessions = sessions.filter((s) => s.date >= mondayStr && s.date <= today);
    const totalMinutes = sessions.reduce((a, s) => a + s.duration, 0);
    const todayMinutes = todaySessions.reduce((a, s) => a + s.duration, 0);
    const weekMinutes = weekSessions.reduce((a, s) => a + s.duration, 0);
    const completedTasks = tasks.filter((t) => t.completed).length;

    const subjectMap: Record<string, number> = {};
    weekSessions.forEach((s) => {
      subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s.duration;
    });
    const subjects = Object.entries(subjectMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Show Mon–Sun of the current week
    const days: { label: string; minutes: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateStr(d);
      const dayLabel = d.toLocaleDateString('en', { weekday: 'short' });
      const mins = sessions.filter((s) => s.date === dateStr).reduce((a, s) => a + s.duration, 0);
      days.push({ label: dayLabel, minutes: mins });
    }
    const maxMinutes = Math.max(...days.map((d) => d.minutes), 1);

    return { totalMinutes, todayMinutes, weekMinutes, completedTasks, subjects, days, maxMinutes };
  }, [sessions, tasks]);

  const statCards = [
    { label: 'Today', value: `${stats.todayMinutes}m`, icon: Clock, color: 'text-primary' },
    { label: 'This Week', value: `${Math.floor(stats.weekMinutes / 60)}h ${stats.weekMinutes % 60}m`, icon: TrendingUp, color: 'text-accent' },
    { label: 'Total Hours', value: `${Math.floor(stats.totalMinutes / 60)}h`, icon: Target, color: 'text-primary' },
    { label: 'Tasks Done', value: stats.completedTasks.toString(), icon: CheckCircle2, color: 'text-success' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-foreground">Progress</h2>

      {/* Current Rank */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-card border border-border card-shadow"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{rank.icon}</span>
          <div>
            <p className="text-lg font-bold text-foreground">{rank.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="w-3 h-3 text-streak" />
              <span>{streak} day streak</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {RANKS.map((r) => (
            <div
              key={r.name}
              className={`flex-1 h-2 rounded-full ${streak >= r.minStreak ? 'gradient-primary' : 'bg-muted'}`}
              title={`${r.name} (${r.minStreak}+ days)`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">🌱</span>
          <span className="text-[10px] text-muted-foreground">🔥</span>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-lg bg-card border border-border card-shadow"
          >
            <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
            <p className="text-2xl font-display font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Weekly bar chart */}
      <div className="p-4 rounded-lg bg-card border border-border card-shadow">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4">This Week</h3>
        <div className="flex items-end gap-2 h-32">
          {stats.days.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                className="w-full rounded-t-md gradient-primary"
                initial={{ height: 0 }}
                animate={{ height: `${(day.minutes / stats.maxMinutes) * 100}%` }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                style={{ minHeight: day.minutes > 0 ? 4 : 0 }}
              />
              <span className="text-[10px] text-muted-foreground">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject breakdown */}
      {stats.subjects.length > 0 && (
        <div className="p-4 rounded-lg bg-card border border-border card-shadow">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Subjects This Week</h3>
          <div className="space-y-2">
            {stats.subjects.map(([subject, minutes]) => {
              const pct = (minutes / stats.weekMinutes) * 100;
              return (
                <div key={subject}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{subject}</span>
                    <span className="text-muted-foreground">{minutes}m</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full gradient-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="p-4 rounded-lg bg-card border border-border card-shadow">
        <AchievementsGrid
          achievements={achievements}
          streak={streak}
          sessionCount={sessions.length}
          completedTasks={stats.completedTasks}
          totalMinutes={stats.totalMinutes}
        />
      </div>
    </div>
  );
};

export default ProgressTracker;
