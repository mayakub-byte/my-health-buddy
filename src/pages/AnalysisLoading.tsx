// ============================================
// MY HEALTH BUDDY - Analysis Loading
// Shown while AI analyzes the food
// ============================================

import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { analyzeMealImage, imageFileToBase64, blobUrlToBase64 } from '../lib/analyze-meal-api';
import type { MealAnalysisResponse } from '../types/meal-analysis';
import type { PhotoConfirmState } from './PhotoConfirmation';
import type { PortionSize } from './PortionSelection';

const PROGRESS_DURATION_MS = 8000;

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
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const analysisStarted = useRef(false);
  const analysisResultRef = useRef<MealAnalysisResponse | null>(null);
  analysisResultRef.current = analysisResult;

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

  // Call Claude Vision API when image is available
  useEffect(() => {
    if (!hasImage || analysisStarted.current) return;
    analysisStarted.current = true;
    let cancelled = false;
    (async () => {
      try {
        let base64: string;
        let mediaType = 'image/jpeg';
        if (state.imageFile) {
          const out = await imageFileToBase64(state.imageFile);
          base64 = out.base64;
          mediaType = out.mediaType;
        } else if (imagePreview && typeof imagePreview === 'string') {
          if (imagePreview.startsWith('data:')) {
            const [header, data] = imagePreview.split(',');
            base64 = data || '';
            mediaType = header?.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
          } else {
            const out = await blobUrlToBase64(imagePreview);
            base64 = out.base64;
            mediaType = out.mediaType;
          }
        } else {
          return;
        }
        if (cancelled || !base64) return;
        const result = await analyzeMealImage(base64, mediaType);
        if (!cancelled) {
          analysisResultRef.current = result;
          setAnalysisResult(result);
        }
      } catch (err) {
        console.error('Meal analysis API error:', err);
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasImage, state.imageFile, imagePreview]);

  // Progress bar: 0 → 100 over 8 seconds; navigate ONLY when progress is 100% AND analysisResult exists
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
        const finalAnalysis = analysisResultRef.current;
        if (finalAnalysis) {
          clearInterval(interval);
          navigate('/results/analysis', {
            state: {
              imageFile: state.imageFile,
              imagePreview: state.imagePreview ?? imagePreview,
              manualText: state.manualText,
              selectedMemberId: state.selectedMemberId,
              portionSize: state.portionSize,
              servings: state.servings,
              claudeAnalysis: finalAnalysis,
            },
          });
        }
      }
    }, 50);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hasImage, state.imageFile, state.imagePreview, state.manualText, state.selectedMemberId, state.portionSize, state.servings, imagePreview, navigate]);

  if (!hasImage) {
    return null;
  }

  return (
    <div className="min-h-screen bg-beige flex flex-col max-w-md mx-auto w-full">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        {apiError ? (
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-beige-300 text-neutral-600 hover:bg-beige-100 shadow-card"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center justify-center w-10 h-10 rounded-full border border-beige-300 text-neutral-400 cursor-not-allowed"
            aria-label="Back (disabled during analysis)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="font-heading text-lg font-bold text-olive-800">{apiError ? 'Something went wrong' : 'Analyzing Your Meal'}</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        {apiError ? (
          <div className="text-center">
            <p className="text-red-600 font-medium mb-4">{apiError}</p>
            <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 rounded-full btn-primary font-semibold"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 rounded-full border-2 border-olive-500 text-olive-600 font-semibold hover:bg-olive-50"
                >
                  Back to Dashboard
                </button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-heading text-olive-800/90 text-center text-lg italic mb-8 max-w-sm animate-fade-opacity">
              Understanding how this meal works for your family...
            </p>
            {/* Gentle leaf / botanical spinner */}
            <div className="leaf-spinner mb-8" aria-hidden>
              <span className="leaf leaf-1">🌿</span>
              <span className="leaf leaf-2">🍃</span>
              <span className="leaf leaf-3">🌿</span>
              <span className="leaf leaf-4">🍃</span>
            </div>
            <div className="w-full max-w-sm">
              <div className="h-1.5 bg-beige-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-olive-500 rounded-full transition-all duration-150 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            {selectedMember && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl card mt-6 w-full max-w-sm">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: selectedMember.avatar_color || '#4A5D3A' }}
                >
                  {selectedMember.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="text-neutral-800 font-medium">{selectedMember.name}</span>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        .leaf-spinner {
          position: relative;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .leaf-spinner .leaf {
          position: absolute;
          font-size: 1.5rem;
          opacity: 0.85;
          animation: leaf-spin 2s ease-in-out infinite;
        }
        .leaf-spinner .leaf-1 { top: 0; left: 50%; transform: translateX(-50%); animation-delay: 0s; }
        .leaf-spinner .leaf-2 { right: 0; top: 50%; transform: translateY(-50%); animation-delay: 0.25s; }
        .leaf-spinner .leaf-3 { bottom: 0; left: 50%; transform: translateX(-50%); animation-delay: 0.5s; }
        .leaf-spinner .leaf-4 { left: 0; top: 50%; transform: translateY(-50%); animation-delay: 0.75s; }
        @keyframes leaf-spin {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(0.9); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
        }
        .leaf-2 { animation-name: leaf-spin-2; }
        .leaf-2 { transform: translateY(-50%); }
        .leaf-3 { animation-name: leaf-spin-3; }
        .leaf-3 { transform: translateX(-50%); }
        .leaf-4 { transform: translateY(-50%); }
        .leaf-4 { animation-name: leaf-spin-4; }
        @keyframes leaf-spin-2 {
          0%, 100% { opacity: 0.5; transform: translateY(-50%) scale(0.9); }
          50% { opacity: 1; transform: translateY(-50%) scale(1.1); }
        }
        @keyframes leaf-spin-3 {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(0.9); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
        }
        @keyframes leaf-spin-4 {
          0%, 100% { opacity: 0.5; transform: translateY(-50%) scale(0.9); }
          50% { opacity: 1; transform: translateY(-50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
