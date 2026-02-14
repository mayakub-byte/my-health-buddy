// ============================================
// MY HEALTH BUDDY - Family Setup Page
// Mobile-first onboarding: add family members (step 2 of 3)
// ============================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import type { FamilyMember, HealthCondition } from '../types';

const RELATIONSHIP_OPTIONS = [
  { value: 'self', label: 'Self' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other', label: 'Other' },
] as const;

const HEALTH_OPTIONS: { value: HealthCondition; label: string }[] = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'bp', label: 'Hypertension' },
  { value: 'cholesterol', label: 'Cholesterol' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'weight_management', label: 'Weight Management' },
  { value: 'none', label: 'None' },
];

const AVATAR_EMOJIS = ['👨', '👩', '👧', '👦', '👴', '👵', '🧑', '👶'];

interface FamilyMemberForm {
  avatarEmoji: string;
  name: string;
  dob: string;
  relationship: string;
  healthConditions: HealthCondition[];
}

interface SavedMember {
  id: string;
  name: string;
  avatar?: string;
}

const initialForm: FamilyMemberForm = {
  avatarEmoji: '😊',
  name: '',
  dob: '',
  relationship: '',
  healthConditions: [],
};

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

function getAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  return Math.floor((today.getTime() - birth.getTime()) / 31557600000);
}

function mapRoleToBackend(rel: string): 'father' | 'mother' | 'son' | 'daughter' | 'grandfather' | 'grandmother' | 'other' {
  const m: Record<string, 'father' | 'mother' | 'son' | 'daughter' | 'grandfather' | 'grandmother' | 'other'> = {
    self: 'other',
    spouse: 'other',
    child: 'son',
    parent: 'father',
    grandparent: 'grandfather',
    sibling: 'other',
    other: 'other',
  };
  return m[rel] || 'other';
}

