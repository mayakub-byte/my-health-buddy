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
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-beige-50/90 backdrop-blur-sm border-t border-beige-300 px-6 safe-area-bottom shadow-card flex items-center">
      <div className="flex justify-around items-center w-full max-w-md mx-auto">
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
              className={`flex flex-col items-center py-2 px-4 rounded-full transition-colors ${
                isActive ? 'text-olive-600' : 'text-neutral-400 hover:text-olive-600'
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
