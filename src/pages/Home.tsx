// ============================================
// MY HEALTH BUDDY - Home Page
// Main dashboard after onboarding
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, TrendingUp, Lightbulb, ChevronRight } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { supabase } from '../lib/supabase';
import type { Meal } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const { family, members } = useFamily();
  const [todaysMeals, setTodaysMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (family) {
      loadTodaysMeals();
    }
  }, [family]);

  const loadTodaysMeals = async () => {
    if (!family) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('family_id', family.id)
        .eq('meal_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodaysMeals(data || []);
    } catch (err) {
      console.error('Error loading meals:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTip = () => {
    const tips = [
      'Try adding a small bowl of curd to your meal for probiotics! 🥛',
      'Green leafy vegetables like palakura are rich in iron 🥬',
      'Pesarattu is a great protein-rich breakfast choice! 💪',
      'Reduce oil in tempering for a healthier meal 🫒',
      'Add cucumber or tomato slices for extra fiber 🥒',
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <div className="bg-primary-500 text-white px-6 pt-8 pb-12 rounded-b-3xl">
        <p className="text-primary-100 mb-1">{getGreeting()}</p>
        <h1 className="text-2xl font-bold">{family?.name || 'Family'}</h1>
        <p className="text-primary-100 text-sm mt-1">
          {members.length} member{members.length !== 1 ? 's' : ''} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>

      {/* Quick Upload Card - Overlapping */}
      <div className="px-6 -mt-6">
        <button
          onClick={() => navigate('/upload')}
          className="w-full bg-white rounded-2xl shadow-lg p-5 flex items-center gap-4 
                     border-2 border-transparent hover:border-primary-200 transition-colors"
        >
          <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
            <Camera className="w-7 h-7 text-primary-600" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-neutral-800">Log a meal</h3>
            <p className="text-sm text-neutral-500">Take a photo of your food</p>
          </div>
          <ChevronRight className="w-5 h-5 text-neutral-400" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 mt-6 space-y-6">
        {/* Today's Meals */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-neutral-800">Today's Meals</h2>
            {todaysMeals.length > 0 && (
              <button
                onClick={() => navigate('/history')}
                className="text-sm text-primary-600 font-medium"
              >
                See all
              </button>
            )}
          </div>

          {loading ? (
            <div className="card animate-pulse">
              <div className="h-20 bg-neutral-100 rounded-lg"></div>
            </div>
          ) : todaysMeals.length > 0 ? (
            <div className="space-y-3">
              {todaysMeals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Camera className="w-8 h-8 text-neutral-400" />
              </div>
              <p className="text-neutral-500 mb-1">No meals logged today</p>
              <p className="text-sm text-neutral-400">
                Tap the button above to get started
              </p>
            </div>
          )}
        </section>

        {/* Weekly Progress */}
        <section>
          <h2 className="font-semibold text-neutral-800 mb-3">This Week</h2>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-neutral-800">Keep going!</p>
                <p className="text-sm text-neutral-500">
                  {todaysMeals.length} meal{todaysMeals.length !== 1 ? 's' : ''} logged today
                </p>
              </div>
            </div>

            {/* Simple week view */}
            <div className="flex justify-between">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
                return (
                  <div key={i} className="text-center">
                    <span className="text-xs text-neutral-400">{day}</span>
                    <div
                      className={`w-8 h-8 rounded-full mt-1 flex items-center justify-center text-xs
                        ${isToday ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-400'}`}
                    >
                      {isToday && todaysMeals.length > 0 ? todaysMeals.length : '–'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Health Tip */}
        <section>
          <div className="bg-gradient-to-r from-accent-50 to-yellow-50 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-accent-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-800 mb-1">Tip of the day</h3>
                <p className="text-sm text-neutral-600">{getTip()}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Meal card component
function MealCard({ meal }: { meal: Meal }) {
  const navigate = useNavigate();
  const mealTypeEmoji: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍪',
  };

  return (
    <button
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
          {new Date(meal.created_at).toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-neutral-400" />
    </button>
  );
}
