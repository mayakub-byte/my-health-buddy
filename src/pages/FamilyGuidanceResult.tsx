// ============================================
// MY HEALTH BUDDY - Family Guidance Result
// Main results screen after meal analysis
// ============================================

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { supabase } from '../lib/supabase';
import { getMealAnalysisCelebration } from '../utils/personalizedCopy';
import type { AnalysisLoadingState } from './AnalysisLoading';
import type { FamilyMember } from '../types';
import type { MealAnalysisResponse } from '../types/meal-analysis';

export interface HistoryResultState {
  fromHistory: true;
  id?: string;
  food_name: string;
  image_url?: string | null;
  calories: number;
  macros: { carbs?: number; protein?: number; fat?: number };
  health_score: number;
  guidance?: string | null;
  selectedMemberId?: string | null;
  created_at?: string;
}

function getScoreColor(score: number): string {
  if (score < 40) return 'red';
  if (score < 70) return 'orange';
  return 'green';
}

function getGuidanceForMember(member: FamilyMember): string[] {
  const conditions = member.health_conditions || [];
  const tips: string[] = [];
  if (conditions.includes('diabetes') || conditions.includes('pre_diabetic')) {
    tips.push('Good fiber content helps manage blood sugar.');
  }
  if (conditions.includes('bp')) {
    tips.push('Moderate sodium; pair with more vegetables for balance.');
  }
  if (conditions.includes('cholesterol')) {
    tips.push('Dal provides plant-based protein and soluble fiber.');
  }
  if (conditions.includes('thyroid')) {
    tips.push('Vegetables add vitamins; ensure adequate iodine from other sources.');
  }
  if (conditions.includes('weight_management')) {
    tips.push('Reasonable portion; consider adding a side salad for fullness.');
  }
  if (tips.length === 0) {
    tips.push('Balanced meal with carbs, protein, and vegetables.');
  }
  return tips;
}

