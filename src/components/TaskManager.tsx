import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, AlertCircle, Trash2, ChevronLeft, ChevronRight, RotateCcw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

const TaskManager = () => {
  const [tasks, setTasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [revisions, setRevisions] = useLocalStorage<RevisionItem[]>('studyflow-revisions', []);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());
  const [activeView, setActiveView] = useState<'tasks' | 'overdue' | 'revision'>('tasks');

  const today = getLocalDateStr();
  const isToday = selectedDate === today;

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(getLocalDateStr(d));
  };

  // Auto-schedule revisions: day+1, day+3, day+7
  const scheduleRevisions = (task: StudyTask) => {
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
  };

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

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setRevisions((prev) => prev.filter((r) => r.taskId !== id));
  };

  const toggleRevision = (id: string) => {
    setRevisions((prev) => prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)));
  };

  // Filtered lists
  const dateTasks = tasks.filter((t) => t.dueDate === selectedDate);
  const pendingTasks = dateTasks.filter((t) => !t.completed);
  const completedTasks = dateTasks.filter((t) => t.completed);
  const overdueTasks = tasks.filter((t) => !t.completed && t.dueDate < today);

  const todayRevisions = revisions.filter((r) => r.revisionDate <= today && !r.completed);
  const completedRevisions = revisions.filter((r) => r.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {pendingTasks.length} pending{overdueTasks.length > 0 ? ` · ${overdueTasks.length} overdue` : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
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
              <div className="p-4 rounded-lg bg-card border border-border card-shadow space-y-3 mt-3">
                <Input placeholder="Task title..." value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input placeholder="Subject (e.g. Mathematics, Physics...)" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Due Date</label>
                  <Input type="date" value={dueDate || selectedDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">📌 Revisions auto-scheduled for +1, +3, +7 days</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addTask}>Add Task</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily Tasks */}
        <TabsContent value="tasks" className="space-y-3 mt-3">
          {/* Date navigator */}
          <div className="flex items-center justify-center gap-3 p-2 rounded-lg bg-card border border-border card-shadow">
            <button onClick={() => changeDate(-1)} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="text-center min-w-[140px]">
              <p className="text-sm font-semibold text-foreground">{isToday ? 'Today' : formatDate(selectedDate)}</p>
              {isToday && <p className="text-xs text-muted-foreground">{formatDate(selectedDate)}</p>}
            </div>
            <button onClick={() => changeDate(1)} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
            {!isToday && (
              <button onClick={() => setSelectedDate(today)} className="text-xs text-primary hover:underline ml-1">↩ Back</button>
            )}
          </div>

          {/* Pending */}
          <div className="space-y-2">
            <AnimatePresence>
              {pendingTasks.map((task) => (
                <TaskItem key={task.id} task={task} isOverdue={false} onToggle={toggleTask} onDelete={deleteTask} />
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
            <div className="text-center py-8 text-muted-foreground">
              <Check className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">All caught up! No overdue tasks 🎉</p>
            </div>
          ) : (
            <AnimatePresence>
              {overdueTasks.map((task) => (
                <TaskItem key={task.id} task={task} isOverdue onToggle={toggleTask} onDelete={deleteTask} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Revision Tab */}
        <TabsContent value="revision" className="space-y-3 mt-3">
          {todayRevisions.length === 0 && completedRevisions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No revisions scheduled</p>
              <p className="text-xs">Add tasks to auto-schedule revisions</p>
            </div>
          ) : (
            <>
              {todayRevisions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due for Revision ({todayRevisions.length})</p>
                  {todayRevisions.map((rev) => (
                    <motion.div
                      key={rev.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border card-shadow"
                    >
                      <button
                        onClick={() => toggleRevision(rev.id)}
                        className="w-5 h-5 rounded-md border-2 border-primary/50 hover:border-primary flex-shrink-0 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{rev.taskTitle}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{rev.subject}</span>
                          <span className="text-xs text-muted-foreground">
                            Originally: {formatDate(rev.originalDate)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium flex-shrink-0">
                        <RotateCcw className="w-3 h-3 inline mr-1" />
                        Revise
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}

              {completedRevisions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed ({completedRevisions.length})</p>
                  {completedRevisions.slice(0, 10).map((rev) => (
                    <div key={rev.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <button
                        onClick={() => toggleRevision(rev.id)}
                        className="w-5 h-5 rounded-md bg-success border-2 border-success flex items-center justify-center flex-shrink-0"
                      >
                        <Check className="w-3 h-3 text-success-foreground" />
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
const TaskItem = ({ task, isOverdue, onToggle, onDelete }: { task: StudyTask; isOverdue: boolean; onToggle: (id: string) => void; onDelete: (id: string) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -50 }}
    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
      isOverdue ? 'bg-destructive/5 border-destructive/30' : 'bg-card border-border card-shadow'
    }`}
  >
    <button
      onClick={() => onToggle(task.id)}
      className="w-5 h-5 rounded-md border-2 border-border hover:border-primary flex-shrink-0 transition-colors"
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{task.subject}</span>
        {isOverdue && (
          <span className="text-xs text-destructive font-medium flex items-center gap-0.5">
            <AlertCircle className="w-3 h-3" /> Due {task.dueDate}
          </span>
        )}
      </div>
    </div>
    <button onClick={() => onDelete(task.id)} className="text-muted-foreground hover:text-destructive transition-colors">
      <Trash2 className="w-4 h-4" />
    </button>
  </motion.div>
);

const CompletedSection = ({ tasks, onToggle, onDelete }: { tasks: StudyTask[]; onToggle: (id: string) => void; onDelete: (id: string) => void }) => (
  <div className="space-y-2">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed ({tasks.length})</p>
    {tasks.map((task) => (
      <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <button
          onClick={() => onToggle(task.id)}
          className="w-5 h-5 rounded-md bg-success border-2 border-success flex items-center justify-center flex-shrink-0"
        >
          <Check className="w-3 h-3 text-success-foreground" />
        </button>
        <p className="text-sm text-muted-foreground line-through truncate">{task.title}</p>
        <button onClick={() => onDelete(task.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    ))}
  </div>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="text-center py-8 text-muted-foreground">
    <svg className="w-8 h-8 mx-auto mb-2 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
    <p className="text-sm">No tasks for {label}</p>
    <p className="text-xs">Add a task to get started</p>
  </div>
);

export default TaskManager;
