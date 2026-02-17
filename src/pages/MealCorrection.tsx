// ============================================
// MY HEALTH BUDDY - Meal Correction
// Edit/remove/add detected food items after AI analysis
// ============================================

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Plus, Edit2, Check } from 'lucide-react';
import type { MealAnalysisResponse } from '../types/meal-analysis';

interface DetectedItem {
  id: string;
  name: string;
  name_telugu?: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  isNew?: boolean;
}

let itemIdCounter = 0;
function nextId() {
  return `item_${++itemIdCounter}_${Date.now()}`;
}

export default function MealCorrection() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as Record<string, unknown>;
  const claude = state.claudeAnalysis as MealAnalysisResponse | undefined;

  const [items, setItems] = useState<DetectedItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPortion, setEditPortion] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPortion, setNewItemPortion] = useState('1 serving');

  // Initialize items from AI analysis
  useEffect(() => {
    if (claude?.dishes && claude.dishes.length > 0) {
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
        }))
      );
    } else if (claude?.meal_name || claude?.food_name) {
      // Single meal item fallback
      setItems([{
        id: nextId(),
        name: claude.meal_name || claude.food_name || 'Detected Meal',
        name_telugu: claude.meal_name_telugu,
        portion: '1 serving',
        calories: claude.total_calories ?? claude.calories ?? 0,
        protein_g: claude.total_protein_g ?? claude.macros?.protein_g ?? 0,
        carbs_g: claude.total_carbs_g ?? claude.macros?.carbs_g ?? 0,
        fat_g: claude.total_fat_g ?? claude.macros?.fat_g ?? 0,
      }]);
    }
  }, []);

  // Redirect if no state
  useEffect(() => {
    if (!claude && !state.imagePreview && !state.manualText) {
      navigate('/dashboard', { replace: true });
    }
  }, [claude, state, navigate]);

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
        item.id === id ? { ...item, name: editName, portion: editPortion } : item
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
        isNew: true,
      },
    ]);
    setNewItemName('');
    setNewItemPortion('1 serving');
    setShowAddForm(false);
  }

  function handleContinue() {
    // Build updated claude analysis with corrected items
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
      meal_name: items.map((i) => i.name).join(', '),
      total_calories: items.reduce((sum, i) => sum + i.calories, 0),
      total_protein_g: items.reduce((sum, i) => sum + i.protein_g, 0),
      total_carbs_g: items.reduce((sum, i) => sum + i.carbs_g, 0),
      total_fat_g: items.reduce((sum, i) => sum + i.fat_g, 0),
    };

    // Navigate to portion confirmation or results
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

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto w-full" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-beige-300 text-neutral-600 hover:bg-beige-100"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-serif text-lg font-bold" style={{ color: '#2D3319' }}>
            Review Detected Items
          </h1>
          <p className="text-sm" style={{ color: '#6B7B5E' }}>
            Edit, remove, or add food items
          </p>
        </div>
      </header>

      {/* Meal Preview */}
      {imagePreview && (
        <div className="px-5 mb-4">
          <div className="w-full h-32 rounded-2xl overflow-hidden border border-beige-300">
            <img src={imagePreview} alt="Your meal" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Detected Items */}
      <main className="flex-1 px-5 pb-6 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium" style={{ color: '#2D3319' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} detected
          </p>
          <p className="text-sm font-semibold" style={{ color: '#5C6B4A' }}>
            {totalCals} cal total
          </p>
        </div>

        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl p-4 border"
            style={{
              backgroundColor: '#FDFBF7',
              borderColor: editingId === item.id ? '#8B9E6B' : '#e5e5e5',
            }}
          >
            {editingId === item.id ? (
              /* Edit mode */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-600">Food name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-beige-300 text-sm"
                    style={{ backgroundColor: '#F4F1EA' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-600">Portion</label>
                  <input
                    type="text"
                    value={editPortion}
                    onChange={(e) => setEditPortion(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-beige-300 text-sm"
                    style={{ backgroundColor: '#F4F1EA' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(item.id)}
                    className="flex-1 py-2 rounded-full text-sm font-medium text-white flex items-center justify-center gap-1"
                    style={{ backgroundColor: '#5C6B4A' }}
                  >
                    <Check className="w-4 h-4" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="py-2 px-4 rounded-full text-sm font-medium border border-beige-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-neutral-800">{item.name}</p>
                  {item.name_telugu && (
                    <p className="text-xs text-neutral-500">{item.name_telugu}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-neutral-500">{item.portion}</span>
                    <span className="text-xs font-medium" style={{ color: '#5C6B4A' }}>{item.calories} cal</span>
                  </div>
                  {item.isNew && (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1" style={{ backgroundColor: '#f0f5eb', color: '#5C6B4A' }}>
                      Manually added
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="p-2 rounded-full text-neutral-400 hover:text-olive-600 transition-colors"
                    aria-label="Edit item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-2 rounded-full text-neutral-400 hover:text-red-500 transition-colors"
                    aria-label="Remove item"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Item */}
        {showAddForm ? (
          <div className="rounded-2xl p-4 border-2 border-dashed" style={{ borderColor: '#8B9E6B', backgroundColor: '#FDFBF7' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#2D3319' }}>Add a food item</p>
            <div className="space-y-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Food name (e.g., Curd Rice)"
                className="w-full px-3 py-2 rounded-xl border border-beige-300 text-sm"
                style={{ backgroundColor: '#F4F1EA' }}
              />
              <input
                type="text"
                value={newItemPortion}
                onChange={(e) => setNewItemPortion(e.target.value)}
                placeholder="Portion (e.g., 1 bowl)"
                className="w-full px-3 py-2 rounded-xl border border-beige-300 text-sm"
                style={{ backgroundColor: '#F4F1EA' }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!newItemName.trim()}
                  className="flex-1 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#5C6B4A' }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setNewItemName(''); }}
                  className="py-2 px-4 rounded-full text-sm font-medium border border-beige-300"
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
            className="w-full py-3 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-colors hover:border-olive-400"
            style={{ borderColor: '#d4d0c8', color: '#6B7B5E' }}
          >
            <Plus className="w-4 h-4" />
            Add missing item
          </button>
        )}

        {/* Info note */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#f0f5eb' }}>
          <p className="text-xs" style={{ color: '#5C6B4A' }}>
            AI detection isn&apos;t perfect! Feel free to correct items for more accurate nutrition tracking.
          </p>
        </div>
      </main>

      {/* Bottom CTA */}
      <div className="px-5 pb-6 pt-2" style={{ backgroundColor: '#F4F1EA' }}>
        <button
          type="button"
          onClick={handleContinue}
          disabled={items.length === 0}
          className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ backgroundColor: '#5C6B4A' }}
        >
          Looks Good — Continue
        </button>
      </div>
    </div>
  );
}
