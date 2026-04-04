import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, AlertCircle, Trash2, ChevronLeft, ChevronRight, RotateCcw, Calendar, Search, BookOpen, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { StudyTask, TaskCategory } from '@/lib/types';
import { TASK_CATEGORIES } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// RevisionItem type kept for backward compat but no longer auto-created
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
  Mathematics: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  Biology: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  History: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  General: 'bg-muted text-muted-foreground',
};

const categoryColors: Record<TaskCategory, string> = {
  'Coaching': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  'Arjuna Batch': 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'School': 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  'Self Study': 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
};

const categoryEmojis: Record<TaskCategory, string> = {
  'Coaching': '🏫',
  'Arjuna Batch': '🎯',
  'School': '📚',
  'Self Study': '💡',
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
  const [category, setCategory] = useState<TaskCategory>('Self Study');
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());
  const [activeView, setActiveView] = useState<'tasks' | 'overdue' | 'revision'>('tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useLocalStorage<string[]>('studyflow-collapsed-cats', []);
  const [addingForCategory, setAddingForCategory] = useState<TaskCategory | null>(null);

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
    setCategory('Self Study');
    setEditingTask(null);
    setShowAdd(false);
    setAddingForCategory(null);
  };

  const startAdd = (cat?: TaskCategory) => {
    resetForm();
    if (cat) setCategory(cat);
    setAddingForCategory(cat || null);
    setShowAdd(true);
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
    setCategory(task.category || 'Self Study');
    setShowAdd(true);
  };

  const changeDate = useCallback((offset: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() + offset);
      return getLocalDateStr(d);
    });
  }, []);

  // Revision topic editing
  const [editingTopic, setEditingTopic] = useState<RevisionTopic | null>(null);

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
      category,
    };
    setTasks((prev) => [task, ...prev]);
    resetForm();
  };

  const saveEdit = () => {
    if (!editingTask || !title.trim()) return;
    const resolvedSubject = getResolvedSubject();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTask.id
          ? { ...t, title: title.trim(), subject: resolvedSubject, dueDate: dueDate || t.dueDate, needsRevision, category }
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

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setRevisions((prev) => prev.filter((r) => r.taskId !== id));
  }, [setTasks, setRevisions]);

  const toggleRevision = useCallback((id: string) => {
    setRevisions((prev) => prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)));
  }, [setRevisions]);

  const toggleReviseFlag = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, needsRevision: !t.needsRevision } : t)));
  }, [setTasks]);

  const addRevisionTopic = () => {
    if (!revTopicTitle.trim()) return;
    const resolvedSubject = revTopicSubject === 'Other'
      ? (revTopicCustomSubject.trim() || 'General')
      : (revTopicSubject || 'General');

    if (editingTopic) {
      setRevisionTopics((prev) =>
        prev.map((t) =>
          t.id === editingTopic.id
            ? { ...t, title: revTopicTitle.trim(), subject: resolvedSubject }
            : t
        )
      );
      setEditingTopic(null);
    } else {
      const topic: RevisionTopic = {
        id: Date.now().toString(),
        title: revTopicTitle.trim(),
        subject: resolvedSubject,
        createdAt: new Date().toISOString(),
      };
      setRevisionTopics((prev) => [topic, ...prev]);
    }
    setRevTopicTitle('');
    setRevTopicSubject('');
    setRevTopicCustomSubject('');
  };

  const deleteRevisionTopic = useCallback((id: string) => {
    setRevisionTopics((prev) => prev.filter((t) => t.id !== id));
    if (editingTopic?.id === id) {
      setEditingTopic(null);
      setRevTopicTitle('');
      setRevTopicSubject('');
      setRevTopicCustomSubject('');
    }
  }, [setRevisionTopics, editingTopic]);

  const startEditTopic = (topic: RevisionTopic) => {
    setEditingTopic(topic);
    setRevTopicTitle(topic.title);
    const isPreset = SUBJECTS.includes(topic.subject);
    if (isPreset) {
      setRevTopicSubject(topic.subject);
      setRevTopicCustomSubject('');
    } else {
      setRevTopicSubject('Other');
      setRevTopicCustomSubject(topic.subject);
    }
  };

  const cancelEditTopic = () => {
    setEditingTopic(null);
    setRevTopicTitle('');
    setRevTopicSubject('');
    setRevTopicCustomSubject('');
  };

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Filtered lists
  const dateTasks = useMemo(() => tasks.filter((t) => t.dueDate === selectedDate), [tasks, selectedDate]);
  const overdueTasks = useMemo(() => tasks.filter((t) => !t.completed && t.dueDate < today), [tasks, today]);
  const todayRevisions = useMemo(() => revisions.filter((r) => r.revisionDate <= today && !r.completed), [revisions, today]);
  const completedRevisions = useMemo(() => revisions.filter((r) => r.completed), [revisions]);
  const manualReviseTasks = useMemo(() => tasks.filter((t) => t.needsRevision), [tasks]);

  // Search filter
  const filteredDateTasks = useMemo(() => {
    if (!searchQuery) return dateTasks;
    const q = searchQuery.toLowerCase();
    return dateTasks.filter(t => t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
  }, [dateTasks, searchQuery]);

  const totalTaskCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const completionRate = totalTaskCount > 0 ? Math.round((completedCount / totalTaskCount) * 100) : 0;

  const isEditing = !!editingTask;

  // Group tasks by category for the daily view
  const tasksByCategory = useMemo(() => {
    const grouped: Record<TaskCategory, { pending: StudyTask[]; completed: StudyTask[] }> = {
      'Coaching': { pending: [], completed: [] },
      'Arjuna Batch': { pending: [], completed: [] },
      'School': { pending: [], completed: [] },
      'Self Study': { pending: [], completed: [] },
    };
    filteredDateTasks.forEach((t) => {
      const cat = t.category || 'Self Study';
      if (grouped[cat]) {
        if (t.completed) grouped[cat].completed.push(t);
        else grouped[cat].pending.push(t);
      } else {
        if (t.completed) grouped['Self Study'].completed.push(t);
        else grouped['Self Study'].pending.push(t);
      }
    });
    return grouped;
  }, [filteredDateTasks]);

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
        <Button size="sm" onClick={() => startAdd()} className="gap-1.5 shadow-sm">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <p className="text-lg font-bold font-display text-foreground">{dateTasks.filter(t => !t.completed).length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Today</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <p className={`text-lg font-bold font-display ${overdueTasks.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {overdueTasks.length}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overdue</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <p className="text-lg font-bold font-display text-primary">{manualReviseTasks.length + revisionTopics.length}</p>
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
            {(manualReviseTasks.length + revisionTopics.length) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {manualReviseTasks.length + revisionTopics.length}
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
                  <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{categoryEmojis[c]} {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {subject === 'Other' && (
                  <Input
                    placeholder="Type custom subject..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                  />
                )}
                <Input type="date" value={dueDate || selectedDate} onChange={(e) => setDueDate(e.target.value)} />
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-foreground font-medium">Mark for revision</span>
                  </div>
                  <Switch checked={needsRevision} onCheckedChange={setNeedsRevision} />
                </div>
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

        {/* Daily Tasks — categorized */}
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

          {/* Category sections */}
          {TASK_CATEGORIES.map((cat) => {
            const { pending, completed: catCompleted } = tasksByCategory[cat];
            const total = pending.length + catCompleted.length;
            const isCollapsed = collapsedCategories.includes(cat);

            return (
              <div key={cat} className="rounded-xl border border-border overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => toggleCategoryCollapse(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{categoryEmojis[cat]}</span>
                    <span className="text-sm font-semibold text-foreground">{cat}</span>
                    {total > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${categoryColors[cat]}`}>
                        {pending.length}/{total}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startAdd(cat);
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Category tasks */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-1.5">
                        {pending.length === 0 && catCompleted.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">No tasks here yet</p>
                        )}
                        {pending.map((task, i) => (
                          <TaskItem key={task.id} task={task} isOverdue={false} onToggle={toggleTask} onDelete={deleteTask} onEdit={startEdit} index={i} />
                        ))}
                        {catCompleted.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Done ({catCompleted.length})</p>
                            {catCompleted.map((task) => (
                              <CompletedTaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onEdit={startEdit} />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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
                <TaskItem key={task.id} task={task} isOverdue onToggle={toggleTask} onDelete={deleteTask} onEdit={startEdit} index={i} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Revision Tab */}
        <TabsContent value="revision" className="space-y-4 mt-3">
          {/* Add/Edit standalone revision topic */}
          <div className="p-3 rounded-xl bg-card border border-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {editingTopic ? 'Edit Revision Topic' : 'Add Revision Topic'}
              </p>
              {editingTopic && (
                <button onClick={cancelEditTopic} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
                {editingTopic ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
                  className={`flex items-center gap-3 p-3.5 rounded-xl bg-card border shadow-sm group ${
                    editingTopic?.id === topic.id ? 'border-primary' : 'border-border'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{topic.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium mt-1 inline-block ${getSubjectStyle(topic.subject)}`}>
                      {topic.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => startEditTopic(topic)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteRevisionTopic(topic.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {manualReviseTasks.length === 0 && revisionTopics.length === 0 && (
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
const TaskItem = ({ task, isOverdue, onToggle, onDelete, onEdit, index }: {
  task: StudyTask; isOverdue: boolean; onToggle: (id: string) => void; onDelete: (id: string) => void; onEdit: (task: StudyTask) => void; index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
    transition={{ delay: index * 0.03 }}
    className={`flex items-center gap-3 p-3 rounded-lg border transition-all group ${
      isOverdue ? 'bg-destructive/5 border-destructive/20' : 'bg-background/50 border-border'
    }`}
  >
    <button
      onClick={() => onToggle(task.id)}
      className="w-5 h-5 rounded-md border-2 border-border hover:border-primary flex-shrink-0 transition-all active:scale-90 hover:bg-primary/5"
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getSubjectStyle(task.subject)}`}>
          {task.subject}
        </span>
        {task.needsRevision && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">📌</span>
        )}
        {isOverdue && (
          <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5">
            <AlertCircle className="w-3 h-3" /> {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
      <button onClick={() => onEdit(task)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onDelete(task.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </motion.div>
);

const CompletedTaskItem = ({ task, onToggle, onDelete, onEdit }: {
  task: StudyTask; onToggle: (id: string) => void; onDelete: (id: string) => void; onEdit: (task: StudyTask) => void;
}) => (
  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 group">
    <button
      onClick={() => onToggle(task.id)}
      className="w-4 h-4 rounded bg-primary border-2 border-primary flex items-center justify-center flex-shrink-0 active:scale-90"
    >
      <Check className="w-2.5 h-2.5 text-primary-foreground" />
    </button>
    <p className="text-xs text-muted-foreground line-through truncate flex-1">{task.title}</p>
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
      <button onClick={() => onEdit(task)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
        <Pencil className="w-3 h-3" />
      </button>
      <button onClick={() => onDelete(task.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  </div>
);

export default TaskManager;
