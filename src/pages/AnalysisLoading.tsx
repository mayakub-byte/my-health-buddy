// ============================================
// MY HEALTH BUDDY - Analysis Loading
// Shown while AI analyzes the food
// ============================================

import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { analyzeMealImage, analyzeMealText, imageFileToBase64, blobUrlToBase64 } from '../lib/analyze-meal-api';
import type { MealAnalysisResponse } from '../types/meal-analysis';
import type { PhotoConfirmState } from './PhotoConfirmation';
import type { PortionSize } from './PortionSelection';

const PROGRESS_DURATION_MS = 8000;

export interface AnalysisLoadingState extends PhotoConfirmState {
  portionSize?: PortionSize;
  servings?: number;
  mealType?: 'text' | 'photo';
}

export default function AnalysisLoading() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as AnalysisLoadingState;
  const { members } = useFamily();

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResponse | null>(null);

  const loadingMessages = [
    'Understanding your meal... 🍽️',
    'Checking nutrition for your family... 👨‍👩‍👧‍👦',
    'Finding smart cooking tips... 🧑‍🍳',
    'Almost ready with your results... ✨',
  ];
  const [apiError, setApiError] = useState<string | null>(null);
  const analysisStarted = useRef(false);
  const analysisResultRef = useRef<MealAnalysisResponse | null>(null);
  analysisResultRef.current = analysisResult;

  const imagePreview = state.imagePreview ?? filePreview;
  const hasImage = !!imagePreview || !!state.imageFile;
  const isTextOnly = state.mealType === 'text' || (!hasImage && !!state.manualText);

  const selectedMember = state.selectedMemberId
    ? members.find((m) => m.id === state.selectedMemberId)
    : members[0];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

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

  // Call Claude API (Vision for photo, Text-only for text)
  useEffect(() => {
    if (analysisStarted.current) return;
    if (isTextOnly && !state.manualText) return;
    if (!isTextOnly && !hasImage) return;
    
    analysisStarted.current = true;
    let cancelled = false;
    (async () => {
      try {
        if (isTextOnly) {
          // Text-only analysis
          const mealDescription = state.manualText?.trim() || '';
          const portionSize = state.portionSize || 'medium';
          if (!mealDescription) return;
          
          const result = await analyzeMealText(mealDescription, portionSize);
          if (!cancelled) {
            analysisResultRef.current = result;
            setAnalysisResult(result);
          }
        } else {
          // Photo-based analysis
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
  }, [hasImage, isTextOnly, state.imageFile, state.manualText, state.portionSize, imagePreview]);

  // Progress bar: 0 → 100 over 8 seconds; navigate ONLY when progress is 100% AND analysisResult exists
  useEffect(() => {
    if (!hasImage && !state.manualText) return;
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
              selectedMembers: state.selectedMembers,
              portionSize: state.portionSize,
              servings: state.servings,
              mealTime: state.mealTime,
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

  if (!hasImage && !state.manualText) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto w-full" style={{ backgroundColor: '#F4F1EA' }}>
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
        <h1 className="font-serif text-lg font-bold text-olive-800">{apiError ? 'Something went wrong' : 'Analyzing Your Meal'}</h1>
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
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 w-full">
            {/* Bouncing food emojis */}
            <div className="flex gap-5 mb-8">
              <span className="text-4xl animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.5s' }}>🥗</span>
              <span className="text-4xl animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.5s' }}>🍚</span>
              <span className="text-4xl animate-bounce" style={{ animationDelay: '600ms', animationDuration: '1.5s' }}>🥘</span>
            </div>
            {/* Rotating message */}
            <p className="font-serif italic text-[#5C6B4A] text-lg text-center min-h-[56px] flex items-center justify-center">
              {loadingMessages[messageIndex]}
            </p>
            {/* Subtle progress bar with shimmer */}
            <div className="w-48 h-1.5 bg-gray-200 rounded-full mt-8 overflow-hidden">
              <div
                className="h-full bg-[#5C6B4A] rounded-full shimmer-bar"
                style={{ width: '60%' }}
              />
            </div>
            {/* Warm subtext */}
            <p className="text-xs text-gray-400 mt-4">This usually takes 5-10 seconds</p>
            {selectedMember && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl card mt-8 w-full max-w-sm">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: selectedMember.avatar_color || '#4A5D3A' }}
                >
                  {selectedMember.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="text-neutral-800 font-medium">{selectedMember.name}</span>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); opacity: 0.5; }
          50% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0.5; }
        }
        .shimmer-bar {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
