// ============================================
// MY HEALTH BUDDY - Settings
// Clean profile-first layout matching mockup
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useFamily } from '../hooks/useFamily';

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
    a: 'Yes! Go to Settings → Edit Family Profiles to add, remove, or update family member details including health conditions.',
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
  const { family } = useFamily();
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
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    const fetchMemberCount = async () => {
      if (!family?.id) return;
      const { count } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', family.id);
      setMemberCount(count ?? 0);
    };
    fetchMemberCount();
  }, [family?.id]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: u }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Settings loadUser failed:', error.message);
          return;
        }
        if (u) {
          setUser({
            email: u.email ?? undefined,
            name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'User',
            avatarUrl: u.user_metadata?.avatar_url,
          });
        }
      } catch (err) {
        console.error('Settings loadUser error:', err);
      }
    };
    loadUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Sign out failed:', err);
      navigate('/login', { replace: true });
    }
  };

  const displayName = user?.name ?? '...';
  const displayEmail = user?.email ?? '...';
  const initial = (displayName.charAt(0) || 'U').toUpperCase();

  return (
    <div className="min-h-screen bg-brand-light flex flex-col pb-24 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[#e8e2d8] flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-[#6ab08c]" />
        </button>
        <h1 className="font-serif text-xl font-bold text-brand-dark">Settings</h1>
      </div>

      <main className="flex-1 overflow-y-auto px-5">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-4 border border-[#eae7e0] mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
              style={{ backgroundColor: '#6ab08c' }}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-dark text-base truncate">{displayName}</p>
              <p className="text-sm text-[#7a8c7e] truncate">{displayEmail}</p>
            </div>
          </div>
        </div>

        {/* Navigation rows */}
        <div className="space-y-2 mb-4">
          {/* Edit Family Profiles → /setup */}
          <button
            type="button"
            onClick={() => navigate('/setup')}
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-[#eae7e0] hover:bg-[#faf9f6] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>👨‍👩‍👧</span>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700">Edit Family Profiles</p>
                <p className="text-xs text-gray-500">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          {/* Personal Information (placeholder) */}
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-[#eae7e0] hover:bg-[#faf9f6] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>👤</span>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700">Personal Information</p>
                <p className="text-xs text-gray-500">Name, email, preferences</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Ask Nutritionist */}
        <div className="rounded-xl overflow-hidden mb-4" style={{ background: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)' }}>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-hidden>👨‍⚕️</span>
              <div>
                <h3 className="text-white font-semibold text-base m-0">Talk to a Nutritionist</h3>
                <p className="text-white/80 text-xs mt-0.5">
                  Get 1-on-1 expert consultation from My Health Passport
                </p>
              </div>
            </div>
            <a
              href="https://www.myhealthpassport.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 py-2.5 px-4 bg-white rounded-lg text-center font-semibold text-sm no-underline"
              style={{ color: '#2d6a4f' }}
            >
              Ask a Nutritionist →
            </a>
          </div>
        </div>

        {/* Expandable Sections */}
        <div className="space-y-2">
          {/* Preferences */}
          <button
            type="button"
            onClick={() => setShowPrefs(!showPrefs)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-[#eae7e0] hover:bg-[#faf9f6] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>⚙️</span>
              <p className="text-sm font-medium text-gray-700">Preferences</p>
            </div>
            {showPrefs ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showPrefs && (
            <div className="space-y-5 p-4 bg-white rounded-xl border border-[#eae7e0]">
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
                          ? 'bg-[#6ab08c] text-white shadow-sm'
                          : 'bg-[#ffffff] border border-gray-200 text-gray-600'
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
                  className={`relative w-12 h-7 rounded-full transition-colors ${reminderOn ? 'bg-[#6ab08c]' : 'bg-gray-300'}`}
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
                    weeklyReportOn ? 'bg-[#6ab08c]' : 'bg-gray-300'
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
                          ? 'bg-[#6ab08c] text-white shadow-sm'
                          : 'bg-[#ffffff] border border-gray-200 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Help */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-[#eae7e0] hover:bg-[#faf9f6] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>❓</span>
              <p className="text-sm font-medium text-gray-700">Help</p>
            </div>
            {showHelp ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showHelp && (
            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl overflow-hidden border border-[#eae7e0]"
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

        {/* Sign Out */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3.5 rounded-full bg-red-500 hover:bg-red-600 font-semibold text-white transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Version */}
        <div className="text-center py-6 mt-4">
          <p className="text-xs text-gray-400">Arogya — My Health Buddy</p>
          <p className="text-xs text-gray-300">v{APP_VERSION} • AIGF Cohort 5, Group 3</p>
        </div>
      </main>
    </div>
  );
}
