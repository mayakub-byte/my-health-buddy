// ============================================
// MY HEALTH BUDDY - Settings
// Mobile-first settings screen
// ============================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { supabase } from '../lib/supabase';
import { useFamily } from '../hooks/useFamily';
import type { HealthCondition } from '../types';

const APP_VERSION = '1.0.0';

function getAgeGroup(dob: string | null | undefined): 'toddler' | 'child' | 'teen' | 'adult' | 'senior' {
  if (!dob) return 'adult';
  const today = new Date();
  const birth = new Date(dob);
  const age = Math.floor((today.getTime() - birth.getTime()) / 31557600000);
  if (age < 3) return 'toddler';
  if (age < 13) return 'child';
  if (age < 18) return 'teen';
  if (age < 60) return 'adult';
  return 'senior';
}

const HEALTH_OPTIONS: { label: string; value: HealthCondition }[] = [
  { label: 'Diabetes', value: 'diabetes' },
  { label: 'Hypertension', value: 'bp' },
  { label: 'Cholesterol', value: 'cholesterol' },
  { label: 'Thyroid', value: 'thyroid' },
  { label: 'Weight Management', value: 'weight_management' },
  { label: 'Others', value: 'others' },
  { label: 'None', value: 'none' },
];

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

interface FamilyMemberRow {
  id: string;
  name: string;
  dob?: string | null;
  relationship?: string | null;
  role?: string | null;
  health_conditions?: HealthCondition[] | null;
  avatar_color?: string;
  is_primary?: boolean;
  created_at?: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { family } = useFamily();
  const [user, setUser] = useState<{ email?: string; name?: string; avatarUrl?: string } | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberRow[]>([]);
  const [editingMember, setEditingMember] = useState<FamilyMemberRow | null>(null);
  const [customConditionText, setCustomConditionText] = useState('');
  const [dietPref, setDietPref] = useState(() => localStorage.getItem('mhb_diet_pref') || 'all');
  const [reminderOn, setReminderOn] = useState(() => localStorage.getItem('mhb_reminders') === 'true');
  const [weeklyReportOn, setWeeklyReportOn] = useState(
    () => localStorage.getItem('mhb_weekly_report') === 'true'
  );
  const [units, setUnits] = useState(() => localStorage.getItem('mhb_units') || 'metric');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!family?.id) return;
      const { data } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', family.id)
        .order('created_at', { ascending: true });
      setFamilyMembers((data as FamilyMemberRow[]) || []);
    };
    fetchMembers();
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

  return (
    <div className="min-h-screen bg-beige flex flex-col pb-24 max-w-md mx-auto w-full">
      <header className="px-5 pt-6 pb-4">
        <PageHeader title="Settings" />
      </header>

      <main className="flex-1 overflow-y-auto px-5">
        <div className="space-y-3">
          {/* Family Members */}
          <button
            type="button"
            onClick={() => setShowFamily(!showFamily)}
            className="w-full flex items-center justify-between p-4 bg-[#FDFBF7] rounded-xl border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>👨‍👩‍👧‍👦</span>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700">Family Members</p>
                <p className="text-xs text-gray-500">{familyMembers.length} members</p>
              </div>
            </div>
            <span className="text-gray-400 text-xs" aria-hidden>{showFamily ? '▼' : '▶'}</span>
          </button>

          {showFamily && (
            <div className="mt-2 space-y-2 mb-3">
              {familyMembers.map((member) => {
                const age = member.dob
                  ? Math.floor((new Date().getTime() - new Date(member.dob).getTime()) / 31557600000)
                  : null;
                const isEditing = editingMember?.id === member.id;
                const relationshipDisplay = member.relationship || member.role || 'Member';
                const healthDisplay =
                  (member.health_conditions?.length ?? 0) > 0 &&
                  member.health_conditions?.[0] !== 'none'
                    ? (member.health_conditions ?? [])
                        .map((c) => HEALTH_OPTIONS.find((h) => h.value === c)?.label ?? c)
                        .join(', ')
                    : '';
                return (
                  <div key={member.id} className="p-4 bg-[#FDFBF7] rounded-xl border border-gray-100">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          value={editingMember.name}
                          onChange={(e) =>
                            setEditingMember({ ...editingMember, name: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                          placeholder="Name"
                          aria-label="Member name"
                        />
                        <input
                          type="date"
                          value={editingMember.dob || ''}
                          onChange={(e) =>
                            setEditingMember({ ...editingMember, dob: e.target.value || null })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                          aria-label="Date of birth"
                          max={new Date().toISOString().split('T')[0]}
                        />
                        <select
                          value={editingMember.relationship || ''}
                          onChange={(e) =>
                            setEditingMember({ ...editingMember, relationship: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                          aria-label="Relationship"
                        >
                          <option value="">Relationship</option>
                          <option value="Self">Self</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Child">Child</option>
                          <option value="Parent">Parent</option>
                          <option value="Grandparent">Grandparent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Other">Other</option>
                        </select>

                        <p className="text-xs text-gray-500">Health needs:</p>
                        <div className="flex flex-wrap gap-2">
                          {HEALTH_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                const current = editingMember.health_conditions || [];
                                if (opt.value === 'none') {
                                  setEditingMember({
                                    ...editingMember,
                                    health_conditions: ['none'],
                                  });
                                  setCustomConditionText('');
                                } else if (opt.value === 'others') {
                                  if (current.includes('others')) {
                                    setEditingMember({
                                      ...editingMember,
                                      health_conditions: current.filter((c) => c !== 'others'),
                                    });
                                    setCustomConditionText('');
                                  } else {
                                    setEditingMember({
                                      ...editingMember,
                                      health_conditions: [...current.filter((c) => c !== 'none'), 'others'],
                                    });
                                  }
                                } else {
                                  const filtered = current.filter((c) => c !== 'none');
                                  setEditingMember({
                                    ...editingMember,
                                    health_conditions: filtered.includes(opt.value)
                                      ? filtered.filter((c) => c !== opt.value)
                                      : [...filtered, opt.value],
                                  });
                                }
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                                (editingMember.health_conditions || []).includes(opt.value)
                                  ? 'bg-[#5C6B4A] text-white'
                                  : 'bg-white border border-gray-200 text-gray-600'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {(editingMember.health_conditions || []).includes('others') && (
                          <input
                            type="text"
                            value={customConditionText}
                            onChange={(e) => setCustomConditionText(e.target.value)}
                            placeholder="Type your condition..."
                            className="w-full px-3 py-2 mt-2 rounded-lg border border-gray-200 text-sm"
                          />
                        )}

                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={async () => {
                              // Build final health conditions with custom condition
                              const finalConditions = (editingMember.health_conditions ?? [])
                                .filter((c) => c !== 'others');
                              if ((editingMember.health_conditions ?? []).includes('others') && customConditionText.trim()) {
                                finalConditions.push(customConditionText.trim());
                              }
                              const { error } = await supabase
                                .from('family_members')
                                .update({
                                  name: editingMember.name,
                                  dob: editingMember.dob || null,
                                  age_group: getAgeGroup(editingMember.dob),
                                  relationship: editingMember.relationship || null,
                                  health_conditions: finalConditions,
                                })
                                .eq('id', member.id);
                              if (!error) {
                                setFamilyMembers((prev) =>
                                  prev.map((m) =>
                                    m.id === member.id ? { ...m, ...editingMember } : m
                                  )
                                );
                                setEditingMember(null);
                              }
                            }}
                            className="flex-1 py-2 bg-[#5C6B4A] text-white rounded-full text-sm font-medium"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMember(null)}
                            className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-full text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl" aria-hidden>😊</span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{member.name}</p>
                            <p className="text-xs text-gray-500">
                              {relationshipDisplay}
                              {age != null ? ` • ${age} yrs` : ''}
                              {healthDisplay ? ` • ${healthDisplay}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const knownVals = ['diabetes', 'pre_diabetic', 'bp', 'cholesterol', 'weight_management', 'thyroid', 'none', 'others'];
                              const existingCustomCond = (member.health_conditions || []).find((c) => !knownVals.includes(c));
                              const conditions = existingCustomCond
                                ? [...(member.health_conditions || []).filter((c) => c !== existingCustomCond), 'others']
                                : member.health_conditions || [];
                              setCustomConditionText(existingCustomCond || '');
                              setEditingMember({ ...member, health_conditions: conditions });
                            }}
                            className="px-3 py-1.5 text-xs text-[#5C6B4A] border border-[#5C6B4A] rounded-full"
                            aria-label={`Edit ${member.name}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Remove ${member.name}?`)) {
                                const { error } = await supabase
                                  .from('family_members')
                                  .delete()
                                  .eq('id', member.id);
                                if (!error) {
                                  setFamilyMembers((prev) => prev.filter((m) => m.id !== member.id));
                                }
                              }
                            }}
                            className="px-3 py-1.5 text-xs text-red-500 border border-red-300 rounded-full"
                            aria-label={`Remove ${member.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => navigate('/family', { state: { addMember: true } })}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 font-medium"
              >
                + Add Family Member
              </button>
            </div>
          )}

          <Link
            to="/family"
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
                          : 'bg-[#FDFBF7] border border-gray-200 text-gray-600'
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
                          : 'bg-[#FDFBF7] border border-gray-200 text-gray-600'
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
