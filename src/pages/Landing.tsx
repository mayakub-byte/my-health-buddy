// ============================================
// AROGYA / MY HEALTH BUDDY - Landing Page
// Warm, nurturing Indian family wellness
// ============================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const FEATURE_CARDS = [
  { title: 'Holistic Health', sub: 'for All Ages', icon: '🌿' },
  { title: 'Connect & Share', sub: 'Moments', icon: '❤️' },
  { title: 'Personalized', sub: 'Family Hub', icon: '🏠' },
];

export default function Landing() {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="min-h-screen bg-beige flex flex-col overflow-x-hidden max-w-md mx-auto w-full">
      <header className="pt-10 pb-6 px-5 text-center flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-olive-500 shadow-card mb-5 mx-auto">
          <span className="text-4xl" aria-hidden>🍽️</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-olive-800 mb-1">
          Your Family&apos;s Wellness Journey, Simplified
        </h1>
        <p className="text-neutral-600 text-sm sm:text-base mb-6">
          Nourishing health and happiness, together. A gentle guide to holistic health for every member of your family.
        </p>
      </header>

      <section className="px-5 mb-8">
        <div className="grid grid-cols-3 gap-3">
          {FEATURE_CARDS.map((card, i) => (
            <div
              key={i}
              className="card text-center py-4"
            >
              <span className="text-2xl mb-2 block" aria-hidden>{card.icon}</span>
              <p className="font-heading font-semibold text-olive-800 text-sm">{card.title}</p>
              <p className="text-neutral-500 text-xs mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center px-5 py-6" aria-hidden>
        <div className="w-40 h-40 rounded-2xl bg-beige-200/60 flex items-center justify-center border border-beige-300">
          <span className="text-6xl">👨‍👩‍👧‍👦</span>
        </div>
      </section>

      <footer className="mt-auto px-5 pb-10 pt-4 space-y-3 max-w-md mx-auto w-full">
        <button
          type="button"
          onClick={() => setToast('Coming soon!')}
          className="btn-primary w-full flex items-center justify-center py-3.5 rounded-full text-base font-semibold"
        >
          Download the App
        </button>
        <Link
          to="/login"
          className="w-full flex items-center justify-center py-3.5 rounded-full text-base font-semibold border-2 border-olive-500 text-olive-600 hover:bg-olive-50 active:bg-olive-100 transition-colors"
        >
          Login to Web
        </Link>
        <p className="text-center text-xs text-neutral-500 pt-2">
          Available on iOS &amp; Android
        </p>
      </footer>

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
