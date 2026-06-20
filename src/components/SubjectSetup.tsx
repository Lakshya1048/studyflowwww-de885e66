import { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SubjectSetupProps {
  onComplete: (subjects: string[]) => void;
}

const PRESETS: Record<string, string[]> = {
  'Class 9': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi'],
  'Class 10': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi'],
  'Class 11 (PCM)': ['Physics', 'Chemistry', 'Mathematics', 'English'],
  'Class 11 (PCB)': ['Physics', 'Chemistry', 'Biology', 'English'],
  'Class 12 (PCM)': ['Physics', 'Chemistry', 'Mathematics', 'English'],
  'Class 12 (PCB)': ['Physics', 'Chemistry', 'Biology', 'English'],
  'JEE': ['Physics', 'Chemistry', 'Mathematics'],
  'NEET': ['Physics', 'Chemistry', 'Botany', 'Zoology'],
  'Custom': [],
};

const SubjectSetup = ({ onComplete }: SubjectSetupProps) => {
  const [preset, setPreset] = useState<string>('Class 11 (PCM)');
  const [subjects, setSubjects] = useState<string[]>(PRESETS['Class 11 (PCM)']);
  const [newSubject, setNewSubject] = useState('');

  const applyPreset = (val: string) => {
    setPreset(val);
    setSubjects(PRESETS[val] || []);
  };

  const addSubject = () => {
    const s = newSubject.trim();
    if (s && !subjects.includes(s)) setSubjects([...subjects, s]);
    setNewSubject('');
  };

  const removeSubject = (s: string) => setSubjects(subjects.filter((x) => x !== s));

  const finish = () => {
    if (subjects.length === 0) return;
    try {
      localStorage.setItem('studyflow-subjects-setup-done', 'true');
    } catch {}
    onComplete(subjects);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Pick your subjects</h2>
          <p className="text-sm text-muted-foreground">Choose a class preset or build your own list. You can change this later in Settings.</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Class / Exam
            </label>
            <select
              value={preset}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.keys(PRESETS).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Your Subjects ({subjects.length})
            </label>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-lg bg-muted/40 border border-border">
              {subjects.length === 0 && (
                <span className="text-xs text-muted-foreground italic px-1 py-1">Add subjects below</span>
              )}
              {subjects.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {s}
                  <button onClick={() => removeSubject(s)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubject()}
              placeholder="Add custom subject (e.g. Computer Science)"
              className="flex-1"
            />
            <Button type="button" variant="outline" size="icon" onClick={addSubject}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button onClick={finish} disabled={subjects.length === 0} size="lg" className="w-full mt-5 gap-2">
          <Check className="w-4 h-4" /> Continue
        </Button>
      </motion.div>
    </div>
  );
};

export default SubjectSetup;