export default function FamilyGuidanceResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as AnalysisLoadingState & Partial<HistoryResultState>;
  const { members } = useFamily();
  const fromHistory = !!(state as Partial<HistoryResultState>).fromHistory;
  const hasState =
    (location.state && Object.keys(location.state as object).length > 0) &&
    (fromHistory
      ? !!(state as HistoryResultState).food_name
      : !!(state.imagePreview || state.imageFile || state.manualText));

  const [imagePreview, setImagePreview] = useState<string | null>(
    fromHistory && state.image_url ? state.image_url : (state.imagePreview ?? null)
  );
  const [toast, setToast] = useState<{ message: string; isSuccess?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedMember =
    (state.selectedMemberId
      ? members.find((m) => m.id === state.selectedMemberId)
      : members[0]) ?? null;

  const claude = (state as { claudeAnalysis?: MealAnalysisResponse | null }).claudeAnalysis;
  const hasRealData = claude != null || fromHistory;

  // New format fields (from updated prompt)
  const mealName = claude?.meal_name ?? claude?.food_name ?? (fromHistory ? state.food_name : undefined);
  const mealNameTelugu = claude?.meal_name_telugu;
  const trafficLight = claude?.traffic_light;
  const trafficLightReason = claude?.traffic_light_reason;
  const quickVerdict = claude?.quick_verdict;
  const beforeCookingTips = claude?.before_cooking_tips ?? [];
  const perMemberGuidance = claude?.per_member_guidance;
  const culturallyAppropriateSwaps = claude?.culturally_appropriate_swaps ?? [];
  const ayurvedicNote = claude?.ayurvedic_note ?? '';

  // Nutrition data (new format takes precedence)
  const calories = claude?.total_calories ?? claude?.calories ?? (fromHistory && state.calories != null ? state.calories : undefined);
  const macros = claude?.total_protein_g != null
    ? {
        carbs: claude.total_carbs_g ?? 0,
        protein: claude.total_protein_g ?? 0,
        fat: claude.total_fat_g ?? 0,
        fiber: claude.total_fiber_g ?? 0,
      }
    : claude?.macros
      ? { carbs: claude.macros.carbs_g ?? 0, protein: claude.macros.protein_g ?? 0, fat: claude.macros.fat_g ?? 0, fiber: claude.macros.fiber_g ?? 0 }
      : fromHistory && state.macros
        ? { carbs: state.macros.carbs ?? 0, protein: state.macros.protein ?? 0, fat: state.macros.fat ?? 0, fiber: 0 }
        : null;
  const macrosSafe = macros ?? { carbs: 0, protein: 0, fat: 0, fiber: 0 };

  // Legacy fields (for backward compatibility)
  const healthScores = claude?.health_scores;
  const healthScore = healthScores?.general ?? (fromHistory && state.health_score != null ? state.health_score : undefined);
  const detailedGuidance = claude?.detailed_guidance ?? [];
  const bestPairedWith = claude?.best_paired_with ?? [];

  // Helper: Get guidance for a member based on their conditions
  const getMemberGuidance = (member: FamilyMember) => {
    if (!perMemberGuidance) return null;
    const conditions = member.health_conditions || [];
    const age = member.age ?? 0;

    // Check condition-specific guidance
    if (conditions.includes('diabetes') || conditions.includes('pre_diabetic')) {
      return perMemberGuidance.diabetic;
    }
    if (conditions.includes('bp')) {
      return perMemberGuidance.hypertension;
    }
    if (conditions.includes('weight_management')) {
      return perMemberGuidance.weight_loss;
    }
    if (age >= 65) {
      return perMemberGuidance.senior;
    }
    if (age < 18) {
      return perMemberGuidance.child;
    }
    return perMemberGuidance.general_adult;
  };

  // Traffic light color mapping
  const getTrafficLightColor = (light: string | undefined) => {
    if (!light) return 'bg-neutral-300';
    if (light === 'green') return 'bg-emerald-500';
    if (light === 'yellow') return 'bg-amber-400';
    if (light === 'red') return 'bg-red-500';
    return 'bg-neutral-300';
  };

  const guidance = (() => {
    if (fromHistory && state.guidance) {
      const parts = state.guidance.split(/[.!]+/).map((s) => s.trim()).filter(Boolean).map((s) => (s.endsWith('.') ? s : s + '.'));
      return parts.length > 0 ? parts : [state.guidance];
    }
    if (claude && selectedMember) {
      const cond = selectedMember.health_conditions || [];
      const lines: string[] = [];
      for (const d of detailedGuidance) {
        const c = d.condition?.toLowerCase() ?? '';
        if (cond.some((x) => x.toLowerCase().includes(c) || c.includes(x.toLowerCase())) || d.condition === 'general') {
          lines.push(d.explanation);
          if (d.suggestions?.length) lines.push(...d.suggestions.map((s) => (s.endsWith('.') ? s : s + '.')));
        }
      }
      if (lines.length) return lines;
    }
    return selectedMember ? getGuidanceForMember(selectedMember) : [];
  })();


  useEffect(() => {
    if (!hasState) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (fromHistory && state.image_url) {
      setImagePreview(state.image_url);
      return;
    }
    if (state.imageFile && !state.imagePreview) {
      const url = URL.createObjectURL(state.imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    if (state.imagePreview) setImagePreview(state.imagePreview);
  }, [hasState, fromHistory, state.image_url, state.imageFile, state.imagePreview, navigate]);

  if (!hasState) {
    return null;
  }

  if (!hasRealData) {
    return (
      <div className="min-h-screen bg-beige flex flex-col pb-8 max-w-md mx-auto w-full">
        <header className="flex items-center gap-3 px-5 pt-6 pb-4">
          <Link
            to="/dashboard"
            className="flex items-center justify-center w-10 h-10 rounded-full border border-beige-300 text-neutral-600 hover:bg-beige-100 shadow-card"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-heading text-lg font-bold text-olive-800">Meal Analysis</h1>
        </header>
        <main className="flex-1 px-5 py-6 flex flex-col items-center justify-center">
          <p className="text-neutral-700 font-medium text-center mb-6">Analysis failed. Please try again.</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-full btn-primary font-semibold"
          >
            Back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  const handleSaveToHistory = async () => {
    setSaving(true);
    setToast(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Save failed: no user from supabase.auth.getUser()');
        setToast({ message: 'Not signed in. Please log in and try again.', isSuccess: false });
        setTimeout(() => setToast(null), 3000);
        return;
      }
      const user_id = user.id;

      let image_url = '';
      if (state.imageFile) {
        try {
          const path = `${user_id}/${Date.now()}.jpg`;
          const { data, error: uploadError } = await supabase.storage
            .from('meal-photos')
            .upload(path, state.imageFile, { cacheControl: '3600', upsert: false });
          if (uploadError) {
            console.error('Supabase storage upload error:', uploadError.message, uploadError);
          }
          if (data?.path) {
            const { data: urlData } = supabase.storage.from('meal-photos').getPublicUrl(data.path);
            image_url = urlData.publicUrl;
          }
        } catch (storageErr) {
          console.error('Storage upload failed:', storageErr);
        }
      } else if (state.imagePreview?.startsWith('http')) {
        image_url = state.imagePreview;
      }

      const guidanceText = Array.isArray(guidance) ? guidance.join(' ') : (guidance ?? '');
      const portion_size = state.portionSize ?? 'medium';

      // Derive a numeric score from traffic_light if health_scores not available
      const derivedScore = healthScore
        ? healthScore
        : trafficLight === 'green' ? 80
        : trafficLight === 'yellow' ? 55
        : trafficLight === 'red' ? 25
        : 0;

      // Build rows for each selected member (multi-member support)
      const memberIds = (state.selectedMembers && state.selectedMembers.length > 0)
        ? state.selectedMembers
        : [state.selectedMemberId ?? selectedMember?.id ?? null];

      const rows = memberIds.map((memberId) => ({
        user_id,
        family_member_id: memberId,
        food_name: mealName ?? 'Meal',
        image_url: image_url || null,
        calories: calories ?? 0,
        macros: { carbs: macrosSafe.carbs, protein: macrosSafe.protein, fat: macrosSafe.fat },
        health_score: derivedScore,
        guidance: guidanceText || null,
        portion_size,
      }));

      const { error } = await supabase.from('meal_history').insert(rows);

      if (error) {
        console.error('Supabase meal_history insert error:', error.message, error.details, error);
        setToast({ message: `Save failed: ${error.message}`, isSuccess: false });
        setTimeout(() => setToast(null), 3000);
        return;
      }
      const savedCount = rows.length;
      setToast({ message: savedCount > 1 ? `Meal saved for ${savedCount} members!` : 'Meal saved!', isSuccess: true });
      setTimeout(() => {
        setToast(null);
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err) {
      console.error('Save failed:', err);
      setToast({ message: err instanceof Error ? err.message : 'Failed to save. Try again.', isSuccess: false });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-beige flex flex-col pb-8 max-w-md mx-auto w-full">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link
          to="/dashboard"
          className="flex items-center justify-center w-10 h-10 rounded-full border border-beige-300 text-neutral-600 hover:bg-beige-100 shadow-card"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-serif text-xl font-bold text-olive-800">Our Family Mealtime Journey</h1>
      </header>

      <main className="flex-1 px-5 py-6 overflow-y-auto">
        {/* SECTION 1: Quick Verdict */}
        <section className="mb-5">
          <div className="card p-5 text-center">
            {/* Traffic Light Circle */}
            {trafficLight && (
              <div className="flex justify-center mb-4">
                <div className={`w-20 h-20 rounded-full ${getTrafficLightColor(trafficLight)} flex items-center justify-center shadow-lg`}>
                  <span className="text-4xl">
                    {trafficLight === 'green' ? '🟢' : trafficLight === 'yellow' ? '🟡' : '🔴'}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Verdict */}
            {quickVerdict && (
              <p className="font-heading text-lg text-olive-800 mb-4">{quickVerdict}</p>
            )}

            {/* Meal Photo + Name */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {imagePreview && (
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-beige-300 bg-beige-100 flex-shrink-0">
                  <img src={imagePreview} alt="Meal" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="text-left">
                <h2 className="font-heading font-bold text-olive-800 text-lg">{mealName ?? 'Meal'}</h2>
                {mealNameTelugu && (
                  <p className="text-sm text-neutral-600 mt-0.5">{mealNameTelugu}</p>
                )}
              </div>
            </div>

            {/* Nutrition Summary */}
            <div className="flex justify-around gap-2 pt-3 border-t border-beige-200 text-sm">
              <div>
                <p className="text-neutral-500 text-xs">Calories</p>
                <p className="font-semibold text-olive-800">{calories ?? 0}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Protein</p>
                <p className="font-semibold text-olive-800">{macrosSafe.protein}g</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Carbs</p>
                <p className="font-semibold text-olive-800">{macrosSafe.carbs}g</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Fat</p>
                <p className="font-semibold text-olive-800">{macrosSafe.fat}g</p>
              </div>
            </div>

            {/* Traffic Light Reason */}
            {trafficLightReason && (
              <p className="text-xs text-neutral-600 mt-3 italic">{trafficLightReason}</p>
            )}

            {/* Personalized celebration */}
            {selectedMember && !fromHistory && (
              <p className="text-sm font-medium mt-3 px-2 py-2 rounded-lg" style={{ backgroundColor: '#f0f5eb', color: '#5C6B4A' }}>
                {getMealAnalysisCelebration(
                  selectedMember.name,
                  healthScore ?? (trafficLight === 'green' ? 80 : trafficLight === 'yellow' ? 55 : 25)
                )}
              </p>
            )}
          </div>
        </section>

        {/* SECTION 2: Tips While You Cook */}
        {beforeCookingTips.length > 0 && (
          <section className="mb-5">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl" aria-hidden>🌿</span>
                <h3 className="font-heading font-semibold text-olive-800">Tips While You Cook</h3>
              </div>
              <ul className="space-y-2">
                {beforeCookingTips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-neutral-700">
                    <span className="text-olive-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* SECTION 3: For Your Family */}
        {perMemberGuidance && members.length > 0 && (
          <section className="mb-5">
            <h3 className="font-heading font-semibold text-olive-800 mb-3">For Your Family</h3>
            <div className="space-y-3">
              {(state.selectedMembers && state.selectedMembers.length > 0
                ? members.filter((m) => state.selectedMembers!.includes(m.id))
                : members
              ).map((member) => {
                const memberGuidance = getMemberGuidance(member);
                if (!memberGuidance) return null;
                const lightColors: Record<string, { bg: string; border: string; badge: string; label: string }> = {
                  green: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', label: 'Great!' },
                  yellow: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Watch' },
                  red: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', label: 'Careful' },
                };
                const lightKey = (memberGuidance.traffic_light || 'green') as 'green' | 'yellow' | 'red';
                const colors = lightColors[lightKey] || lightColors.green;
                const ageGroupLabel = member.age_group ? member.age_group.charAt(0).toUpperCase() + member.age_group.slice(1) : '';
                const conditionsLabel = member.health_conditions?.length ? member.health_conditions.join(', ') : '';
                return (
                  <div key={member.id} className={`p-4 rounded-2xl ${colors.bg} ${colors.border} border-2`}>
                    {/* Header: Avatar + Name + Badge */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center text-xl font-bold text-neutral-700 flex-shrink-0`}>
                        {(member as { avatar?: string }).avatar ?? member.name?.charAt(0)?.toUpperCase() ?? '😊'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-800">{member.name}</p>
                        <p className="text-xs text-neutral-500">
                          {[ageGroupLabel, conditionsLabel].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                        {colors.label}
                      </span>
                    </div>
                    {/* Tip */}
                    {memberGuidance.tip && (
                      <div className="flex gap-2 mb-2">
                        <span className="text-sm flex-shrink-0">💡</span>
                        <p className="text-sm text-neutral-700 font-serif">{memberGuidance.tip}</p>
                      </div>
                    )}
                    {/* Avoid warning */}
                    {memberGuidance.avoid && (
                      <div className="flex gap-2 mt-2 p-2 bg-red-50 rounded-lg">
                        <span className="text-sm flex-shrink-0">⚠️</span>
                        <p className="text-sm text-red-700">{memberGuidance.avoid}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-center font-serif italic text-[#5C6B4A] mt-4 mb-6">
              Every meal strengthens our bond 💚
            </p>
          </section>
        )}

        {/* Legacy: Fallback to old format if new format not available */}
        {!perMemberGuidance && selectedMember && guidance.length > 0 && (
          <section className="mb-5">
            <h3 className="font-heading font-semibold text-olive-800 mb-3">Guidance for {selectedMember.name}</h3>
            <ul className="card p-4 space-y-2">
              {guidance.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-neutral-700">
                  <span className="text-olive-500 mt-0.5">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Legacy: Condition-specific detailed guidance */}
        {detailedGuidance.length > 0 && !perMemberGuidance && (
          <section className="mb-5">
            <p className="font-heading font-semibold text-olive-800 mb-3">Condition-specific guidance</p>
            <div className="space-y-3">
              {detailedGuidance.map((d, i) => (
                <div key={i} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-neutral-800 capitalize">{d.condition}</span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      getScoreColor(d.score) === 'green' ? 'bg-olive-100 text-olive-700' :
                      getScoreColor(d.score) === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {d.score}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 mb-2">{d.explanation}</p>
                  {d.suggestions?.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-neutral-600 space-y-0.5">
                      {d.suggestions.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 4: Telugu Food Swaps */}
        {culturallyAppropriateSwaps.length > 0 && (
          <section className="mb-5">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl" aria-hidden>🔄</span>
                <h3 className="font-heading font-semibold text-olive-800">Telugu Food Swaps</h3>
              </div>
              <ul className="space-y-2">
                {culturallyAppropriateSwaps.map((swap, i) => (
                  <li key={i} className="flex gap-2 text-sm text-neutral-700">
                    <span className="text-olive-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{swap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Ayurvedic note */}
        {ayurvedicNote && (
          <section className="mb-5">
            <div className="card p-4">
              <p className="font-heading font-semibold text-olive-800 mb-2">Ayurvedic Note</p>
              <p className="text-sm text-neutral-700">{ayurvedicNote}</p>
            </div>
          </section>
        )}

        {/* Legacy: Best paired with */}
        {bestPairedWith.length > 0 && !culturallyAppropriateSwaps.length && (
          <section className="mb-5">
            <p className="font-heading font-semibold text-olive-800 mb-2">Complete your meal</p>
            <ul className="flex flex-wrap gap-2">
              {bestPairedWith.map((s, i) => (
                <li key={i} className="px-3 py-1.5 rounded-full bg-olive-50 text-olive-800 text-sm">
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* SECTION 5: Action Buttons */}
        <div className="flex flex-col gap-3">
          {!fromHistory && (
            <button
              onClick={handleSaveToHistory}
              disabled={saving}
              className="w-full py-3.5 rounded-full btn-primary font-semibold disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Save to History'}
            </button>
          )}
          <Link
            to="/dashboard"
            className="w-full py-3.5 rounded-full border-2 border-olive-500 text-olive-600 font-semibold hover:bg-olive-50 text-center transition-colors"
          >
            Scan Another Meal
          </Link>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-4 right-4 mx-auto max-w-sm text-white text-sm font-medium py-3 px-4 rounded-xl text-center shadow-lg animate-fade-in z-50 ${
            toast.isSuccess ? 'bg-olive-600' : 'bg-neutral-800'
          }`}
          role="status"
        >
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
