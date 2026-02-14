// ============================================
// MY HEALTH BUDDY - Settings
// Mobile-first settings screen
// ============================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

const APP_VERSION = '1.0.0';

const FAQS = [
  {
    q: 'How does meal scanning work?',
    a: 'Take a photo of your meal or describe it by typing or speaking. Our AI analyzes the nutritional content and gives personalized guidance for each family member based on their health needs.',
  },
  {
    q: 'How are traffic light scores calculated?',
    a: '🟢 Green = Balanced meal within healthy range.\n🟡 Yellow = Good but one area needs attention.\n🔴 Red = Multiple nutritional concerns to address.',
  },
  {
    q: 'Can I edit my family members?',
    a: 'Yes! Go to Settings → Edit Family to add, remove, or update family member details including health conditions.',
  },
  {
    q: 'What is the Smart Grocery List?',
    a: 'Based on your weekly meals, our AI generates a grocery shopping list with Telugu ingredients, quantities, and estimated costs. You can share it on WhatsApp!',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your meal data is stored securely and only visible to you. We never share your health information with anyone.',
  },
  {
    q: 'Who built this?',
    a: 'My Health Buddy (Arogya) is built by AIGF Cohort 5, Group 3 — a team passionate about making family nutrition accessible for Indian families.',
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email?: string; name?: string; avatarUrl?: string } | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dietPref, setDietPref] = useState(() => localStorage.getItem('mhb_diet_pref') || 'all');
  const [reminderOn, setReminderOn] = useState(() => localStorage.getItem('mhb_reminders') === 'true');
  const [weeklyReportOn, setWeeklyReportOn] = useState(
    () => localStorage.getItem('mhb_weekly_report') === 'true'
  );
  const [units, setUnits] = useState(() => localStorage.getItem('mhb_units') || 'metric');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
        <h1 className="font-serif text-xl font-bold text-olive-800 flex items-center gap-2">
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
            onClick={() => setShowPrefs(!showPrefs)}
            className="w-full py-3.5 rounded-full card text-center font-medium text-olive-800 hover:shadow-card-hover transition-shadow flex items-center justify-center gap-2"
          >
            Preferences
            {showPrefs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showPrefs && (
            <div className="space-y-5 p-4 bg-[#FDFBF7] rounded-xl mt-2 mb-3">
              {/* Dietary Preference */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Dietary Preference</p>
                <div className="flex gap-2">
                  {[
                    { key: 'veg', label: '🥬 Veg Only' },
                    { key: 'egg', label: '🥚 Veg + Egg' },
                    { key: 'all', label: '🍗 All' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setDietPref(opt.key);
                        localStorage.setItem('mhb_diet_pref', opt.key);
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition ${
                        dietPref === opt.key
                          ? 'bg-[#5C6B4A] text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meal Reminders Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Meal Reminders</p>
                  <p className="text-xs text-gray-500">Get notified to log meals</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newVal = !reminderOn;
                    setReminderOn(newVal);
                    localStorage.setItem('mhb_reminders', String(newVal));
                  }}
                  className={`relative w-12 h-7 rounded-full transition-colors ${reminderOn ? 'bg-[#5C6B4A]' : 'bg-gray-300'}`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${reminderOn ? 'left-6' : 'left-1'}`}
                  />
                </button>
              </div>

              {/* Weekly Report Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Weekly Report</p>
                  <p className="text-xs text-gray-500">Get weekly nutrition summary</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newVal = !weeklyReportOn;
                    setWeeklyReportOn(newVal);
                    localStorage.setItem('mhb_weekly_report', String(newVal));
                  }}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    weeklyReportOn ? 'bg-[#5C6B4A]' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                      weeklyReportOn ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Measurement Units */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Measurements</p>
                <div className="flex gap-2">
                  {[
                    { key: 'metric', label: 'Metric (kg, g)' },
                    { key: 'imperial', label: 'Imperial (lb, oz)' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setUnits(opt.key);
                        localStorage.setItem('mhb_units', opt.key);
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition ${
                        units === opt.key
                          ? 'bg-[#5C6B4A] text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="w-full py-3.5 rounded-full card text-center font-medium text-olive-800 hover:shadow-card-hover transition-shadow flex items-center justify-center gap-2"
          >
            Help
            {showHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHelp && (
            <div className="space-y-2 mt-2 mb-3">
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className="bg-[#FDFBF7] rounded-xl overflow-hidden border border-gray-100"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-3.5 text-left"
                  >
                    <span className="text-sm font-medium text-gray-700 flex-1 pr-2">{faq.q}</span>
                    <span
                      className={`text-gray-400 text-xs inline-block transition-transform duration-200 ${openFaq === i ? 'rotate-90' : ''}`}
                    >
                      ▶
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="px-3.5 pb-3.5">
                      <p className="text-sm text-gray-600 whitespace-pre-line">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
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

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3.5 rounded-full bg-red-500 hover:bg-red-600 font-semibold text-white transition-colors"
          >
            Sign Out
          </button>
        </div>

        <div className="text-center py-6 mt-4">
          <p className="text-xs text-gray-400">Arogya — My Health Buddy</p>
          <p className="text-xs text-gray-300">v{APP_VERSION} • AIGF Cohort 5, Group 3</p>
        </div>
      </main>
    </div>
  );
}
