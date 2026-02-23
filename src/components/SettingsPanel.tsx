import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Target, Save, Moon, Sun, Trash2, Bell, BellOff, Clock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Profile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface AppSettings {
  notificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number; // 0-23
  quietHoursEnd: number;   // 0-23
  soundEnabled: boolean;
  autoStartBreak: boolean;
  showStreakOnDashboard: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: 22,
  quietHoursEnd: 7,
  soundEnabled: true,
  autoStartBreak: false,
  showStreakOnDashboard: true,
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
    className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const SettingsPanel = ({ open, onClose, profile, onUpdateProfile }: SettingsPanelProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(profile?.display_name || '');
  const [goalMinutes, setGoalMinutes] = useState(profile?.daily_goal_minutes ?? 60);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [settings, setSettings] = useLocalStorage<AppSettings>('studyflow-settings', DEFAULT_SETTINGS);

  // Sync when profile changes
  useEffect(() => {
    if (profile) {
      setName(profile.display_name || '');
      setGoalMinutes(profile.daily_goal_minutes ?? 60);
    }
  }, [profile]);

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
      'studyflow-task-minutes', 'studyflow-session-start', 'studyflow-session-saved-mins'].forEach((k) => localStorage.removeItem(k));
    toast({ title: 'Study data cleared' });
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
            className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-card border-l border-border flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display text-lg font-bold text-foreground">Settings</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Profile section */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Profile</h3>
                </div>
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
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
                  <p className="text-xs text-muted-foreground">Or enter a custom value:</p>
                  <Input
                    type="number"
                    min={10}
                    max={480}
                    value={goalMinutes}
                    onChange={(e) => setGoalMinutes(Number(e.target.value))}
                  />
                </div>
              </section>

              {/* Notifications */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {settings.notificationsEnabled ? <Bell className="w-3.5 h-3.5 text-muted-foreground" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-sm text-foreground">Enable notifications</span>
                    </div>
                    <Toggle checked={settings.notificationsEnabled} onChange={(v) => updateSetting('notificationsEnabled', v)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">Quiet hours</span>
                    </div>
                    <Toggle checked={settings.quietHoursEnabled} onChange={(v) => updateSetting('quietHoursEnabled', v)} />
                  </div>

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
                      <p className="text-xs text-muted-foreground">No notifications between these hours</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Timer preferences */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Timer</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-muted-foreground" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-sm text-foreground">Timer sounds</span>
                    </div>
                    <Toggle checked={settings.soundEnabled} onChange={(v) => updateSetting('soundEnabled', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Auto-start breaks</span>
                    <Toggle checked={settings.autoStartBreak} onChange={(v) => updateSetting('autoStartBreak', v)} />
                  </div>
                </div>
              </section>

              {/* Appearance */}
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-3">Appearance</h3>
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary hover:bg-muted transition-colors"
                >
                  <span className="text-sm text-foreground">{dark ? 'Dark Mode' : 'Light Mode'}</span>
                  {dark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                </button>
              </section>

              {/* Danger zone */}
              <section>
                <h3 className="text-sm font-semibold text-destructive mb-3">Data</h3>
                <button
                  onClick={clearStudyData}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all study data
                </button>
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
