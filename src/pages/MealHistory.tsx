// ============================================
// MY HEALTH BUDDY - Meal History
// Past meal scans from meal_history
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader';
import { useFamily } from '../hooks/useFamily';
import { getHistoryHeader, getEmptyStateMessage, buildCopyContext } from '../utils/personalizedCopy';

export type HistoryFilter = 'all' | 'today' | 'week' | 'month';

export interface MealHistoryRecord {
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
  /** Optional: stored analysis JSON with meal_name, traffic_light */
  analysis_result?: { meal_name?: string; traffic_light?: 'green' | 'yellow' | 'red' } | null;
}

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

function getScoreColor(score: number): string {
  if (score < 40) return 'red';
  if (score < 70) return 'orange';
  return 'green';
}

function filterMeals(meals: MealHistoryRecord[], filter: HistoryFilter): MealHistoryRecord[] {
  if (filter === 'all') return meals;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  return meals.filter((m) => {
    const t = new Date(m.created_at).getTime();
    if (filter === 'today') return t >= todayStart;
    if (filter === 'week') return t >= weekStart;
    if (filter === 'month') return t >= monthStart;
    return true;
  });
}

function inferMealTime(createdAt: string): 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner' {
  const hour = new Date(createdAt).getHours();
  if (hour < 11) return 'Breakfast';
  if (hour < 15) return 'Lunch';
  if (hour < 18) return 'Snack';
  return 'Dinner';
}

const GRID_MEAL_TIMES = ['Breakfast', 'Lunch', 'Dinner'] as const;

function getWeekDays(offset = 0): { date: Date; label: string }[] {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      date: d,
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
    };
  });
}

