// ============================================
// MY HEALTH BUDDY - Weekly Snapshot
// Real data from meal_history for current week
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface MealRecord {
  id: string;
  food_name: string;
  calories: number | null;
  macros: { carbs?: number; protein?: number; fat?: number } | null;
  health_score: number | null;
  created_at: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Weekly() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeeklyMeals();
  }, []);

  const loadWeeklyMeals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMeals([]);
        return;
      }

      // Get current week start (Sunday) and end (Saturday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('meal_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeals((data as MealRecord[]) || []);
    } catch (err) {
      console.error('Error loading weekly meals:', err);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  // Group meals by day
  const mealsByDay: Record<string, MealRecord[]> = {};
  meals.forEach((meal) => {
    const date = new Date(meal.created_at);
    const dayName = DAYS[date.getDay()];
    if (!mealsByDay[dayName]) mealsByDay[dayName] = [];
    mealsByDay[dayName].push(meal);
  });

  // Calculate analytics
  const totalMeals = meals.length;
  const avgCalories = totalMeals > 0
    ? Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0) / totalMeals)
    : 0;
  
  const dishCounts: Record<string, number> = {};
  meals.forEach((m) => {
    dishCounts[m.food_name] = (dishCounts[m.food_name] || 0) + 1;
  });
  const mostCommonDish = Object.entries(dishCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

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
        carbs: Math.round(totalMacros.carbs / totalMeals),
        protein: Math.round(totalMacros.protein / totalMeals),
        fat: Math.round(totalMacros.fat / totalMeals),
      }
    : { carbs: 0, protein: 0, fat: 0 };

  // Daily calories for chart
  const dailyCalories: Record<string, number> = {};
  meals.forEach((m) => {
    const date = new Date(m.created_at);
    const dayKey = DAYS[date.getDay()];
    dailyCalories[dayKey] = (dailyCalories[dayKey] || 0) + (m.calories || 0);
  });
  const maxCalories = Math.max(...Object.values(dailyCalories), 1);

  return (
    <div className="min-h-screen bg-beige pb-20 max-w-md mx-auto w-full">
      <header className="p-5">
        <h1 className="font-heading text-xl font-bold text-olive-800">Weekly Snapshot</h1>
        <p className="text-neutral-600 text-sm mt-0.5">Your week at a glance</p>
      </header>
      <main className="p-5">
        {loading ? (
          <div className="py-12 flex flex-col items-center">
            <div className="w-10 h-10 border-2 border-olive-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-500 text-sm mt-3">Loading…</p>
          </div>
        ) : (
          <>
            {/* Weekly meal list */}
            <section className="card p-5 mb-4">
              <h2 className="font-heading font-semibold text-olive-800 mb-3">This Week&apos;s Meals</h2>
              {totalMeals === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-4">No meals logged this week yet.</p>
              ) : (
                <div className="space-y-3">
                  {DAYS.map((day) => {
                    const dayMeals = mealsByDay[day] || [];
                    if (dayMeals.length === 0) return null;
                    return (
                      <div key={day} className="border-b border-beige-200 pb-2 last:border-0">
                        <p className="font-semibold text-olive-800 text-sm mb-1">{day}</p>
                        <ul className="space-y-1">
                          {dayMeals.map((meal) => (
                            <li key={meal.id} className="text-sm text-neutral-700 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-olive-500" />
                              {meal.food_name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* General Analytics */}
            <section className="card p-5 mb-4">
              <h2 className="font-heading font-semibold text-olive-800 mb-3">General Analytics</h2>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li className="flex justify-between">
                  <span>Total meals logged:</span>
                  <span className="font-semibold text-olive-800">{totalMeals}</span>
                </li>
                <li className="flex justify-between">
                  <span>Average calories per meal:</span>
                  <span className="font-semibold text-olive-800">{avgCalories} kcal</span>
                </li>
                <li className="flex justify-between">
                  <span>Most common dish:</span>
                  <span className="font-semibold text-olive-800">{mostCommonDish}</span>
                </li>
                <li className="pt-2 border-t border-beige-200">
                  <span className="block mb-1">Average macros:</span>
                  <div className="flex gap-3 text-xs">
                    <span>Carbs: {avgMacros.carbs}g</span>
                    <span>Protein: {avgMacros.protein}g</span>
                    <span>Fat: {avgMacros.fat}g</span>
                  </div>
                </li>
              </ul>
            </section>

            {/* Daily Calorie Chart */}
            {totalMeals > 0 && (
              <section className="card p-5 mb-4">
                <h2 className="font-heading font-semibold text-olive-800 mb-3">Daily Calorie Intake</h2>
                <div className="space-y-2">
                  {DAYS.map((day) => {
                    const calories = dailyCalories[day] || 0;
                    const percentage = maxCalories > 0 ? (calories / maxCalories) * 100 : 0;
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <span className="text-xs text-neutral-600 w-16 flex-shrink-0">{day.slice(0, 3)}</span>
                        <div className="flex-1 h-6 bg-beige-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-olive-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-neutral-700 w-12 text-right">{calories || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-olive-600 font-medium hover:text-olive-700"
        >
          Back to Home
        </button>
      </main>
    </div>
  );
}
