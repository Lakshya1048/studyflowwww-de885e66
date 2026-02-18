import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, AlertCircle, Trash2 } from 'lucide-react';
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

  const addTask = () => {
    if (!title.trim()) return;
    const task: StudyTask = {
      id: Date.now().toString(),
      title: title.trim(),
      subject: subject.trim() || 'General',
      completed: false,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
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

  const today = new Date().toISOString().split('T')[0];
  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const overdueTasks = pendingTasks.filter((t) => t.dueDate < today);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {pendingTasks.length} pending{overdueTasks.length > 0 && `, ${overdueTasks.length} overdue`}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
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
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
            const isOverdue = task.dueDate < today;
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
                    <span className={`text-xs ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {isOverdue && <AlertCircle className="w-3 h-3 inline mr-0.5" />}
                      Due {task.dueDate}
                    </span>
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
          {completedTasks.slice(0, 5).map((task) => (
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

      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No tasks yet</p>
          <p className="text-xs">Add your homework and assignments</p>
        </div>
      )}
    </div>
  );
};

const CheckSquare = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

export default TaskManager;
