import { useState, useMemo, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import TaskManager from '@/components/TaskManager';
import FocusTimer from '@/components/FocusTimer';
import PdfManager from '@/components/PdfManager';
import ProgressTracker from '@/components/ProgressTracker';
import DoubtSolver from '@/components/DoubtSolver';
import SettingsPanel from '@/components/SettingsPanel';
import { useProfile } from '@/hooks/useProfile';
import type { TabId, StreakData, StudySession } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useStudyNotifications } from '@/hooks/useStudyNotifications';
import { Menu, X, Moon, Sun, Settings } from 'lucide-react';
import OfflineIndicator from '@/components/OfflineIndicator';

const Index = () => {
  const { profile, updateProfile } = useProfile();

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useStudyNotifications(profile?.display_name);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('studyflow-theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const streak = useMemo<StreakData>(() => {
    const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
    let currentStreak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const studiedToday = dates.includes(todayStr);
    const startOffset = studiedToday ? 0 : 1;

    for (let i = startOffset; ; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(checkStr)) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      currentStreak,
      longestStreak: currentStreak,
      lastStudyDate: dates[0] || '',
      totalStudyMinutes: sessions.reduce((a, s) => a + s.duration, 0),
      totalTasksCompleted: 0,
    };
  }, [sessions]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const toggleMobileTheme = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('studyflow-theme', isDark ? 'dark' : 'light');
  };

  const mobileNavTabs: TabId[] = ['dashboard', 'tasks', 'timer', 'pdfs', 'doubts', 'progress'];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={handleTabChange} profile={profile} />;
      case 'tasks': return <TaskManager />;
      case 'timer': return <FocusTimer />;
      case 'progress': return <ProgressTracker />;
      default: return null;
    }
  };

  return (
    <>
      <OfflineIndicator />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onUpdateProfile={updateProfile}
      />

      <div className="flex h-screen bg-background overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            streak={streak}
            onOpenSettings={() => setSettingsOpen(true)}
            profile={profile}
          />
        </div>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">S</span>
            </div>
            <span className="font-display font-bold text-foreground">StudyFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMobileTheme} className="text-foreground p-1">
              <Moon className="w-5 h-5 dark:hidden" />
              <Sun className="w-5 h-5 hidden dark:block" />
            </button>
            <button onClick={() => setSettingsOpen(true)} className="text-foreground p-1">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-foreground">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute top-14 left-0 right-0 bg-card border-b border-border p-2 space-y-1" onClick={(e) => e.stopPropagation()}>
              {mobileNavTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {tab === 'doubts' ? 'Doubt Solver' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6 pt-20 md:pt-6">
            {activeTab !== 'doubts' && activeTab !== 'pdfs' && renderContent()}
            <div className={activeTab === 'pdfs' ? '' : 'hidden'}>
              <PdfManager />
            </div>
            <div className={activeTab === 'doubts' ? '' : 'hidden'}>
              <DoubtSolver />
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Index;
