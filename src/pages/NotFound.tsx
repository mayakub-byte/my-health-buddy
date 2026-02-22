// ============================================
// MY HEALTH BUDDY - 404 Not Found
// ============================================

import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 max-w-md mx-auto"
      style={{ backgroundColor: '#F4F1EA' }}
    >
      <span className="text-6xl mb-4" aria-hidden>🔍</span>
      <h1 className="font-serif text-2xl font-bold text-brand-dark mb-2">
        Page not found
      </h1>
      <p className="text-brand-text text-sm text-center mb-6">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="px-6 py-3 rounded-full border-2 border-[#5C6B4A] text-[#5C6B4A] font-semibold"
      >
        Go back
      </button>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-3 px-6 py-3 rounded-full bg-[#5C6B4A] text-white font-semibold"
      >
        Go to Home
      </button>
    </div>
  );
}
