// ============================================
// MY HEALTH BUDDY - Scan Loading
// Shown while meal analysis runs
// ============================================

import { useLocation, useNavigate } from 'react-router-dom';

export default function ScanLoading() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const handleContinue = () => {
    navigate('/upload', { state });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <div className="w-14 h-14 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-neutral-600 font-medium">Analyzing your meal…</p>
      <button
        onClick={handleContinue}
        className="mt-6 text-green-600 font-medium"
      >
        Continue to upload
      </button>
    </div>
  );
}
