import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, AlertCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { StudyTask } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const TaskManager = () => {
  const [tasks, setTasks] = useLocalStorage<StudyTask[]>('studyflow-tasks', []);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');

  const getLocalDateStr = (date: Date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Date navigation
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(getLocalDateStr(d));
  };

  const isToday = selectedDate === getLocalDateStr();

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
  };

  const today = getLocalDateStr();
  const dateTasks = tasks.filter((t) => t.dueDate === selectedDate);
  const pendingTasks = dateTasks.filter((t) => !t.completed);
  const completedTasks = dateTasks.filter((t) => t.completed);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {pendingTasks.length} pending for {isToday ? 'today' : formatDate(selectedDate)}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Date navigator */}
      <div className="flex items-center justify-center gap-3 p-2 rounded-lg bg-card border border-border card-shadow">
        <button onClick={() => changeDate(-1)} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="text-center min-w-[140px]">
          <p className="text-sm font-semibold text-foreground">{formatDate(selectedDate)}</p>
          {isToday && <p className="text-xs text-primary font-medium">Today</p>}
        </div>
        <button onClick={() => changeDate(1)} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(getLocalDateStr())}
            className="text-xs text-primary hover:underline ml-1"
          >
            Today
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-lg bg-card border border-border card-shadow space-y-3">
              <Input placeholder="Task title..." value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input
                placeholder="Subject (e.g. Mathematics, Physics...)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Due Date</label>
                <Input type="date" value={dueDate || selectedDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addTask}>Add Task</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Tasks */}
      <div className="space-y-2">
        <AnimatePresence>
          {pendingTasks.map((task) => {
            const isOverdue = task.dueDate < today && !task.completed;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isOverdue ? 'bg-destructive/5 border-destructive/30' : 'bg-card border-border card-shadow'
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-5 h-5 rounded-md border-2 border-border hover:border-primary flex-shrink-0 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{task.subject}</span>
                    {isOverdue && (
                      <span className="text-xs text-destructive font-medium flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Completed */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed ({completedTasks.length})</p>
          {completedTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <button
                onClick={() => toggleTask(task.id)}
                className="w-5 h-5 rounded-md bg-success border-2 border-success flex items-center justify-center flex-shrink-0"
              >
                <Check className="w-3 h-3 text-success-foreground" />
              </button>
              <p className="text-sm text-muted-foreground line-through truncate">{task.title}</p>
              <button onClick={() => deleteTask(task.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {dateTasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <p className="text-sm">No tasks for {isToday ? 'today' : formatDate(selectedDate)}</p>
          <p className="text-xs">Add a task to get started</p>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
