import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Target, Save, Moon, Sun, Trash2, Bell, BellOff, Clock, Volume2, VolumeX, Shield, Palette, Info, Download, Upload, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Profile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface AppSettings {
  notificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  soundEnabled: boolean;
  autoStartBreak: boolean;
  showStreakOnDashboard: boolean;
  compactMode: boolean;
  weekStartsMonday: boolean;
  defaultTimerMinutes: number;
  showRevisionReminders: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: 22,
  quietHoursEnd: 7,
  soundEnabled: true,
  autoStartBreak: false,
  showStreakOnDashboard: true,
  compactMode: false,
  weekStartsMonday: true,
  defaultTimerMinutes: 25,
  showRevisionReminders: true,
};

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onUpdateProfile: (updates: Partial<Profile>) => void;
}

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary' : 'bg-muted'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

// Setting row with built-in info hint
const SettingRow = ({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => {
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center justify-between group">
        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
        >
          {icon}
          <span className="text-sm text-foreground">{label}</span>
          <HelpCircle className={`w-3 h-3 transition-colors flex-shrink-0 ${showHint ? 'text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground'}`} />
        </button>
        <Toggle checked={checked} onChange={onChange} />
      </div>
      <AnimatePresence>
        {showHint && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] text-muted-foreground leading-relaxed pl-6 pt-1 overflow-hidden"
          >
            💡 {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsPanel = ({ open, onClose, profile, onUpdateProfile }: SettingsPanelProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(profile?.display_name || '');
  const [goalMinutes, setGoalMinutes] = useState(profile?.daily_goal_minutes ?? 60);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [settings, setSettings] = useLocalStorage<AppSettings>('studyflow-settings', DEFAULT_SETTINGS);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || '');
      setGoalMinutes(profile.daily_goal_minutes ?? 60);
    }
  }, [profile]);

  // Apply compact mode class
  useEffect(() => {
    if (settings.compactMode) {
      document.documentElement.classList.add('compact-mode');
    } else {
      document.documentElement.classList.remove('compact-mode');
    }
  }, [settings.compactMode]);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
    localStorage.setItem('studyflow-theme', isDark ? 'dark' : 'light');
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    onUpdateProfile({ display_name: name.trim() || null, daily_goal_minutes: goalMinutes });
    toast({ title: 'Settings saved ✓' });
    onClose();
  };

  const clearStudyData = () => {
    if (!confirm('Clear all local study data (tasks, sessions, timer)? This cannot be undone.')) return;
    ['studyflow-tasks', 'studyflow-sessions', 'studyflow-timer-end', 'studyflow-timer-subject',
      'studyflow-timer-task', 'studyflow-focus-duration', 'studyflow-break-duration',
      'studyflow-task-minutes', 'studyflow-session-start', 'studyflow-session-saved-mins',
      'studyflow-revisions'].forEach((k) => localStorage.removeItem(k));
    toast({ title: 'Study data cleared' });
  };

  const BACKUP_KEYS = ['studyflow-tasks', 'studyflow-sessions', 'studyflow-revisions', 'studyflow-task-minutes', 'studyflow-profile', 'studyflow-settings'];

  const exportData = () => {
    const data: Record<string, unknown> = {};
    BACKUP_KEYS.forEach((k) => {
      const val = localStorage.getItem(k);
      if (val) data[k] = JSON.parse(val);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Data exported ✓' });
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as Record<string, unknown>;
        const validKeys = BACKUP_KEYS.filter((k) => k in data);
        if (validKeys.length === 0) {
          toast({ title: 'Invalid backup file', description: 'No recognizable StudyFlow data found.', variant: 'destructive' });
          return;
        }
        if (!confirm(`This will restore ${validKeys.length} data categories. Existing data will be overwritten. Continue?`)) return;
        validKeys.forEach((k) => {
          localStorage.setItem(k, JSON.stringify(data[k]));
        });
        toast({ title: `Data restored ✓`, description: `${validKeys.length} categories imported. Reloading…` });
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast({ title: 'Import failed', description: 'Could not parse the file. Make sure it's a valid StudyFlow backup.', variant: 'destructive' });
      }
    };
    input.click();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-80 bg-card border-l border-border flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display text-lg font-bold text-foreground">Settings</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Profile */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Profile</h3>
                </div>
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  <p className="text-xs text-muted-foreground">Shown in greeting on dashboard</p>
                </div>
              </section>

              {/* Study goals */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Study Goal</h3>
                </div>
                <div className="space-y-1.5">
                  <Label>Daily target (minutes)</Label>
                  <div className="flex gap-2">
                    {[30, 60, 90, 120].map((m) => (
                      <button
                        key={m}
                        onClick={() => setGoalMinutes(m)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          goalMinutes === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <Input type="number" min={10} max={480} value={goalMinutes} onChange={(e) => setGoalMinutes(Number(e.target.value))} />
                </div>
              </section>

              {/* Notifications */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                </div>
                <div className="space-y-3">
                  <SettingRow
                    icon={settings.notificationsEnabled ? <Bell className="w-3.5 h-3.5 text-muted-foreground" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
                    label="Enable notifications"
                    hint="Get browser notifications for timer completions and study reminders."
                    checked={settings.notificationsEnabled}
                    onChange={(v) => updateSetting('notificationsEnabled', v)}
                  />

                  <SettingRow
                    icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                    label="Quiet hours"
                    hint="Mute all notifications during late-night hours so you're not disturbed."
                    checked={settings.quietHoursEnabled}
                    onChange={(v) => updateSetting('quietHoursEnabled', v)}
                  />

                  {settings.quietHoursEnabled && (
                    <div className="pl-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs w-12">From</Label>
                        <select
                          value={settings.quietHoursStart}
                          onChange={(e) => updateSetting('quietHoursStart', Number(e.target.value))}
                          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs w-12">To</Label>
                        <select
                          value={settings.quietHoursEnd}
                          onChange={(e) => updateSetting('quietHoursEnd', Number(e.target.value))}
                          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <SettingRow
                    label="Revision reminders"
                    hint="Reminds you to revisit topics you studied earlier for better retention."
                    checked={settings.showRevisionReminders}
                    onChange={(v) => updateSetting('showRevisionReminders', v)}
                  />
                </div>
              </section>

              {/* Timer */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Timer</h3>
                </div>
                <div className="space-y-3">
                  <SettingRow
                    icon={settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-muted-foreground" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
                    label="Timer sounds"
                    hint="Play a sound when your focus or break session ends."
                    checked={settings.soundEnabled}
                    onChange={(v) => updateSetting('soundEnabled', v)}
                  />
                  <SettingRow
                    label="Auto-start breaks"
                    hint="Automatically start your break timer when a focus session ends — no clicking needed."
                    checked={settings.autoStartBreak}
                    onChange={(v) => updateSetting('autoStartBreak', v)}
                  />
                  <div>
                    <Label className="text-xs">Default focus (min)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={180}
                      value={settings.defaultTimerMinutes}
                      onChange={(e) => updateSetting('defaultTimerMinutes', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </section>

              {/* Appearance */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
                </div>
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary hover:bg-muted transition-colors"
                >
                  <span className="text-sm text-foreground">{dark ? 'Dark Mode' : 'Light Mode'}</span>
                  {dark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                </button>
                <div className="mt-3">
                  <SettingRow
                    label="Compact mode"
                    hint="Reduces spacing and padding across the entire app — fits more content on screen. Great for smaller screens."
                    checked={settings.compactMode}
                    onChange={(v) => updateSetting('compactMode', v)}
                  />
                </div>
                <div className="mt-3">
                  <SettingRow
                    label="Week starts Monday"
                    hint="Changes weekly charts and calendars to start on Monday instead of Sunday."
                    checked={settings.weekStartsMonday}
                    onChange={(v) => updateSetting('weekStartsMonday', v)}
                  />
                </div>
              </section>

              {/* Data & Privacy */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Data & Privacy</h3>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={exportData}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-muted transition-colors text-sm text-foreground"
                  >
                    <Download className="w-4 h-4" />
                    Export all data (JSON)
                  </button>
                  <button
                    onClick={importData}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-muted transition-colors text-sm text-foreground"
                  >
                    <Upload className="w-4 h-4" />
                    Import data from backup
                  </button>
                  <button
                    onClick={clearStudyData}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear all study data
                  </button>
                </div>
              </section>

              {/* About */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">About</h3>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/50">
                  <p><strong className="text-foreground">StudyFlow</strong> v1.0.0</p>
                  <p>© {new Date().getFullYear()} StudyFlow. All rights reserved.</p>
                  <p>Built for focused, distraction-free studying.</p>
                  <p className="pt-1">Your data is stored locally on your device. No account required.</p>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border">
              <Button onClick={handleSave} className="w-full gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;