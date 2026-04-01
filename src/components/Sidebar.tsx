import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Timer, BarChart3, LayoutDashboard, Moon, Sun, MessageCircleQuestion, FileText, Settings, User, CalendarDays } from 'lucide-react';
import type { TabId, StreakData } from '@/lib/types';
import type { Profile } from '@/hooks/useProfile';
import type { RankInfo } from '@/hooks/useGamification';
import GamificationCard from '@/components/GamificationCard';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  streak: StreakData;
  onOpenSettings: () => void;
  profile: Profile;
  gamification: {
    rank: RankInfo;
    nextRank: RankInfo | null;
    streak: number;
    progressPercent: number;
  };
}

const navItems: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'timer', label: 'Focus Timer', icon: Timer },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'pdfs', label: 'Study Materials', icon: FileText },
  { id: 'doubts', label: 'Doubt Solver', icon: MessageCircleQuestion },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
];

const Sidebar = ({ activeTab, onTabChange, streak, onOpenSettings, profile, gamification }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
    localStorage.setItem('studyflow-theme', isDark ? 'dark' : 'light');
  };

  return (
    <aside className={`flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 p-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground text-xs font-bold">S</span>
        </div>
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-lg font-bold text-sidebar-foreground">
            StudyFlow
          </motion.span>
        )}
      </div>

      {/* Rank card */}
      {!collapsed && (
        <div className="mt-3">
          <GamificationCard compact rank={gamification.rank} nextRank={gamification.nextRank} streak={gamification.streak} progressPercent={gamification.progressPercent} />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                isActive ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              {isActive && (
                <motion.div layoutId="activeTab" className="absolute inset-0 bg-sidebar-accent rounded-lg" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
              )}
              <item.icon className="w-4.5 h-4.5 relative z-10 flex-shrink-0" />
              {!collapsed && <span className="relative z-10">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User + Settings */}
      <button
        onClick={onOpenSettings}
        className={`mx-3 mb-1 p-2.5 rounded-xl hover:bg-sidebar-accent flex items-center gap-2.5 transition-colors ${collapsed ? 'justify-center' : ''}`}
      >
        <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{profile?.display_name || 'My Account'}</p>
            <p className="text-xs text-muted-foreground">Settings</p>
          </div>
        )}
        {!collapsed && <Settings className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
      </button>

      {/* Theme toggle */}
      <button onClick={toggleTheme} className="mx-3 mb-1 p-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent flex items-center gap-2 text-sm transition-colors">
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
      </button>

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(!collapsed)} className="m-3 p-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent text-xs text-center transition-colors">
        {collapsed ? '→' : '← Collapse'}
      </button>
    </aside>
  );
};

export default Sidebar;
