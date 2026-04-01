import { motion } from 'framer-motion';
import { LayoutDashboard, CheckSquare, Timer, FileText, MessageCircleQuestion, BarChart3, CalendarDays } from 'lucide-react';
import type { TabId } from '@/lib/types';

interface MobileBottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'timer', label: 'Focus', icon: Timer },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'pdfs', label: 'PDFs', icon: FileText },
  { id: 'doubts', label: 'AI', icon: MessageCircleQuestion },
  { id: 'progress', label: 'Stats', icon: BarChart3 },
];

const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-[3.5rem] transition-colors active:scale-95"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
              <tab.icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-medium relative z-10 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
