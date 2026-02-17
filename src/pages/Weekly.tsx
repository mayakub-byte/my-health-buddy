// ============================================
// MY HEALTH BUDDY - Weekly Snapshot
// Real data from meal_history with analytics
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useFamily } from '../hooks/useFamily';
import PageHeader from '../components/PageHeader';

interface MealRecord {
  id: string;
  user_id: string;
  family_member_id: string | null;
  food_name: string;
  image_url: string | null;
  calories: number | null;
  macros: { carbs?: number; protein?: number; fat?: number } | null;
  health_score: number | null;
  guidance: string | null;
  portion_size: string | null;
  created_at: string;
}

// Derive traffic_light from health_score (API may not store it yet)
function getTrafficLight(score: number | null): 'green' | 'yellow' | 'red' {
  if (score == null) return 'yellow';
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

const TARGET_MEALS_PER_WEEK = 21; // 3 meals × 7 days

const RECIPE_SUGGESTIONS: Record<
  string,
  Array<{ name: string; telugu: string; emoji: string; why: string; prep: string }>
> = {
  protein: [
    {
      name: 'Pesarattu',
      telugu: 'పెసరట్టు',
      emoji: '🥞',
      why: 'Rich in protein from moong dal — perfect for breakfast',
      prep: '15 min',
    },
    {
      name: 'Egg Curry with Roti',
      telugu: 'ఎగ్ కర్రీ & రోటీ',
      emoji: '🥚',
      why: 'Quick protein boost the whole family loves',
      prep: '20 min',
    },
    {
      name: 'Chana Dal Paratha',
      telugu: 'శనగపప్పు పరాటా',
      emoji: '🫓',
      why: 'Protein-packed stuffed paratha — great for tiffin too',
      prep: '25 min',
    },
  ],
  high_carbs: [
    {
      name: 'Palak Dal',
      telugu: 'పాలకూర పప్పు',
      emoji: '🥬',
      why: 'Swap one rice meal with this dal-heavy dish for better balance',
      prep: '20 min',
    },
    {
      name: 'Ragi Mudde',
      telugu: 'రాగి ముద్ద',
      emoji: '🟤',
      why: 'Lower GI alternative to rice, rich in calcium',
      prep: '15 min',
    },
    {
      name: 'Jowar Roti & Curry',
      telugu: 'జొన్న రొట్టి & కూర',
      emoji: '🫓',
      why: 'Millet roti cuts carbs and adds fiber',
      prep: '20 min',
    },
  ],
  variety: [
    {
      name: 'Gongura Pachadi',
      telugu: 'గొంగూర పచ్చడి',
      emoji: '🌿',
      why: 'Iron-rich Telugu specialty — try it this week!',
      prep: '10 min',
    },
    {
      name: 'Gutti Vankaya Kura',
      telugu: 'గుత్తి వంకాయ కూర',
      emoji: '🍆',
      why: 'Classic Telugu stuffed brinjal, rich in fiber',
      prep: '30 min',
    },
    {
      name: 'Tomato Bath',
      telugu: 'టమాటో బాత్',
      emoji: '🍅',
      why: 'Quick tangy rice dish — easy variety for busy days',
      prep: '20 min',
    },
  ],
  low_variety: [
    {
      name: 'Pulihora',
      telugu: 'పులిహోర',
      emoji: '🍋',
      why: 'Tangy tamarind rice — quick change from daily routine',
      prep: '15 min',
    },
    {
      name: 'Pesarattu & Upma',
      telugu: 'పెసరట్టు & ఉప్మా',
      emoji: '🥞',
      why: 'Classic Andhra combo for a refreshing breakfast switch',
      prep: '20 min',
    },
    {
      name: 'Bisi Bele Bath',
      telugu: 'బిసి బేలే బాత్',
      emoji: '🍲',
      why: 'One-pot spiced rice with lentils — kids love it',
      prep: '25 min',
    },
  ],
  balanced: [],
};

function detectGaps(
  meals: MealRecord[] | null | undefined,
  carbsPct: number,
  proteinPct: number
): string[] {
  const gaps: string[] = [];
  if (proteinPct < 20) gaps.push('protein');
  if (carbsPct > 60) gaps.push('high_carbs');
  if (!meals || meals.length < 14) gaps.push('variety');
  const mealCounts: Record<string, number> = {};
  meals?.forEach((m) => {
    const name = m.food_name ?? '';
    mealCounts[name] = (mealCounts[name] || 0) + 1;
  });
  if (Object.values(mealCounts).some((c) => c > 4)) gaps.push('low_variety');
  if (gaps.length === 0) gaps.push('balanced');
  return gaps;
}

export default function Weekly() {
  const navigate = useNavigate();
  const { members } = useFamily();
  const [allMeals, setAllMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekRangeLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  useEffect(() => {
    loadWeeklyMeals();
  }, [weekOffset]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadWeeklyMeals = async () => {
    setFetchError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Weekly getUser failed:', userError.message);
        setFetchError(userError.message);
        setAllMeals([]);
        return;
      }
      if (!user) {
        setAllMeals([]);
        return;
      }

      const { data, error } = await supabase
        .from('meal_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lt('created_at', weekEnd.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Weekly meal_history query failed:', error.message);
        setFetchError(error.message);
        setAllMeals([]);
        return;
      }
      setAllMeals((data as MealRecord[]) || []);
    } catch (err) {
      console.error('Error loading weekly meals:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to load');
      setAllMeals([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter meals by selected member
  const meals = selectedMemberFilter
    ? allMeals.filter((m) => m.family_member_id === selectedMemberFilter)
    : allMeals;

  // Group meals by day and order Sun–Sat
  const mealsByDay: Record<string, MealRecord[]> = {};
  const orderedDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dayKey = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    mealsByDay[dayKey] = [];
    orderedDays.push(dayKey);
  }
  meals.forEach((meal) => {
    const day = new Date(meal.created_at).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    if (!mealsByDay[day]) mealsByDay[day] = [];
    mealsByDay[day].push(meal);
  });

  // Analytics
  const totalMeals = meals.length;
  const greenCount = meals.filter((m) => getTrafficLight(m.health_score) === 'green').length;
  const yellowCount = meals.filter((m) => getTrafficLight(m.health_score) === 'yellow').length;
  const redCount = meals.filter((m) => getTrafficLight(m.health_score) === 'red').length;

  const familyScore = totalMeals > 0
    ? Math.round(((greenCount * 10 + yellowCount * 6 + redCount * 2) / (totalMeals * 10)) * 100)
    : 0;

  const avgCalories = totalMeals > 0
    ? Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0) / totalMeals)
    : 0;

  const dishCounts: Record<string, number> = {};
  meals.forEach((m) => {
    dishCounts[m.food_name] = (dishCounts[m.food_name] || 0) + 1;
  });
  const topDish = Object.entries(dishCounts).sort((a, b) => b[1] - a[1])[0];

  const totalMacros = meals.reduce(
    (acc, m) => {
      const macros = m.macros || {};
      return {
        carbs: acc.carbs + (macros.carbs || 0),
        protein: acc.protein + (macros.protein || 0),
        fat: acc.fat + (macros.fat || 0),
      };
    },
    { carbs: 0, protein: 0, fat: 0 }
  );

  const avgMacros = totalMeals > 0
    ? {
        carbs: totalMacros.carbs / totalMeals,
        protein: totalMacros.protein / totalMeals,
        fat: totalMacros.fat / totalMeals,
      }
    : { carbs: 0, protein: 0, fat: 0 };

  const totalGrams = avgMacros.carbs + avgMacros.protein + avgMacros.fat;
  const carbsPct = totalGrams > 0 ? Math.round((avgMacros.carbs / totalGrams) * 100) : 33;
  const proteinPct = totalGrams > 0 ? Math.round((avgMacros.protein / totalGrams) * 100) : 33;
  const fatPct = Math.max(0, 100 - carbsPct - proteinPct);

  const scoreColor = familyScore >= 70 ? 'emerald' : familyScore >= 40 ? 'amber' : 'red';
  const mealsProgress = Math.min(100, (totalMeals / TARGET_MEALS_PER_WEEK) * 100);

  const gaps = detectGaps(meals, carbsPct, proteinPct);
  const suggestions = gaps
    .flatMap((gap) => RECIPE_SUGGESTIONS[gap] || [])
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-beige pb-24 max-w-md mx-auto w-full">
      <header className="px-4 pt-6 pb-2">
        <PageHeader title="This Week" subtitle="Weekly nutrition snapshot" />
      </header>

      {/* Per-member filter tabs */}
      {members.length > 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedMemberFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedMemberFilter === null
                ? 'bg-olive-500 text-white'
                : 'bg-beige-50 border border-beige-300 text-neutral-600'
            }`}
          >
            All
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberFilter(m.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                selectedMemberFilter === m.id
                  ? 'bg-olive-500 text-white'
                  : 'bg-beige-50 border border-beige-300 text-neutral-600'
              }`}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: m.avatar_color || '#5C6B4A' }}
              >
                {m.name?.charAt(0)?.toUpperCase()}
              </span>
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* SECTION 1: Week Navigation */}
      <section className="px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center text-olive-600 hover:bg-olive-50 border border-beige-300 transition-colors"
          aria-label="Previous week"
        >
          <span aria-hidden>←</span>
        </button>
        <div className="text-center">
          <p className="font-serif font-semibold text-olive-800 text-xl">This Week</p>
          <p className="text-neutral-600 text-xs mt-0.5">{weekRangeLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center text-olive-600 hover:bg-olive-50 border border-beige-300 transition-colors"
          aria-label="Next week"
        >
          <span aria-hidden>→</span>
        </button>
      </section>

      {loading ? (
        <main className="flex justify-center py-12">
          <span className="animate-bounce text-2xl" aria-hidden>🍽️</span>
        </main>
      ) : fetchError ? (
        <main className="text-center py-12 px-4">
          <span className="text-3xl" aria-hidden>😕</span>
          <p className="text-gray-600 mt-2">Something went wrong</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-[#5C6B4A] text-white rounded-full text-sm"
          >
            Try Again
          </button>
        </main>
      ) : totalMeals === 0 ? (
        /* Empty state */
        <main className="px-4 py-8 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-4" aria-hidden>🍽️</div>
          <p className="font-heading text-lg font-semibold text-olive-800 mb-2">No meals tracked this week yet</p>
          <p className="text-neutral-600 text-sm mb-6">Start scanning to see your family&apos;s nutrition progress!</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full max-w-xs py-3.5 rounded-full btn-primary font-semibold"
          >
            Scan Your First Meal
          </button>
        </main>
      ) : (
        <main className="px-4 py-4 space-y-6">
          {/* SECTION 2: Daily Meal Grid */}
          <section className="card rounded-2xl shadow-sm p-4 bg-beige-50">
            <h2 className="font-heading font-semibold text-olive-800 mb-3">Daily Meals</h2>
            <div className="space-y-3">
              {orderedDays.map((day) => {
                const dayMeals = mealsByDay[day] || [];
                return (
                  <div key={day} className="flex items-start gap-3 py-2 border-b border-beige-200 last:border-0">
                    <div className="w-14 flex-shrink-0">
                      <p className="text-sm font-semibold text-olive-800">{day}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {dayMeals.length === 0 ? (
                        <p className="text-sm text-neutral-400 italic">— No meals logged —</p>
                      ) : (
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          {dayMeals.map((meal) => {
                            const light = getTrafficLight(meal.health_score);
                            const dot = light === 'green' ? '🟢' : light === 'yellow' ? '🟡' : '🔴';
                            const cals = meal.calories ?? 0;
                            return (
                              <span key={meal.id} className="text-sm text-neutral-700">
                                {dot} {meal.food_name} ({cals} cal)
                                {dayMeals.indexOf(meal) < dayMeals.length - 1 ? ' • ' : ''}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 3: Weekly Analytics Cards */}
          <section className="grid grid-cols-2 gap-3">
            <div className="card rounded-2xl shadow-sm p-4 bg-beige-50">
              <p className="text-xs font-medium text-neutral-500 mb-1">Family Score</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white ${
                    scoreColor === 'emerald' ? 'bg-emerald-500' : scoreColor === 'amber' ? 'bg-amber-400' : 'bg-red-500'
                  }`}
                >
                  {familyScore}
                </div>
                <span className="text-2xl font-bold text-olive-800">{familyScore}%</span>
              </div>
            </div>
            <div className="card rounded-2xl shadow-sm p-4 bg-beige-50">
              <p className="text-xs font-medium text-neutral-500 mb-1">Meals Tracked</p>
              <p className="text-2xl font-bold text-olive-800">
                {totalMeals} of {TARGET_MEALS_PER_WEEK}
              </p>
              <div className="mt-2 h-1.5 bg-beige-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-olive-500 rounded-full transition-all"
                  style={{ width: `${mealsProgress}%` }}
                />
              </div>
            </div>
            <div className="card rounded-2xl shadow-sm p-4 bg-beige-50">
              <p className="text-xs font-medium text-neutral-500 mb-1">Avg Calories</p>
              <p className="text-2xl font-bold text-olive-800">{avgCalories} cal/meal</p>
            </div>
            <div className="card rounded-2xl shadow-sm p-4 bg-beige-50">
              <p className="text-xs font-medium text-neutral-500 mb-1">Top Dish</p>
              <p className="text-sm font-semibold text-olive-800">
                {topDish ? `${topDish[0]} — ${topDish[1]}×` : '—'}
              </p>
            </div>
          </section>

          {/* SECTION 4: Macro Breakdown */}
          <section className="card rounded-2xl shadow-sm p-4 bg-beige-50">
            <h2 className="font-heading font-semibold text-olive-800 mb-3">Avg Macro Breakdown</h2>
            <div className="space-y-2">
              <div className="flex h-6 rounded-full overflow-hidden bg-beige-200">
                <div style={{ width: `${carbsPct}%` }} className="bg-amber-400" />
                <div style={{ width: `${proteinPct}%` }} className="bg-emerald-500" />
                <div style={{ width: `${fatPct}%` }} className="bg-rose-400" />
              </div>
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Carbs {carbsPct}%</span>
                <span>Protein {proteinPct}%</span>
                <span>Fat {fatPct}%</span>
              </div>
            </div>
          </section>

          {/* Recipe Suggestions - only when meal data exists */}
          {suggestions.length > 0 ? (
            <div className="mt-6">
              <h3 className="font-serif text-lg font-semibold text-gray-800 mb-3">
                Try This Week
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Based on your family&apos;s nutrition this week
              </p>
              <div className="space-y-3">
                {suggestions.map((recipe, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border border-gray-100"
                    style={{ backgroundColor: '#FDFBF7' }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{recipe.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{recipe.name}</p>
                        <p className="text-xs text-gray-500 mb-1">
                          {recipe.telugu} • ⏱️ {recipe.prep}
                        </p>
                        <p className="text-sm text-[#5C6B4A]">{recipe.why}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : gaps.includes('balanced') && meals.length > 0 ? (
            <div className="mt-6 p-4 bg-emerald-50 rounded-2xl text-center">
              <span className="text-3xl">🎉</span>
              <p className="font-serif text-[#5C6B4A] mt-2 font-semibold">Great balance this week!</p>
              <p className="text-sm text-gray-600 mt-1">
                Your family&apos;s nutrition is well-rounded — keep it up!
              </p>
            </div>
          ) : null}

          {/* SECTION 5: Action Buttons */}
          <section className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate('/grocery')}
              className="w-full py-3.5 rounded-full btn-primary font-semibold"
            >
              Generate Grocery List
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full py-3.5 rounded-full border-2 border-olive-500 text-olive-600 font-semibold hover:bg-olive-50 transition-colors"
            >
              Scan a Meal
            </button>
          </section>
        </main>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 mx-auto max-w-sm bg-neutral-800 text-white text-sm font-medium py-3 px-4 rounded-xl text-center shadow-lg z-50"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
