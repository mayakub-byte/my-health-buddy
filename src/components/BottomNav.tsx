// ============================================
// MY HEALTH BUDDY - Bottom Navigation
// Warm sage active pill, no gray icons
// ============================================

import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Clock, BarChart3, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/history', icon: Clock, label: 'History' },
  { path: '/weekly', icon: BarChart3, label: 'Weekly' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const hideOnRoutes = ['/', '/login', '/signup', '/onboarding', '/setup', '/goals', '/baseline', '/complete', '/forgot-password', '/complete-profile'];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (hideOnRoutes.includes(location.pathname)) return null;
  if (location.pathname.startsWith('/results') || location.pathname.startsWith('/scan') || location.pathname.startsWith('/meal-correction') || location.pathname.startsWith('/portion-confirm')) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 border-t px-6 safe-area-bottom z-50 flex items-center"
      style={{ backgroundColor: '#f4f6f4', borderColor: 'var(--border-warm, #e8e2d8)' }}
    >
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
              type="button"
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center py-1.5 px-4 transition-all"
              style={{
                background: isActive ? 'rgba(90, 124, 101, 0.12)' : 'transparent',
                borderRadius: isActive ? 20 : 0,
                color: isActive ? '#3d5a47' : '#7a8c7e',
              }}
              aria-label={item.label}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`}
                fill={isActive ? '#3d5a47' : 'none'}
              />
              <span
                className="mt-0.5"
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#3d5a47' : '#7a8c7e',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
