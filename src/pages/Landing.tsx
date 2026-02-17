// ============================================
// AROGYA / MY HEALTH BUDDY - Landing Page
// Punchy, mobile-first landing for new users
// ============================================

import { Link } from 'react-router-dom';

const FEATURES = [
  { emoji: '\uD83D\uDCF8', label: 'AI Meal Scanner' },
  { emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', label: 'Family Tracking' },
  { emoji: '\uD83D\uDED2', label: 'Smart Grocery Lists' },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto w-full" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Top section with food illustration */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6 text-center">
        {/* Food emoji circle */}
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 rounded-full" style={{ backgroundColor: 'rgba(139,158,107,0.2)' }} />
          <span className="absolute text-4xl" style={{ top: '8px', left: '50%', transform: 'translateX(-50%)' }}>{'\uD83C\uDF5B'}</span>
          <span className="absolute text-3xl" style={{ top: '50%', right: '2px', transform: 'translateY(-50%)' }}>{'\uD83E\uDD57'}</span>
          <span className="absolute text-4xl" style={{ bottom: '8px', left: '50%', transform: 'translateX(-50%)' }}>{'\uD83C\uDF72'}</span>
          <span className="absolute text-3xl" style={{ top: '50%', left: '2px', transform: 'translateY(-50%)' }}>{'\uD83E\uDD58'}</span>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-3" style={{ color: '#2D3319' }}>
          What if your kitchen knew exactly what your family needs?
        </h1>
        <p className="text-sm sm:text-base mb-8" style={{ color: '#6B7B5E' }}>
          Snap a meal. Get instant nutrition scores. Track your whole family&apos;s health — effortlessly.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {FEATURES.map((f) => (
            <span
              key={f.label}
              className="px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: '#FDFBF7',
                borderColor: '#8B9E6B',
                color: '#5C6B4A',
              }}
            >
              {f.emoji} {f.label}
            </span>
          ))}
        </div>
      </section>

      {/* Bottom CTA section */}
      <footer className="px-6 pb-10 pt-4 space-y-3">
        <Link
          to="/signup"
          className="w-full flex items-center justify-center py-3.5 rounded-full text-base font-semibold text-white transition-colors"
          style={{ backgroundColor: '#5C6B4A' }}
        >
          Start your first scan &rarr;
        </Link>
        <Link
          to="/login"
          className="w-full flex items-center justify-center py-3 rounded-full text-base font-medium transition-colors"
          style={{ border: '1.5px solid #5C6B4A', color: '#5C6B4A' }}
        >
          Already have an account? Log in
        </Link>
      </footer>
    </div>
  );
}
