// ============================================
// MY HEALTH BUDDY - Goals Screen
// First onboarding step: save user preferences
// ============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const GOAL_OPTIONS = [
  { id: 'weight', label: 'Weight management', icon: '⚖️' },
  { id: 'energy', label: 'More energy', icon: '⚡' },
  { id: 'family', label: 'Family nutrition', icon: '👨‍👩‍👧‍👦' },
  { id: 'health', label: 'General wellness', icon: '🌿' },
];

export default function GoalsScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { goals: selected };
      if (user) {
        await supabase.auth.updateUser({ data: { onboarding_goals: payload } });
      } else {
        localStorage.setItem('mhb_onboarding_goals', JSON.stringify(payload));
      }
      navigate('/baseline', { replace: true });
    } catch (err) {
      console.error('Goals save error:', err);
      localStorage.setItem('mhb_onboarding_goals', JSON.stringify({ goals: selected }));
      navigate('/baseline', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col px-5 pt-10 pb-8 max-w-md mx-auto w-full"
      style={{ backgroundColor: '#F4F1EA' }}
    >
      <h1 className="font-serif text-2xl font-bold text-brand-dark mb-1">
        What are your goals?
      </h1>
      <p className="text-brand-text text-sm mb-6">
        Select all that apply. We&apos;ll personalize your experience.
      </p>

      <div className="space-y-3 mb-8">
        {GOAL_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-colors text-left ${
              selected.includes(opt.id)
                ? 'border-[#5C6B4A] bg-[#5C6B4A]/10'
                : 'border-gray-200 bg-[#FDFBF7] hover:border-brand-border'
            }`}
          >
            <span className="text-2xl" aria-hidden>{opt.icon}</span>
            <span className="font-medium text-gray-800">{opt.label}</span>
            {selected.includes(opt.id) && (
              <span className="ml-auto text-[#5C6B4A]" aria-hidden>✓</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="w-full py-3.5 bg-[#5C6B4A] text-white rounded-full font-semibold disabled:opacity-70"
        >
          {loading ? 'Saving…' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
