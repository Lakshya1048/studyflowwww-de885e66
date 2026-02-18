import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckSquare, Timer, BarChart3, LayoutDashboard, Flame } from 'lucide-react';
import type { TabId, StreakData } from '@/lib/types';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  streak: StreakData;
}

const navItems: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'planner', label: 'Planner', icon: BookOpen },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'timer', label: 'Focus Timer', icon: Timer },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
];

const Sidebar = ({ activeTab, onTabChange, streak }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 p-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-display text-lg font-bold text-sidebar-foreground"
          >
            StudyFlow
          </motion.span>
        )}
      </div>

      {/* Streak */}
      <div className={`mx-3 mt-4 mb-2 rounded-lg bg-sidebar-accent p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? '' : 'gap-2'}`}>
          <Flame className="w-5 h-5 text-streak flex-shrink-0" />
          {!collapsed && (
            <div>
              <p className="text-xs text-muted-foreground">Current Streak</p>
              <p className="font-display text-lg font-bold text-sidebar-foreground leading-tight">
                {streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-sidebar-accent rounded-lg"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon className="w-4.5 h-4.5 relative z-10 flex-shrink-0" />
              {!collapsed && <span className="relative z-10">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="m-3 p-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent text-xs text-center transition-colors"
      >
        {collapsed ? '→' : '← Collapse'}
      </button>
    </aside>
  );
};

export default Sidebar;
