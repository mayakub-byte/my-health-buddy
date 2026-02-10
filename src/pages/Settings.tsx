// ============================================
// MY HEALTH BUDDY - Settings
// Mobile-first settings screen
// ============================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const APP_VERSION = '1.0.0';

type Language = 'telugu' | 'english' | 'hindi';
type Units = 'metric' | 'imperial';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'hindi', label: 'Hindi' },
];

const STORAGE_KEYS = {
  language: 'mhb_language',
  notifications: 'mhb_notifications',
  units: 'mhb_units',
} as const;

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email?: string; name?: string; avatarUrl?: string } | null>(null);
  const [language, setLanguage] = useState<Language>(() =>
    (localStorage.getItem(STORAGE_KEYS.language) as Language) || 'english'
  );
  const [notifications, setNotifications] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.notifications) !== 'false'
  );
  const [units, setUnits] = useState<Units>(() =>
    (localStorage.getItem(STORAGE_KEYS.units) as Units) || 'metric'
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser({
          email: u.email ?? undefined,
          name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'User',
          avatarUrl: u.user_metadata?.avatar_url,
        });
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.language, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notifications, String(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.units, units);
  }, [units]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-beige flex flex-col pb-24 max-w-md mx-auto w-full">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link
          to="/dashboard"
          className="flex items-center justify-center w-10 h-10 rounded-full border border-beige-300 text-neutral-600 hover:bg-beige-100 shadow-card"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-heading text-lg font-bold text-olive-800 flex items-center gap-2">
          <span className="text-olive-600" aria-hidden>🌿</span>
          Settings
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5">
        <div className="space-y-3">
          <Link
            to="/setup"
            className="block w-full py-3.5 rounded-full card text-center font-medium text-olive-800 hover:shadow-card-hover transition-shadow"
          >
            Edit family
          </Link>
          <button
            type="button"
            onClick={() => setToast('Coming soon!')}
            className="block w-full py-3.5 rounded-full card text-center font-medium text-olive-800 hover:shadow-card-hover transition-shadow"
          >
            Preferences
          </button>
          <button
            type="button"
            onClick={() => setToast('Coming soon!')}
            className="block w-full py-3.5 rounded-full card text-center font-medium text-olive-800 hover:shadow-card-hover transition-shadow"
          >
            Help
          </button>
        </div>

        {/* Profile (optional, compact) */}
        <section className="mt-6 card px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-olive-100 flex items-center justify-center text-lg font-bold text-olive-700 flex-shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                (user?.name?.charAt(0) ?? 'U').toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-neutral-800 truncate">{user?.name ?? '…'}</p>
              <p className="text-sm text-neutral-500 truncate">{user?.email ?? '…'}</p>
            </div>
          </div>
        </section>

        {/* Preferences (optional expand) */}
        <section className="mt-4 card p-4">
          <p className="text-sm font-medium text-olive-800 mb-2">Language</p>
          <div className="flex gap-2 flex-wrap">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguage(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  language === opt.value ? 'bg-olive-500 text-white' : 'bg-beige-100 text-neutral-600 hover:bg-beige-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-beige-200">
            <span className="text-neutral-800">Notifications</span>
            <button
              type="button"
              role="switch"
              aria-checked={notifications}
              onClick={() => setNotifications((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${notifications ? 'bg-olive-500' : 'bg-beige-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-beige-200">
            <span className="text-neutral-800">Units</span>
            <div className="flex rounded-full border border-beige-300 p-0.5">
              <button
                type="button"
                onClick={() => setUnits('metric')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${units === 'metric' ? 'bg-olive-500 text-white' : 'text-neutral-600'}`}
              >
                Metric
              </button>
              <button
                type="button"
                onClick={() => setUnits('imperial')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${units === 'imperial' ? 'bg-olive-500 text-white' : 'text-neutral-600'}`}
              >
                Imperial
              </button>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3.5 rounded-full bg-red-500 hover:bg-red-600 font-semibold text-white transition-colors"
          >
            Sign Out
          </button>
        </div>

        <p className="text-center text-neutral-500 text-sm py-6">App version {APP_VERSION}</p>
      </main>

      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 mx-auto max-w-sm bg-neutral-800 text-white text-sm font-medium py-3 px-4 rounded-xl text-center shadow-lg z-50"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
