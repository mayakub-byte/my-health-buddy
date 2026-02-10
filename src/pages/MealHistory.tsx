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

export default function MealHistory() {
  const navigate = useNavigate();
  const { members } = useFamily();
  const [meals, setMeals] = useState<MealHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [weekOffset, setWeekOffset] = useState(0);

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

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekRangeLabel = `${weekStart.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}`;

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

      {/* Week navigation */}
      <div className="px-5 py-3 flex items-center justify-between">
        <button type="button" onClick={() => setWeekOffset((o) => o - 1)} className="p-2 rounded-full text-olive-600 hover:bg-olive-50" aria-label="Previous week">&lt;</button>
        <span className="text-sm font-medium text-neutral-700">{weekRangeLabel}</span>
        <button type="button" onClick={() => setWeekOffset((o) => o + 1)} className="p-2 rounded-full text-olive-600 hover:bg-olive-50" aria-label="Next week">&gt;</button>
      </div>

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

      <main className="flex-1 px-5">
        {loading ? (
          <div className="py-12 flex flex-col items-center">
            <div className="w-10 h-10 border-2 border-olive-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-500 text-sm mt-3">Loading…</p>
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