function getMonthDays(offset = 0): { date: Date; label: string }[] {
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const days: { date: Date; label: string }[] = [];
  const targetMonth = d.getMonth();
  while (d.getMonth() === targetMonth) {
    days.push({
      date: new Date(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
    });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export default function MealHistory() {
  const { members } = useFamily();
  const [meals, setMeals] = useState<MealHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setFetchError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('MealHistory getUser failed:', userError.message);
        setFetchError(userError.message);
        setMeals([]);
        return;
      }
      if (!user) {
        setMeals([]);
        return;
      }
      const { data, error } = await supabase
        .from('meal_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Meal history query failed:', error.message);
        setFetchError(error.message);
        setMeals([]);
        return;
      }
      setMeals((data as MealHistoryRecord[]) || []);
    } catch (err) {
      console.error('Error loading meal history:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to load history');
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const memberFilteredMeals = selectedMemberFilter
    ? meals.filter((m) => m.family_member_id === selectedMemberFilter)
    : meals;
  const filteredMeals = filterMeals(memberFilteredMeals, filter);

  const getMealDisplayName = (meal: MealHistoryRecord) =>
    meal.analysis_result?.meal_name ?? meal.food_name;
  const getMealTrafficLight = (meal: MealHistoryRecord): 'green' | 'yellow' | 'red' => {
    const t = meal.analysis_result?.traffic_light;
    if (t) return t;
    const score = meal.health_score ?? 0;
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  const getMealForDayAndTime = (
    date: Date,
    mealTime: (typeof GRID_MEAL_TIMES)[number],
    mealsList: MealHistoryRecord[]
  ): MealHistoryRecord | undefined => {
    const dateStr = date.toDateString();
    const matches = (t: string) =>
      mealTime === 'Lunch' ? t === 'Lunch' || t === 'Snack' : t === mealTime;
    const candidates = mealsList.filter((m) => {
      const mealDate = new Date(m.created_at).toDateString();
      const inferredTime = inferMealTime(m.created_at);
      return mealDate === dateStr && matches(inferredTime);
    });
    return candidates.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  };

  const showGrid = viewMode === 'grid' && (filter === 'week' || filter === 'month');
  const daysToShow =
    filter === 'week'
      ? getWeekDays(weekOffset)
      : filter === 'month'
        ? getMonthDays(monthOffset)
        : [];
  const gridMeals =
    filter === 'week'
      ? memberFilteredMeals.filter((m) => {
          const d = new Date(m.created_at);
          const days = getWeekDays(weekOffset);
          const first = days[0]?.date;
          const last = days[6]?.date;
          if (!first || !last) return false;
          const dayStart = new Date(first).setHours(0, 0, 0, 0);
          const dayEnd = new Date(last).setHours(23, 59, 59, 999);
          const t = d.getTime();
          return t >= dayStart && t <= dayEnd;
        })
      : filter === 'month'
        ? memberFilteredMeals.filter((m) => {
            const d = new Date(m.created_at);
            const days = getMonthDays(monthOffset);
            const first = days[0]?.date;
            const last = days[days.length - 1]?.date;
            if (!first || !last) return false;
            const dayStart = new Date(first).setHours(0, 0, 0, 0);
            const dayEnd = new Date(last).setHours(23, 59, 59, 999);
            const t = d.getTime();
            return t >= dayStart && t <= dayEnd;
          })
        : [];

  const memberName = (id: string | null) =>
    id ? members.find((m) => m.id === id)?.name ?? '—' : '—';

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    return isToday
      ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
      : d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
  };

  const weekDaysForLabel = getWeekDays(weekOffset);
  const weekRangeLabel =
    weekDaysForLabel.length >= 7
      ? `${weekDaysForLabel[0].date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${weekDaysForLabel[6].date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
      : '';

  // Personalized header
  const primaryName = members[0]?.name?.split(' ')[0] || 'there';
  const thisWeekMeals = meals.filter((m) => {
    const t = new Date(m.created_at).getTime();
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 7 * 24 * 60 * 60 * 1000;
    return t >= weekStart;
  });
  const historySubtitle = useMemo(() => {
    const ctx = buildCopyContext(
      primaryName,
      members.map((m) => ({ name: m.name, id: m.id })),
      0,
      { weeklyMealsCount: thisWeekMeals.length },
    );
    return getHistoryHeader(ctx);
  }, [primaryName, members.length, thisWeekMeals.length]);

  const emptyMessage = useMemo(() => {
    const ctx = buildCopyContext(
      primaryName,
      members.map((m) => ({ name: m.name, id: m.id })),
      0,
    );
    return getEmptyStateMessage(ctx);
  }, [primaryName, members.length]);

  return (
    <div className="min-h-screen bg-brand-light flex flex-col pb-24 max-w-md mx-auto w-full">
      <header className="px-5 pt-6 pb-4">
        <PageHeader title="Meal History" subtitle={historySubtitle} />
      </header>

      {/* Per-member filter tabs */}
      {members.length > 0 && (
        <div className="px-5 py-2 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedMemberFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedMemberFilter === null
                ? 'bg-brand-light0 text-white'
                : 'bg-brand-light border border-brand-border text-brand-text'
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
                  ? 'bg-brand-light0 text-white'
                  : 'bg-brand-light border border-brand-border text-brand-text'
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

      {/* Week / Month navigation (shown when Week or Month filter + grid) */}
      {(filter === 'week' || filter === 'month') && (
        <div className="px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              filter === 'week' ? setWeekOffset((o) => o - 1) : setMonthOffset((o) => o - 1)
            }
            className="p-2 rounded-full text-brand-text hover:bg-brand-light"
            aria-label={filter === 'week' ? 'Previous week' : 'Previous month'}
          >
            <span aria-hidden>&lt;</span>
          </button>
          <span className="text-sm font-medium text-brand-dark">
            {filter === 'week'
              ? weekRangeLabel
              : (() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + monthOffset);
                  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                })()}
          </span>
          <button
            type="button"
            onClick={() =>
              filter === 'week' ? setWeekOffset((o) => o + 1) : setMonthOffset((o) => o + 1)
            }
            className="p-2 rounded-full text-brand-text hover:bg-brand-light"
            aria-label={filter === 'week' ? 'Next week' : 'Next month'}
          >
            <span aria-hidden>&gt;</span>
          </button>
        </div>
      )}

      <div className="px-5 py-2 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-brand-light0 text-white'
                : 'bg-brand-light border border-brand-border text-brand-text hover:border-brand-green'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* View toggle: List / Calendar - only when Week or Month filter */}
      {(filter === 'week' || filter === 'month') && (
        <div className="px-5 mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex-1 py-1.5 text-xs rounded-md transition ${
                viewMode === 'list' ? 'bg-[#ffffff] shadow-sm font-medium' : 'text-gray-500'
              }`}
              aria-label="List view"
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex-1 py-1.5 text-xs rounded-md transition ${
                viewMode === 'grid' ? 'bg-[#ffffff] shadow-sm font-medium' : 'text-gray-500'
              }`}
              aria-label="Calendar view"
            >
              Calendar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 px-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="animate-bounce text-2xl" aria-hidden>🍽️</span>
          </div>
        ) : fetchError ? (
          <div className="text-center py-12">
            <span className="text-3xl" aria-hidden>😕</span>
            <p className="text-gray-600 mt-2">Something went wrong</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-[#6ab08c] text-white rounded-full text-sm"
            >
              Try Again
            </button>
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-3xl" aria-hidden>🍽️</span>
            <p className="text-gray-600 mt-2">{emptyMessage}</p>
            <Link
              to="/dashboard"
              className="mt-3 inline-block px-4 py-2 bg-[#6ab08c] text-white rounded-full text-sm"
            >
              Scan a meal
            </Link>
          </div>
        ) : showGrid ? (
          <div className="overflow-x-auto -mx-4 px-4 pb-4">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-[#6ab08c] text-white text-xs">
                  <th className="py-2 px-2 text-left rounded-tl-lg sticky left-0 bg-[#6ab08c] min-w-[100px] z-10">
                    Day
                  </th>
                  <th className="py-2 px-2 text-left min-w-[100px]">Breakfast</th>
                  <th className="py-2 px-2 text-left min-w-[100px]">Lunch</th>
                  <th className="py-2 px-2 text-left rounded-tr-lg min-w-[100px]">Dinner</th>
                </tr>
              </thead>
              <tbody>
                {daysToShow.map((day) => (
                  <tr key={day.date.toISOString()} className="border-b border-gray-100">
                    <td className="py-2 px-2 text-xs font-semibold text-gray-700 sticky left-0 bg-[#f4f6f4] min-w-[100px] z-10">
                      {day.label}
                    </td>
                    {GRID_MEAL_TIMES.map((mealTime) => {
                      const meal = getMealForDayAndTime(day.date, mealTime, gridMeals);
                      return (
                        <td key={mealTime} className="py-2 px-2 text-xs min-w-[100px]">
                          {meal ? (
                            <Link
                              to="/results/analysis"
                              state={{
                                fromHistory: true,
                                id: meal.id,
                                food_name: meal.food_name,
                                image_url: meal.image_url,
                                calories: meal.calories ?? 0,
                                macros: meal.macros ?? { carbs: 0, protein: 0, fat: 0 },
                                health_score: meal.health_score ?? 0,
                                guidance: meal.guidance ?? '',
                                selectedMemberId: meal.family_member_id,
                                created_at: meal.created_at,
                              }}
                              className="flex items-center gap-1 w-full text-left hover:opacity-80 active:opacity-90 block"
                            >
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  getMealTrafficLight(meal) === 'green'
                                    ? 'bg-emerald-500'
                                    : getMealTrafficLight(meal) === 'yellow'
                                      ? 'bg-amber-400'
                                      : 'bg-red-500'
                                }`}
                              />
                              <span className="truncate max-w-[80px]">{getMealDisplayName(meal)}</span>
                            </Link>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="space-y-3 pb-4">
            {filteredMeals.map((meal) => {
              const score = meal.health_score ?? 0;
              const color = getScoreColor(score);
              const resultState = {
                fromHistory: true as const,
                id: meal.id,
                food_name: meal.food_name,
                image_url: meal.image_url,
                calories: meal.calories ?? 0,
                macros: meal.macros ?? { carbs: 0, protein: 0, fat: 0 },
                health_score: meal.health_score ?? 0,
                guidance: meal.guidance ?? '',
                selectedMemberId: meal.family_member_id,
                created_at: meal.created_at,
              };
              return (
                <li key={meal.id}>
                  <Link
                    to="/results/analysis"
                    state={resultState}
                    className="w-full card p-4 flex items-center gap-4 text-left hover:shadow-card-hover transition-shadow active:opacity-90 block"
                  >
                    <div className="w-14 h-14 rounded-xl bg-brand-light overflow-hidden flex-shrink-0">
                      {meal.image_url ? (
                        <img src={meal.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-neutral-400">🍽️</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-dark truncate">{meal.food_name}</p>
                      <p className="text-xs text-brand-text mt-0.5">{formatDateTime(meal.created_at)}</p>
                      <p className="text-sm text-brand-text mt-1">
                        {meal.calories ?? '—'} kcal <span className="text-neutral-400 mx-1">·</span> {memberName(meal.family_member_id)}
                      </p>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        color === 'red' ? 'bg-red-100 text-red-700' : color === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-brand-gray text-brand-dark'
                      }`}
                    >
                      {score}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
