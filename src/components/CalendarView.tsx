import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flame, Trophy, Clock, CalendarDays } from 'lucide-react';
import type { StudySession } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getLocalDateStr } from '@/lib/utils';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STREAK_THRESHOLD = 60; // minutes required for a day to count toward streak

function getIntensityClass(minutes: number): string {
  if (minutes <= 0) return 'bg-muted/40';
  if (minutes <= 30) return 'bg-emerald-900/60';
  if (minutes <= 60) return 'bg-emerald-700/70';
  if (minutes <= 120) return 'bg-emerald-500/80';
  return 'bg-emerald-400';
}

function getIntensityLabel(minutes: number): string {
  if (minutes <= 0) return 'No study';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const CalendarView = () => {
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [direction, setDirection] = useState(0);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const todayStr = getLocalDateStr();

  // Build a map of date -> total minutes for the viewed month
  const { calendarDays, monthStats } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const totalDaysInMonth = lastDay.getDate();

    // What day of week does the 1st fall on? (0=Sun)
    let startDow = firstDay.getDay();
    // Convert to Mon=0
    startDow = startDow === 0 ? 6 : startDow - 1;

    // Build date->minutes map for this month
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const minutesByDate: Record<string, number> = {};
    sessions.forEach((s) => {
      if (s.date.startsWith(monthPrefix)) {
        minutesByDate[s.date] = (minutesByDate[s.date] || 0) + s.duration;
      }
    });

    // Build calendar grid cells
    const cells: { date: string; day: number; inMonth: boolean; minutes: number }[] = [];

    // Leading empty cells
    for (let i = 0; i < startDow; i++) {
      cells.push({ date: '', day: 0, inMonth: false, minutes: 0 });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        date: dateStr,
        day: d,
        inMonth: true,
        minutes: minutesByDate[dateStr] || 0,
      });
    }

    // Trailing empty cells to fill last row
    while (cells.length % 7 !== 0) {
      cells.push({ date: '', day: 0, inMonth: false, minutes: 0 });
    }

    // Stats
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const daysPassed = isCurrentMonth ? today.getDate() : totalDaysInMonth;

    const studiedDays = Object.entries(minutesByDate).filter(([, m]) => m > 0);
    const daysStudied = studiedDays.length;
    const totalMonthMinutes = studiedDays.reduce((a, [, m]) => a + m, 0);
    const bestDay = studiedDays.length > 0
      ? studiedDays.reduce((best, curr) => curr[1] > best[1] ? curr : best)
      : null;

    // Streak calculation for this month (days with >= 60 mins, consecutive up to today)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if ((minutesByDate[dateStr] || 0) >= STREAK_THRESHOLD) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Current streak: consecutive qualifying days ending today (or yesterday if current month)
    if (isCurrentMonth) {
      currentStreak = 0;
      for (let d = today.getDate(); d >= 1; d--) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if ((minutesByDate[dateStr] || 0) >= STREAK_THRESHOLD) {
          currentStreak++;
        } else if (d === today.getDate()) {
          // Today might not be done yet, check yesterday
          continue;
        } else {
          break;
        }
      }
    }

    return {
      calendarDays: cells,
      monthStats: {
        totalMonthMinutes,
        daysStudied,
        daysPassed,
        bestDay,
        currentStreak,
        longestStreak,
      },
    };
  }, [viewDate, sessions]);

  const goToPrevMonth = () => {
    setDirection(-1);
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setDirection(1);
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthLabel = viewDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-foreground">Calendar</h2>

      {/* Calendar card */}
      <div className="p-4 rounded-xl bg-card border border-border card-shadow">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-display text-base font-semibold text-foreground">{monthLabel}</h3>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid with animation */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={monthLabel}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="grid grid-cols-7 gap-1"
          >
            {calendarDays.map((cell, i) => {
              if (!cell.inMonth) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const isToday = cell.date === todayStr;
              const isHovered = hoveredDay === cell.date;

              return (
                <div
                  key={cell.date}
                  className="relative"
                  onMouseEnter={() => setHoveredDay(cell.date)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => setHoveredDay(isHovered ? null : cell.date)}
                >
                  <div
                    className={`aspect-square rounded-md flex items-center justify-center text-[11px] font-medium transition-all cursor-default
                      ${getIntensityClass(cell.minutes)}
                      ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : ''}
                      ${cell.minutes > 0 ? 'text-foreground' : 'text-muted-foreground/60'}
                    `}
                  >
                    {cell.day}
                  </div>

                  {/* Tooltip */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-popover border border-border shadow-lg text-[10px] text-foreground whitespace-nowrap pointer-events-none"
                    >
                      {getIntensityLabel(cell.minutes)}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {[0, 15, 45, 90, 150].map((m) => (
            <div key={m} className={`w-3 h-3 rounded-sm ${getIntensityClass(m)}`} />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>

      {/* Monthly stats */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-card border border-border card-shadow"
        >
          <Clock className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-display font-bold text-foreground">
            {Math.floor(monthStats.totalMonthMinutes / 60)}h {Math.round(monthStats.totalMonthMinutes % 60)}m
          </p>
          <p className="text-xs text-muted-foreground">This Month</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 rounded-lg bg-card border border-border card-shadow"
        >
          <CalendarDays className="w-5 h-5 text-accent mb-2" />
          <p className="text-2xl font-display font-bold text-foreground">
            {monthStats.daysStudied}/{monthStats.daysPassed}
          </p>
          <p className="text-xs text-muted-foreground">Days Studied</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-lg bg-card border border-border card-shadow"
        >
          <Trophy className="w-5 h-5 text-streak mb-2" />
          <p className="text-2xl font-display font-bold text-foreground">
            {monthStats.bestDay ? getIntensityLabel(monthStats.bestDay[1]) : '—'}
          </p>
          <p className="text-xs text-muted-foreground">Best Day</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-4 rounded-lg bg-card border border-border card-shadow"
        >
          <Flame className="w-5 h-5 text-streak mb-2" />
          <p className="text-2xl font-display font-bold text-foreground">
            {monthStats.longestStreak}d
          </p>
          <p className="text-xs text-muted-foreground">Longest Streak (Month)</p>
        </motion.div>
      </div>
    </div>
  );
};

export default CalendarView;
