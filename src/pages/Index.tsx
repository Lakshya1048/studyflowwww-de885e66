import { useState, useMemo, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import TaskManager from '@/components/TaskManager';
import FocusTimer from '@/components/FocusTimer';
import PdfManager from '@/components/PdfManager';
import ProgressTracker from '@/components/ProgressTracker';
import CalendarView from '@/components/CalendarView';
import DoubtSolver from '@/components/DoubtSolver';
import SettingsPanel from '@/components/SettingsPanel';
import OnboardingScreen from '@/components/OnboardingScreen';
import MobileBottomNav from '@/components/MobileBottomNav';
import BadgeToast from '@/components/BadgeToast';
import { useProfile } from '@/hooks/useProfile';
import { useGamification } from '@/hooks/useGamification';
import type { TabId, StreakData, StudySession } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getLocalDateStr } from '@/lib/utils';
import type { AppSettings } from '@/components/SettingsPanel';
import { DEFAULT_SETTINGS } from '@/components/SettingsPanel';
import { useStudyNotifications } from '@/hooks/useStudyNotifications';
import { Moon, Sun, Settings } from 'lucide-react';
import OfflineIndicator from '@/components/OfflineIndicator';

const Index = () => {
  const { profile, updateProfile } = useProfile();
  const gamification = useGamification();

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingDone, setOnboardingDone] = useLocalStorage<boolean>('studyflow-onboarding-done', false);
  const [appSettings] = useLocalStorage<AppSettings>('studyflow-settings', DEFAULT_SETTINGS);

  // Apply compact mode on mount
  useEffect(() => {
    if (appSettings.compactMode) {
      document.documentElement.classList.add('compact-mode');
    } else {
      document.documentElement.classList.remove('compact-mode');
    }
  }, [appSettings.compactMode]);

  useStudyNotifications(profile?.display_name);

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
    const todayStr = getLocalDateStr(today);
    const studiedToday = dates.includes(todayStr);
    const startOffset = studiedToday ? 0 : 1;
    for (let i = startOffset; ; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkStr = getLocalDateStr(checkDate);
      if (dates.includes(checkStr)) currentStreak++;
      else break;
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
  };

  const toggleMobileTheme = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('studyflow-theme', isDark ? 'dark' : 'light');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={handleTabChange} profile={profile} gamification={gamification} />;
      case 'tasks': return <TaskManager />;
      case 'timer': return <FocusTimer />;
      case 'calendar': return <CalendarView />;
      case 'progress': return <ProgressTracker achievements={gamification.achievements} rank={gamification.rank} streak={gamification.streak} />;
      default: return null;
    }
  };

  // Show onboarding for first-time users
  if (!onboardingDone) {
    return <OnboardingScreen onComplete={() => setOnboardingDone(true)} />;
  }

  return (
    <>
      <OfflineIndicator />
      <BadgeToast badge={gamification.newBadge} onDismiss={gamification.dismissNewBadge} />
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
            gamification={gamification}
          />
        </div>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">S</span>
            </div>
            <span className="font-display font-bold text-foreground">StudyFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMobileTheme} className="text-foreground p-1 active:scale-90 transition-transform">
              <Moon className="w-5 h-5 dark:hidden" />
              <Sun className="w-5 h-5 hidden dark:block" />
            </button>
            <button onClick={() => setSettingsOpen(true)} className="text-foreground p-1 active:scale-90 transition-transform">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6 pt-20 md:pt-6 pb-24 md:pb-6">
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

      {/* Mobile bottom navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  );
};

export default Index;
