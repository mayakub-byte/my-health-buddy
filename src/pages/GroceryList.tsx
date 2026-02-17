// ============================================
// MY HEALTH BUDDY - Smart Grocery List
// Auto-generated from this week's meals
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Square } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader';
import { useFamily } from '../hooks/useFamily';

const GROCERY_CHECKED_KEY = 'mhb_grocery_checked';
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

export default function GroceryList() {
  const { members } = useFamily();
  const memberCountRef = useRef(members?.length ?? 4);
  memberCountRef.current = members?.length ?? 4;

  const [groceryData, setGroceryData] = useState<GroceryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<GroceryError>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(`${GROCERY_CHECKED_KEY}_${getWeekKey()}`);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const hasFetchedRef = useRef(false);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }, []);

  const toggleItem = useCallback((itemName: string) => {
    setCheckedItems((prev) => {
      const next = prev.includes(itemName)
        ? prev.filter((i) => i !== itemName)
        : [...prev, itemName];
      try {
        sessionStorage.setItem(`${GROCERY_CHECKED_KEY}_${getWeekKey()}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const persistChecked = useCallback((items: string[]) => {
    try {
      sessionStorage.setItem(`${GROCERY_CHECKED_KEY}_${getWeekKey()}`, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, []);

  const { totalItems, checkedCount, allSelected } = useMemo(() => {
    if (!groceryData?.grocery_list) {
      return { totalItems: 0, checkedCount: 0, allSelected: false };
    }
    const total = groceryData.grocery_list.reduce((sum, cat) => sum + cat.items.length, 0);
    const checked = groceryData.grocery_list.reduce(
      (sum, cat) => sum + cat.items.filter((i) => checkedItems.includes(i.name)).length,
      0
    );
    return {
      totalItems: total,
      checkedCount: checked,
      allSelected: total > 0 && checked === total,
    };
  }, [groceryData?.grocery_list, checkedItems]);

  const handleToggleAll = useCallback(() => {
    if (!groceryData?.grocery_list || totalItems === 0) return;
    if (allSelected) {
      setCheckedItems([]);
      persistChecked([]);
    } else {
      const allNames = groceryData.grocery_list.flatMap((cat) => cat.items.map((i) => i.name));
      setCheckedItems([...allNames]);
      persistChecked([...allNames]);
    }
  }, [groceryData?.grocery_list, totalItems, allSelected, persistChecked]);

  const buildFallbackGroceryList = useCallback((mealNames: string[]): GroceryData => {
    return {
      grocery_list: [
        {
          category: 'Ingredients for your meals',
          emoji: '🛒',
          items: mealNames.map((name) => ({
            name,
            quantity: 'As needed',
          })),
        },
      ],
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
      if (!user) {
        const msg = 'Not signed in';
        console.warn('GroceryList:', msg);
        setError('failed');
        setErrorDetail(msg);
        setLoading(false);
        return;
      }

      // Use last 14 days (not "this week") so we include meals logged recently
      const rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 14);
      rangeStart.setHours(0, 0, 0, 0);

      const { data: meals, error: mealsError } = await supabase
        .from('meal_history')
        .select('id, food_name, created_at')
        .eq('user_id', user.id)
        .gte('created_at', rangeStart.toISOString())
        .order('created_at', { ascending: false });

      if (mealsError) {
        const msg = `Meals query failed: ${mealsError.message}`;
        console.error('GroceryList:', msg, mealsError);
        setError('failed');
        setErrorDetail(mealsError.message);
        setLoading(false);
        return;
      }

      const mealNames =
        meals?.map((m: { food_name?: string }) =>
          m.food_name ?? 'Unknown meal'
        ).filter(Boolean) ?? [];

      if (mealNames.length === 0) {
        console.warn('GroceryList: No meals in range', {
          userId: user.id,
          rangeStart: rangeStart.toISOString(),
          mealsReturned: meals?.length ?? 0,
        });
        setError('no_meals');
        setLoading(false);
        return;
      }

      const memberCount = memberCountRef.current;

      const { data, error: fnError } = await supabase.functions.invoke('dynamic-processor', {
        body: { type: 'grocery', mealNames, memberCount },
      });

      if (fnError) {
        const msg = fnError.message || String(fnError);
        console.error('GroceryList: Edge function error:', msg, fnError);
        setErrorDetail(msg);
        // Fallback: show basic list from meal names when AI fails
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
        const msg = 'AI returned invalid format';
        console.warn('GroceryList:', msg, data);
        setErrorDetail(msg);
        setGroceryData(buildFallbackGroceryList(mealNames));
        setExpandedCategories(['Ingredients for your meals']);
        setError(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('GroceryList error:', err);
      setError('failed');
      setErrorDetail(msg);
    } finally {
      setLoading(false);
    }
  }, [buildFallbackGroceryList]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchGroceryList();
  }, [fetchGroceryList]);

  const buildShareText = (): string => {
    if (!groceryData) return '';
    let text = '🛒 Weekly Grocery List\n\n';
    groceryData.grocery_list.forEach((cat) => {
      const items = cat.items;
      if (items.length > 0) {
        text += `${cat.emoji} ${cat.category}:\n`;
        items.forEach((item) => {
          text += `• ${item.name} — ${item.quantity}\n`;
        });
        text += '\n';
      }
    });
    text += '— Generated by Arogya 🌿';
    return text;
  };

  const buildCopyText = (): string => {
    if (!groceryData) return '';
    let text = 'Weekly Grocery List\n\n';
    groceryData.grocery_list.forEach((cat) => {
      const items = cat.items;
      if (items.length > 0) {
        text += `${cat.category}:\n`;
        items.forEach((item) => {
          const prefix = checkedItems.includes(item.name) ? '[x] ' : '[ ] ';
          text += `${prefix}${item.name} — ${item.quantity}\n`;
        });
        text += '\n';
      }
    });
    return text;
  };

  const handleShareWhatsApp = () => {
    const shareText = buildShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
  };

  const handleCopyList = async () => {
    const copyText = buildCopyText();
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      console.error('Clipboard copy failed');
    }
  };

  return (
    <div
      className="min-h-screen pb-24 max-w-md mx-auto w-full"
      style={{ backgroundColor: '#F4F1EA' }}
    >
      <header className="px-4 pt-6 pb-4">
        <PageHeader
          title="🛒 Smart Grocery List"
          subtitle="Based on your meals this week"
        />
      </header>

      <main className="px-4">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4 animate-bounce" aria-hidden>
              🛒
            </div>
            <p className="font-medium text-olive-800 mb-1">Generating your smart grocery list...</p>
            <p className="text-sm text-neutral-500">This takes about 10 seconds</p>
          </div>
        ) : error === 'no_meals' ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4" aria-hidden>
              🍽️
            </div>
            <p className="font-heading text-lg font-semibold text-olive-800 mb-2">
              Log some meals first!
            </p>
            <p className="text-neutral-600 text-sm mb-6">
              We need your meal data to generate a grocery list
            </p>
            <Link
              to="/dashboard"
              className="py-3 px-6 rounded-full btn-primary font-semibold text-sm"
            >
              Scan a Meal
            </Link>
          </div>
        ) : error === 'failed' ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <p className="font-medium text-olive-800 mb-2">
              Something went wrong. Please try again.
            </p>
            {errorDetail && (
              <p className="text-sm text-neutral-500 mb-4 max-w-xs">
                {errorDetail}
              </p>
            )}
            <button
              type="button"
              onClick={fetchGroceryList}
              className="py-3 px-6 rounded-full btn-primary font-semibold text-sm"
            >
              Retry
            </button>
          </div>
        ) : groceryData ? (
          <div className="space-y-4 pb-6">
            {/* Select All / Deselect All */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-2">
                <p className="text-sm text-neutral-600">
                  {checkedCount} of {totalItems} items selected
                </p>
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border-2 border-olive-500 text-olive-700 font-medium flex items-center justify-center gap-2 transition-colors hover:bg-olive-50 active:opacity-90"
                  aria-label={allSelected ? 'Deselect all items' : 'Select all items'}
                >
                  {allSelected ? (
                    <>
                      <CheckSquare className="w-5 h-5" aria-hidden />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="w-5 h-5" aria-hidden />
                      Select All
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Smart Tips Card */}
            {groceryData.smart_tips?.length > 0 && (
              <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💡</span>
                  <h2 className="font-heading font-semibold text-olive-800">Smart Tips</h2>
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
              const checkedCount = cat.items.filter((i) => checkedItems.includes(i.name)).length;
              const isExpanded = expandedCategories.includes(cat.category);
              return (
                <div
                  key={cat.category}
                  className="rounded-2xl shadow-sm overflow-hidden"
                  style={{ backgroundColor: '#FDFBF7' }}
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.category)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="font-heading font-semibold text-olive-800">
                        {cat.category}
                      </span>
                      {checkedCount > 0 && (
                        <span className="text-xs text-neutral-500">
                          ({checkedCount}/{cat.items.length} checked)
                        </span>
                      )}
                    </div>
                    <span className="text-neutral-400">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-beige-100 pt-3">
                      {cat.items.map((item) => {
                        const isChecked = checkedItems.includes(item.name);
                        return (
                          <label
                            key={item.name}
                            className="flex items-center gap-3 py-2 min-h-[48px] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleItem(item.name)}
                              className="w-5 h-5 rounded border-olive-300 text-olive-600 focus:ring-olive-400"
                            />
                            <span
                              className={`flex-1 text-sm ${
                                isChecked ? 'line-through text-neutral-400' : 'text-neutral-800'
                              }`}
                            >
                              {item.name}
                            </span>
                            <span className="text-xs text-neutral-500">{item.quantity}</span>
                          </label>
                        );
                      })}
                      {cat.items.length === 0 && (
                        <p className="text-sm text-neutral-400 italic py-2">— None this week —</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex-1 py-3.5 rounded-full font-semibold text-white"
                style={{ backgroundColor: '#25D366' }}
              >
                Share on WhatsApp
              </button>
              <button
                type="button"
                onClick={handleCopyList}
                className="flex-1 py-3.5 rounded-full font-semibold border-2 border-olive-500 text-olive-600 hover:bg-olive-50 transition-colors"
              >
                Copy List
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
