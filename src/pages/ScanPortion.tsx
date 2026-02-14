// ============================================
// MY HEALTH BUDDY - Scan Portion
// Placeholder: portion selection or proceed to analysis
// ============================================

import { useLocation, useNavigate } from 'react-router-dom';

export default function ScanPortion() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const handleProceed = () => {
    navigate('/upload', { state });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="p-4 border-b border-neutral-100 bg-white">
        <button onClick={() => navigate(-1)} className="text-green-600 font-medium">
          Back
        </button>
        <h1 className="text-lg font-bold text-neutral-800 mt-2">Portion &amp; analyze</h1>
      </header>
      <main className="flex-1 p-4">
        <p className="text-neutral-500 text-sm mb-4">
          Select your portion and proceed to analysis.
        </p>
        <button
          onClick={handleProceed}
          className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold"
        >
          Analyze Meal
        </button>
      </main>
    </div>
  );
}
