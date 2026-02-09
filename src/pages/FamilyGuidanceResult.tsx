// ============================================
// MY HEALTH BUDDY - Family Guidance Result
// Main results screen after meal analysis
// ============================================

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { supabase } from '../lib/supabase';
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

// Sample result data (replace with real AI response when wired)
const SAMPLE_FOOD_NAME = 'Rice with Dal & Vegetables';
const SAMPLE_CALORIES = 420;
const SAMPLE_MACROS = { carbs: 52, protein: 14, fat: 12 }; // grams
const SAMPLE_HEALTH_SCORE = 78;

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

  const foodName = claude?.food_name ?? (fromHistory && state.food_name ? state.food_name : SAMPLE_FOOD_NAME);
  const calories = claude?.calories ?? (fromHistory && state.calories != null ? state.calories : SAMPLE_CALORIES);
  const macros = claude?.macros
    ? { carbs: claude.macros.carbs_g ?? 0, protein: claude.macros.protein_g ?? 0, fat: claude.macros.fat_g ?? 0, fiber: claude.macros.fiber_g ?? 0 }
    : fromHistory && state.macros
      ? { carbs: state.macros.carbs ?? 0, protein: state.macros.protein ?? 0, fat: state.macros.fat ?? 0, fiber: 0 }
      : { ...SAMPLE_MACROS, fiber: 0 };
  const totalMacro = macros.carbs + macros.protein + macros.fat;
  const carbsPct = totalMacro ? (macros.carbs / totalMacro) * 100 : 33;
  const proteinPct = totalMacro ? (macros.protein / totalMacro) * 100 : 33;
  const fatPct = totalMacro ? (macros.fat / totalMacro) * 100 : 34;
  const healthScores = claude?.health_scores;
  const healthScore = healthScores?.general ?? (fromHistory && state.health_score != null ? state.health_score : SAMPLE_HEALTH_SCORE);
  const scoreColor = getScoreColor(healthScore);
  const glycemicIndex = claude?.glycemic_index;
  const foodItems = claude?.food_items ?? [];
  const micronutrients = claude?.micronutrients ?? [];
  const detailedGuidance = claude?.detailed_guidance ?? [];
  const ayurvedicNote = claude?.ayurvedic_note ?? '';
  const bestPairedWith = claude?.best_paired_with ?? [];

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

  function getMemberScore(member: FamilyMember): number {
    if (!healthScores) return healthScore;
    const c = member.health_conditions || [];
    if (c.includes('diabetes') || c.includes('pre_diabetic')) return healthScores.diabetic ?? healthScore;
    if (c.includes('bp')) return healthScores.hypertension ?? healthScore;
    if (c.includes('cholesterol')) return healthScores.cholesterol ?? healthScore;
    return healthScores.general ?? healthScore;
  }

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

      const family_member_id = state.selectedMemberId ?? selectedMember?.id ?? null;
      const guidanceText = Array.isArray(guidance) ? guidance.join(' ') : (guidance ?? '');
      const portion_size = state.portionSize ?? 'medium';

      const row = {
        user_id,
        family_member_id,
        food_name: foodName,
        image_url: image_url || null,
        calories,
        macros: { carbs: macros.carbs, protein: macros.protein, fat: macros.fat },
        health_score: healthScore,
        guidance: guidanceText || null,
        portion_size,
      };

      const { error } = await supabase.from('meal_history').insert(row);

      if (error) {
        console.error('Supabase meal_history insert error:', error.message, error.details, error);
        setToast({ message: `Save failed: ${error.message}`, isSuccess: false });
        setTimeout(() => setToast(null), 3000);
        return;
      }
      setToast({ message: 'Meal saved!', isSuccess: true });
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
    <div className="min-h-screen bg-neutral-50 flex flex-col pb-8">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-4 bg-white border-b border-neutral-100">
        <Link
          to="/dashboard"
          className="flex items-center justify-center w-10 h-10 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-neutral-800">Meal Analysis</h1>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        {/* Food image thumbnail */}
        {imagePreview && (
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
              <img
                src={imagePreview}
                alt="Meal"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Main result card */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 mb-5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="font-bold text-neutral-800 text-lg">{foodName}</h2>
            {glycemicIndex && (
              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                glycemicIndex === 'low' ? 'bg-green-100 text-green-700' :
                glycemicIndex === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              }`}>
                GI: {glycemicIndex}
              </span>
            )}
          </div>
          <p className="text-neutral-500 text-sm mb-4">{calories} kcal (est.)</p>

          {/* Food items detected */}
          {foodItems.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-neutral-500 mb-2">Detected items</p>
              <ul className="flex flex-wrap gap-2">
                {foodItems.map((item, i) => (
                  <li key={i} className="px-2.5 py-1 rounded-lg bg-neutral-100 text-sm text-neutral-700">
                    {item.name} {item.quantity ? `(${item.quantity})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Macro bar: Carbs (green) / Protein (blue) / Fat (orange) */}
          <div className="flex h-3 rounded-full overflow-hidden bg-neutral-100 mb-2">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${carbsPct}%` }}
            />
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${proteinPct}%` }}
            />
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${fatPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Carbs {macros.carbs}g</span>
            <span>Protein {macros.protein}g</span>
            <span>Fat {macros.fat}g</span>
            {'fiber' in macros && macros.fiber != null && macros.fiber > 0 && (
              <span>Fiber {macros.fiber}g</span>
            )}
          </div>
        </div>

        {/* Micronutrients */}
        {micronutrients.length > 0 && (
          <section className="mb-5">
            <p className="text-sm font-medium text-neutral-700 mb-2">Top micronutrients</p>
            <ul className="bg-white rounded-xl border border-neutral-100 p-4 space-y-2">
              {micronutrients.slice(0, 5).map((m, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-neutral-700">{m.name}</span>
                  <span className="text-neutral-500">{m.amount} ({m.daily_value_percent}% DV)</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Family Health Score: circular gauge */}
        <section className="mb-5">
          <p className="text-sm font-medium text-neutral-700 mb-3">Family Health Score</p>
          <div className="flex justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#e5e5e5"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={
                    scoreColor === 'red'
                      ? '#ef4444'
                      : scoreColor === 'orange'
                        ? '#f97316'
                        : '#22c55e'
                  }
                  strokeWidth="10"
                  strokeDasharray={`${healthScore * 2.64} 264`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-neutral-800">{healthScore}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Guidance for [member name] */}
        {selectedMember && (
          <section className="mb-5">
            <h3 className="text-sm font-semibold text-neutral-800 mb-2">
              Guidance for {selectedMember.name}
            </h3>
            <ul className="bg-white rounded-xl border border-neutral-100 p-4 space-y-2">
              {guidance.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-neutral-700">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Condition-specific detailed guidance */}
        {detailedGuidance.length > 0 && (
          <section className="mb-5">
            <p className="text-sm font-semibold text-neutral-800 mb-2">Condition-specific guidance</p>
            <div className="space-y-3">
              {detailedGuidance.map((d, i) => (
                <div key={i} className="bg-white rounded-xl border border-neutral-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-neutral-800 capitalize">{d.condition}</span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      getScoreColor(d.score) === 'green' ? 'bg-green-100 text-green-700' :
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

        {/* Other family members: horizontal scroll of score circles (condition-specific when Claude) */}
        {(members.length > 1 || members.length === 1) && (
          <section className="mb-6">
            <p className="text-sm font-medium text-neutral-700 mb-2">Family scores</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {members.map((m) => {
                const score = healthScores ? getMemberScore(m) : (m.id === selectedMember?.id ? healthScore : Math.min(100, Math.max(0, healthScore + ((m.name.length % 3) - 1) * 8)));
                const color = getScoreColor(score);
                return (
                  <div
                    key={m.id}
                    className="flex-shrink-0 flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                        color === 'red'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : color === 'orange'
                            ? 'bg-orange-100 text-orange-700 border-orange-200'
                            : 'bg-green-100 text-green-700 border-green-200'
                      }`}
                    >
                      {score}
                    </div>
                    <span className="text-xs text-neutral-600 max-w-[4rem] truncate">
                      {m.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Ayurvedic note */}
        {ayurvedicNote && (
          <section className="mb-5">
            <p className="text-sm font-semibold text-neutral-800 mb-2">Ayurvedic note</p>
            <p className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-900">
              {ayurvedicNote}
            </p>
          </section>
        )}

        {/* Best paired with */}
        {bestPairedWith.length > 0 && (
          <section className="mb-5">
            <p className="text-sm font-semibold text-neutral-800 mb-2">Complete your meal</p>
            <ul className="flex flex-wrap gap-2">
              {bestPairedWith.map((s, i) => (
                <li key={i} className="px-3 py-1.5 rounded-full bg-green-50 text-green-800 text-sm">
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            to="/dashboard"
            className="w-full py-3.5 rounded-xl border-2 border-neutral-300 font-semibold text-neutral-700 hover:bg-neutral-50 text-center transition-colors"
          >
            Scan Another Meal
          </Link>
          {!fromHistory && (
            <button
              onClick={handleSaveToHistory}
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 font-semibold text-white disabled:opacity-70 transition-colors"
            >
              {saving ? 'Saving…' : 'Save to History'}
            </button>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-4 right-4 mx-auto max-w-sm text-white text-sm font-medium py-3 px-4 rounded-xl text-center shadow-lg animate-fade-in z-50 ${
            toast.isSuccess ? 'bg-green-600' : 'bg-neutral-800'
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
