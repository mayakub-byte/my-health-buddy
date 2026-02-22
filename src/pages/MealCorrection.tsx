// ============================================
// MY HEALTH BUDDY - Meal Correction
// Review detected items with confidence badges,
// alternatives, voice/text correction, re-analysis
// ============================================

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Plus, Edit2, Check, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { MealAnalysisResponse } from '../types/meal-analysis';
import type { DetectedDish } from '../types/meal-analysis';
import { reAnalyzeWithCorrection } from '../lib/analyze-meal-api';
import type { MemberProfile } from '../lib/analyze-meal-api';
import { useFamily } from '../hooks/useFamily';
import { VoiceRecorderButton } from '../components/VoiceRecorderButton';

interface DetectedItem {
  id: string;
  name: string;
  name_telugu?: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: 'high' | 'medium' | 'low';
  confidence_pct?: number;
  alternatives?: Array<{ name: string; reason: string }>;
  visual_cues?: string;
  isNew?: boolean;
  isUserCorrected?: boolean;
}

let itemIdCounter = 0;
function nextId() {
  return `item_${++itemIdCounter}_${Date.now()}`;
}

function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): { bg: string; text: string; border: string; label: string } {
  switch (confidence) {
    case 'high':
      return { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7', label: 'High' };
    case 'medium':
      return { bg: '#fff8e1', text: '#f57f17', border: '#ffe082', label: 'Medium' };
    case 'low':
      return { bg: '#fce4ec', text: '#c62828', border: '#ef9a9a', label: 'Low' };
  }
}

export default function MealCorrection() {
  const location = useLocation();
  const navigate = useNavigate();
  const { members } = useFamily();
  const state = (location.state ?? {}) as Record<string, unknown>;
  const claude = state.claudeAnalysis as MealAnalysisResponse | undefined;

  const [items, setItems] = useState<DetectedItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPortion, setEditPortion] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPortion, setNewItemPortion] = useState('1 serving');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Correction state
  const [correctionText, setCorrectionText] = useState('');
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);

  // Verification questions from AI
  const verificationQuestions = claude?.verification_questions ?? [];

  // Initialize items from AI analysis
  useEffect(() => {
    if (claude?.detected_dishes && claude.detected_dishes.length > 0) {
      // Use the new detected_dishes format with confidence
      setItems(
        claude.detected_dishes.map((d: DetectedDish) => ({
          id: nextId(),
          name: d.name,
          name_telugu: d.name_telugu ?? undefined,
          portion: d.portion,
          calories: d.estimated_calories,
          protein_g: d.protein_g,
          carbs_g: d.carbs_g,
          fat_g: d.fat_g,
          confidence: d.confidence || 'high',
          confidence_pct: d.confidence_pct,
          alternatives: d.alternatives,
          visual_cues: d.visual_cues,
        }))
      );
    } else if (claude?.dishes && claude.dishes.length > 0) {
      // Fallback to legacy dishes format
      setItems(
        claude.dishes.map((d) => ({
          id: nextId(),
          name: d.name,
          name_telugu: d.name_telugu,
          portion: d.portion,
          calories: d.estimated_calories,
          protein_g: d.protein_g,
          carbs_g: d.carbs_g,
          fat_g: d.fat_g,
          confidence: 'high' as const,
        }))
      );
    } else if (claude?.meal_name || claude?.food_name) {
      setItems([{
        id: nextId(),
        name: claude.meal_name || claude.food_name || 'Detected Meal',
        name_telugu: claude.meal_name_telugu,
        portion: '1 serving',
        calories: claude.total_calories ?? claude.calories ?? 0,
        protein_g: claude.total_protein_g ?? claude.macros?.protein_g ?? 0,
        carbs_g: claude.total_carbs_g ?? claude.macros?.carbs_g ?? 0,
        fat_g: claude.total_fat_g ?? claude.macros?.fat_g ?? 0,
        confidence: 'medium' as const,
      }]);
    }
  }, []);

  // Redirect if no state
  useEffect(() => {
    if (!claude && !state.imagePreview && !state.manualText) {
      navigate('/dashboard', { replace: true });
    }
  }, [claude, state, navigate]);

  // Select an alternative for a dish
  function selectAlternative(itemId: string, altName: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, name: altName, confidence: 'high' as const, isUserCorrected: true, alternatives: undefined }
          : item
      )
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function startEdit(item: DetectedItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPortion(item.portion);
  }

  function saveEdit(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, name: editName, portion: editPortion, isUserCorrected: true, confidence: 'high' as const }
          : item
      )
    );
    setEditingId(null);
  }

  function addItem() {
    if (!newItemName.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: nextId(),
        name: newItemName.trim(),
        portion: newItemPortion.trim() || '1 serving',
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        confidence: 'high' as const,
        isNew: true,
        isUserCorrected: true,
      },
    ]);
    setNewItemName('');
    setNewItemPortion('1 serving');
    setShowAddForm(false);
  }

  // Re-analyze with corrections
  async function handleReAnalyze() {
    if (!correctionText.trim()) return;
    setIsReAnalyzing(true);
    try {
      const selectedIds = (state.selectedMembers as string[]) ?? (state.selectedMemberId ? [state.selectedMemberId as string] : []);
      const profiles: MemberProfile[] = members
        .filter((m) => selectedIds.includes(m.id))
        .map((m) => {
          const age = m.dob
            ? Math.floor((new Date().getTime() - new Date(m.dob).getTime()) / 31557600000)
            : (m.age ?? 30);
          return {
            name: m.name,
            age,
            conditions: (m.health_conditions || []).filter((c) => c !== 'none'),
            relationship: m.relationship ?? undefined,
          };
        });

      const originalDishes = items.map((i) => ({
        name: i.name,
        portion: i.portion,
        estimated_calories: i.calories,
      }));

      // Get image base64 if available
      let imgBase64: string | undefined;
      let imgMediaType: string | undefined;
      if (state.imageBase64) {
        imgBase64 = state.imageBase64 as string;
        imgMediaType = (state.mediaType as string) || 'image/jpeg';
      }

      const result = await reAnalyzeWithCorrection(
        correctionText.trim(),
        originalDishes,
        profiles,
        imgBase64,
        imgMediaType,
      );

      // Update items with corrected analysis
      if (result.detected_dishes && result.detected_dishes.length > 0) {
        setItems(
          result.detected_dishes.map((d: DetectedDish) => ({
            id: nextId(),
            name: d.name,
            name_telugu: d.name_telugu ?? undefined,
            portion: d.portion,
            calories: d.estimated_calories,
            protein_g: d.protein_g,
            carbs_g: d.carbs_g,
            fat_g: d.fat_g,
            confidence: 'high' as const,
            isUserCorrected: true,
          }))
        );
      } else if (result.dishes && result.dishes.length > 0) {
        setItems(
          result.dishes.map((d) => ({
            id: nextId(),
            name: d.name,
            name_telugu: d.name_telugu,
            portion: d.portion,
            calories: d.estimated_calories,
            protein_g: d.protein_g,
            carbs_g: d.carbs_g,
            fat_g: d.fat_g,
            confidence: 'high' as const,
            isUserCorrected: true,
          }))
        );
      }

      // Update the full analysis in state for downstream
      Object.assign(state, { claudeAnalysis: result });
      setCorrectionText('');
      setShowCorrectionInput(false);
    } catch (err) {
      console.error('Re-analysis failed:', err);
    } finally {
      setIsReAnalyzing(false);
    }
  }

  function handleContinue() {
    const updatedAnalysis: MealAnalysisResponse = {
      ...claude,
      dishes: items.map((item) => ({
        name: item.name,
        name_telugu: item.name_telugu,
        portion: item.portion,
        estimated_calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: 0,
      })),
      detected_dishes: items.map((item) => ({
        name: item.name,
        name_telugu: item.name_telugu,
        confidence: item.confidence,
        confidence_pct: item.confidence_pct,
        portion: item.portion,
        estimated_calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: 0,
      })),
      meal_name: items.map((i) => i.name).join(', '),
      total_calories: items.reduce((sum, i) => sum + i.calories, 0),
      total_protein_g: items.reduce((sum, i) => sum + i.protein_g, 0),
      total_carbs_g: items.reduce((sum, i) => sum + i.carbs_g, 0),
      total_fat_g: items.reduce((sum, i) => sum + i.fat_g, 0),
    };

    const hasMultipleMembers = (state.selectedMembers as string[] | undefined)?.length
      ? (state.selectedMembers as string[]).length > 1
      : false;
    const nextRoute = hasMultipleMembers ? '/portion-confirm' : '/results/analysis';

    navigate(nextRoute, {
      state: {
        ...state,
        claudeAnalysis: updatedAnalysis,
      },
    });
  }

  if (!claude && !state.imagePreview && !state.manualText) {
    return null;
  }

  const imagePreview = state.imagePreview as string | undefined;
  const totalCals = items.reduce((sum, i) => sum + i.calories, 0);
  const hasLowConfidence = items.some((i) => i.confidence === 'low' || i.confidence === 'medium');

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto w-full" style={{ backgroundColor: '#f4f6f4' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full text-brand-text hover:bg-brand-light flex-shrink-0"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8' }}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#6ab08c' }} />
        </button>
        <div className="flex-1">
          <h1 className="font-serif text-lg font-bold" style={{ color: '#143628' }}>
            Review Detected Items
          </h1>
          <p className="text-xs" style={{ color: '#7a8c7e' }}>
            Verify what our AI found in your meal
          </p>
        </div>
      </header>

      {/* Meal Preview */}
      {imagePreview && (
        <div className="px-5 mb-4">
          <div className="w-full h-32 rounded-2xl overflow-hidden" style={{ border: '1px solid #e8e2d8' }}>
            <img src={imagePreview} alt="Your meal" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Verification Questions Banner */}
      {verificationQuestions.length > 0 && (
        <div className="mx-5 mb-4 p-4 rounded-2xl" style={{ backgroundColor: '#fff8e1', border: '1px solid #ffe082' }}>
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f57f17' }} />
            <p className="text-sm font-semibold" style={{ color: '#e65100' }}>
              Quick questions to improve accuracy
            </p>
          </div>
          <ul className="space-y-1.5 ml-7">
            {verificationQuestions.map((q, idx) => (
              <li key={idx} className="text-sm" style={{ color: '#795548' }}>
                • {q}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setShowCorrectionInput(true)}
            className="mt-3 ml-7 text-sm font-medium underline"
            style={{ color: '#6ab08c' }}
          >
            Answer with voice or text →
          </button>
        </div>
      )}

      {/* Detected Items */}
      <main className="flex-1 px-5 pb-6 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium" style={{ color: '#143628' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} detected
          </p>
          <p className="text-sm font-semibold" style={{ color: '#6ab08c' }}>
            {totalCals} cal total
          </p>
        </div>

        {items.map((item) => {
          const conf = getConfidenceColor(item.confidence);
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className="rounded-2xl p-4"
              style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${editingId === item.id ? '#6ab08c' : '#e8e2d8'}`,
                boxShadow: '0 2px 8px rgba(90, 70, 50, 0.06)',
              }}
            >
              {editingId === item.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium" style={{ color: '#7a8c7e' }}>Food name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm"
                      style={{ backgroundColor: '#f4f6f4', border: '1px solid #e8e2d8', color: '#143628' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium" style={{ color: '#7a8c7e' }}>Portion</label>
                    <input
                      type="text"
                      value={editPortion}
                      onChange={(e) => setEditPortion(e.target.value)}
                      className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm"
                      style={{ backgroundColor: '#f4f6f4', border: '1px solid #e8e2d8', color: '#143628' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(item.id)}
                      className="flex-1 py-2.5 rounded-full text-sm font-medium text-white flex items-center justify-center gap-1"
                      style={{ backgroundColor: '#6ab08c' }}
                    >
                      <Check className="w-4 h-4" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="py-2.5 px-4 rounded-full text-sm font-medium"
                      style={{ border: '1px solid #e8e2d8', color: '#7a8c7e' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Name + Confidence badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm" style={{ color: '#143628' }}>{item.name}</p>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: conf.bg,
                            color: conf.text,
                            border: `1px solid ${conf.border}`,
                          }}
                        >
                          {conf.label}{item.confidence_pct ? ` ${item.confidence_pct}%` : ''}
                        </span>
                        {item.isUserCorrected && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
                          >
                            ✓ Confirmed
                          </span>
                        )}
                      </div>
                      {item.name_telugu && (
                        <p className="text-xs mt-0.5" style={{ color: '#7a8c7e' }}>{item.name_telugu}</p>
                      )}
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-xs" style={{ color: '#7a8c7e' }}>{item.portion}</span>
                        <span className="text-xs font-medium" style={{ color: '#6ab08c' }}>{item.calories} cal</span>
                        <span className="text-xs" style={{ color: '#a8c4a0' }}>{item.protein_g}g P</span>
                      </div>
                      {item.isNew && (
                        <span
                          className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1.5 font-medium"
                          style={{ backgroundColor: '#f5f0e8', color: '#6ab08c' }}
                        >
                          Manually added
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {(item.alternatives && item.alternatives.length > 0 || item.visual_cues) && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="p-2 rounded-full transition-colors"
                          style={{ color: '#7a8c7e' }}
                          aria-label={isExpanded ? 'Collapse' : 'Show alternatives'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="p-2 rounded-full transition-colors"
                        style={{ color: '#7a8c7e' }}
                        aria-label="Edit item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-full transition-colors"
                        style={{ color: '#c49a82' }}
                        aria-label="Remove item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Alternatives + Visual Cues */}
                  {isExpanded && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f5f0e8' }}>
                      {item.visual_cues && (
                        <p className="text-xs mb-3" style={{ color: '#7a8c7e', fontStyle: 'italic' }}>
                          🔍 {item.visual_cues}
                        </p>
                      )}
                      {item.alternatives && item.alternatives.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-2" style={{ color: '#143628' }}>
                            Could also be:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {item.alternatives.map((alt, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => selectAlternative(item.id, alt.name)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                                style={{
                                  backgroundColor: '#f5f0e8',
                                  color: '#6ab08c',
                                  border: '1px solid #e8e2d8',
                                }}
                              >
                                {alt.name}
                              </button>
                            ))}
                          </div>
                          {item.alternatives.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.alternatives.map((alt, idx) => (
                                <p key={idx} className="text-[11px]" style={{ color: '#7a8c7e' }}>
                                  <span className="font-medium">{alt.name}:</span> {alt.reason}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Item */}
        {showAddForm ? (
          <div className="rounded-2xl p-4 border-2 border-dashed" style={{ borderColor: '#a8c4a0', backgroundColor: '#ffffff' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#143628' }}>Add a food item</p>
            <div className="space-y-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Food name (e.g., Curd Rice)"
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ backgroundColor: '#f4f6f4', border: '1px solid #e8e2d8', color: '#143628' }}
              />
              <input
                type="text"
                value={newItemPortion}
                onChange={(e) => setNewItemPortion(e.target.value)}
                placeholder="Portion (e.g., 1 bowl)"
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ backgroundColor: '#f4f6f4', border: '1px solid #e8e2d8', color: '#143628' }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!newItemName.trim()}
                  className="flex-1 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#6ab08c' }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setNewItemName(''); }}
                  className="py-2.5 px-4 rounded-full text-sm font-medium"
                  style={{ border: '1px solid #e8e2d8', color: '#7a8c7e' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            style={{ borderColor: '#e8e2d8', color: '#7a8c7e' }}
          >
            <Plus className="w-4 h-4" />
            Add missing item
          </button>
        )}

        {/* Voice/Text Correction Section */}
        {(hasLowConfidence || showCorrectionInput) && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: '#f5f0e8', border: '1px solid #e8e2d8' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: '#143628' }}>
              🗣️ Correct the AI
            </p>
            <p className="text-xs mb-3" style={{ color: '#7a8c7e' }}>
              Tell us what's different — e.g. "That's not dal, it's sambar" or "Add pickle, AI missed it"
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                placeholder="Type correction or use mic..."
                className="flex-1 px-3 py-2.5 rounded-xl text-sm"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', color: '#143628' }}
                onKeyDown={(e) => e.key === 'Enter' && handleReAnalyze()}
              />
              <VoiceRecorderButton
                size="lg"
                showDuration={false}
                onTranscript={(text) => setCorrectionText((prev) => prev ? `${prev} ${text}` : text)}
                onError={(err) => console.error('Voice correction error:', err)}
              />
            </div>
            {correctionText && (
              <button
                type="button"
                onClick={handleReAnalyze}
                disabled={isReAnalyzing}
                className="w-full py-2.5 rounded-full text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: '#6ab08c' }}
              >
                {isReAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Re-analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Re-analyze with correction
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Show correction input toggle if not already visible */}
        {!hasLowConfidence && !showCorrectionInput && (
          <button
            type="button"
            onClick={() => setShowCorrectionInput(true)}
            className="w-full py-2.5 text-sm font-medium"
            style={{ color: '#6ab08c' }}
          >
            Something wrong? Correct the AI →
          </button>
        )}

        {/* Info note */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#f5f0e8' }}>
          <p className="text-xs" style={{ color: '#6ab08c' }}>
            💡 Tap the confidence badge to see why AI identified each dish. Use voice or text to correct mistakes — AI will re-analyze with your input!
          </p>
        </div>
      </main>

      {/* Bottom CTA */}
      <div className="px-5 pb-6 pt-2" style={{ backgroundColor: '#f4f6f4' }}>
        <button
          type="button"
          onClick={handleContinue}
          disabled={items.length === 0 || isReAnalyzing}
          className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ backgroundColor: '#6ab08c' }}
        >
          Looks Good — Continue
        </button>
      </div>
    </div>
  );
}
