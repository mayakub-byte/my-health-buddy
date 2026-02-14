// ============================================
// MY HEALTH BUDDY - Meal History
// Past meal scans from meal_history
// ============================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useFamily } from '../hooks/useFamily';

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
  const navigate = useNavigate();
  const { members } = useFamily();
  const [meals, setMeals] = useState<MealHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMeals([]);
        return;
      }
      const { data, error } = await supabase
        .from('meal_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeals((data as MealHistoryRecord[]) || []);
    } catch (err) {
      console.error('Error loading meal history:', err);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeals = filterMeals(meals, filter);

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
      ? meals.filter((m) => {
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
        ? meals.filter((m) => {
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

  const handleCardClick = (meal: MealHistoryRecord) => {
    navigate('/results/analysis', {
      state: {
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
      },
    });
  };

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

  return (
    <div className="min-h-screen bg-beige flex flex-col pb-24 max-w-md mx-auto w-full">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link
          to="/dashboard"
          className="flex items-center justify-center w-10 h-10 rounded-full border border-beige-300 text-neutral-600 hover:bg-beige-100 shadow-card"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-heading text-lg font-bold text-olive-800">Meal History</h1>
      </header>

      {/* Week / Month navigation (shown when Week or Month filter + grid) */}
      {(filter === 'week' || filter === 'month') && (
        <div className="px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              filter === 'week' ? setWeekOffset((o) => o - 1) : setMonthOffset((o) => o - 1)
            }
            className="p-2 rounded-full text-olive-600 hover:bg-olive-50"
            aria-label={filter === 'week' ? 'Previous week' : 'Previous month'}
          >
            &lt;
          </button>
          <span className="text-sm font-medium text-neutral-700">
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
            className="p-2 rounded-full text-olive-600 hover:bg-olive-50"
            aria-label={filter === 'week' ? 'Next week' : 'Next month'}
          >
            &gt;
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
                ? 'bg-olive-500 text-white'
                : 'bg-beige-50 border border-beige-300 text-neutral-600 hover:border-olive-400'
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
                viewMode === 'list' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex-1 py-1.5 text-xs rounded-md transition ${
                viewMode === 'grid' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 px-5">
        {loading ? (
          <div className="py-12 flex flex-col items-center">
            <div className="w-10 h-10 border-2 border-olive-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-500 text-sm mt-3">Loading…</p>
          </div>
        ) : showGrid ? (
          <div className="overflow-x-auto -mx-4 px-4 pb-4">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-[#5C6B4A] text-white text-xs">
                  <th className="py-2 px-2 text-left rounded-tl-lg sticky left-0 bg-[#5C6B4A] min-w-[100px] z-10">
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
                    <td className="py-2 px-2 text-xs font-semibold text-gray-700 sticky left-0 bg-[#F4F1EA] min-w-[100px] z-10">
                      {day.label}
                    </td>
                    {GRID_MEAL_TIMES.map((mealTime) => {
                      const meal = getMealForDayAndTime(day.date, mealTime, gridMeals);
                      return (
                        <td key={mealTime} className="py-2 px-2 text-xs min-w-[100px]">
                          {meal ? (
                            <button
                              type="button"
                              onClick={() => handleCardClick(meal)}
                              className="flex items-center gap-1 w-full text-left hover:opacity-80"
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
                            </button>
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
        ) : filteredMeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 rounded-full bg-beige-200 flex items-center justify-center text-4xl mb-4">🍽️</div>
            <p className="text-neutral-600 font-medium mb-4">No meals scanned yet — start your first scan!</p>
            <Link to="/dashboard" className="py-2.5 px-4 rounded-full btn-primary font-semibold text-sm">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <ul className="space-y-3 pb-4">
            {filteredMeals.map((meal) => {
              const score = meal.health_score ?? 0;
              const color = getScoreColor(score);
              return (
                <li key={meal.id}>
                  <button
                    type="button"
                    onClick={() => handleCardClick(meal)}
                    className="w-full card p-4 flex items-center gap-4 text-left hover:shadow-card-hover transition-shadow"
                  >
                    <div className="w-14 h-14 rounded-xl bg-beige-100 overflow-hidden flex-shrink-0">
                      {meal.image_url ? (
                        <img src={meal.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-neutral-400">🍽️</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-olive-800 truncate">{meal.food_name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{formatDateTime(meal.created_at)}</p>
                      <p className="text-sm text-neutral-600 mt-1">
                        {meal.calories ?? '—'} kcal <span className="text-neutral-400 mx-1">·</span> {memberName(meal.family_member_id)}
                      </p>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        color === 'red' ? 'bg-red-100 text-red-700' : color === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-olive-100 text-olive-700'
                      }`}
                    >
                      {score}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
