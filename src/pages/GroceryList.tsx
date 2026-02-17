// ============================================
// MY HEALTH BUDDY - Smart Grocery List (Upgraded)
// Categorized Indian items, Already Have / Need to Buy, WhatsApp share
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Square, Edit2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader';
import { useFamily } from '../hooks/useFamily';

const GROCERY_CHECKED_KEY = 'mhb_grocery_checked';
const GROCERY_HAVE_KEY = 'mhb_grocery_have';

function getWeekKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

interface GroceryItem {
  name: string;
  quantity: string;
}

interface GroceryCategory {
  category: string;
  emoji: string;
  items: GroceryItem[];
}

interface GroceryData {
  grocery_list: GroceryCategory[];
  smart_tips: string[];
}

type GroceryError = 'no_meals' | 'failed' | null;
type ViewMode = 'all' | 'need' | 'have';

// Common Indian grocery staples for quick-add
const QUICK_ADD_ITEMS: { name: string; emoji: string; category: string }[] = [
  { name: 'Rice (Basmati)', emoji: '🍚', category: 'Grains & Staples' },
  { name: 'Atta (Wheat Flour)', emoji: '🫓', category: 'Grains & Staples' },
  { name: 'Rava (Semolina)', emoji: '🌾', category: 'Grains & Staples' },
  { name: 'Moong Dal', emoji: '🫘', category: 'Dals & Pulses' },
  { name: 'Toor Dal', emoji: '🫘', category: 'Dals & Pulses' },
  { name: 'Chana Dal', emoji: '🫘', category: 'Dals & Pulses' },
  { name: 'Urad Dal', emoji: '🫘', category: 'Dals & Pulses' },
  { name: 'Masoor Dal', emoji: '🫘', category: 'Dals & Pulses' },
  { name: 'Onions', emoji: '🧅', category: 'Vegetables' },
  { name: 'Tomatoes', emoji: '🍅', category: 'Vegetables' },
  { name: 'Potatoes', emoji: '🥔', category: 'Vegetables' },
  { name: 'Green Chillies', emoji: '🌶️', category: 'Vegetables' },
  { name: 'Ginger', emoji: '🫚', category: 'Vegetables' },
  { name: 'Garlic', emoji: '🧄', category: 'Vegetables' },
  { name: 'Curry Leaves', emoji: '🍃', category: 'Vegetables' },
  { name: 'Coriander Leaves', emoji: '🌿', category: 'Vegetables' },
  { name: 'Brinjal', emoji: '🍆', category: 'Vegetables' },
  { name: 'Okra (Bhindi)', emoji: '🥒', category: 'Vegetables' },
  { name: 'Spinach (Palak)', emoji: '🥬', category: 'Vegetables' },
  { name: 'Drumstick', emoji: '🥬', category: 'Vegetables' },
  { name: 'Bottle Gourd', emoji: '🥒', category: 'Vegetables' },
  { name: 'Banana', emoji: '🍌', category: 'Fruits' },
  { name: 'Mango', emoji: '🥭', category: 'Fruits' },
  { name: 'Apple', emoji: '🍎', category: 'Fruits' },
  { name: 'Lemon', emoji: '🍋', category: 'Fruits' },
  { name: 'Coconut', emoji: '🥥', category: 'Fruits' },
  { name: 'Milk', emoji: '🥛', category: 'Dairy' },
  { name: 'Curd (Yogurt)', emoji: '🥛', category: 'Dairy' },
  { name: 'Paneer', emoji: '🧀', category: 'Dairy' },
  { name: 'Ghee', emoji: '🧈', category: 'Dairy' },
  { name: 'Butter', emoji: '🧈', category: 'Dairy' },
  { name: 'Eggs', emoji: '🥚', category: 'Protein' },
  { name: 'Chicken', emoji: '🍗', category: 'Protein' },
  { name: 'Fish', emoji: '🐟', category: 'Protein' },
  { name: 'Cooking Oil', emoji: '🫗', category: 'Oils & Condiments' },
  { name: 'Mustard Seeds', emoji: '🌰', category: 'Spices' },
  { name: 'Cumin Seeds (Jeera)', emoji: '🌰', category: 'Spices' },
  { name: 'Turmeric', emoji: '🟡', category: 'Spices' },
  { name: 'Red Chilli Powder', emoji: '🌶️', category: 'Spices' },
  { name: 'Coriander Powder', emoji: '🌿', category: 'Spices' },
  { name: 'Garam Masala', emoji: '🫙', category: 'Spices' },
  { name: 'Tamarind', emoji: '🟤', category: 'Oils & Condiments' },
  { name: 'Jaggery (Bellam)', emoji: '🟤', category: 'Oils & Condiments' },
  { name: 'Salt', emoji: '🧂', category: 'Oils & Condiments' },
  { name: 'Sugar', emoji: '🍬', category: 'Oils & Condiments' },
  { name: 'Tea Powder', emoji: '🍵', category: 'Beverages' },
  { name: 'Coffee Powder', emoji: '☕', category: 'Beverages' },
  { name: 'Poha (Flattened Rice)', emoji: '🍚', category: 'Grains & Staples' },
  { name: 'Idli Batter', emoji: '🫓', category: 'Grains & Staples' },
  { name: 'Ragi Flour', emoji: '🌾', category: 'Grains & Staples' },
];

