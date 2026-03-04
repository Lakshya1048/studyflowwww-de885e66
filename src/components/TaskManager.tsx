import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, AlertCircle, Trash2, ChevronLeft, ChevronRight, RotateCcw, Calendar, Search, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { StudyTask, StudySession } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface RevisionItem {
  id: string;
  taskId: string;
  taskTitle: string;
  subject: string;
  originalDate: string;
  revisionDate: string;
  completed: boolean;
}

const getLocalDateStr = (date: Date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
};

const priorityColors: Record<string, string> = {
  Mathematics: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  Physics: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  Chemistry: 'bg-green-500/15 text-green-700 dark:text-green-300',
  Biology: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  English: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  History: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  General: 'bg-muted text-muted-foreground',
};

const getSubjectStyle = (subject: string) =>
  priorityColors[subject] || 'bg-primary/10 text-primary';

const TaskManager = () => {
  const [tasks, setTasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [revisions, setRevisions] = useLocalStorage<RevisionItem[]>('studyflow-revisions', []);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());
  const [activeView, setActiveView] = useState<'tasks' | 'overdue' | 'revision'>('tasks');
  const [searchQuery, setSearchQuery] = useState('');

  const today = getLocalDateStr();
  const isToday = selectedDate === today;

  const changeDate = useCallback((offset: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() + offset);
      return getLocalDateStr(d);
    });
  }, []);

  const scheduleRevisions = useCallback((task: StudyTask) => {
    const base = new Date(task.dueDate + 'T00:00:00');
    const offsets = [1, 3, 7];
    const newRevisions: RevisionItem[] = offsets.map((offset) => {
      const d = new Date(base);
      d.setDate(d.getDate() + offset);
      return {
        id: `${task.id}-rev-${offset}`,
        taskId: task.id,
        taskTitle: task.title,
        subject: task.subject,
        originalDate: task.dueDate,
        revisionDate: getLocalDateStr(d),
        completed: false,
      };
    });
    setRevisions((prev) => [...newRevisions, ...prev]);
  }, [setRevisions]);

  const addTask = () => {
    if (!title.trim()) return;
    const task: StudyTask = {
      id: Date.now().toString(),
      title: title.trim(),
      subject: subject.trim() || 'General',
      completed: false,
      dueDate: dueDate || selectedDate,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [task, ...prev]);
    scheduleRevisions(task);
    setTitle('');
    setSubject('');
    setDueDate('');
    setShowAdd(false);
  };

  const [activeDays, setActiveDays] = useLocalStorage<string[]>('studyflow-active-days', []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task && !task.completed) {
        const today = getLocalDateStr();
        setActiveDays((days) => days.includes(today) ? days : [...days, today]);
      }
      return prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    });
  }, [setTasks, setActiveDays]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setRevisions((prev) => prev.filter((r) => r.taskId !== id));
  }, [setTasks, setRevisions]);

  const toggleRevision = useCallback((id: string) => {
    setRevisions((prev) => prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)));
  }, [setRevisions]);

  // Filtered lists
  const dateTasks = useMemo(() => tasks.filter((t) => t.dueDate === selectedDate), [tasks, selectedDate]);
  const pendingTasks = useMemo(() => dateTasks.filter((t) => !t.completed), [dateTasks]);
  const completedTasks = useMemo(() => dateTasks.filter((t) => t.completed), [dateTasks]);
  const overdueTasks = useMemo(() => tasks.filter((t) => !t.completed && t.dueDate < today), [tasks, today]);
  const todayRevisions = useMemo(() => revisions.filter((r) => r.revisionDate <= today && !r.completed), [revisions, today]);
  const completedRevisions = useMemo(() => revisions.filter((r) => r.completed), [revisions]);

  // Search filter
  const filteredPending = useMemo(() => {
    if (!searchQuery) return pendingTasks;
    const q = searchQuery.toLowerCase();
    return pendingTasks.filter(t => t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
  }, [pendingTasks, searchQuery]);

  const totalTaskCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const completionRate = totalTaskCount > 0 ? Math.round((completedCount / totalTaskCount) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header with stats */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Tasks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {completedCount}/{totalTaskCount} completed · {completionRate}% done
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5 shadow-sm">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <p className="text-lg font-bold font-display text-foreground">{pendingTasks.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Today</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <p className={`text-lg font-bold font-display ${overdueTasks.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {overdueTasks.length}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overdue</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <p className="text-lg font-bold font-display text-primary">{todayRevisions.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revisions</p>
        </div>
      </div>

      {/* View tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
        <TabsList className="w-full">
          <TabsTrigger value="tasks" className="flex-1 text-xs gap-1">
            <Calendar className="w-3.5 h-3.5" /> Daily
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex-1 text-xs gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Overdue
            {overdueTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {overdueTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="revision" className="flex-1 text-xs gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Revision
            {todayRevisions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {todayRevisions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Add task form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-3 mt-3">
                <Input
                  placeholder="What do you need to study?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  autoFocus
                  className="font-medium"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                  <Input type="date" value={dueDate || selectedDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Revisions auto-scheduled for +1, +3, +7 days
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addTask} className="flex-1">Add Task</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily Tasks */}
        <TabsContent value="tasks" className="space-y-3 mt-3">
          {/* Date navigator */}
          <div className="flex items-center justify-center gap-3 p-2.5 rounded-xl bg-card border border-border">
            <button onClick={() => changeDate(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors active:scale-95">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="text-center min-w-[140px]">
              <p className="text-sm font-semibold text-foreground">{isToday ? 'Today' : formatDate(selectedDate)}</p>
              {isToday && <p className="text-xs text-muted-foreground">{formatDate(selectedDate)}</p>}
            </div>
            <button onClick={() => changeDate(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors active:scale-95">
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
            {!isToday && (
              <button onClick={() => setSelectedDate(today)} className="text-xs text-primary hover:underline ml-1">↩ Today</button>
            )}
          </div>

          {/* Search */}
          {dateTasks.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}

          {/* Pending */}
          <div className="space-y-2">
            <AnimatePresence>
              {filteredPending.map((task, i) => (
                <TaskItem key={task.id} task={task} isOverdue={false} onToggle={toggleTask} onDelete={deleteTask} index={i} />
              ))}
            </AnimatePresence>
          </div>

          {/* Completed */}
          {completedTasks.length > 0 && (
            <CompletedSection tasks={completedTasks} onToggle={toggleTask} onDelete={deleteTask} />
          )}

          {dateTasks.length === 0 && <EmptyState label={isToday ? 'today' : formatDate(selectedDate)} />}
        </TabsContent>

        {/* Overdue Tasks */}
        <TabsContent value="overdue" className="space-y-2 mt-3">
          {overdueTasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No overdue tasks 🎉</p>
            </div>
          ) : (
            <AnimatePresence>
              {overdueTasks.map((task, i) => (
                <TaskItem key={task.id} task={task} isOverdue onToggle={toggleTask} onDelete={deleteTask} index={i} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Revision Tab */}
        <TabsContent value="revision" className="space-y-3 mt-3">
          {todayRevisions.length === 0 && completedRevisions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">No revisions scheduled</p>
              <p className="text-xs text-muted-foreground mt-1">Add tasks to auto-schedule revisions</p>
            </div>
          ) : (
            <>
              {todayRevisions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Due for Revision ({todayRevisions.length})
                  </p>
                  {todayRevisions.map((rev) => (
                    <motion.div
                      key={rev.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm"
                    >
                      <button
                        onClick={() => toggleRevision(rev.id)}
                        className="w-5 h-5 rounded-md border-2 border-primary/50 hover:border-primary flex-shrink-0 transition-colors active:scale-90"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{rev.taskTitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${getSubjectStyle(rev.subject)}`}>
                            {rev.subject}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            from {formatDate(rev.originalDate)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium flex-shrink-0">
                        <RotateCcw className="w-3 h-3 inline mr-1" />
                        Revise
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}

              {completedRevisions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Completed ({completedRevisions.length})
                  </p>
                  {completedRevisions.slice(0, 10).map((rev) => (
                    <div key={rev.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <button
                        onClick={() => toggleRevision(rev.id)}
                        className="w-5 h-5 rounded-md bg-primary border-2 border-primary flex items-center justify-center flex-shrink-0"
                      >
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </button>
                      <p className="text-sm text-muted-foreground line-through truncate">{rev.taskTitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Sub-components
const TaskItem = ({ task, isOverdue, onToggle, onDelete, index }: {
  task: StudyTask; isOverdue: boolean; onToggle: (id: string) => void; onDelete: (id: string) => void; index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
    transition={{ delay: index * 0.03 }}
    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all group ${
      isOverdue ? 'bg-destructive/5 border-destructive/20' : 'bg-card border-border shadow-sm'
    }`}
  >
    <button
      onClick={() => onToggle(task.id)}
      className="w-5 h-5 rounded-md border-2 border-border hover:border-primary flex-shrink-0 transition-all active:scale-90 hover:bg-primary/5"
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${getSubjectStyle(task.subject)}`}>
          {task.subject}
        </span>
        {isOverdue && (
          <span className="text-[11px] text-destructive font-medium flex items-center gap-0.5">
            <AlertCircle className="w-3 h-3" /> Due {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
    <button
      onClick={() => onDelete(task.id)}
      className="text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100 active:scale-90"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </motion.div>
);

const CompletedSection = ({ tasks, onToggle, onDelete }: {
  tasks: StudyTask[]; onToggle: (id: string) => void; onDelete: (id: string) => void;
}) => (
  <div className="space-y-2">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      Completed ({tasks.length})
    </p>
    {tasks.map((task) => (
      <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 group">
        <button
          onClick={() => onToggle(task.id)}
          className="w-5 h-5 rounded-md bg-primary border-2 border-primary flex items-center justify-center flex-shrink-0 active:scale-90"
        >
          <Check className="w-3 h-3 text-primary-foreground" />
        </button>
        <p className="text-sm text-muted-foreground line-through truncate flex-1">{task.title}</p>
        <button
          onClick={() => onDelete(task.id)}
          className="ml-auto text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    ))}
  </div>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="text-center py-10 text-muted-foreground">
    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
      <Calendar className="w-7 h-7 text-muted-foreground/60" />
    </div>
    <p className="text-sm font-semibold text-foreground">No tasks for {label}</p>
    <p className="text-xs text-muted-foreground mt-1">Tap "Add Task" to get started</p>
  </div>
);

export default TaskManager;
