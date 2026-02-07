// ============================================
// MY HEALTH BUDDY - Settings
// Mobile-first settings screen
// ============================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
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
    <div className="min-h-screen bg-neutral-50 flex flex-col pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-4 bg-white border-b border-neutral-100">
        <Link
          to="/dashboard"
          className="flex items-center justify-center w-10 h-10 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-neutral-800">Settings</h1>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Profile section */}
        <section className="bg-white px-4 py-5 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-700 flex-shrink-0">
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

        {/* Account */}
        <section className="mt-4 bg-white rounded-xl border border-neutral-100 overflow-hidden mx-4">
          <p className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Account
          </p>
          <Link
            to="#"
            className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-neutral-800 hover:bg-neutral-50"
          >
            <span>Edit Profile</span>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </Link>
          <Link
            to="#"
            className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-neutral-800 hover:bg-neutral-50"
          >
            <span>Change Password</span>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </Link>
        </section>

        {/* Family */}
        <section className="mt-4 bg-white rounded-xl border border-neutral-100 overflow-hidden mx-4">
          <p className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Family
          </p>
          <Link
            to="/setup"
            className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-neutral-800 hover:bg-neutral-50"
          >
            <span>Manage Family Members</span>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </Link>
          <Link
            to="#"
            className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-neutral-800 hover:bg-neutral-50"
          >
            <span>Health Conditions</span>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </Link>
        </section>

        {/* Preferences */}
        <section className="mt-4 bg-white rounded-xl border border-neutral-100 overflow-hidden mx-4">
          <p className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Preferences
          </p>
          <div className="px-4 py-3 border-t border-neutral-100">
            <p className="text-sm font-medium text-neutral-700 mb-2">Language</p>
            <div className="flex gap-2 flex-wrap">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLanguage(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    language === opt.value
                      ? 'bg-green-500 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <span className="text-neutral-800">Notifications</span>
            <button
              type="button"
              role="switch"
              aria-checked={notifications}
              onClick={() => setNotifications((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                notifications ? 'bg-green-500' : 'bg-neutral-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <span className="text-neutral-800">Units</span>
            <div className="flex rounded-lg border border-neutral-200 p-0.5">
              <button
                type="button"
                onClick={() => setUnits('metric')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  units === 'metric' ? 'bg-green-500 text-white' : 'text-neutral-600'
                }`}
              >
                Metric
              </button>
              <button
                type="button"
                onClick={() => setUnits('imperial')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  units === 'imperial' ? 'bg-green-500 text-white' : 'text-neutral-600'
                }`}
              >
                Imperial
              </button>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="mt-4 bg-white rounded-xl border border-neutral-100 overflow-hidden mx-4">
          <p className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            About
          </p>
          <p className="px-4 py-3 border-t border-neutral-100 text-neutral-600 text-sm">
            App Version {APP_VERSION}
          </p>
          <Link
            to="#"
            className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-neutral-800 hover:bg-neutral-50"
          >
            <span>Privacy Policy</span>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </Link>
          <Link
            to="#"
            className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-neutral-800 hover:bg-neutral-50"
          >
            <span>Terms of Service</span>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </Link>
          <Link
            to="#"
            className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-neutral-800 hover:bg-neutral-50"
          >
            <span>Help & Support</span>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </Link>
        </section>

        {/* Sign Out */}
        <div className="px-4 py-6">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 font-semibold text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}
