import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import StudyPlanner from '@/components/StudyPlanner';
import TaskManager from '@/components/TaskManager';
import FocusTimer from '@/components/FocusTimer';
import NotesManager from '@/components/NotesManager';
import ProgressTracker from '@/components/ProgressTracker';
import type { TabId, StreakData, StudySession } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Menu, X } from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sessions] = useLocalStorage<StudySession[]>('studyflow-sessions', []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const streak = useMemo<StreakData>(() => {
    const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];
      if (dates.includes(expectedStr)) {
        currentStreak++;
      } else if (i === 0) {
        // Today hasn't been studied yet, check from yesterday
        continue;
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={handleTabChange} />;
      case 'planner': return <StudyPlanner />;
      case 'tasks': return <TaskManager />;
      case 'timer': return <FocusTimer />;
      case 'notes': return <NotesManager />;
      case 'progress': return <ProgressTracker />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} streak={streak} />
      </div>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">S</span>
          </div>
          <span className="font-display font-bold text-foreground">StudyFlow</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-foreground">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-card border-b border-border p-2 space-y-1" onClick={(e) => e.stopPropagation()}>
            {(['dashboard', 'planner', 'tasks', 'timer', 'notes', 'progress'] as TabId[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 pt-20 md:pt-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
