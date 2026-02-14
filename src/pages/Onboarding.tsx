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

const HEALTH_CONDITIONS: { value: HealthCondition; label: string }[] = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'pre_diabetic', label: 'Pre-diabetic' },
  { value: 'bp', label: 'High Blood Pressure' },
  { value: 'cholesterol', label: 'High Cholesterol' },
  { value: 'weight_management', label: 'Weight Management' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'none', label: 'None of the above' },
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

export default function Onboarding({ onComplete }: OnboardingProps) {
  const navigate = useNavigate();
  const { createFamily, loading } = useFamily();

  const [step, setStep] = useState<OnboardingStep>('family');
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<Partial<FamilyMember>[]>([
    { name: '', age: undefined, gender: undefined, role: undefined, health_conditions: [] },
  ]);

  const addMember = () => {
    if (members.length < 6) {
      setMembers([
        ...members,
        { name: '', age: undefined, gender: undefined, role: undefined, health_conditions: [] },
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
    const family = await createFamily(familyName, members);
    if (family) {
      onComplete();
      navigate('/home');
    }
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
            <button type="button" onClick={prevStep} className="p-2 -ml-2 text-neutral-600" aria-label="Go back">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex-1">
            <ProgressBar step={step} />
          </div>
        </div>
      </div>

      {/* Content — pb-24 so it doesn't sit under the fixed bottom button */}
      <div className="flex-1 px-6 pb-24 overflow-y-auto">
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
        {step === 'ready' && <StepReady familyName={familyName} memberCount={members.length} />}
      </div>

      {/* Fixed bottom action — no bottom nav on onboarding */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#F4F1EA] max-w-md mx-auto">
        {step === 'ready' ? (
          <button
            type="button"
            onClick={handleComplete}
            disabled={loading}
            className="w-full py-3.5 bg-[#5C6B4A] text-white rounded-full font-medium"
          >
            {loading ? 'Setting up...' : 'Start Tracking Meals'}
            <ArrowRight className="w-5 h-5 inline ml-2 align-middle" />
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canProceed()}
            className="w-full py-3.5 bg-[#5C6B4A] text-white rounded-full font-medium"
          >
            Continue
            <ArrowRight className="w-5 h-5 inline ml-2 align-middle" />
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
            i <= currentIndex ? 'bg-primary-500' : 'bg-neutral-200'
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
      <h1 className="text-2xl font-bold text-neutral-800 mb-2">
        What's your family name?
      </h1>
      <p className="text-neutral-500 mb-6">
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
      <h1 className="text-2xl font-bold text-neutral-800 mb-2">
        Who's in your family?
      </h1>
      <p className="text-neutral-500 mb-6">
        Add family members who eat together
      </p>

      <div className="space-y-4">
        {members.map((member, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-600" />
                </div>
                <span className="font-medium text-neutral-700">
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
                  <label className="label">Age</label>
                  <input
                    type="number"
                    value={member.age || ''}
                    onChange={(e) =>
                      updateMember(index, { age: parseInt(e.target.value) || undefined })
                    }
                    placeholder="Age"
                    className="input-field"
                    min="1"
                    max="120"
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
            className="w-full py-3 border-2 border-dashed border-neutral-200 rounded-xl 
                       text-neutral-500 hover:border-primary-300 hover:text-primary-600
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
      <h1 className="text-2xl font-bold text-neutral-800 mb-2">
        Any health considerations?
      </h1>
      <p className="text-neutral-500 mb-6">
        This helps us give personalized nutrition advice
      </p>

      <div className="space-y-6">
        {members.map((member, memberIndex) => (
          <div key={memberIndex} className="card">
            <h3 className="font-semibold text-neutral-800 mb-3">
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
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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
function StepReady({
  familyName,
  memberCount,
}: {
  familyName: string;
  memberCount: number;
}) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-primary-600" />
      </div>

      <h1 className="text-2xl font-bold text-neutral-800 mb-2">
        You're all set! 🎉
      </h1>
      <p className="text-neutral-500 mb-6">
        {familyName} with {memberCount} member{memberCount > 1 ? 's' : ''} is ready
      </p>

      <div className="bg-primary-50 rounded-xl p-4 text-left">
        <h3 className="font-semibold text-primary-800 mb-2">What's next?</h3>
        <ul className="text-sm text-primary-700 space-y-1">
          <li>📸 Take a photo of your meal</li>
          <li>🍽️ We'll identify the dishes</li>
          <li>💯 Get personalized health scores</li>
          <li>💡 Small suggestions to improve</li>
        </ul>
      </div>
    </div>
  );
}
