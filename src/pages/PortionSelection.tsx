// ============================================
// MY HEALTH BUDDY - Portion Selection
// Select portion size before analysis
// ============================================

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { PhotoConfirmState } from './PhotoConfirmation';

export type PortionSize = 'small' | 'medium' | 'large';

export interface PortionSelectionState extends PhotoConfirmState {
  mealType?: 'text' | 'photo';
}

const PORTION_OPTIONS: { value: PortionSize; label: string; sublabel: string; icon: string }[] = [
  { value: 'small', label: 'Small', sublabel: 'Just a light meal', icon: '🥣' },
  { value: 'medium', label: 'Normal', sublabel: 'A satisfying plate', icon: '🍽️' },
  { value: 'large', label: 'Large', sublabel: 'Ready for a feast!', icon: '🍲' },
];

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 5;

export default function PortionSelection() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as PortionSelectionState;
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const imagePreview = state.imagePreview ?? filePreview;
  const hasImage = !!imagePreview || !!state.imageFile;
  const isTextOnly = state.mealType === 'text' || (!hasImage && !!state.manualText);

  const [portionSize, setPortionSize] = useState<PortionSize>('medium');
  const [servings, setServings] = useState(1);

  useEffect(() => {
    // Allow text-only flow OR photo flow
    if (!hasImage && !state.manualText) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (state.imageFile && !state.imagePreview) {
      const url = URL.createObjectURL(state.imageFile);
      setFilePreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [hasImage, state.imageFile, state.imagePreview, state.manualText, navigate]);

  const handleStartAnalysis = () => {
    navigate('/scan/loading', {
      state: {
        ...state,
        imageFile: state.imageFile,
        imagePreview: state.imagePreview ?? imagePreview,
        manualText: state.manualText,
        selectedMemberId: state.selectedMemberId,
        selectedMembers: state.selectedMembers,
        portionSize,
        servings,
        mealType: isTextOnly ? 'text' : 'photo',
      },
    });
  };

  const confirmState = { ...state, imagePreview: state.imagePreview ?? imagePreview };
  const backRoute = isTextOnly ? '/dashboard' : '/scan/confirm';

  if (!hasImage && !state.manualText) {
    return null;
  }

  const previewUrl = imagePreview;

  return (
    <div className="min-h-screen bg-brand-light flex flex-col max-w-md mx-auto w-full">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          type="button"
          onClick={() => navigate(backRoute, { state: isTextOnly ? undefined : confirmState })}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-brand-border text-brand-text hover:bg-brand-light shadow-card"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-heading text-lg font-bold text-brand-dark">How much are you feeling today?</h1>
          <p className="text-brand-text text-sm mt-0.5">Choose your preferred portion size.</p>
        </div>
      </header>

      <main className="flex-1 px-5 py-6 overflow-y-auto">
        {previewUrl && (
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border border-brand-border bg-brand-light flex-shrink-0 shadow-card">
              <img
                src={previewUrl}
                alt="Your meal"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
        
        {isTextOnly && state.manualText && (
          <div className="flex justify-center mb-6">
            <div className="card p-4 max-w-xs">
              <p className="text-sm text-brand-text mb-1">Meal description:</p>
              <p className="font-heading font-semibold text-brand-dark">{state.manualText}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          {PORTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPortionSize(opt.value)}
              className={`flex flex-col items-center p-4 rounded-2xl border-2 text-center transition-colors card ${
                portionSize === opt.value
                  ? 'border-brand-green bg-brand-light/50 shadow-card'
                  : 'border-brand-border hover:border-brand-green'
              }`}
            >
              <span className="text-3xl mb-2" aria-hidden>{opt.icon}</span>
              <span className="font-heading font-semibold text-brand-dark block">{opt.label}</span>
              <span className="text-xs text-brand-text mt-0.5">{opt.sublabel}</span>
            </button>
          ))}
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-brand-dark mb-2">Number of servings</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setServings((s) => Math.max(MIN_SERVINGS, s - 1))}
              disabled={servings <= MIN_SERVINGS}
              className="w-12 h-12 rounded-full border-2 border-brand-border flex items-center justify-center text-xl font-medium text-brand-text hover:bg-brand-light disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Decrease servings"
            >
              <span aria-hidden>−</span>
            </button>
            <span className="text-lg font-semibold text-brand-dark w-8 text-center">{servings}</span>
            <button
              type="button"
              onClick={() => setServings((s) => Math.min(MAX_SERVINGS, s + 1))}
              disabled={servings >= MAX_SERVINGS}
              className="w-12 h-12 rounded-full border-2 border-brand-border flex items-center justify-center text-xl font-medium text-brand-text hover:bg-brand-light disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Increase servings"
            >
              <span aria-hidden>+</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleStartAnalysis}
          className="w-full py-3.5 rounded-full btn-primary font-semibold"
        >
          Sounds good!
        </button>
      </main>
    </div>
  );
}
