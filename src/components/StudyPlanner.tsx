import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TimeSlot } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Computer Science', 'Other'];

const StudyPlanner = () => {
  const today = new Date().toISOString().split('T')[0];
  const [slots, setSlots] = useLocalStorage<TimeSlot[]>(`studyflow-plan-${today}`, []);
  const [showAdd, setShowAdd] = useState(false);
  const [newSubject, setNewSubject] = useState(SUBJECTS[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const addSlot = () => {
    const slot: TimeSlot = {
      id: Date.now().toString(),
      subject: newSubject,
      startTime,
      endTime,
      completed: false,
    };
    setSlots((prev) => [...prev, slot].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    setShowAdd(false);
  };

  const toggleSlot = (id: string) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
  };

  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const completedCount = slots.filter((s) => s.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Today's Plan</h2>
          <p className="text-sm text-muted-foreground">
            {completedCount}/{slots.length} sessions completed
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Session
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
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Subject</label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Start</label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">End</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addSlot}>Add</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      {slots.length > 0 && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / slots.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {/* Slots */}
      <div className="space-y-2">
        <AnimatePresence>
          {slots.map((slot) => (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                slot.completed
                  ? 'bg-success/10 border-success/30'
                  : 'bg-card border-border card-shadow'
              }`}
            >
              <button
                onClick={() => toggleSlot(slot.id)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                  slot.completed
                    ? 'bg-success border-success'
                    : 'border-border hover:border-primary'
                }`}
              >
                {slot.completed && <Check className="w-3 h-3 text-success-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${slot.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {slot.subject}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {slot.startTime} – {slot.endTime}
                </p>
              </div>
              <button onClick={() => removeSlot(slot.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {slots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No sessions planned for today</p>
            <p className="text-xs">Add your first study session above</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlanner;
