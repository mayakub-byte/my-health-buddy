// ============================================
// MY HEALTH BUDDY - History Page
// View past meals
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Calendar } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { supabase } from '../lib/supabase';
import type { Meal } from '../types';

export default function History() {
  const navigate = useNavigate();
  const { family } = useFamily();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (family) {
      loadMeals();
    }
  }, [family]);

  const loadMeals = async () => {
    if (!family) return;

    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('family_id', family.id)
        .order('meal_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMeals(data || []);
    } catch (err) {
      console.error('Error loading meals:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group meals by date
  const groupedMeals = meals.reduce<Record<string, Meal[]>>((acc, meal) => {
    const date = meal.meal_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(meal);
    return acc;
  }, {});

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    }
    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const mealTypeEmoji: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍪',
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-neutral-100">
        <h1 className="text-xl font-bold text-neutral-800">Meal History</h1>
        <p className="text-sm text-neutral-500">{meals.length} meals logged</p>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-20 bg-neutral-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-neutral-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-700 mb-2">
              No meals yet
            </h2>
            <p className="text-neutral-500 mb-4">
              Start logging your meals to see them here
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="btn-primary"
            >
              Log Your First Meal
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMeals).map(([date, dateMeals]) => (
              <div key={date}>
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                  {formatDate(date)}
                </h2>
                <div className="space-y-3">
                  {dateMeals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => navigate(`/results/${meal.id}`)}
                      className="card w-full text-left flex items-center gap-4 hover:shadow-md transition-shadow"
                    >
                      {meal.photo_url ? (
                        <img
                          src={meal.photo_url}
                          alt="Meal"
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center text-2xl">
                          {mealTypeEmoji[meal.meal_type] || '🍽️'}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-neutral-800 capitalize">
                          {meal.meal_type}
                        </h3>
                        <p className="text-sm text-neutral-500">
                          {meal.confirmed_dishes?.length || 0} dish
                          {(meal.confirmed_dishes?.length || 0) !== 1 ? 'es' : ''} •{' '}
                          {Math.round(meal.total_nutrition?.calories || 0)} kcal
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {new Date(meal.created_at).toLocaleTimeString('en-IN', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-400" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
