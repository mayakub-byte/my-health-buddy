// ============================================
// MY HEALTH BUDDY - Analysis Loading
// Shown while AI analyzes the food
// ============================================

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import type { PhotoConfirmState } from './PhotoConfirmation';
import type { PortionSize } from './PortionSelection';

const ANALYSIS_STEPS: { text: string; emoji: string }[] = [
  { text: 'Identifying food items...', emoji: '🔍' },
  { text: 'Checking nutritional values...', emoji: '📊' },
  { text: 'Calculating family scores...', emoji: '❤️' },
  { text: 'Preparing personalized guidance...', emoji: '✨' },
];

const PROGRESS_DURATION_MS = 8000;
const STEP_INTERVAL_MS = 2000;

export interface AnalysisLoadingState extends PhotoConfirmState {
  portionSize?: PortionSize;
  servings?: number;
}

export default function AnalysisLoading() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as AnalysisLoadingState;
  const { members } = useFamily();

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const imagePreview = state.imagePreview ?? filePreview;
  const hasImage = !!imagePreview || !!state.imageFile;

  const selectedMember = state.selectedMemberId
    ? members.find((m) => m.id === state.selectedMemberId)
    : members[0];

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

  // Progress bar: 0 → 100 over 8 seconds, then navigate
  useEffect(() => {
    if (!hasImage) return;
    const start = Date.now();
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / PROGRESS_DURATION_MS) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        navigate('/results/analysis', {
          state: {
            imageFile: state.imageFile,
            imagePreview: state.imagePreview ?? imagePreview,
            manualText: state.manualText,
            selectedMemberId: state.selectedMemberId,
            portionSize: state.portionSize,
            servings: state.servings,
          },
        });
      }
    }, 50);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImage]);

  // Rotating steps every 2 seconds
  useEffect(() => {
    if (!hasImage) return;
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % ANALYSIS_STEPS.length);
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasImage]);

  if (!hasImage) {
    return null;
  }

  const previewUrl = imagePreview;
  const step = ANALYSIS_STEPS[stepIndex];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header: disabled back arrow + title */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-4 bg-white border-b border-neutral-100">
        <button
          type="button"
          disabled
          className="flex items-center justify-center w-10 h-10 rounded-full border border-neutral-200 text-neutral-300 cursor-not-allowed"
          aria-label="Back (disabled during analysis)"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-neutral-800">Analyzing Your Meal</h1>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-8">
        {/* Centered: thumbnail + pulsing ring + rotating step */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="relative inline-flex items-center justify-center">
            {/* Pulsing green ring */}
            <div
              className="absolute inset-0 rounded-full animate-pulse-ring"
              style={{ padding: 4 }}
              aria-hidden
            />
            {/* Image thumbnail */}
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-neutral-200 bg-neutral-100">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Your meal"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          {/* Rotating analysis step */}
          <div className="mt-6 min-h-[3rem] flex flex-col items-center justify-center">
            <p
              key={stepIndex}
              className="text-neutral-700 font-medium text-center animate-fade-step"
            >
              <span className="mr-2" aria-hidden>{step.emoji}</span>
              {step.text}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm mb-6">
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-150 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Selected family member */}
        {selectedMember && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-neutral-100 w-full max-w-sm">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: selectedMember.avatar_color || '#22c55e' }}
            >
              {selectedMember.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className="text-neutral-800 font-medium">{selectedMember.name}</span>
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
            border-radius: 9999px;
            border: 2px solid rgba(34, 197, 94, 0.3);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(34, 197, 94, 0);
            border: 2px solid rgba(34, 197, 94, 0.2);
          }
        }
        .animate-pulse-ring {
          width: calc(6rem + 24px);
          height: calc(6rem + 24px);
          margin: -12px;
          animation: pulse-ring 1.5s ease-in-out infinite;
        }
        @keyframes fade-step {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-step {
          animation: fade-step 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