export default function GroceryList() {
  const { members } = useFamily();
  const memberCountRef = useRef(members?.length ?? 4);
  memberCountRef.current = members?.length ?? 4;

  const [groceryData, setGroceryData] = useState<GroceryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<GroceryError>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // "Checked" = purchased items
  const [checkedItems, setCheckedItems] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(`${GROCERY_CHECKED_KEY}_${getWeekKey()}`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  });

  // "Already have" items
  const [haveItems, setHaveItems] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(`${GROCERY_HAVE_KEY}_${getWeekKey()}`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  });

  // Editing quantity
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');

  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const hasFetchedRef = useRef(false);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }, []);

  const toggleItem = useCallback((itemName: string) => {
    setCheckedItems((prev) => {
      const next = prev.includes(itemName) ? prev.filter((i) => i !== itemName) : [...prev, itemName];
      try { sessionStorage.setItem(`${GROCERY_CHECKED_KEY}_${getWeekKey()}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const toggleHaveItem = useCallback((itemName: string) => {
    setHaveItems((prev) => {
      const next = prev.includes(itemName) ? prev.filter((i) => i !== itemName) : [...prev, itemName];
      try { sessionStorage.setItem(`${GROCERY_HAVE_KEY}_${getWeekKey()}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const saveQuantity = useCallback((itemName: string) => {
    if (!groceryData) return;
    setGroceryData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        grocery_list: prev.grocery_list.map((cat) => ({
          ...cat,
          items: cat.items.map((i) =>
            i.name === itemName ? { ...i, quantity: editQty } : i
          ),
        })),
      };
    });
    setEditingItem(null);
  }, [editQty, groceryData]);

  const clearPurchased = useCallback(() => {
    setCheckedItems([]);
    try { sessionStorage.setItem(`${GROCERY_CHECKED_KEY}_${getWeekKey()}`, JSON.stringify([])); } catch {}
  }, []);

  const { totalItems, checkedCount, needCount, haveCount } = useMemo(() => {
    if (!groceryData?.grocery_list) return { totalItems: 0, checkedCount: 0, needCount: 0, haveCount: 0 };
    const total = groceryData.grocery_list.reduce((sum, cat) => sum + cat.items.length, 0);
    const checked = groceryData.grocery_list.reduce(
      (sum, cat) => sum + cat.items.filter((i) => checkedItems.includes(i.name)).length, 0
    );
    const have = groceryData.grocery_list.reduce(
      (sum, cat) => sum + cat.items.filter((i) => haveItems.includes(i.name)).length, 0
    );
    return { totalItems: total, checkedCount: checked, needCount: total - have, haveCount: have };
  }, [groceryData?.grocery_list, checkedItems, haveItems]);

  const buildFallbackGroceryList = useCallback((mealNames: string[]): GroceryData => {
    return {
      grocery_list: [{
        category: 'Ingredients for your meals',
        emoji: '🛒',
        items: mealNames.map((name) => ({ name, quantity: 'As needed' })),
      }],
      smart_tips: [
        'AI grocery suggestions are temporarily unavailable. This is a basic list from your meal names.',
        'Try again later for AI-powered quantities and Telugu ingredient suggestions.',
      ],
    };
  }, []);

  const fetchGroceryList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorDetail(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('failed'); setErrorDetail('Not signed in'); setLoading(false); return; }
      const rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 14);
      rangeStart.setHours(0, 0, 0, 0);
      const { data: meals, error: mealsError } = await supabase
        .from('meal_history').select('id, food_name, created_at')
        .eq('user_id', user.id).gte('created_at', rangeStart.toISOString())
        .order('created_at', { ascending: false });
      if (mealsError) { setError('failed'); setErrorDetail(mealsError.message); setLoading(false); return; }
      const mealNames = meals?.map((m: { food_name?: string }) => m.food_name ?? 'Unknown meal').filter(Boolean) ?? [];
      if (mealNames.length === 0) { setError('no_meals'); setLoading(false); return; }
      const memberCount = memberCountRef.current;
      const { data, error: fnError } = await supabase.functions.invoke('dynamic-processor', {
        body: { type: 'grocery', mealNames, memberCount },
      });
      if (fnError) {
        setErrorDetail(fnError.message || String(fnError));
        setGroceryData(buildFallbackGroceryList(mealNames));
        setExpandedCategories(['Ingredients for your meals']);
        setError(null);
        setLoading(false);
        return;
      }
      const parsed = data as GroceryData;
      if (parsed?.grocery_list) {
        setGroceryData(parsed);
        setExpandedCategories(parsed.grocery_list.map((c) => c.category));
      } else {
        setGroceryData(buildFallbackGroceryList(mealNames));
        setExpandedCategories(['Ingredients for your meals']);
        setError(null);
      }
    } catch (err) {
      setError('failed');
      setErrorDetail(err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  }, [buildFallbackGroceryList]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchGroceryList();
  }, [fetchGroceryList]);

  // Quick add an item
  const quickAddItem = useCallback((item: typeof QUICK_ADD_ITEMS[0]) => {
    if (!groceryData) return;
    setGroceryData((prev) => {
      if (!prev) return prev;
      const existingCat = prev.grocery_list.find((c) => c.category === item.category);
      if (existingCat) {
        if (existingCat.items.some((i) => i.name === item.name)) return prev;
        return {
          ...prev,
          grocery_list: prev.grocery_list.map((c) =>
            c.category === item.category
              ? { ...c, items: [...c.items, { name: item.name, quantity: 'As needed' }] }
              : c
          ),
        };
      }
      return {
        ...prev,
        grocery_list: [
          ...prev.grocery_list,
          { category: item.category, emoji: item.emoji, items: [{ name: item.name, quantity: 'As needed' }] },
        ],
      };
    });
    if (!expandedCategories.includes(item.category)) {
      setExpandedCategories((prev) => [...prev, item.category]);
    }
  }, [groceryData, expandedCategories]);

  // Filter items based on view mode
  const getFilteredItems = useCallback((items: GroceryItem[]): GroceryItem[] => {
    if (viewMode === 'need') return items.filter((i) => !haveItems.includes(i.name));
    if (viewMode === 'have') return items.filter((i) => haveItems.includes(i.name));
    return items;
  }, [viewMode, haveItems]);

  const buildShareText = (): string => {
    if (!groceryData) return '';
    let text = '🛒 *Weekly Grocery List*\n\n';
    const needToBuy = groceryData.grocery_list.map((cat) => ({
      ...cat,
      items: cat.items.filter((i) => !haveItems.includes(i.name)),
    })).filter((cat) => cat.items.length > 0);

    if (needToBuy.length > 0) {
      text += '*Need to Buy:*\n';
      needToBuy.forEach((cat) => {
        text += `\n${cat.emoji} *${cat.category}:*\n`;
        cat.items.forEach((item) => {
          const purchased = checkedItems.includes(item.name) ? '✅' : '⬜';
          text += `${purchased} ${item.name} — ${item.quantity}\n`;
        });
      });
    }
    text += '\n— Generated by Arogya 🌿';
    return text;
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`);
  };

  const handleCopyList = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
    } catch { console.error('Clipboard copy failed'); }
  };

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto w-full" style={{ backgroundColor: '#F4F1EA' }}>
      <header className="px-4 pt-6 pb-4">
        <PageHeader title="🛒 Smart Grocery List" subtitle="Based on your meals this week" />
      </header>

      <main className="px-4">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4 animate-bounce">🛒</div>
            <p className="font-medium" style={{ color: '#2D3319' }}>Generating your smart grocery list...</p>
            <p className="text-sm text-neutral-500">This takes about 10 seconds</p>
          </div>
        ) : error === 'no_meals' ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="font-serif text-lg font-semibold mb-2" style={{ color: '#2D3319' }}>Log some meals first!</p>
            <p className="text-sm mb-6" style={{ color: '#6B7B5E' }}>We need your meal data to generate a grocery list</p>
            <Link to="/dashboard" className="py-3 px-6 rounded-full font-semibold text-sm text-white" style={{ backgroundColor: '#5C6B4A' }}>
              Scan a Meal
            </Link>
          </div>
        ) : error === 'failed' ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <p className="font-medium mb-2" style={{ color: '#2D3319' }}>Something went wrong. Please try again.</p>
            {errorDetail && <p className="text-sm text-neutral-500 mb-4 max-w-xs">{errorDetail}</p>}
            <button type="button" onClick={fetchGroceryList} className="py-3 px-6 rounded-full font-semibold text-sm text-white" style={{ backgroundColor: '#5C6B4A' }}>
              Retry
            </button>
          </div>
        ) : groceryData ? (
          <div className="space-y-4 pb-6">
            {/* View Mode Tabs: All / Need to Buy / Already Have */}
            <div className="flex gap-2 bg-white rounded-full p-1 border border-beige-200">
              {([
                { key: 'all' as ViewMode, label: 'All', count: totalItems },
                { key: 'need' as ViewMode, label: 'Need to Buy', count: needCount },
                { key: 'have' as ViewMode, label: 'Already Have', count: haveCount },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setViewMode(tab.key)}
                  className={`flex-1 py-2 px-2 rounded-full text-xs font-medium transition-all ${
                    viewMode === tab.key ? 'text-white shadow-sm' : 'text-neutral-600'
                  }`}
                  style={viewMode === tab.key ? { backgroundColor: '#5C6B4A' } : {}}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Progress */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between py-1">
                <p className="text-sm" style={{ color: '#6B7B5E' }}>
                  {checkedCount} of {needCount} purchased
                </p>
                {checkedCount > 0 && (
                  <button type="button" onClick={clearPurchased} className="text-xs underline" style={{ color: '#5C6B4A' }}>
                    Clear purchased
                  </button>
                )}
              </div>
            )}

            {/* Smart Tips */}
            {groceryData.smart_tips?.length > 0 && (
              <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💡</span>
                  <h2 className="font-serif font-semibold" style={{ color: '#2D3319' }}>Smart Tips</h2>
                </div>
                <ul className="space-y-1.5">
                  {groceryData.smart_tips.map((tip, i) => (
                    <li key={i} className="text-sm text-neutral-700 flex gap-2">
                      <span className="text-emerald-500">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Grocery Categories */}
            {groceryData.grocery_list?.map((cat) => {
              const filtered = getFilteredItems(cat.items);
              if (filtered.length === 0) return null;
              const catChecked = filtered.filter((i) => checkedItems.includes(i.name)).length;
              const isExpanded = expandedCategories.includes(cat.category);
              return (
                <div key={cat.category} className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: '#FDFBF7' }}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.category)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="font-serif font-semibold" style={{ color: '#2D3319' }}>{cat.category}</span>
                      {catChecked > 0 && (
                        <span className="text-xs text-neutral-500">({catChecked}/{filtered.length})</span>
                      )}
                    </div>
                    <span className="text-neutral-400">{isExpanded ? '▼' : '▶'}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-1 border-t pt-3" style={{ borderColor: '#e8e4dc' }}>
                      {filtered.map((item) => {
                        const isChecked = checkedItems.includes(item.name);
                        const isHave = haveItems.includes(item.name);
                        const isEditing = editingItem === item.name;

                        return (
                          <div key={item.name} className="flex items-center gap-2 py-2 min-h-[48px]">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleItem(item.name)}
                              className="flex-shrink-0 p-1"
                              aria-label={isChecked ? 'Unmark as purchased' : 'Mark as purchased'}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-5 h-5" style={{ color: '#5C6B4A' }} />
                              ) : (
                                <Square className="w-5 h-5 text-neutral-300" />
                              )}
                            </button>

                            {/* Name + Quantity */}
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm ${isChecked ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                {item.name}
                              </span>
                              {isEditing ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <input
                                    type="text"
                                    value={editQty}
                                    onChange={(e) => setEditQty(e.target.value)}
                                    className="text-xs px-2 py-1 rounded-lg border border-beige-300 w-24"
                                    style={{ backgroundColor: '#F4F1EA' }}
                                    autoFocus
                                  />
                                  <button type="button" onClick={() => saveQuantity(item.name)} className="p-1">
                                    <Check className="w-4 h-4" style={{ color: '#5C6B4A' }} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setEditingItem(item.name); setEditQty(item.quantity); }}
                                  className="flex items-center gap-1 mt-0.5"
                                >
                                  <span className="text-xs text-neutral-500">{item.quantity}</span>
                                  <Edit2 className="w-3 h-3 text-neutral-400" />
                                </button>
                              )}
                            </div>

                            {/* Already Have toggle */}
                            <button
                              type="button"
                              onClick={() => toggleHaveItem(item.name)}
                              className={`text-[10px] px-2 py-1 rounded-full border transition-all flex-shrink-0 ${
                                isHave
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                  : 'border-beige-200 text-neutral-500'
                              }`}
                            >
                              {isHave ? '✓ Have' : 'Have it'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick Add Section */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FDFBF7' }}>
              <button
                type="button"
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">➕</span>
                  <span className="font-serif font-semibold" style={{ color: '#2D3319' }}>Quick Add Indian Staples</span>
                </div>
                <span className="text-neutral-400">{showQuickAdd ? '▼' : '▶'}</span>
              </button>
              {showQuickAdd && (
                <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: '#e8e4dc' }}>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_ADD_ITEMS.map((item) => {
                      const alreadyAdded = groceryData?.grocery_list?.some((cat) =>
                        cat.items.some((i) => i.name === item.name)
                      );
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => quickAddItem(item)}
                          disabled={alreadyAdded}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            alreadyAdded
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              : 'border-beige-200 text-neutral-600 hover:border-olive-400'
                          }`}
                        >
                          {item.emoji} {item.name} {alreadyAdded ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex-1 py-3.5 rounded-full font-semibold text-white"
                style={{ backgroundColor: '#25D366' }}
              >
                📲 WhatsApp
              </button>
              <button
                type="button"
                onClick={handleCopyList}
                className="flex-1 py-3.5 rounded-full font-semibold border-2 transition-colors hover:bg-olive-50"
                style={{ borderColor: '#5C6B4A', color: '#5C6B4A' }}
              >
                📋 Copy List
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