export default function FamilySetup() {
  const navigate = useNavigate();
  const { family, createFamily, addMember: addMemberToFamily, deleteMember, loading } = useFamily();
  const [form, setForm] = useState<FamilyMemberForm>({ ...initialForm });
  const [savedMembers, setSavedMembers] = useState<SavedMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const updateForm = (updates: Partial<FamilyMemberForm>) => {
    setForm((f) => ({ ...f, ...updates }));
  };

  const toggleHealth = (condition: HealthCondition) => {
    const current = form.healthConditions;
    if (condition === 'none') {
      updateForm({ healthConditions: ['none'] });
      return;
    }
    const next = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current.filter((c) => c !== 'none'), condition];
    updateForm({ healthConditions: next });
  };

  const clearForm = () => {
    setForm({
      avatarEmoji: '😊',
      name: '',
      dob: '',
      relationship: '',
      healthConditions: [],
    });
  };

  const saveAndAddAnother = async () => {
    setError(null);
    const name = form.name.trim();
    if (!name || name.length < 2) {
      setError('Please enter a name (at least 2 characters).');
      return;
    }
    const payload: Partial<FamilyMember> & { relationship?: string } = {
      name,
      dob: form.dob || undefined,
      age_group: getAgeGroup(form.dob || null),
      age: getAge(form.dob || null) ?? undefined,
      role: mapRoleToBackend(form.relationship),
      relationship: form.relationship || undefined,
      health_conditions: form.healthConditions.length ? form.healthConditions : ['none'],
    };
    if (!family) {
      const result = await createFamily('My Family', [payload]);
      if (result.family) {
        setSavedMembers((prev) => [...prev, { id: `temp-${Date.now()}`, name, avatar: form.avatarEmoji }]);
        clearForm();
        setToast(`Added ${name}!`);
      } else {
        setError(result.error || 'Failed to save. Please try again.');
      }
    } else {
      const result = await addMemberToFamily(payload);
      if (result.member) {
        setSavedMembers((prev) => [...prev, { id: result.member!.id, name, avatar: form.avatarEmoji }]);
        clearForm();
        setToast(`Added ${name}!`);
      } else {
        setError(result.error || 'Failed to save. Please try again.');
      }
    }
  };

  const finishSetup = async () => {
    setError(null);
    const name = form.name.trim();
    const hasFormData = name && name.length >= 2;
    const hasSavedMembers = savedMembers.length > 0;

    if (hasFormData) {
      const payload: Partial<FamilyMember> & { relationship?: string } = {
        name,
        dob: form.dob || undefined,
        age_group: getAgeGroup(form.dob || null),
        age: getAge(form.dob || null) ?? undefined,
        role: mapRoleToBackend(form.relationship),
        relationship: form.relationship || undefined,
        health_conditions: form.healthConditions.length ? form.healthConditions : ['none'],
      };
      if (!family) {
        const result = await createFamily('My Family', [payload]);
        if (result.family) {
          setToast('Family setup complete!');
          navigate('/dashboard', { replace: true });
        } else {
          setError(result.error || 'Failed to save. Please try again.');
        }
      } else {
        const result = await addMemberToFamily(payload);
        if (result.member) {
          setToast('Family setup complete!');
          navigate('/dashboard', { replace: true });
        } else {
          setError(result.error || 'Failed to save. Please try again.');
        }
      }
    } else if (hasSavedMembers) {
      setToast('Family setup complete!');
      navigate('/dashboard', { replace: true });
    } else {
      setError('Please add at least one family member.');
    }
  };

  const removeSavedMember = async (id: string) => {
    if (!id.startsWith('temp-')) {
      await deleteMember(id);
    }
    setSavedMembers((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-beige flex flex-col pb-28 max-w-md mx-auto w-full">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/onboarding"
            className="flex items-center justify-center w-10 h-10 rounded-full border border-beige-300 text-neutral-600 hover:bg-beige-100 shadow-card"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex gap-1">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full ${step <= 2 ? 'bg-olive-500' : 'bg-beige-300'}`}
                />
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-1.5">Step 2 of 3</p>
          </div>
        </div>
        <h1 className="font-serif text-xl font-bold text-olive-800">Settle In, Family</h1>
        <p className="text-neutral-600 text-sm mt-0.5">Who&apos;s joining the household?</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
        {/* Already added members */}
        {savedMembers.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Family members added:</p>
            <div className="flex flex-wrap gap-2">
              {savedMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-full"
                >
                  <span>{m.avatar || '😊'}</span>
                  <span className="text-sm font-medium text-gray-700">{m.name}</span>
                  <button
                    type="button"
                    onClick={() => removeSavedMember(m.id)}
                    className="text-gray-400 hover:text-red-500 text-xs p-0.5"
                    aria-label={`Remove ${m.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current member form card */}
        <div className="bg-[#FDFBF7] rounded-2xl p-5 border border-gray-100 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmojiOpen((o) => !o)}
                className="w-12 h-12 rounded-full bg-beige-100 border border-beige-300 flex items-center justify-center text-2xl hover:bg-beige-200"
              >
                {form.avatarEmoji}
              </button>
              {emojiOpen && (
                <>
                  <div
                  className="fixed inset-0 z-10"
                  role="button"
                  tabIndex={0}
                  aria-label="Close"
                  onClick={() => setEmojiOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEmojiOpen(false);
                    }
                  }}
                />
                  <div className="absolute left-0 top-full mt-1 p-2 bg-beige-50 rounded-xl border border-beige-300 shadow-card z-20 grid grid-cols-4 gap-1">
                    {AVATAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          updateForm({ avatarEmoji: emoji });
                          setEmojiOpen(false);
                        }}
                        className="w-9 h-9 flex items-center justify-center text-xl rounded hover:bg-beige-200"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex-1">
              <label className="label sr-only">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="Name"
                className="input-field"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-neutral-700">Date of Birth</label>
              <input
                type="date"
                value={form.dob || ''}
                onChange={(e) => updateForm({ dob: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-beige-300 bg-beige-50 focus:border-olive-500 focus:ring-1 focus:ring-olive-500 outline-none transition-all mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Relationship</label>
              <select
                value={form.relationship}
                onChange={(e) => updateForm({ relationship: e.target.value })}
                className="input-field mt-1"
              >
                <option value="">Select relationship</option>
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-2">Health needs (optional)</p>
              <div className="flex flex-wrap gap-2">
                {HEALTH_OPTIONS.map((opt) => {
                  const active =
                    form.healthConditions.includes(opt.value) ||
                    (opt.value === 'none' && (form.healthConditions.length === 0 || form.healthConditions.includes('none')));
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleHealth(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        active ? 'bg-olive-500 text-white border-olive-500' : 'bg-beige-50 text-neutral-600 border-beige-300 hover:border-olive-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
        )}
      </div>

      {/* Fixed bottom actions — no bottom nav on setup */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#F4F1EA] max-w-md mx-auto">
        <div className="space-y-3">
          <button
            type="button"
            onClick={saveAndAddAnother}
            disabled={loading}
            className="w-full py-3.5 border-2 border-[#5C6B4A] text-[#5C6B4A] rounded-full font-medium disabled:opacity-70"
          >
            + Save & Add Another Person
          </button>
          <button
            type="button"
            onClick={finishSetup}
            disabled={loading}
            className="w-full py-3.5 bg-[#5C6B4A] text-white rounded-full font-medium disabled:opacity-70"
          >
            Finish Setup →
          </button>
        </div>
      </div>

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
