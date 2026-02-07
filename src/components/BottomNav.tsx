// ============================================
// MY HEALTH BUDDY - Bottom Navigation
// ============================================

import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Clock, BarChart3, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/history', icon: Clock, label: 'History' },
  { path: '/weekly', icon: BarChart3, label: 'Weekly' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show on results or scan confirm
  if (location.pathname.startsWith('/results') || location.pathname.startsWith('/scan')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-6 py-2 safe-area-bottom">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === '/dashboard'
              ? location.pathname === '/dashboard' || location.pathname === '/home'
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors
                ${
                  isActive
                    ? 'text-green-500'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
            >
              <Icon
                className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`}
              />
              <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
