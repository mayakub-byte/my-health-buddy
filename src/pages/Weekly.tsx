// ============================================
// MY HEALTH BUDDY - Weekly View
// ============================================

import { useNavigate } from 'react-router-dom';

export default function Weekly() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-beige pb-20 max-w-md mx-auto w-full">
      <header className="p-5">
        <h1 className="font-heading text-xl font-bold text-olive-800">Weekly Snapshot</h1>
        <p className="text-neutral-600 text-sm mt-0.5">Your week at a glance</p>
      </header>
      <main className="p-5">
        <div className="card text-center py-8 mb-4">
          <p className="text-sm font-medium text-neutral-600 mb-2">Weekly meal list with dates and dish names</p>
          <p className="text-xs text-neutral-500">Coming soon</p>
        </div>
        <section className="card p-5 mb-4">
          <h2 className="font-heading font-semibold text-olive-800 mb-3">General Analytics</h2>
          <ul className="space-y-2 text-sm text-neutral-700">
            <li>Nutrition Score: —</li>
            <li>Variety Score: —</li>
            <li>Calorie Avg: —</li>
            <li>Macros: —</li>
          </ul>
          <p className="text-xs text-neutral-500 mt-3">Visual charts for calorie intake coming soon.</p>
        </section>
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
