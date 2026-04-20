import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, TrendingUp, Trophy, Target, BookOpen, Calendar as CalIcon } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { StudySession, StudyTask } from '@/lib/types';
import { getLocalDateStr } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type RangeKey = '7' | '21' | '30' | '365' | 'all';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '21', label: 'Last 21 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '365', label: 'Last 365 days' },
  { value: 'all', label: 'All time' },
];

const formatMinutes = (mins: number) => {
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });

const DetailedStats = () => {
  const navigate = useNavigate();
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [tasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [range, setRange] = useState<RangeKey>('30');

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = getLocalDateStr(today);

    let startStr = '';
    if (range !== 'all') {
      const days = parseInt(range, 10);
      const start = new Date(today);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);
      startStr = getLocalDateStr(start);
    }

    const filtered = range === 'all'
      ? sessions
      : sessions.filter((s) => s.date >= startStr && s.date <= todayStr);

    const totalMinutes = filtered.reduce((a, s) => a + s.duration, 0);
    const sessionCount = filtered.length;
    const uniqueDays = new Set(filtered.map((s) => s.date)).size;
    const avgPerDay = uniqueDays > 0 ? totalMinutes / uniqueDays : 0;
    const avgPerSession = sessionCount > 0 ? totalMinutes / sessionCount : 0;

    // Subject breakdown
    const subjectMap: Record<string, { minutes: number; sessions: number }> = {};
    filtered.forEach((s) => {
      if (!subjectMap[s.subject]) subjectMap[s.subject] = { minutes: 0, sessions: 0 };
      subjectMap[s.subject].minutes += s.duration;
      subjectMap[s.subject].sessions += 1;
    });
    const subjects = Object.entries(subjectMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.minutes - a.minutes);

    // Best day
    const dayTotals: Record<string, number> = {};
    filtered.forEach((s) => {
      dayTotals[s.date] = (dayTotals[s.date] || 0) + s.duration;
    });
    let bestDay: { date: string; minutes: number } | null = null;
    Object.entries(dayTotals).forEach(([date, minutes]) => {
      if (!bestDay || minutes > bestDay.minutes) bestDay = { date, minutes };
    });

    // Daily breakdown (most recent first), top 14 for display
    const dailyBreakdown = Object.entries(dayTotals)
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Tasks completed in range
    const completedTasksInRange = range === 'all'
      ? tasks.filter((t) => t.completed).length
      : tasks.filter((t) => t.completed && t.dueDate >= startStr && t.dueDate <= todayStr).length;

    return {
      totalMinutes,
      sessionCount,
      uniqueDays,
      avgPerDay,
      avgPerSession,
      subjects,
      bestDay,
      dailyBreakdown,
      completedTasksInRange,
    };
  }, [sessions, tasks, range]);

  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label ?? '';

  const summaryCards = [
    { label: 'Total Studied', value: formatMinutes(stats.totalMinutes), icon: Clock, color: 'text-primary' },
    { label: 'Active Days', value: `${stats.uniqueDays}`, icon: CalIcon, color: 'text-accent' },
    { label: 'Sessions', value: `${stats.sessionCount}`, icon: TrendingUp, color: 'text-primary' },
    { label: 'Avg / Active Day', value: formatMinutes(stats.avgPerDay), icon: Target, color: 'text-accent' },
    { label: 'Avg / Session', value: formatMinutes(stats.avgPerSession), icon: BookOpen, color: 'text-primary' },
    { label: 'Tasks Completed', value: `${stats.completedTasksInRange}`, icon: Trophy, color: 'text-streak' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-2xl font-bold text-foreground">Detailed Stats</h1>
        </div>

        {/* Range selector */}
        <div className="mb-6">
          <label className="text-xs text-muted-foreground font-medium mb-2 block">Time Range</label>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-4 rounded-lg bg-card border border-border card-shadow"
            >
              <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
              <p className="text-xl font-display font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Best day */}
        {stats.bestDay && (
          <div className="p-4 rounded-lg bg-card border border-border card-shadow mb-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">Best Day in {rangeLabel}</h3>
            <div className="flex items-baseline justify-between">
              <span className="text-foreground font-medium">{formatDate(stats.bestDay.date)}</span>
              <span className="text-2xl font-display font-bold text-primary">
                {formatMinutes(stats.bestDay.minutes)}
              </span>
            </div>
          </div>
        )}

        {/* Subjects */}
        <div className="p-4 rounded-lg bg-card border border-border card-shadow mb-6">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">
            Subjects ({stats.subjects.length})
          </h3>
          {stats.subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No study sessions in this range.</p>
          ) : (
            <div className="space-y-3">
              {stats.subjects.map((subj) => {
                const pct = stats.totalMinutes > 0 ? (subj.minutes / stats.totalMinutes) * 100 : 0;
                return (
                  <div key={subj.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{subj.name}</span>
                      <span className="text-muted-foreground">
                        {formatMinutes(subj.minutes)} · {subj.sessions} session{subj.sessions !== 1 ? 's' : ''} · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
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
          )}
        </div>

        {/* Daily breakdown */}
        {stats.dailyBreakdown.length > 0 && (
          <div className="p-4 rounded-lg bg-card border border-border card-shadow">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">
              Daily Breakdown ({stats.dailyBreakdown.length} day{stats.dailyBreakdown.length !== 1 ? 's' : ''})
            </h3>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {stats.dailyBreakdown.map((d) => (
                <div
                  key={d.date}
                  className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-muted/50"
                >
                  <span className="text-sm text-foreground">{formatDate(d.date)}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatMinutes(d.minutes)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailedStats;
