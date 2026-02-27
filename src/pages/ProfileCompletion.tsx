// ============================================
// MY HEALTH BUDDY - Profile Completion
// Lightweight screen to collect health info
// for the auto-created primary member
// ============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import type { HealthCondition, FamilyMember } from '../types';

const HEALTH_CONDITIONS: { value: HealthCondition; label: string }[] = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'pre_diabetic', label: 'Pre-diabetic' },
  { value: 'bp', label: 'High BP' },
  { value: 'cholesterol', label: 'Cholesterol' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'weight_management', label: 'Weight Management' },
  { value: 'others', label: 'Others' },
  { value: 'none', label: 'None' },
];

const ROLE_OPTIONS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'other', label: 'Other' },
];

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

function calcAge(dob: string): number {
  return Math.floor((new Date().getTime() - new Date(dob).getTime()) / 31557600000);
}

export default function ProfileCompletion() {
  const navigate = useNavigate();
  const { members, updateMember } = useFamily();
  const primaryMember = members.find((m) => m.is_primary);

  const [name, setName] = useState(primaryMember?.name || '');
  const [dob, setDob] = useState(primaryMember?.dob || '');
  const [role, setRole] = useState<FamilyMember['role'] | ''>(primaryMember?.role || '');
  const [conditions, setConditions] = useState<HealthCondition[]>(() => {
    const existing = primaryMember?.health_conditions || [];
    // If there's a custom condition stored, map it back to 'others' for the UI
    const knownValues = ['diabetes', 'pre_diabetic', 'bp', 'cholesterol', 'weight_management', 'thyroid', 'none', 'others'];
    const customCondition = existing.find((c) => !knownValues.includes(c));
    if (customCondition) return [...existing.filter((c) => c !== customCondition), 'others'];
    return existing;
  });
  const [otherConditionText, setOtherConditionText] = useState(() => {
    const existing = primaryMember?.health_conditions || [];
    const knownValues = ['diabetes', 'pre_diabetic', 'bp', 'cholesterol', 'weight_management', 'thyroid', 'none', 'others'];
    return existing.find((c) => !knownValues.includes(c)) || '';
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCondition = (condition: HealthCondition) => {
    if (condition === 'none') {
      setConditions(['none']);
      setOtherConditionText('');
    } else {
      setConditions((prev) => {
        const filtered = prev.filter((c) => c !== 'none');
        const toggled = filtered.includes(condition)
          ? filtered.filter((c) => c !== condition)
          : [...filtered, condition];
        // Clear other text if 'others' is deselected
        if (condition === 'others' && filtered.includes('others')) {
          setOtherConditionText('');
        }
        return toggled;
      });
    }
  };

  const canSave = name.trim().length >= 2 && conditions.length > 0;

  const handleSave = async () => {
    if (!primaryMember || !canSave) return;
    setSaving(true);
    setError(null);

    // Replace 'others' with the actual custom text if provided
    const finalConditions = conditions.map((c) =>
      c === 'others' && otherConditionText.trim() ? otherConditionText.trim() as HealthCondition : c
    );

    const updates: Partial<FamilyMember> = {
      name: name.trim(),
      health_conditions: finalConditions,
    };
    if (dob) {
      updates.dob = dob;
      updates.age = calcAge(dob);
      updates.age_group = getAgeGroup(dob);
    }
    if (role) {
      updates.role = role as FamilyMember['role'];
    }

    const success = await updateMember(primaryMember.id, updates);
    if (success) {
      localStorage.setItem('mhb_profile_completed', 'true');
      navigate('/home', { replace: true });
    } else {
      setError('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  if (!primaryMember) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col pb-28" style={{ backgroundColor: '#F4F1EA' }}>
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#143628' }}>
          Complete Your Profile
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7a8c7e' }}>
          Help us personalize your meal guidance
        </p>
      </div>

      <div className="flex-1 px-6 pb-28 overflow-y-auto">
        <div className="space-y-5">
          {/* Name */}
          <div className="card">
            <label className="label">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="input-field"
              autoFocus
            />
          </div>

          {/* DOB & Role */}
          <div className="card">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#143628' }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FDFBF7] focus:border-[#5C6B4A] focus:ring-1 focus:ring-[#5C6B4A] mt-1"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="label">Role in Family</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as FamilyMember['role'])}
                  className="input-field"
                >
                  <option value="">Select</option>
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Health Conditions */}
          <div className="card">
            <label className="label mb-3 block">Health Conditions</label>
            <p className="text-xs mb-3" style={{ color: '#7a8c7e' }}>
              Select all that apply — this helps us tailor meal advice
            </p>
            <div className="flex flex-wrap gap-2">
              {HEALTH_CONDITIONS.map((condition) => {
                const isSelected = conditions.includes(condition.value);
                return (
                  <button
                    key={condition.value}
                    type="button"
                    onClick={() => toggleCondition(condition.value)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200'
                    }`}
                    style={isSelected ? { backgroundColor: '#5C6B4A' } : { color: '#143628' }}
                  >
                    {isSelected && <Check className="w-4 h-4 inline mr-1" />}
                    {condition.label}
                  </button>
                );
              })}
            </div>
            {conditions.includes('others') && (
              <input
                type="text"
                value={otherConditionText}
                onChange={(e) => setOtherConditionText(e.target.value)}
                placeholder="Type your condition (e.g., PCOS, uric acid)"
                className="input-field mt-3 text-sm"
              />
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>
      </div>

      {/* Fixed bottom action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-200 max-w-md mx-auto" style={{ backgroundColor: '#F4F1EA' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full py-3.5 text-white rounded-full font-medium text-base disabled:opacity-50"
          style={{ backgroundColor: '#5C6B4A' }}
        >
          {saving ? 'Saving...' : 'Save & Start Tracking'}
          {!saving && <ArrowRight className="w-5 h-5 inline ml-2 align-middle" />}
        </button>
      </div>
    </div>
  );
}
