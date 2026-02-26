// ============================================
// MY HEALTH BUDDY - Family Setup Page
// Household Overview + Add/Edit Family Member form
// Matches mockup: member grid → add/edit member screen
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Plus, Pencil, Camera, ChevronDown, Check } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { uploadAvatar } from '../lib/supabase';
import type { FamilyMember, HealthCondition } from '../types';

// ---------- Constants ----------

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
  { value: 'cholesterol', label: 'Cholesterol' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'weight_management', label: 'Weight management' },
  { value: 'bp', label: 'Hypertension' },
  { value: 'none', label: 'None' },
  { value: 'others', label: 'Other' },
];

const KNOWN_HEALTH_VALUES = ['diabetes', 'pre_diabetic', 'bp', 'cholesterol', 'weight_management', 'thyroid', 'none', 'others'];

// ---------- Helpers ----------

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

function mapRoleToBackend(rel: string): FamilyMember['role'] {
  const m: Record<string, FamilyMember['role']> = {
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

function getAgeGroupLabel(member: FamilyMember): string {
  const age = getAge(member.dob);
  if (age !== null) return `${age} yrs`;
  if (member.age) return `${member.age} yrs`;
  return member.age_group || 'Adult';
}

function getRoleLabel(member: FamilyMember): string {
  if (member.relationship) {
    const opt = RELATIONSHIP_OPTIONS.find((r) => r.value === member.relationship);
    if (opt) return opt.label;
  }
  const roleMap: Record<string, string> = {
    father: 'Father', mother: 'Mother', son: 'Son', daughter: 'Daughter',
    grandfather: 'Grandfather', grandmother: 'Grandmother', other: 'Member',
  };
  return roleMap[member.role || ''] || 'Adult';
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

/** Convert a FamilyMember's health_conditions back to form state */
function memberToFormHealth(conditions: HealthCondition[]): { healthConditions: HealthCondition[]; otherHealthText: string } {
  const customCondition = conditions.find((c) => !KNOWN_HEALTH_VALUES.includes(c));
  if (customCondition) {
    return {
      healthConditions: [...conditions.filter((c) => c !== customCondition), 'others'],
      otherHealthText: customCondition,
    };
  }
  return { healthConditions: conditions, otherHealthText: '' };
}

// ---------- Member Form ----------

interface MemberFormData {
  name: string;
  dob: string;
  relationship: string;
  email: string;
  healthConditions: HealthCondition[];
  otherHealthText: string;
}

const emptyForm: MemberFormData = {
  name: '',
  dob: '',
  relationship: '',
  email: '',
  healthConditions: [],
  otherHealthText: '',
};

// ---------- Shared Member Form Screen (Add + Edit) ----------

function MemberFormScreen({
  title,
  initialData,
  onSave,
  onCancel,
  loading,
  error,
}: {
  title: string;
  initialData?: FamilyMember;
  onSave: (form: MemberFormData, photoFile?: File) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState<MemberFormData>(() => {
    if (!initialData) return { ...emptyForm };
    const { healthConditions, otherHealthText } = memberToFormHealth(initialData.health_conditions || []);
    return {
      name: initialData.name || '',
      dob: initialData.dob || '',
      relationship: initialData.relationship || '',
      email: '',
      healthConditions,
      otherHealthText,
    };
  });

  // Show existing avatar when editing
  const existingAvatarUrl = initialData?.avatar_url;

  const update = (updates: Partial<MemberFormData>) => {
    setForm((f) => ({ ...f, ...updates }));
  };

  const toggleHealth = (condition: HealthCondition) => {
    const current = form.healthConditions;
    if (condition === 'none') {
      update({ healthConditions: current.includes('none') ? [] : ['none'], otherHealthText: '' });
      return;
    }
    if (condition === 'others') {
      if (current.includes('others')) {
        update({ healthConditions: current.filter((c) => c !== 'others'), otherHealthText: '' });
      } else {
        update({ healthConditions: [...current.filter((c) => c !== 'none'), 'others'] });
      }
      return;
    }
    const next = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current.filter((c) => c !== 'none'), condition];
    update({ healthConditions: next });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const canSave = form.name.trim().length >= 2;

  // Determine what to show in the avatar circle
  const avatarDisplay = photoPreview || existingAvatarUrl;

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-brand-text hover:text-brand-dark"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-brand-dark">{title}</h1>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-[#7a8c7e] hover:text-brand-dark"
        >
          Cancel
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        {/* Avatar / Photo picker */}
        <div className="flex justify-center my-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-full bg-[#f0f0ee] border-2 border-dashed border-[#d0cec8] flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#6ab08c] transition-colors"
            aria-label="Select profile picture"
          >
            {avatarDisplay ? (
              <img src={avatarDisplay} alt="Profile preview" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-7 h-7 text-[#aaa]" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>
        <p className="text-center text-xs text-[#999] -mt-2 mb-6">
          {avatarDisplay ? 'tap to change picture' : 'add profile picture'}
        </p>

        <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1.5">
              Full Name <span className="text-[#999] font-normal">(required)</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Enter full name"
              className="w-full px-4 py-3 rounded-xl border border-[#e8e2d8] bg-white text-brand-dark placeholder:text-gray-400 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
              autoFocus
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1.5">
              Date of Birth
            </label>
            <div className="relative">
              <input
                type="date"
                value={form.dob}
                onChange={(e) => update({ dob: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-[#e8e2d8] bg-white text-brand-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Relationship */}
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1.5">
              Relationship <span className="text-[#999] font-normal">(optional)</span>
            </label>
            <div className="relative">
              <select
                value={form.relationship}
                onChange={(e) => update({ relationship: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#e8e2d8] bg-white text-brand-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all appearance-none pr-10"
              >
                <option value="">Select</option>
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1.5">
              Email <span className="text-[#999] font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="We'll use this to share reports and meal notifications"
              className="w-full px-4 py-3 rounded-xl border border-[#e8e2d8] bg-white text-brand-dark placeholder:text-gray-400 text-sm focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
            />
          </div>

          {/* Health Conditions */}
          <div>
            <p className="text-sm font-semibold text-brand-dark mb-3">
              Needs a little extra care?
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {HEALTH_OPTIONS.map((opt) => {
                const active = form.healthConditions.includes(opt.value) ||
                  (opt.value === 'none' && form.healthConditions.length === 0);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleHealth(opt.value)}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                      active
                        ? 'bg-[#6ab08c] text-white'
                        : 'bg-[#f3f1eb] text-brand-dark hover:bg-[#e8e5dd]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Other free text input */}
            {form.healthConditions.includes('others') && (
              <input
                type="text"
                value={form.otherHealthText}
                onChange={(e) => update({ otherHealthText: e.target.value })}
                placeholder="Add another ailment..."
                className="w-full mt-2 px-4 py-2.5 rounded-xl border border-[#e8e2d8] bg-white text-brand-dark placeholder:text-gray-400 text-sm focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                autoFocus
              />
            )}

            <p className="text-xs text-[#999] mt-2 leading-relaxed">
              This supports food portions and guidance on medical diagnosis.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mt-4">{error}</p>
        )}
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#eee] p-4 max-w-md mx-auto">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-full border border-[#d0cec8] text-brand-dark font-medium text-sm hover:bg-[#f8f8f6] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(form, photoFile || undefined)}
            disabled={!canSave || loading}
            className="flex-1 py-3 rounded-full bg-[#6ab08c] text-white font-medium text-sm hover:bg-[#599A7A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Household Overview Screen ----------

function HouseholdOverview({
  members,
  onAddMember,
  onCreateFamily,
  onEditMember,
  loading,
}: {
  members: FamilyMember[];
  onAddMember: () => void;
  onCreateFamily: () => void;
  onEditMember: (member: FamilyMember) => void;
  loading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto w-full" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase text-center mb-1">
          Family Setup &ndash; Household Overview
        </p>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1 text-brand-text hover:text-brand-dark"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-lg font-bold text-brand-dark">Your Household</h1>
          <button type="button" className="p-1 text-[#999] hover:text-brand-dark" aria-label="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
        <h2 className="text-base font-bold text-brand-dark mb-1">
          Who usually eats together at home?
        </h2>
        <p className="text-[13px] text-[#7a8c7e] mb-5">
          This helps us personalise guidance for everyone.
        </p>

        {/* Member Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl p-3 border border-[#eae7e0] flex flex-col items-center relative"
            >
              {/* Edit icon */}
              <button
                type="button"
                onClick={() => onEditMember(member)}
                className="absolute top-2 right-2 w-6 h-6 bg-[#f3f1eb] rounded-full flex items-center justify-center"
                aria-label={`Edit ${member.name}`}
              >
                <Pencil className="w-3 h-3 text-[#888]" />
              </button>

              {/* Avatar */}
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.name}
                  className="w-14 h-14 rounded-full object-cover mb-2"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold mb-2"
                  style={{ backgroundColor: member.avatar_color || '#4CAF50' }}
                >
                  {getInitial(member.name)}
                </div>
              )}

              {/* Info */}
              <p className="text-sm font-semibold text-brand-dark text-center leading-tight truncate w-full">
                {member.name}
              </p>
              <p className="text-[11px] text-[#999] text-center">
                {getRoleLabel(member)}
              </p>
              <p className="text-[11px] text-[#999] text-center">
                {getAgeGroupLabel(member)}
              </p>
            </div>
          ))}

          {/* Add Member card */}
          <button
            type="button"
            onClick={onAddMember}
            className="bg-white rounded-2xl p-3 border-2 border-dashed border-[#d5d2cb] flex flex-col items-center justify-center hover:border-[#6ab08c]/50 transition-colors min-h-[130px]"
          >
            <div className="w-14 h-14 rounded-full bg-[#f3f1eb] flex items-center justify-center mb-2">
              <Plus className="w-6 h-6 text-[#999]" />
            </div>
            <p className="text-xs font-medium text-[#999] text-center leading-tight">
              Add Member
            </p>
            <p className="text-[10px] text-[#bbb] text-center">Create profile</p>
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-[#e8efe9] rounded-xl px-4 py-3 flex items-start gap-3 mt-2">
          <div className="w-5 h-5 bg-[#6ab08c] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-dark mb-0.5">Balanced Nutrition for All</p>
            <p className="text-xs text-[#7a8c7e] leading-relaxed">
              We automatically adjust portions and nutrient guidance based on age and health context.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 max-w-md mx-auto" style={{ backgroundColor: '#F4F1EA' }}>
        <button
          type="button"
          onClick={onCreateFamily}
          disabled={members.length === 0 || loading}
          className="w-full py-3.5 bg-[#6ab08c] text-white font-semibold text-[15px] rounded-full hover:bg-[#599A7A] active:bg-[#4d866a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Setting up...' : 'Create Family'}
        </button>
      </div>
    </div>
  );
}

// ---------- Main FamilySetup Component ----------

export default function FamilySetup() {
  const navigate = useNavigate();
  const { family, members, addMember: addMemberToFamily, createFamily, updateMember, loading, refreshFamily } = useFamily();
  const [view, setView] = useState<'overview' | 'add' | 'edit'>('overview');
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAddMember = () => {
    setError(null);
    setView('add');
  };

  const handleCancelForm = () => {
    setError(null);
    setEditingMember(null);
    setView('overview');
  };

  /** Upload photo for a member and return the public URL */
  const uploadMemberPhoto = async (memberId: string, photoFile: File): Promise<string | null> => {
    if (!family) return null;
    return uploadAvatar(family.id, memberId, photoFile);
  };

  const handleSaveMember = async (form: MemberFormData, photoFile?: File) => {
    setError(null);
    const name = form.name.trim();
    if (!name || name.length < 2) {
      setError('Please enter a name (at least 2 characters).');
      return;
    }

    // Build health conditions array including custom text
    let healthConditions: HealthCondition[] = form.healthConditions.filter((c) => c !== 'others');
    if (form.healthConditions.includes('others') && form.otherHealthText.trim()) {
      healthConditions = [...healthConditions, form.otherHealthText.trim() as HealthCondition];
    }
    if (healthConditions.length === 0) {
      healthConditions = ['none'];
    }

    const payload: Partial<FamilyMember> & { relationship?: string } = {
      name,
      dob: form.dob || undefined,
      age_group: getAgeGroup(form.dob || null),
      age: getAge(form.dob || null) ?? undefined,
      role: mapRoleToBackend(form.relationship),
      relationship: form.relationship || undefined,
      health_conditions: healthConditions,
    };

    if (!family) {
      // First member — create the family
      const result = await createFamily(`${name}'s Family`, [payload]);
      if (result.family) {
        // Upload photo if provided (need to find the newly created member)
        if (photoFile) {
          await refreshFamily();
          // The member was just created — get it from the family
          const { data: newMembers } = await (await import('../lib/supabase')).supabase
            .from('family_members')
            .select('*')
            .eq('family_id', result.family.id)
            .order('created_at', { ascending: false })
            .limit(1);
          if (newMembers?.[0]) {
            const avatarUrl = await uploadMemberPhoto(newMembers[0].id, photoFile);
            if (avatarUrl) {
              await updateMember(newMembers[0].id, { avatar_url: avatarUrl } as Partial<FamilyMember>);
            }
          }
        }
        setToast(`Added ${name}!`);
        setView('overview');
        await refreshFamily();
      } else {
        setError(result.error || 'Failed to save. Please try again.');
      }
    } else {
      const result = await addMemberToFamily(payload);
      if (result.member) {
        // Upload photo if provided
        if (photoFile) {
          const avatarUrl = await uploadMemberPhoto(result.member.id, photoFile);
          if (avatarUrl) {
            await updateMember(result.member.id, { avatar_url: avatarUrl } as Partial<FamilyMember>);
          }
        }
        setToast(`Added ${name}!`);
        setView('overview');
        await refreshFamily();
      } else {
        setError(result.error || 'Failed to save. Please try again.');
      }
    }
  };

  const handleEditMember = (member: FamilyMember) => {
    setError(null);
    setEditingMember(member);
    setView('edit');
  };

  const handleUpdateMember = async (form: MemberFormData, photoFile?: File) => {
    if (!editingMember || !family) return;
    setError(null);

    const name = form.name.trim();
    if (!name || name.length < 2) {
      setError('Please enter a name (at least 2 characters).');
      return;
    }

    // Build health conditions
    let healthConditions: HealthCondition[] = form.healthConditions.filter((c) => c !== 'others');
    if (form.healthConditions.includes('others') && form.otherHealthText.trim()) {
      healthConditions = [...healthConditions, form.otherHealthText.trim() as HealthCondition];
    }
    if (healthConditions.length === 0) {
      healthConditions = ['none'];
    }

    const updates: Partial<FamilyMember> = {
      name,
      dob: form.dob || undefined,
      age_group: getAgeGroup(form.dob || null),
      age: getAge(form.dob || null) ?? undefined,
      role: mapRoleToBackend(form.relationship),
      relationship: form.relationship || undefined,
      health_conditions: healthConditions,
    };

    // Upload photo if provided
    if (photoFile) {
      const avatarUrl = await uploadMemberPhoto(editingMember.id, photoFile);
      if (avatarUrl) {
        updates.avatar_url = avatarUrl;
      }
    }

    const success = await updateMember(editingMember.id, updates);
    if (success) {
      setToast(`Updated ${name}!`);
      setEditingMember(null);
      setView('overview');
      await refreshFamily();
    } else {
      setError('Failed to update. Please try again.');
    }
  };

  const handleCreateFamily = () => {
    navigate('/dashboard', { replace: true });
  };

  if (view === 'add') {
    return (
      <MemberFormScreen
        title="Add Family Member"
        onSave={handleSaveMember}
        onCancel={handleCancelForm}
        loading={loading}
        error={error}
      />
    );
  }

  if (view === 'edit' && editingMember) {
    return (
      <MemberFormScreen
        title="Edit Family Member"
        initialData={editingMember}
        onSave={handleUpdateMember}
        onCancel={handleCancelForm}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <>
      <HouseholdOverview
        members={members}
        onAddMember={handleAddMember}
        onCreateFamily={handleCreateFamily}
        onEditMember={handleEditMember}
        loading={loading}
      />

      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 mx-auto max-w-sm bg-neutral-800 text-white text-sm font-medium py-3 px-4 rounded-xl text-center shadow-lg z-50"
          role="status"
        >
          {toast}
        </div>
      )}
    </>
  );
}
