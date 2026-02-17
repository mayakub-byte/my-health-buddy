// ============================================
// MY HEALTH BUDDY - Per-Person Portion Confirmation
// Customize serving size, oil, add-ons, cooking style per member
// Shown between AI analysis and final results
// ============================================

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import type { FamilyMember } from '../types';

type OilLevel = 'low' | 'medium' | 'heavy';
type CookingStyle = 'steamed' | 'stir_fried' | 'deep_fried' | 'curry' | 'raw' | 'baked';
type PortionSize = 'small' | 'medium' | 'large';

interface MemberPortion {
  memberId: string;
  portionSize: PortionSize;
  servings: number;
  oilLevel: OilLevel;
  cookingStyle: CookingStyle;
  addOns: string[];
  skipMeal: boolean;
}

const OIL_OPTIONS: { value: OilLevel; label: string; emoji: string }[] = [
  { value: 'low', label: 'Low Oil', emoji: '💧' },
  { value: 'medium', label: 'Medium', emoji: '💧💧' },
  { value: 'heavy', label: 'Heavy', emoji: '💧💧💧' },
];

const COOKING_STYLES: { value: CookingStyle; label: string; emoji: string }[] = [
  { value: 'steamed', label: 'Steamed', emoji: '♨️' },
  { value: 'stir_fried', label: 'Stir Fried', emoji: '🍳' },
  { value: 'deep_fried', label: 'Deep Fried', emoji: '🫕' },
  { value: 'curry', label: 'Curry', emoji: '🍛' },
  { value: 'raw', label: 'Raw/Fresh', emoji: '🥗' },
  { value: 'baked', label: 'Baked', emoji: '🥖' },
];

const COMMON_ADDONS = [
  { name: 'Extra Rice', emoji: '🍚' },
  { name: 'Curd', emoji: '🥛' },
  { name: 'Pickle', emoji: '🫙' },
  { name: 'Papad', emoji: '🫓' },
  { name: 'Salad', emoji: '🥗' },
  { name: 'Buttermilk', emoji: '🥤' },
  { name: 'Ghee', emoji: '🧈' },
  { name: 'Roti', emoji: '🫓' },
  { name: 'Dal', emoji: '🥣' },
  { name: 'Egg', emoji: '🥚' },
];

const PORTION_SIZES: { value: PortionSize; label: string; emoji: string; desc: string }[] = [
  { value: 'small', label: 'Small', emoji: '🥣', desc: 'Light portion' },
  { value: 'medium', label: 'Normal', emoji: '🍽️', desc: 'Regular plate' },
  { value: 'large', label: 'Large', emoji: '🍲', desc: 'Full plate' },
];

