// ============================================
// MY HEALTH BUDDY - Family Setup Page
// Mobile-first onboarding: add family members (step 2 of 3)
// ============================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import type { FamilyMember, HealthCondition } from '../types';

const RELATIONSHIP_OPTIONS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'grandmother', label: 'Grandmother' },
] as const;

const HEALTH_OPTIONS: { value: HealthCondition; label: string }[] = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'bp', label: 'Hypertension' },
  { value: 'cholesterol', label: 'Cholesterol' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'none', label: 'None' },
];

const AVATAR_EMOJIS = ['👨', '👩', '👧', '👦', '👴', '👵', '🧑', '👶'];

export interface FamilyMemberForm {
  avatarEmoji: string;
  name: string;
  dob: string;
  relationship: (typeof RELATIONSHIP_OPTIONS)[number]['value'] | '';
  healthConditions: HealthCondition[];
}

const initialMember: FamilyMemberForm = {
  avatarEmoji: '👤',
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

function capitalizeAgeGroup(g: string): string {
  return g.charAt(0).toUpperCase() + g.slice(1);
}

export default function FamilySetup() {
  const navigate = useNavigate();
  const { createFamily, loading } = useFamily();
  const [members, setMembers] = useState<FamilyMemberForm[]>([{ ...initialMember }]);
  const [error, setError] = useState<string | null>(null);

  const addMember = () => {
    if (members.length < 10) {
      setMembers([...members, { ...initialMember }]);
    }
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, updates: Partial<FamilyMemberForm>) => {
    setMembers(members.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  };

  const toggleHealth = (index: number, condition: HealthCondition) => {
    const m = members[index];
    const current = m.healthConditions;
    if (condition === 'none') {
      updateMember(index, { healthConditions: ['none'] });
      return;
    }
    const next = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current.filter((c) => c !== 'none'), condition];
    updateMember(index, { healthConditions: next });
  };

  const handleContinue = async () => {
    setError(null);
    const valid = members.every((m) => m.name.trim().length >= 2);
    if (!valid) {
      setError('Please enter a name for each family member.');
      return;
    }
    const payload: Partial<FamilyMember>[] = members.map((m) => {
      const ageGroup = getAgeGroup(m.dob || null);
      const age = getAge(m.dob || null);
      return {
        name: m.name.trim(),
        dob: m.dob || undefined,
        age_group: ageGroup,
        age: age ?? undefined,
        role: m.relationship || undefined,
        health_conditions: m.healthConditions.length ? m.healthConditions : ['none'],
      };
    });
    const family = await createFamily('My Family', payload);
    if (family) {
      navigate('/dashboard', { replace: true });
    } else {
      setError('Failed to save family. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-beige flex flex-col max-w-md mx-auto w-full">
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
                  className={`h-1.5 flex-1 rounded-full ${
                    step <= 2 ? 'bg-olive-500' : 'bg-beige-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-1.5">Step 2 of 3</p>
          </div>
        </div>
        <h1 className="font-heading text-xl font-bold text-olive-800">Settle In, Family</h1>
        <p className="text-neutral-600 text-sm mt-0.5">
          Who&apos;s joining the household?
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-4">
          {members.map((member, index) => (
            <MemberCard
              key={index}
              member={member}
              onUpdate={(updates) => updateMember(index, updates)}
              onToggleHealth={(condition) => toggleHealth(index, condition)}
              onRemove={() => removeMember(index)}
              canRemove={members.length > 1}
            />
          ))}

          <button
            type="button"
            onClick={addMember}
            className="w-full py-3.5 border-2 border-dashed border-olive-300 rounded-2xl text-olive-600 hover:border-olive-400 hover:bg-olive-50/50 flex items-center justify-center gap-2 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            + Add Another Person
          </button>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-beige-300">
        {error && (
          <p className="text-sm text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
        )}
        <button
          onClick={handleContinue}
          disabled={loading}
          className="btn-primary w-full py-3.5 rounded-full font-semibold disabled:opacity-70"
        >
          {loading ? 'Saving…' : 'Finish & Create Home'}
        </button>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  onUpdate,
  onToggleHealth,
  onRemove,
  canRemove,
}: {
  member: FamilyMemberForm;
  onUpdate: (u: Partial<FamilyMemberForm>) => void;
  onToggleHealth: (c: HealthCondition) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);

  return (
    <div className="card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Avatar emoji picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setEmojiOpen((o) => !o)}
              className="w-12 h-12 rounded-full bg-beige-100 border border-beige-300 flex items-center justify-center text-2xl hover:bg-beige-200"
            >
              {member.avatarEmoji}
            </button>
            {emojiOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setEmojiOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1 p-2 bg-beige-50 rounded-xl border border-beige-300 shadow-card z-20 grid grid-cols-4 gap-1">
                  {AVATAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onUpdate({ avatarEmoji: emoji });
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
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-2 text-neutral-400 hover:text-red-500 rounded-lg"
              aria-label="Remove member"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="label sr-only">Name</label>
            <input
              type="text"
              value={member.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Name"
              className="input-field"
            />
            {member.dob && (
              <p className="text-xs text-neutral-500 mt-1">
                {getAge(member.dob)} years • {capitalizeAgeGroup(getAgeGroup(member.dob))}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Date of Birth</label>
            <input
              type="date"
              value={member.dob || ''}
              onChange={(e) => onUpdate({ dob: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-xl border border-beige-300 bg-beige-50 focus:border-olive-500 focus:ring-1 focus:ring-olive-500 outline-none transition-all mt-1"
            />
          </div>
          <div>
            <label className="label sr-only">Relationship</label>
            <select
              value={member.relationship}
              onChange={(e) =>
                onUpdate({
                  relationship: e.target.value as FamilyMemberForm['relationship'],
                })
              }
              className="input-field"
            >
              <option value="">Relationship</option>
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Health conditions / needs */}
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-2">Needs a little extra care</p>
            <div className="flex flex-wrap gap-2">
              {HEALTH_OPTIONS.map((opt) => {
                const active =
                  member.healthConditions.includes(opt.value) ||
                  (opt.value === 'none' && (member.healthConditions.length === 0 || member.healthConditions.includes('none')));
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onToggleHealth(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-olive-500 text-white border-olive-500'
                        : 'bg-beige-50 text-neutral-600 border-beige-300 hover:border-olive-400'
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
    </div>
  );
}
