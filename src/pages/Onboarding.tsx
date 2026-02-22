// ============================================
// MY HEALTH BUDDY - Onboarding Page
// Multi-step family setup flow
// ============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Trash2, Check, User } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import type { FamilyMember, HealthCondition } from '../types';

interface OnboardingProps {
  onComplete: () => void;
}

type OnboardingStep = 'family' | 'members' | 'health' | 'ready';

// Match /setup page: Diabetes, Hypertension, Cholesterol, Thyroid, Weight Management, None
const HEALTH_CONDITIONS: { value: HealthCondition; label: string }[] = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'bp', label: 'Hypertension' },
  { value: 'cholesterol', label: 'Cholesterol' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'weight_management', label: 'Weight Management' },
  { value: 'none', label: 'None' },
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

const ROLE_OPTIONS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'other', label: 'Other' },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const navigate = useNavigate();
  const { createFamily, loading } = useFamily();

  const [step, setStep] = useState<OnboardingStep>('family');
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<Partial<FamilyMember>[]>([
    { name: '', dob: undefined, gender: undefined, role: undefined, health_conditions: [] },
  ]);

  const addMember = () => {
    if (members.length < 6) {
      setMembers([
        ...members,
        { name: '', dob: undefined, gender: undefined, role: undefined, health_conditions: [] },
      ]);
    }
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, updates: Partial<FamilyMember>) => {
    setMembers(members.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  };

  const toggleHealthCondition = (memberIndex: number, condition: HealthCondition) => {
    const member = members[memberIndex];
    const conditions = member.health_conditions || [];
    
    if (condition === 'none') {
      updateMember(memberIndex, { health_conditions: ['none'] });
    } else {
      const newConditions = conditions.includes(condition)
        ? conditions.filter((c) => c !== condition)
        : [...conditions.filter((c) => c !== 'none'), condition];
      updateMember(memberIndex, { health_conditions: newConditions });
    }
  };

  const handleComplete = async () => {
    const payload = members.map((member) => ({
      name: member.name,
      dob: member.dob,
      age_group: getAgeGroup(member.dob),
      role: member.role ?? undefined,
      health_conditions: member.health_conditions ?? [],
    }));
    const result = await createFamily(familyName, payload);
    if (result.family) {
      onComplete();
      navigate('/home');
    }
    // If result.error, useFamily hook has set error; could surface via useFamily().error
  };

  const canProceed = () => {
    switch (step) {
      case 'family':
        return familyName.trim().length >= 2;
      case 'members':
        return members.every((m) => m.name && m.name.trim().length >= 2);
      case 'health':
        return members.every((m) => m.health_conditions && m.health_conditions.length > 0);
      default:
        return true;
    }
  };

  const nextStep = () => {
    const steps: OnboardingStep[] = ['family', 'members', 'health', 'ready'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: OnboardingStep[] = ['family', 'members', 'health', 'ready'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-28" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Progress Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-4">
          {step !== 'family' && (
            <button type="button" onClick={prevStep} className="p-2 -ml-2 text-brand-text" aria-label="Go back">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex-1">
            <ProgressBar step={step} />
          </div>
        </div>
      </div>

      {/* Content — pb-28 so it doesn't sit under the fixed bottom button */}
      <div className="flex-1 px-6 pb-28 overflow-y-auto">
        {step === 'family' && (
          <StepFamily familyName={familyName} setFamilyName={setFamilyName} />
        )}
        {step === 'members' && (
          <StepMembers
            members={members}
            updateMember={updateMember}
            addMember={addMember}
            removeMember={removeMember}
          />
        )}
        {step === 'health' && (
          <StepHealth
            members={members}
            toggleHealthCondition={toggleHealthCondition}
          />
        )}
        {step === 'ready' && (
          <StepReady
            familyName={familyName}
            members={members}
            onEditFamily={() => setStep('members')}
          />
        )}
      </div>

      {/* Fixed bottom action — no bottom nav on onboarding */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#F4F1EA] border-t border-gray-200 max-w-md mx-auto">
        {step === 'ready' ? (
          <button
            type="button"
            onClick={handleComplete}
            disabled={loading}
            className="w-full py-3.5 bg-[#5C6B4A] text-white rounded-full font-medium text-base"
          >
            {loading ? 'Setting up...' : 'Start Tracking Meals'}
            <ArrowRight className="w-5 h-5 inline ml-2 align-middle" />
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canProceed()}
            className="w-full py-3.5 bg-[#5C6B4A] text-white rounded-full font-medium text-base"
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}

// Progress bar component
function ProgressBar({ step }: { step: OnboardingStep }) {
  const steps: OnboardingStep[] = ['family', 'members', 'health', 'ready'];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="flex gap-2">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i <= currentIndex ? 'bg-brand-light0' : 'bg-neutral-200'
          }`}
        />
      ))}
    </div>
  );
}

// Step 1: Family name
function StepFamily({
  familyName,
  setFamilyName,
}: {
  familyName: string;
  setFamilyName: (name: string) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-2">
        What's your family name?
      </h1>
      <p className="text-brand-text mb-6">
        This helps us personalize your experience
      </p>

      <div>
        <label className="label">Family Name</label>
        <input
          type="text"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          placeholder="e.g., Sharma Family"
          className="input-field"
          autoFocus
        />
      </div>
    </div>
  );
}

// Step 2: Family members
function StepMembers({
  members,
  updateMember,
  addMember,
  removeMember,
}: {
  members: Partial<FamilyMember>[];
  updateMember: (index: number, updates: Partial<FamilyMember>) => void;
  addMember: () => void;
  removeMember: (index: number) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-2">
        Who's in your family?
      </h1>
      <p className="text-brand-text mb-6">
        Add family members who eat together
      </p>

      <div className="space-y-4">
        {members.map((member, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-gray rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-brand-text" />
                </div>
                <span className="font-medium text-brand-dark">
                  Member {index + 1}
                </span>
              </div>
              {members.length > 1 && (
                <button
                  onClick={() => removeMember(index)}
                  className="p-2 text-neutral-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={member.name || ''}
                  onChange={(e) => updateMember(index, { name: e.target.value })}
                  placeholder="Enter name"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    type="date"
                    value={member.dob || ''}
                    onChange={(e) => updateMember(index, { dob: e.target.value || undefined })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FDFBF7] focus:border-[#5C6B4A] focus:ring-1 focus:ring-[#5C6B4A] mt-1"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select
                    value={member.role || ''}
                    onChange={(e) =>
                      updateMember(index, { role: e.target.value as FamilyMember['role'] })
                    }
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
          </div>
        ))}

        {members.length < 6 && (
          <button
            onClick={addMember}
            className="w-full py-3 border-2 border-dashed border-brand-border rounded-xl 
                       text-brand-text hover:border-brand-border hover:text-brand-text
                       flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Family Member
          </button>
        )}
      </div>
    </div>
  );
}

// Step 3: Health conditions
function StepHealth({
  members,
  toggleHealthCondition,
}: {
  members: Partial<FamilyMember>[];
  toggleHealthCondition: (memberIndex: number, condition: HealthCondition) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark mb-2">
        Any health considerations?
      </h1>
      <p className="text-brand-text mb-6">
        This helps us give personalized nutrition advice
      </p>

      <div className="space-y-6">
        {members.map((member, memberIndex) => (
          <div key={memberIndex} className="card">
            <h3 className="font-semibold text-brand-dark mb-3">
              {member.name || `Member ${memberIndex + 1}`}
            </h3>

            <div className="flex flex-wrap gap-2">
              {HEALTH_CONDITIONS.map((condition) => {
                const isSelected = member.health_conditions?.includes(condition.value);
                return (
                  <button
                    key={condition.value}
                    onClick={() => toggleHealthCondition(memberIndex, condition.value)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors
                      ${
                        isSelected
                          ? 'bg-brand-light0 text-white'
                          : 'bg-neutral-100 text-brand-text hover:bg-neutral-200'
                      }`}
                  >
                    {isSelected && <Check className="w-4 h-4 inline mr-1" />}
                    {condition.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Step 4: Ready
const ROLE_LABELS: Record<string, string> = {
  father: 'Father',
  mother: 'Mother',
  son: 'Son',
  daughter: 'Daughter',
  grandfather: 'Grandfather',
  grandmother: 'Grandmother',
  other: 'Member',
};

function StepReady({
  familyName,
  members,
  onEditFamily,
}: {
  familyName: string;
  members: Partial<FamilyMember>[];
  onEditFamily: () => void;
}) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-brand-gray rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-brand-text" />
      </div>

      <h1 className="text-2xl font-bold text-brand-dark mb-2">
        You're all set! 🎉
      </h1>
      <p className="text-brand-text mb-6">
        {familyName} with {members.length} member{members.length !== 1 ? 's' : ''} is ready
      </p>

      <div className="bg-brand-light rounded-xl p-4 text-left">
        <h3 className="font-semibold text-brand-dark mb-2">What's next?</h3>
        <ul className="text-sm text-brand-dark space-y-1">
          <li>📸 Take a photo of your meal</li>
          <li>🍽️ We'll identify the dishes</li>
          <li>💯 Get personalized health scores</li>
          <li>💡 Small suggestions to improve</li>
        </ul>
      </div>

      {/* Family Members Added */}
      <div className="mt-6 p-4 bg-[#FDFBF7] rounded-2xl border border-gray-100 text-left">
        <p className="text-sm font-semibold text-gray-700 mb-3">👨‍👩‍👧‍👦 Your Family</p>
        <div className="space-y-2">
          {members.map((m, i) => {
            const age = m.dob
              ? Math.floor((new Date().getTime() - new Date(m.dob).getTime()) / 31557600000)
              : null;
            const relationshipLabel = m.role ? ROLE_LABELS[m.role] || m.role : 'Member';
            const healthLabel =
              (m.health_conditions?.length ?? 0) > 0 && m.health_conditions?.[0] !== 'none'
                ? (m.health_conditions ?? [])
                    .map((c) => HEALTH_CONDITIONS.find((h) => h.value === c)?.label ?? c)
                    .join(', ')
                : '';
            return (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">😊</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.name}</p>
                    <p className="text-xs text-gray-500">
                      {relationshipLabel}
                      {age != null ? ` • ${age} yrs` : ''}
                      {healthLabel ? ` • ${healthLabel}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-emerald-500 text-sm">✓</span>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onEditFamily}
          className="w-full mt-3 py-2 text-sm text-[#5C6B4A] font-medium"
        >
          ✏️ Edit Family
        </button>
      </div>
    </div>
  );
}
