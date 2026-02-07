// ============================================
// MY HEALTH BUDDY - Scan Confirm
// Confirm captured image or manual entry before analysis
// ============================================

import { useLocation, useNavigate } from 'react-router-dom';

interface ScanConfirmState {
  imageFile?: File;
  imagePreview?: string;
  manualText?: string;
  selectedMemberId?: string;
}

export default function ScanConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as ScanConfirmState;

  const hasImage = !!state.imagePreview || !!state.imageFile;
  const hasText = !!state.manualText?.trim();

  const handleAnalyze = () => {
    // Pass through to upload flow or run analysis
    navigate('/upload', { state });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="p-4 border-b border-neutral-100 bg-white">
        <button
          onClick={() => navigate(-1)}
          className="text-green-600 font-medium"
        >
          Back
        </button>
        <h1 className="text-lg font-bold text-neutral-800 mt-2">Confirm meal</h1>
      </header>
      <main className="flex-1 p-4">
        {hasImage && state.imagePreview && (
          <img
            src={state.imagePreview}
            alt="Meal"
            className="w-full rounded-xl object-cover max-h-64"
          />
        )}
        {hasText && (
          <p className="mt-4 p-3 bg-white rounded-xl border border-neutral-200 text-neutral-700">
            {state.manualText}
          </p>
        )}
        <button
          onClick={handleAnalyze}
          className="mt-6 w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold"
        >
          Analyze Meal
        </button>
      </main>
    </div>
  );
}
