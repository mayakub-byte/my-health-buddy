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
  age: number | '';
  relationship: (typeof RELATIONSHIP_OPTIONS)[number]['value'] | '';
  healthConditions: HealthCondition[];
}

const initialMember: FamilyMemberForm = {
  avatarEmoji: '👤',
  name: '',
  age: '',
  relationship: '',
  healthConditions: [],
};

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
    const payload: Partial<FamilyMember>[] = members.map((m) => ({
      name: m.name.trim(),
      age: m.age === '' ? undefined : Number(m.age),
      role: m.relationship || undefined,
      health_conditions: m.healthConditions.length ? m.healthConditions : ['none'],
    }));
    const family = await createFamily('My Family', payload);
    if (family) {
      navigate('/dashboard', { replace: true });
    } else {
      setError('Failed to save family. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header: back + progress */}
      <div className="px-4 pt-6 pb-4 bg-white border-b border-neutral-100">
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/onboarding"
            className="flex items-center justify-center w-10 h-10 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
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
                    step <= 2 ? 'bg-green-500' : 'bg-neutral-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-1.5">Step 2 of 3</p>
          </div>
        </div>
        <h1 className="text-xl font-bold text-neutral-800">Set Up Your Family</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          Add family members for personalized nutrition guidance
        </p>
      </div>

      {/* Member cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {members.map((member, index) => (
            <MemberCard
              key={index}
              member={member}
              index={index}
              onUpdate={(updates) => updateMember(index, updates)}
              onToggleHealth={(condition) => toggleHealth(index, condition)}
              onRemove={() => removeMember(index)}
              canRemove={members.length > 1}
            />
          ))}

          <button
            type="button"
            onClick={addMember}
            className="w-full py-3 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-500 hover:border-green-300 hover:text-green-600 flex items-center justify-center gap-2 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Family Member
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-4 bg-white border-t border-neutral-100">
        {error && (
          <p className="text-sm text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        <button
          onClick={handleContinue}
          disabled={loading}
          className="btn-primary w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold disabled:opacity-70"
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  index,
  onUpdate,
  onToggleHealth,
  onRemove,
  canRemove,
}: {
  member: FamilyMemberForm;
  index: number;
  onUpdate: (u: Partial<FamilyMemberForm>) => void;
  onToggleHealth: (c: HealthCondition) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Avatar emoji picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setEmojiOpen((o) => !o)}
              className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-2xl hover:bg-neutral-200"
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
                <div className="absolute left-0 top-full mt-1 p-2 bg-white rounded-lg border border-neutral-200 shadow-lg z-20 grid grid-cols-4 gap-1">
                  {AVATAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onUpdate({ avatarEmoji: emoji });
                        setEmojiOpen(false);
                      }}
                      className="w-9 h-9 flex items-center justify-center text-xl rounded hover:bg-neutral-100"
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
          </div>
          <div>
            <label className="label sr-only">Age</label>
            <input
              type="number"
              min={1}
              max={120}
              value={member.age === '' ? '' : member.age}
              onChange={(e) =>
                onUpdate({ age: e.target.value === '' ? '' : parseInt(e.target.value, 10) || '' })
              }
              placeholder="Age"
              className="input-field"
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

          {/* Health conditions chips */}
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-2">Health conditions</p>
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
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-green-300'
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
