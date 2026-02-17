// ============================================
// MY HEALTH BUDDY - Family Page
// Manage family members
// ============================================

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import type { FamilyMember, HealthCondition } from '../types';

const HEALTH_CONDITIONS: { value: HealthCondition; label: string }[] = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'pre_diabetic', label: 'Pre-diabetic' },
  { value: 'bp', label: 'High BP' },
  { value: 'cholesterol', label: 'Cholesterol' },
  { value: 'weight_management', label: 'Weight' },
  { value: 'others', label: 'Others' },
  { value: 'none', label: 'None' },
];

export default function Family() {
  const location = useLocation();
  const { family, members, addMember, updateMember, deleteMember } = useFamily();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if ((location.state as { addMember?: boolean } | null)?.addMember) {
      setShowAddForm(true);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Header */}
      <div className="bg-[#FDFBF7] px-6 py-4 border-b border-neutral-100">
        <h1 className="text-xl font-bold text-neutral-800">
          {family?.name || 'Family'}
        </h1>
        <p className="text-sm text-neutral-500">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* Family Members List */}
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            isEditing={editingId === member.id}
            onEdit={() => setEditingId(member.id)}
            onCancel={() => setEditingId(null)}
            onSave={(updates) => {
              updateMember(member.id, updates);
              setEditingId(null);
            }}
            onDelete={() => {
              if (confirm(`Remove ${member.name} from family?`)) {
                deleteMember(member.id);
              }
            }}
          />
        ))}

        {/* Add Member Button */}
        {!showAddForm && members.length < 6 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-4 border-2 border-dashed border-neutral-200 rounded-2xl
                       text-neutral-500 hover:border-primary-300 hover:text-primary-600
                       flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Family Member
          </button>
        )}

        {/* Add Member Form */}
        {showAddForm && (
          <>
            {addError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
                {addError}
              </div>
            )}
            <AddMemberForm
              onSave={async (newMember) => {
                setAddError(null);
                const result = await addMember(newMember);
                if (result.member) {
                  setShowAddForm(false);
                  setAddError(null);
                } else {
                  setAddError(result.error || 'Failed to save member.');
                }
              }}
              onCancel={() => { setShowAddForm(false); setAddError(null); }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Member card component
function MemberCard({
  member,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  member: FamilyMember;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: Partial<FamilyMember>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [age, setAge] = useState(member.age || 0);
  const knownValues = ['diabetes', 'pre_diabetic', 'bp', 'cholesterol', 'weight_management', 'thyroid', 'none', 'others'];
  const existingCustom = (member.health_conditions || []).find((c) => !knownValues.includes(c));
  const [conditions, setConditions] = useState<HealthCondition[]>(
    existingCustom
      ? [...(member.health_conditions || []).filter((c) => c !== existingCustom), 'others']
      : member.health_conditions || []
  );
  const [customCondition, setCustomCondition] = useState(existingCustom || '');

  const toggleCondition = (condition: HealthCondition) => {
    if (condition === 'none') {
      setConditions(['none']);
      setCustomCondition('');
    } else if (condition === 'others') {
      if (conditions.includes('others')) {
        setConditions(conditions.filter((c) => c !== 'others'));
        setCustomCondition('');
      } else {
        setConditions([...conditions.filter((c) => c !== 'none'), 'others']);
      }
    } else {
      setConditions(
        conditions.includes(condition)
          ? conditions.filter((c) => c !== condition)
          : [...conditions.filter((c) => c !== 'none'), condition]
      );
    }
  };

  const getFinalConditions = (): HealthCondition[] => {
    const result = conditions.filter((c) => c !== 'others');
    if (conditions.includes('others') && customCondition.trim()) {
      result.push(customCondition.trim() as HealthCondition);
    }
    return result;
  };

  if (isEditing) {
    return (
      <div className="card">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="w-24">
              <label className="label">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Health Conditions</label>
            <div className="flex flex-wrap gap-2">
              {HEALTH_CONDITIONS.map((condition) => (
                <button
                  key={condition.value}
                  onClick={() => toggleCondition(condition.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${
                      conditions.includes(condition.value)
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                >
                  {condition.label}
                </button>
              ))}
            </div>
            {conditions.includes('others') && (
              <input
                type="text"
                value={customCondition}
                onChange={(e) => setCustomCondition(e.target.value)}
                placeholder="Type your condition (e.g., thyroid, uric acid)"
                className="input-field mt-2 w-full"
              />
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onSave({ name, age, health_conditions: getFinalConditions() })}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
<button type="button" onClick={onCancel} className="btn-ghost" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl"
          style={{ backgroundColor: member.avatar_color }}
        >
          {member.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-800">{member.name}</h3>
            {member.is_primary && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                Primary
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500">
            {member.age ? `${member.age} years` : 'Age not set'}
            {member.role && ` • ${member.role}`}
          </p>
          {member.health_conditions && member.health_conditions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {member.health_conditions
                .filter((c) => c !== 'none')
                .map((condition) => (
                  <span key={condition} className="health-tag text-xs capitalize">
                    {condition.replace('_', ' ')}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="p-2 text-neutral-400 hover:text-primary-500"
            aria-label="Edit member"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          {!member.is_primary && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 text-neutral-400 hover:text-red-500"
              aria-label="Delete member"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Add member form component
function AddMemberForm({
  onSave,
  onCancel,
}: {
  onSave: (member: Partial<FamilyMember>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | undefined>();
  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [customCondition, setCustomCondition] = useState('');

  const toggleCondition = (condition: HealthCondition) => {
    if (condition === 'none') {
      setConditions(['none']);
      setCustomCondition('');
    } else if (condition === 'others') {
      if (conditions.includes('others')) {
        setConditions(conditions.filter((c) => c !== 'others'));
        setCustomCondition('');
      } else {
        setConditions([...conditions.filter((c) => c !== 'none'), 'others']);
      }
    } else {
      setConditions(
        conditions.includes(condition)
          ? conditions.filter((c) => c !== condition)
          : [...conditions.filter((c) => c !== 'none'), condition]
      );
    }
  };

  const getFinalConditions = (): HealthCondition[] => {
    const result = conditions.filter((c) => c !== 'others');
    if (conditions.includes('others') && customCondition.trim()) {
      result.push(customCondition.trim() as HealthCondition);
    }
    return result;
  };

  return (
    <div className="card border-2 border-primary-200">
      <h3 className="font-semibold text-neutral-800 mb-4">Add Family Member</h3>

      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="input-field"
            />
          </div>
          <div className="w-24">
            <label className="label">Age</label>
            <input
              type="number"
              value={age || ''}
              onChange={(e) => setAge(parseInt(e.target.value) || undefined)}
              placeholder="Age"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="label">Health Conditions</label>
          <div className="flex flex-wrap gap-2">
            {HEALTH_CONDITIONS.map((condition) => (
              <button
                key={condition.value}
                onClick={() => toggleCondition(condition.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${
                    conditions.includes(condition.value)
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
              >
                {condition.label}
              </button>
            ))}
          </div>
          {conditions.includes('others') && (
            <input
              type="text"
              value={customCondition}
              onChange={(e) => setCustomCondition(e.target.value)}
              placeholder="Type your condition (e.g., thyroid, uric acid)"
              className="input-field mt-2 w-full"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (name.trim()) {
                onSave({ name, age, health_conditions: getFinalConditions() });
              }
            }}
            disabled={!name.trim()}
            className="btn-primary flex-1"
          >
            Save
          </button>
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
