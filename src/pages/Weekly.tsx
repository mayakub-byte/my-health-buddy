// ============================================
// MY HEALTH BUDDY - Weekly Snapshot (Redesigned)
// Score circle, calorie trend bars, macro cards
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useFamily } from '../hooks/useFamily';
import PageHeader from '../components/PageHeader';
import ScoreCircle from '../components/ScoreCircle';
import {
  getTrafficLight,
  calculateFamilyScore,
  calculateAvgCalories,
  calculateMacroBreakdown,
  getDailyCalories,
  getTopDish,
} from '../utils/scoreCalculator';

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

const TARGET_MEALS_PER_WEEK = 21;

const RECIPE_SUGGESTIONS: Record<
  string,
  Array<{ name: string; telugu: string; emoji: string; why: string; prep: string }>
> = {
  protein: [
    { name: 'Pesarattu', telugu: 'పెసరట్టు', emoji: '🥞', why: 'Rich in protein from moong dal — perfect for breakfast', prep: '15 min' },
    { name: 'Egg Curry with Roti', telugu: 'ఎగ్ కర్రీ & రోటీ', emoji: '🥚', why: 'Quick protein boost the whole family loves', prep: '20 min' },
    { name: 'Chana Dal Paratha', telugu: 'శనగపప్పు పరాటా', emoji: '🫓', why: 'Protein-packed stuffed paratha — great for tiffin too', prep: '25 min' },
  ],
  high_carbs: [
    { name: 'Palak Dal', telugu: 'పాలకూర పప్పు', emoji: '🥬', why: 'Swap one rice meal with this dal-heavy dish for better balance', prep: '20 min' },
    { name: 'Ragi Mudde', telugu: 'రాగి ముద్ద', emoji: '🟤', why: 'Lower GI alternative to rice, rich in calcium', prep: '15 min' },
    { name: 'Jowar Roti & Curry', telugu: 'జొన్న రొట్టి & కూర', emoji: '🫓', why: 'Millet roti cuts carbs and adds fiber', prep: '20 min' },
  ],
  variety: [
    { name: 'Gongura Pachadi', telugu: 'గొంగూర పచ్చడి', emoji: '🌿', why: 'Iron-rich Telugu specialty — try it this week!', prep: '10 min' },
    { name: 'Gutti Vankaya Kura', telugu: 'గుత్తి వంకాయ కూర', emoji: '🍆', why: 'Classic Telugu stuffed brinjal, rich in fiber', prep: '30 min' },
    { name: 'Tomato Bath', telugu: 'టమాటో బాత్', emoji: '🍅', why: 'Quick tangy rice dish — easy variety for busy days', prep: '20 min' },
  ],
  low_variety: [
    { name: 'Pulihora', telugu: 'పులిహోర', emoji: '🍋', why: 'Tangy tamarind rice — quick change from daily routine', prep: '15 min' },
    { name: 'Pesarattu & Upma', telugu: 'పెసరట్టు & ఉప్మా', emoji: '🥞', why: 'Classic Andhra combo for a refreshing breakfast switch', prep: '20 min' },
    { name: 'Bisi Bele Bath', telugu: 'బిసి బేలే బాత్', emoji: '🍲', why: 'One-pot spiced rice with lentils — kids love it', prep: '25 min' },
  ],
  balanced: [],
};