export default function PortionConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as Record<string, unknown>;
  const { members } = useFamily();

  const selectedMembers = (state.selectedMembers as string[]) ?? [];
  const relevantMembers = members.filter((m) => selectedMembers.includes(m.id));
  const mealName = (state.claudeAnalysis as Record<string, unknown>)?.meal_name as string
    ?? (state.claudeAnalysis as Record<string, unknown>)?.food_name as string
    ?? 'Your Meal';

  const [memberPortions, setMemberPortions] = useState<MemberPortion[]>([]);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // Initialize member portions
  useEffect(() => {
    if (relevantMembers.length > 0 && memberPortions.length === 0) {
      const defaults = relevantMembers.map((m) => ({
        memberId: m.id,
        portionSize: getDefaultPortionForMember(m),
        servings: 1,
        oilLevel: 'medium' as OilLevel,
        cookingStyle: 'curry' as CookingStyle,
        addOns: [] as string[],
        skipMeal: false,
      }));
      setMemberPortions(defaults);
      // Expand first member
      if (relevantMembers.length > 0) {
        setExpandedMember(relevantMembers[0].id);
      }
    }
  }, [relevantMembers.length]);

  // Redirect if no state
  useEffect(() => {
    if (!state.claudeAnalysis && !state.imagePreview && !state.manualText) {
      navigate('/dashboard', { replace: true });
    }
  }, [state, navigate]);

  function getDefaultPortionForMember(member: FamilyMember): PortionSize {
    const age = member.age ?? 30;
    if (age < 10) return 'small';
    if (age >= 65) return 'small';
    const conditions = member.health_conditions || [];
    if (conditions.includes('weight_management')) return 'small';
    return 'medium';
  }

  function updatePortion(memberId: string, updates: Partial<MemberPortion>) {
    setMemberPortions((prev) =>
      prev.map((p) => (p.memberId === memberId ? { ...p, ...updates } : p))
    );
  }

  function toggleAddOn(memberId: string, addOn: string) {
    setMemberPortions((prev) =>
      prev.map((p) => {
        if (p.memberId !== memberId) return p;
        const has = p.addOns.includes(addOn);
        return {
          ...p,
          addOns: has ? p.addOns.filter((a) => a !== addOn) : [...p.addOns, addOn],
        };
      })
    );
  }

  function handleContinue() {
    // Pass all state through, plus the per-member portion data
    const activePortions = memberPortions.filter((p) => !p.skipMeal);
    const activeMembers = activePortions.map((p) => p.memberId);

    navigate('/results/analysis', {
      state: {
        ...state,
        selectedMembers: activeMembers,
        selectedMemberId: activeMembers[0] ?? state.selectedMemberId,
        memberPortions: activePortions,
        portionSize: activePortions[0]?.portionSize ?? state.portionSize ?? 'medium',
      },
    });
  }

  if (!state.claudeAnalysis && !state.imagePreview && !state.manualText) {
    return null;
  }

  const imagePreview = state.imagePreview as string | undefined;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto w-full" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-beige-300 text-neutral-600 hover:bg-beige-100 shadow-card"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-serif text-lg font-bold" style={{ color: '#2D3319' }}>
            Customize Portions
          </h1>
          <p className="text-sm" style={{ color: '#6B7B5E' }}>
            Personalize for each family member
          </p>
        </div>
      </header>

      {/* Meal Preview */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: '#FDFBF7' }}>
          {imagePreview && (
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-beige-300 flex-shrink-0">
              <img src={imagePreview} alt="Meal" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-serif font-bold text-olive-800 truncate">{mealName}</h2>
            <p className="text-xs text-neutral-500">
              {relevantMembers.length} member{relevantMembers.length !== 1 ? 's' : ''} eating
            </p>
          </div>
        </div>
      </div>

      {/* Member Portion Cards */}
      <main className="flex-1 px-5 pb-6 overflow-y-auto space-y-3">
        {relevantMembers.map((member) => {
          const portion = memberPortions.find((p) => p.memberId === member.id);
          if (!portion) return null;
          const isExpanded = expandedMember === member.id;

          return (
            <div
              key={member.id}
              className="rounded-2xl overflow-hidden border"
              style={{
                backgroundColor: portion.skipMeal ? '#f5f5f5' : '#FDFBF7',
                borderColor: isExpanded ? '#8B9E6B' : '#e5e5e5',
                opacity: portion.skipMeal ? 0.6 : 1,
              }}
            >
              {/* Member Header (collapsible) */}
              <button
                type="button"
                onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: member.avatar_color || '#5C6B4A' }}
                >
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-800">{member.name}</p>
                  <p className="text-xs text-neutral-500">
                    {portion.skipMeal
                      ? 'Skipping this meal'
                      : `${PORTION_SIZES.find((s) => s.value === portion.portionSize)?.label} • ${portion.servings} serving${portion.servings > 1 ? 's' : ''} • ${OIL_OPTIONS.find((o) => o.value === portion.oilLevel)?.label}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!portion.skipMeal && portion.addOns.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f0f5eb', color: '#5C6B4A' }}>
                      +{portion.addOns.length}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && !portion.skipMeal && (
                <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: '#e5e5e5' }}>
                  {/* Portion Size */}
                  <div className="pt-3">
                    <p className="text-sm font-medium text-neutral-700 mb-2">Portion Size</p>
                    <div className="grid grid-cols-3 gap-2">
                      {PORTION_SIZES.map((size) => (
                        <button
                          key={size.value}
                          type="button"
                          onClick={() => updatePortion(member.id, { portionSize: size.value })}
                          className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                            portion.portionSize === size.value
                              ? 'border-olive-500 bg-olive-50/50'
                              : 'border-beige-200 hover:border-olive-300'
                          }`}
                        >
                          <span className="text-xl mb-1">{size.emoji}</span>
                          <span className="text-xs font-medium text-neutral-700">{size.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Servings */}
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-2">Servings</p>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => updatePortion(member.id, { servings: Math.max(1, portion.servings - 1) })}
                        disabled={portion.servings <= 1}
                        className="w-10 h-10 rounded-full border-2 border-beige-300 flex items-center justify-center text-lg font-medium text-neutral-600 disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="text-lg font-semibold text-olive-800 w-8 text-center">{portion.servings}</span>
                      <button
                        type="button"
                        onClick={() => updatePortion(member.id, { servings: Math.min(5, portion.servings + 1) })}
                        disabled={portion.servings >= 5}
                        className="w-10 h-10 rounded-full border-2 border-beige-300 flex items-center justify-center text-lg font-medium text-neutral-600 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Oil Level */}
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-2">Oil Level</p>
                    <div className="flex gap-2">
                      {OIL_OPTIONS.map((oil) => (
                        <button
                          key={oil.value}
                          type="button"
                          onClick={() => updatePortion(member.id, { oilLevel: oil.value })}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-center text-sm font-medium transition-all border-2 ${
                            portion.oilLevel === oil.value
                              ? 'border-olive-500 bg-olive-50/50 text-olive-800'
                              : 'border-beige-200 text-neutral-600 hover:border-olive-300'
                          }`}
                        >
                          {oil.emoji}
                          <br />
                          <span className="text-xs">{oil.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cooking Style */}
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-2">Cooking Style</p>
                    <div className="flex flex-wrap gap-2">
                      {COOKING_STYLES.map((style) => (
                        <button
                          key={style.value}
                          type="button"
                          onClick={() => updatePortion(member.id, { cookingStyle: style.value })}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                            portion.cookingStyle === style.value
                              ? 'border-olive-500 bg-olive-50 text-olive-800'
                              : 'border-beige-200 text-neutral-600 hover:border-olive-300'
                          }`}
                        >
                          {style.emoji} {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add-ons */}
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-2">Add-ons</p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_ADDONS.map((addon) => (
                        <button
                          key={addon.name}
                          type="button"
                          onClick={() => toggleAddOn(member.id, addon.name)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                            portion.addOns.includes(addon.name)
                              ? 'border-olive-500 bg-olive-50 text-olive-800'
                              : 'border-beige-200 text-neutral-600 hover:border-olive-300'
                          }`}
                        >
                          {addon.emoji} {addon.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Health note for member */}
                  {member.health_conditions && member.health_conditions.filter((c) => c !== 'none').length > 0 && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#f0f5eb' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: '#5C6B4A' }}>
                        Health note for {member.name}
                      </p>
                      <p className="text-xs text-neutral-600">
                        {getHealthNote(member)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Skip toggle */}
              {isExpanded && (
                <div className="px-4 pb-3">
                  <button
                    type="button"
                    onClick={() => updatePortion(member.id, { skipMeal: !portion.skipMeal })}
                    className="text-xs text-neutral-500 underline"
                  >
                    {portion.skipMeal ? 'Include in this meal' : 'Skip this meal for ' + member.name}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Quick Apply All */}
        {relevantMembers.length > 1 && (
          <div className="rounded-2xl p-4 border border-dashed border-beige-300" style={{ backgroundColor: '#FDFBF7' }}>
            <p className="text-sm font-medium text-neutral-700 mb-2">Quick: Apply to all</p>
            <div className="flex gap-2">
              {PORTION_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => {
                    setMemberPortions((prev) =>
                      prev.map((p) => (p.skipMeal ? p : { ...p, portionSize: size.value }))
                    );
                  }}
                  className="flex-1 py-2 rounded-xl border border-beige-200 text-center text-xs font-medium text-neutral-600 hover:border-olive-400 hover:bg-olive-50/50 transition-all"
                >
                  {size.emoji} {size.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="px-5 pb-6 pt-2" style={{ backgroundColor: '#F4F1EA' }}>
        <button
          type="button"
          onClick={handleContinue}
          disabled={memberPortions.filter((p) => !p.skipMeal).length === 0}
          className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ backgroundColor: '#5C6B4A' }}
        >
          Continue to Results
        </button>
        <p className="text-center text-xs mt-2" style={{ color: '#6B7B5E' }}>
          {memberPortions.filter((p) => !p.skipMeal).length} of {relevantMembers.length} members eating
        </p>
      </div>
    </div>
  );
}

function getHealthNote(member: FamilyMember): string {
  const conditions = member.health_conditions || [];
  const notes: string[] = [];

  if (conditions.includes('diabetes') || conditions.includes('pre_diabetic')) {
    notes.push('Consider smaller portions with less rice');
  }
  if (conditions.includes('bp')) {
    notes.push('Go easy on salt and pickles');
  }
  if (conditions.includes('cholesterol')) {
    notes.push('Choose low-oil cooking and skip deep fried');
  }
  if (conditions.includes('weight_management')) {
    notes.push('Smaller portions with more veggies recommended');
  }

  return notes.length > 0 ? notes.join(' • ') : 'Balanced portions work great!';
}
