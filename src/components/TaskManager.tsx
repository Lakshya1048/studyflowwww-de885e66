import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, AlertCircle, Trash2, ChevronLeft, ChevronRight, RotateCcw, Calendar, Search, BookOpen, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { StudyTask } from '@/lib/types';
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

interface RevisionTopic {
  id: string;
  title: string;
  subject: string;
  createdAt: string;
}

const SUBJECTS = ['English', 'Math', 'Physics', 'Chemistry', 'AI', 'IP', 'Other'];

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
  Math: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  Physics: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  Chemistry: 'bg-green-500/15 text-green-700 dark:text-green-300',
  English: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  AI: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  IP: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  // Legacy mappings
  Mathematics: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  Biology: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  History: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  General: 'bg-muted text-muted-foreground',
};

const getSubjectStyle = (subject: string) =>
  priorityColors[subject] || 'bg-primary/10 text-primary';

const TaskManager = () => {
  const [tasks, setTasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [revisions, setRevisions] = useLocalStorage<RevisionItem[]>('studyflow-revisions', []);
  const [revisionTopics, setRevisionTopics] = useLocalStorage<RevisionTopic[]>('studyflow-revision-topics', []);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [needsRevision, setNeedsRevision] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());
  const [activeView, setActiveView] = useState<'tasks' | 'overdue' | 'revision'>('tasks');
  const [searchQuery, setSearchQuery] = useState('');

  // Revision topic add form
  const [revTopicTitle, setRevTopicTitle] = useState('');
  const [revTopicSubject, setRevTopicSubject] = useState('');
  const [revTopicCustomSubject, setRevTopicCustomSubject] = useState('');

  const today = getLocalDateStr();
  const isToday = selectedDate === today;

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setCustomSubject('');
    setDueDate('');
    setNeedsRevision(false);
    setEditingTask(null);
    setShowAdd(false);
  };

  const startEdit = (task: StudyTask) => {
    setEditingTask(task);
    setTitle(task.title);
    const isPreset = SUBJECTS.includes(task.subject);
    if (isPreset) {
      setSubject(task.subject);
      setCustomSubject('');
    } else {
      setSubject('Other');
      setCustomSubject(task.subject);
    }
    setDueDate(task.dueDate);
    setNeedsRevision(task.needsRevision || false);
    setShowAdd(true);
  };

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

  const getResolvedSubject = () => {
    if (subject === 'Other') return customSubject.trim() || 'General';
    return subject || 'General';
  };

  const addTask = () => {
    if (!title.trim()) return;
    const resolvedSubject = getResolvedSubject();
    const task: StudyTask = {
      id: Date.now().toString(),
      title: title.trim(),
      subject: resolvedSubject,
      completed: false,
      dueDate: dueDate || selectedDate,
      createdAt: new Date().toISOString(),
      needsRevision,
    };
    setTasks((prev) => [task, ...prev]);
    scheduleRevisions(task);
    resetForm();
  };

  const saveEdit = () => {
    if (!editingTask || !title.trim()) return;
    const resolvedSubject = getResolvedSubject();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTask.id
          ? { ...t, title: title.trim(), subject: resolvedSubject, dueDate: dueDate || t.dueDate, needsRevision }
          : t
      )
    );
    resetForm();
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

  const toggleReviseFlag = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, needsRevision: !t.needsRevision } : t)));
  }, [setTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setRevisions((prev) => prev.filter((r) => r.taskId !== id));
  }, [setTasks, setRevisions]);

  const toggleRevision = useCallback((id: string) => {
    setRevisions((prev) => prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)));
  }, [setRevisions]);

  const addRevisionTopic = () => {
    if (!revTopicTitle.trim()) return;
    const resolvedSubject = revTopicSubject === 'Other'
      ? (revTopicCustomSubject.trim() || 'General')
      : (revTopicSubject || 'General');
    const topic: RevisionTopic = {
      id: Date.now().toString(),
      title: revTopicTitle.trim(),
      subject: resolvedSubject,
      createdAt: new Date().toISOString(),
    };
    setRevisionTopics((prev) => [topic, ...prev]);
    setRevTopicTitle('');
    setRevTopicSubject('');
    setRevTopicCustomSubject('');
  };

  const deleteRevisionTopic = useCallback((id: string) => {
    setRevisionTopics((prev) => prev.filter((t) => t.id !== id));
  }, [setRevisionTopics]);

  // Filtered lists
  const dateTasks = useMemo(() => tasks.filter((t) => t.dueDate === selectedDate), [tasks, selectedDate]);
  const pendingTasks = useMemo(() => dateTasks.filter((t) => !t.completed), [dateTasks]);
  const completedTasks = useMemo(() => dateTasks.filter((t) => t.completed), [dateTasks]);
  const overdueTasks = useMemo(() => tasks.filter((t) => !t.completed && t.dueDate < today), [tasks, today]);
  const todayRevisions = useMemo(() => revisions.filter((r) => r.revisionDate <= today && !r.completed), [revisions, today]);
  const completedRevisions = useMemo(() => revisions.filter((r) => r.completed), [revisions]);
  const manualReviseTasks = useMemo(() => tasks.filter((t) => t.needsRevision), [tasks]);

  // Search filter
  const filteredPending = useMemo(() => {
    if (!searchQuery) return pendingTasks;
    const q = searchQuery.toLowerCase();
    return pendingTasks.filter(t => t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
  }, [pendingTasks, searchQuery]);

  const totalTaskCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const completionRate = totalTaskCount > 0 ? Math.round((completedCount / totalTaskCount) * 100) : 0;

  const isEditing = !!editingTask;

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
        <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }} className="gap-1.5 shadow-sm">
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
            {(todayRevisions.length + manualReviseTasks.length + revisionTopics.length) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {todayRevisions.length + manualReviseTasks.length + revisionTopics.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Add/Edit task form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{isEditing ? 'Edit Task' : 'New Task'}</p>
                  <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Input
                  placeholder="What do you need to study?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (isEditing ? saveEdit() : addTask())}
                  autoFocus
                  className="font-medium"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={dueDate || selectedDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                {subject === 'Other' && (
                  <Input
                    placeholder="Type custom subject..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                  />
                )}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-foreground font-medium">Mark for revision</span>
                  </div>
                  <Switch checked={needsRevision} onCheckedChange={setNeedsRevision} />
                </div>
                {!isEditing && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Revisions auto-scheduled for +1, +3, +7 days
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={isEditing ? saveEdit : addTask} className="flex-1">
                    {isEditing ? 'Save Changes' : 'Add Task'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
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
                <TaskItem key={task.id} task={task} isOverdue={false} onToggle={toggleTask} onDelete={deleteTask} onEdit={startEdit} onToggleRevise={toggleReviseFlag} index={i} />
              ))}
            </AnimatePresence>
          </div>

          {/* Completed */}
          {completedTasks.length > 0 && (
            <CompletedSection tasks={completedTasks} onToggle={toggleTask} onDelete={deleteTask} onEdit={startEdit} onToggleRevise={toggleReviseFlag} />
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
                <TaskItem key={task.id} task={task} isOverdue onToggle={toggleTask} onDelete={deleteTask} onEdit={startEdit} onToggleRevise={toggleReviseFlag} index={i} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Revision Tab */}
        <TabsContent value="revision" className="space-y-4 mt-3">
          {/* Add standalone revision topic */}
          <div className="p-3 rounded-xl bg-card border border-border space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add Revision Topic</p>
            <div className="flex gap-2">
              <Input
                placeholder="Topic name..."
                value={revTopicTitle}
                onChange={(e) => setRevTopicTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRevisionTopic()}
                className="h-9 text-sm flex-1"
              />
              <Select value={revTopicSubject} onValueChange={setRevTopicSubject}>
                <SelectTrigger className="h-9 w-28">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addRevisionTopic} className="h-9 px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {revTopicSubject === 'Other' && (
              <Input
                placeholder="Custom subject..."
                value={revTopicCustomSubject}
                onChange={(e) => setRevTopicCustomSubject(e.target.value)}
                className="h-9 text-sm"
              />
            )}
          </div>

          {/* Manual revise tasks */}
          {manualReviseTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Marked for Revision ({manualReviseTasks.length})
              </p>
              {manualReviseTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm group"
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${getSubjectStyle(task.subject)}`}>
                        {task.subject}
                      </span>
                      {task.completed && (
                        <span className="text-[10px] text-primary font-medium">✓ Completed</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleReviseFlag(task.id)}
                    className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    Done
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Standalone revision topics */}
          {revisionTopics.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Topics ({revisionTopics.length})
              </p>
              {revisionTopics.map((topic) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{topic.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium mt-1 inline-block ${getSubjectStyle(topic.subject)}`}>
                      {topic.subject}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteRevisionTopic(topic.id)}
                    className="text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Auto-scheduled revisions */}
          {todayRevisions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Auto-Scheduled ({todayRevisions.length})
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

          {todayRevisions.length === 0 && completedRevisions.length === 0 && manualReviseTasks.length === 0 && revisionTopics.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">No revisions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add topics above or toggle revision on tasks</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Sub-components
const TaskItem = ({ task, isOverdue, onToggle, onDelete, onEdit, onToggleRevise, index }: {
  task: StudyTask; isOverdue: boolean; onToggle: (id: string) => void; onDelete: (id: string) => void; onEdit: (task: StudyTask) => void; onToggleRevise: (id: string) => void; index: number;
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
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${getSubjectStyle(task.subject)}`}>
          {task.subject}
        </span>
        {task.needsRevision && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">📌 Revise</span>
        )}
        {isOverdue && (
          <span className="text-[11px] text-destructive font-medium flex items-center gap-0.5">
            <AlertCircle className="w-3 h-3" /> Due {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
      <button onClick={() => onEdit(task)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onDelete(task.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </motion.div>
);

const CompletedSection = ({ tasks, onToggle, onDelete, onEdit, onToggleRevise }: {
  tasks: StudyTask[]; onToggle: (id: string) => void; onDelete: (id: string) => void; onEdit: (task: StudyTask) => void; onToggleRevise: (id: string) => void;
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
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground line-through truncate">{task.title}</p>
          {task.needsRevision && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">📌 Revise</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={() => onEdit(task)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
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
