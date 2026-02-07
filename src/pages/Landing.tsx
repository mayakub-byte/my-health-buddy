// ============================================
// MY HEALTH BUDDY - Landing Page
// Mobile-first intro screen for family nutrition assistant
// ============================================

import { Link } from 'react-router-dom';

const ORBIT_EMOJIS = ['🍚', '🥘', '🥗', '🍲', '🥕', '🍆', '🫑', '🥦'];
const FAMILY_AVATARS = ['👨', '👩', '👧', '👦'];

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col overflow-x-hidden">
      {/* Top: Logo + Title + Tagline + Badge */}
      <header className="pt-10 pb-6 px-5 text-center">
        {/* Green gradient logo with food emoji */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 shadow-lg shadow-green-500/25 mb-5">
          <span className="text-4xl" aria-hidden>🍽️</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 mb-1">
          My <span className="text-green-500 bg-green-500/15 px-1.5 rounded">Health</span> Buddy
        </h1>
        <p className="text-neutral-500 text-sm sm:text-base mb-3">
          AI-powered nutrition for your family
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
          🇮🇳 Telugu & Indian foods
        </span>
      </header>

      {/* Feature pills */}
      <section className="px-4 mb-6">
        <div className="flex flex-wrap justify-center gap-2">
          <Pill icon="📸" label="Snap Food" />
          <Pill icon="✨" label="AI Analysis" />
          <Pill icon="❤️" label="Family Scores" />
        </div>
      </section>

      {/* Animated food circle illustration */}
      <section className="flex justify-center py-6 px-4" aria-hidden>
        <div className="relative w-48 h-48 sm:w-56 sm:h-56">
          {/* Orbiting food emojis */}
          <div className="absolute inset-0 animate-orbit-slow">
            {ORBIT_EMOJIS.map((emoji, i) => (
              <span
                key={i}
                className="absolute text-2xl sm:text-3xl orbit-item"
                style={{
                  '--angle': `${(i / ORBIT_EMOJIS.length) * 360}deg`,
                } as React.CSSProperties}
              >
                {emoji}
              </span>
            ))}
          </div>
          {/* Center circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md border-4 border-white">
              <span className="text-3xl sm:text-4xl">🥗</span>
            </div>
          </div>
        </div>
      </section>

      {/* Family avatar row */}
      <section className="px-4 mb-8">
        <p className="text-center text-neutral-500 text-sm mb-3">For the whole family</p>
        <div className="flex justify-center gap-3">
          {FAMILY_AVATARS.map((avatar, i) => (
            <div
              key={i}
              className="w-12 h-12 rounded-full bg-white border-2 border-green-200 flex items-center justify-center text-2xl shadow-sm"
            >
              {avatar}
            </div>
          ))}
        </div>
      </section>

      {/* CTA + Log in */}
      <footer className="mt-auto px-5 pb-10 pt-4">
        <Link
          to="/login"
          className="btn-primary w-full flex items-center justify-center py-3.5 rounded-xl text-base font-semibold bg-green-500 hover:bg-green-600 active:bg-green-700 text-white transition-colors"
        >
          Get Started
        </Link>
        <p className="text-center mt-4">
          <Link
            to="/login"
            className="text-sm font-medium text-green-600 hover:text-green-700 underline underline-offset-2"
          >
            Log in
          </Link>
        </p>
      </footer>

      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-orbit-slow {
          animation: orbit 20s linear infinite;
        }
        .orbit-item {
          --radius: 5.5rem;
          left: 50%;
          top: 50%;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(-1 * var(--radius)));
        }
        @media (min-width: 640px) {
          .orbit-item { --radius: 6.5rem; }
        }
      `}</style>
    </div>
  );
}

function Pill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-white border border-green-200 text-neutral-700 shadow-sm">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