function detectGaps(meals: MealRecord[] | null | undefined, carbsPct: number, proteinPct: number): string[] {
  const gaps: string[] = [];
  if (proteinPct < 20) gaps.push('protein');
  if (carbsPct > 60) gaps.push('high_carbs');
  if (!meals || meals.length < 14) gaps.push('variety');
  const mealCounts: Record<string, number> = {};
  meals?.forEach((m) => { mealCounts[m.food_name] = (mealCounts[m.food_name] || 0) + 1; });
  if (Object.values(mealCounts).some((c) => c > 4)) gaps.push('low_variety');
  if (gaps.length === 0) gaps.push('balanced');
  return gaps;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  useEffect(() => { loadWeeklyMeals(); }, [weekOffset]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadWeeklyMeals = async () => {
    setFetchError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) { setFetchError(userError.message); setAllMeals([]); return; }
      if (!user) { setAllMeals([]); return; }
      const { data, error } = await supabase
        .from('meal_history').select('*').eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString()).lt('created_at', weekEnd.toISOString())
        .order('created_at', { ascending: true });
      if (error) { setFetchError(error.message); setAllMeals([]); return; }
      setAllMeals((data as MealRecord[]) || []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load');
      setAllMeals([]);
    } finally { setLoading(false); }
  };

  const meals = selectedMemberFilter
    ? allMeals.filter((m) => m.family_member_id === selectedMemberFilter)
    : allMeals;

  // Group meals by day
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
  const familyScore = calculateFamilyScore(meals);
  const avgCalories = calculateAvgCalories(meals);
  const { carbsPct, proteinPct, fatPct } = calculateMacroBreakdown(meals);
  const topDish = getTopDish(meals);
  const dailyCals = getDailyCalories(meals, 7, weekStart);
  const maxDailyCal = Math.max(...dailyCals, 1);

  const greenCount = meals.filter((m) => getTrafficLight(m.health_score) === 'green').length;
  const yellowCount = meals.filter((m) => getTrafficLight(m.health_score) === 'yellow').length;
  const redCount = meals.filter((m) => getTrafficLight(m.health_score) === 'red').length;

  const mealsProgress = Math.min(100, (totalMeals / TARGET_MEALS_PER_WEEK) * 100);
  const gaps = detectGaps(meals, carbsPct, proteinPct);
  const suggestions = gaps.flatMap((gap) => RECIPE_SUGGESTIONS[gap] || []).slice(0, 3);

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto w-full" style={{ backgroundColor: '#f4f6f4' }}>
      <header className="px-4 pt-6 pb-2">
        <PageHeader title="This Week" subtitle="Weekly nutrition snapshot" />
      </header>

      {/* Per-member filter tabs */}
      {members.length > 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedMemberFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedMemberFilter === null ? 'text-white' : 'border border-brand-border text-brand-text'
            }`}
            style={selectedMemberFilter === null ? { backgroundColor: '#6ab08c' } : { backgroundColor: '#ffffff', border: '1px solid #e8e2d8' }}
          >
            All
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberFilter(m.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                selectedMemberFilter === m.id ? 'text-white' : 'text-brand-text'
              }`}
              style={selectedMemberFilter === m.id ? { backgroundColor: '#6ab08c' } : { backgroundColor: '#ffffff', border: '1px solid #e8e2d8' }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: m.avatar_color || '#6ab08c' }}
              >
                {m.name?.charAt(0)?.toUpperCase()}
              </span>
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Week Navigation */}
      <section className="px-4 py-3 flex items-center justify-between">
        <button
          type="button" onClick={() => setWeekOffset((o) => o - 1)}
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center hover:bg-brand-light border border-brand-border transition-colors"
          style={{ color: '#6ab08c' }}
          aria-label="Previous week"
        >←</button>
        <div className="text-center">
          <p className="font-serif font-semibold text-xl" style={{ color: '#143628' }}>This Week</p>
          <p className="text-xs mt-0.5" style={{ color: '#7a8c7e' }}>{weekRangeLabel}</p>
        </div>
        <button
          type="button" onClick={() => setWeekOffset((o) => o + 1)}
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center hover:bg-brand-light border border-brand-border transition-colors"
          style={{ color: '#6ab08c' }}
          aria-label="Next week"
        >→</button>
      </section>

      {loading ? (
        <main className="flex justify-center py-12">
          <span className="animate-bounce text-2xl">🍽️</span>
        </main>
      ) : fetchError ? (
        <main className="text-center py-12 px-4">
          <span className="text-3xl">😕</span>
          <p className="text-gray-600 mt-2">Something went wrong</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-3 px-4 py-2 text-white rounded-full text-sm" style={{ backgroundColor: '#6ab08c' }}>
            Try Again
          </button>
        </main>
      ) : totalMeals === 0 ? (
        <main className="px-4 py-8 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-4">🍽️</div>
          <p className="font-serif text-lg font-semibold mb-2" style={{ color: '#143628' }}>No meals tracked this week yet</p>
          <p className="text-sm mb-6" style={{ color: '#7a8c7e' }}>Start scanning to see your family&apos;s nutrition progress!</p>
          <button onClick={() => navigate('/dashboard')} className="w-full max-w-xs py-3.5 rounded-full font-semibold text-white" style={{ backgroundColor: '#6ab08c' }}>
            Scan Your First Meal
          </button>
        </main>
      ) : (
        <main className="px-4 py-4 space-y-5">
          {/* SECTION 1: Score Circle + Stats Row */}
          <section className="rounded-2xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
            <div className="flex items-center justify-center mb-4">
              <ScoreCircle
                score={familyScore}
                size={140}
                strokeWidth={12}
                label="Family Score"
                sublabel={`${totalMeals} of ${TARGET_MEALS_PER_WEEK} meals tracked`}
              />
            </div>

            {/* Traffic light summary */}
            <div className="flex justify-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-brand-text">{greenCount} green</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-xs text-brand-text">{yellowCount} yellow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-brand-text">{redCount} red</span>
              </div>
            </div>

            {/* Meals progress bar */}
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${mealsProgress}%`, backgroundColor: '#5C6B4A' }}
              />
            </div>
          </section>

          {/* SECTION 2: Calorie Trend Bars */}
          <section className="rounded-2xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
            <h2 className="font-serif font-semibold mb-3" style={{ color: '#143628' }}>Daily Calories</h2>
            <div className="flex items-end justify-between gap-1.5" style={{ height: 120 }}>
              {dailyCals.map((cal, i) => {
                const height = maxDailyCal > 0 ? Math.max(4, (cal / maxDailyCal) * 100) : 4;
                const isToday = i === new Date().getDay() && weekOffset === 0;
                return (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <span className="text-[10px] text-brand-text mb-1">
                      {cal > 0 ? cal : ''}
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${height}%`,
                        backgroundColor: isToday ? '#6ab08c' : '#a8c4a0',
                        opacity: cal > 0 ? 1 : 0.3,
                        minHeight: 4,
                      }}
                    />
                    <span className={`text-[10px] mt-1 ${isToday ? 'font-bold' : ''}`} style={{ color: '#7a8c7e' }}>
                      {DAY_LABELS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs mt-3" style={{ color: '#7a8c7e' }}>
              Avg: {avgCalories} cal/meal
            </p>
          </section>

          {/* SECTION 3: Macro Summary Cards */}
          <section className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#FEF3C7' }}>
              <p className="text-xs text-amber-700 font-medium">Carbs</p>
              <p className="text-xl font-bold text-amber-800">{carbsPct}%</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#D1FAE5' }}>
              <p className="text-xs text-emerald-700 font-medium">Protein</p>
              <p className="text-xl font-bold text-emerald-800">{proteinPct}%</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#FEE2E2' }}>
              <p className="text-xs text-rose-700 font-medium">Fat</p>
              <p className="text-xl font-bold text-rose-800">{fatPct}%</p>
            </div>
          </section>

          {/* SECTION 4: Quick Stats */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
              <p className="text-xs font-medium text-brand-text mb-1">Avg Calories</p>
              <p className="text-2xl font-bold" style={{ color: '#143628' }}>{avgCalories}</p>
              <p className="text-xs" style={{ color: '#7a8c7e' }}>cal/meal</p>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
              <p className="text-xs font-medium text-brand-text mb-1">Top Dish</p>
              <p className="text-sm font-semibold" style={{ color: '#143628' }}>
                {topDish ? `${topDish.name}` : '—'}
              </p>
              {topDish && (
                <p className="text-xs" style={{ color: '#7a8c7e' }}>{topDish.count} times</p>
              )}
            </div>
          </section>

          {/* SECTION 5: Daily Meal Grid */}
          <section className="rounded-2xl shadow-sm p-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
            <h2 className="font-serif font-semibold mb-3" style={{ color: '#143628' }}>Daily Meals</h2>
            <div className="space-y-3">
              {orderedDays.map((day) => {
                const dayMeals = mealsByDay[day] || [];
                return (
                  <div key={day} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: '#e8e4dc' }}>
                    <div className="w-14 flex-shrink-0">
                      <p className="text-sm font-semibold" style={{ color: '#143628' }}>{day}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {dayMeals.length === 0 ? (
                        <p className="text-sm text-neutral-400 italic">— No meals logged —</p>
                      ) : (
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          {dayMeals.map((meal) => {
                            const light = getTrafficLight(meal.health_score);
                            const dot = light === 'green' ? '🟢' : light === 'yellow' ? '🟡' : '🔴';
                            return (
                              <span key={meal.id} className="text-sm text-brand-dark">
                                {dot} {meal.food_name} ({meal.calories ?? 0} cal)
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

          {/* Recipe Suggestions */}
          {suggestions.length > 0 ? (
            <div className="mt-2">
              <h3 className="font-serif text-lg font-semibold mb-3" style={{ color: '#143628' }}>Try This Week</h3>
              <p className="text-xs mb-3" style={{ color: '#7a8c7e' }}>Based on your family&apos;s nutrition this week</p>
              <div className="space-y-3">
                {suggestions.map((recipe, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-[#e8e2d8]" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{recipe.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold" style={{ color: '#143628' }}>{recipe.name}</p>
                        <p className="text-xs mb-1" style={{ color: '#7a8c7e' }}>{recipe.telugu} • ⏱️ {recipe.prep}</p>
                        <p className="text-sm" style={{ color: '#6ab08c' }}>{recipe.why}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : gaps.includes('balanced') && meals.length > 0 ? (
            <div className="mt-2 p-4 bg-emerald-50 rounded-2xl text-center">
              <span className="text-3xl">🎉</span>
              <p className="font-serif mt-2 font-semibold" style={{ color: '#6ab08c' }}>Great balance this week!</p>
              <p className="text-sm text-gray-600 mt-1">Your family&apos;s nutrition is well-rounded — keep it up!</p>
            </div>
          ) : null}

          {/* Action Buttons */}
          <section className="flex flex-col gap-3">
            <button type="button" onClick={() => navigate('/monthly')} className="w-full py-3.5 rounded-full font-semibold border-2 transition-colors hover:bg-brand-light" style={{ borderColor: '#6ab08c', color: '#6ab08c' }}>
              View Monthly Overview
            </button>
            <button type="button" onClick={() => navigate('/grocery')} className="w-full py-3.5 rounded-full font-semibold text-white" style={{ backgroundColor: '#6ab08c' }}>
              Generate Grocery List
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} className="w-full py-3.5 rounded-full font-semibold border-2 transition-colors hover:bg-brand-light" style={{ borderColor: '#6ab08c', color: '#6ab08c' }}>
              Scan a Meal
            </button>
          </section>
        </main>
      )}

      {toast && (
        <div className="fixed bottom-24 left-4 right-4 mx-auto max-w-sm bg-neutral-800 text-white text-sm font-medium py-3 px-4 rounded-xl text-center shadow-lg z-50" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
