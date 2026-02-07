// ============================================
// MY HEALTH BUDDY - Portion Selection
// Select portion size before analysis
// ============================================

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { PhotoConfirmState } from './PhotoConfirmation';

export type PortionSize = 'small' | 'medium' | 'large';

const PORTION_OPTIONS: { value: PortionSize; label: string; sublabel: string }[] = [
  { value: 'small', label: 'Small', sublabel: 'quarter plate' },
  { value: 'medium', label: 'Medium', sublabel: 'half plate' },
  { value: 'large', label: 'Large', sublabel: 'full plate' },
];

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 5;

export default function PortionSelection() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as PhotoConfirmState;
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const imagePreview = state.imagePreview ?? filePreview;
  const hasImage = !!imagePreview || !!state.imageFile;

  const [portionSize, setPortionSize] = useState<PortionSize>('medium');
  const [servings, setServings] = useState(1);

  useEffect(() => {
    if (!hasImage) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (state.imageFile && !state.imagePreview) {
      const url = URL.createObjectURL(state.imageFile);
      setFilePreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [hasImage, state.imageFile, state.imagePreview, navigate]);

  const handleStartAnalysis = () => {
    navigate('/scan/loading', {
      state: {
        imageFile: state.imageFile,
        imagePreview: state.imagePreview ?? imagePreview,
        manualText: state.manualText,
        selectedMemberId: state.selectedMemberId,
        portionSize,
        servings,
      },
    });
  };

  const confirmState = { ...state, imagePreview: state.imagePreview ?? imagePreview };

  if (!hasImage) {
    return null;
  }

  const previewUrl = imagePreview;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-4 bg-white border-b border-neutral-100">
        <Link
          to="/scan/confirm"
          state={confirmState}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-neutral-800">Select Portion Size</h1>
          <p className="text-neutral-500 text-sm mt-0.5">How much did you eat?</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        {/* Food image thumbnail */}
        {previewUrl && (
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 flex-shrink-0">
              <img
                src={previewUrl}
                alt="Your meal"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Portion option cards */}
        <div className="space-y-2 mb-6">
          {PORTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPortionSize(opt.value)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors ${
                portionSize === opt.value
                  ? 'border-green-500 bg-green-50/50'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <span className="text-2xl" aria-hidden>🍽</span>
              <div>
                <span className="font-semibold text-neutral-800 block">
                  {opt.label} ({opt.sublabel})
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Number of servings stepper */}
        <div className="mb-6">
          <p className="text-sm font-medium text-neutral-700 mb-2">Number of servings</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setServings((s) => Math.max(MIN_SERVINGS, s - 1))}
              disabled={servings <= MIN_SERVINGS}
              className="w-12 h-12 rounded-xl border-2 border-neutral-200 flex items-center justify-center text-xl font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              −
            </button>
            <span className="text-lg font-semibold text-neutral-800 w-8 text-center">
              {servings}
            </span>
            <button
              type="button"
              onClick={() => setServings((s) => Math.min(MAX_SERVINGS, s + 1))}
              disabled={servings >= MAX_SERVINGS}
              className="w-12 h-12 rounded-xl border-2 border-neutral-200 flex items-center justify-center text-xl font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              +
            </button>
          </div>
        </div>

        {/* Start Analysis */}
        <button
          onClick={handleStartAnalysis}
          className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 font-semibold text-white transition-colors"
        >
          Start Analysis
        </button>
      </main>
    </div>
  );
}
