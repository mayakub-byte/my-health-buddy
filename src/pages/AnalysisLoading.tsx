// ============================================
// MY HEALTH BUDDY - Analysis Loading
// Shown while AI analyzes the food
// ============================================

import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { analyzeMealImage, analyzeMealText, imageFileToBase64, blobUrlToBase64 } from '../lib/analyze-meal-api';
import type { MemberProfile } from '../lib/analyze-meal-api';
import type { MealAnalysisResponse } from '../types/meal-analysis';
import type { PhotoConfirmState } from './PhotoConfirmation';
import type { PortionSize } from './PortionSelection';

const PROGRESS_DURATION_MS = 8000;

export interface AnalysisLoadingState extends PhotoConfirmState {
  portionSize?: PortionSize;
  servings?: number;
  mealType?: 'text' | 'photo';
  voiceContext?: string;
}

export default function AnalysisLoading() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as AnalysisLoadingState;
  const { members } = useFamily();

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResponse | null>(null);
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
        // Build member profiles for personalized AI analysis
        const selectedIds = state.selectedMembers ?? (state.selectedMemberId ? [state.selectedMemberId] : []);
        const profiles: MemberProfile[] = members
          .filter((m) => selectedIds.includes(m.id))
          .map((m) => {
            const age = m.dob
              ? Math.floor((new Date().getTime() - new Date(m.dob).getTime()) / 31557600000)
              : (m.age ?? 30);
            return {
              name: m.name,
              age,
              conditions: (m.health_conditions || []).filter((c) => c !== 'none'),
              relationship: m.relationship ?? undefined,
            };
          });
        const voiceCtx = state.voiceContext ?? '';

        if (isTextOnly) {
          // Text-only analysis
          const mealDescription = state.manualText?.trim() || '';
          const portionSize = state.portionSize || 'medium';
          if (!mealDescription) return;

          const result = await analyzeMealText(mealDescription, portionSize, profiles, voiceCtx);
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
          const result = await analyzeMealImage(base64, mediaType, profiles, voiceCtx);
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
      if (p >= 100) {
        const finalAnalysis = analysisResultRef.current;
        if (finalAnalysis) {
          clearInterval(interval);
          // Navigate to meal correction first (so user can verify detected items)
          // MealCorrection will then route to portion-confirm or results
          const hasDishes = finalAnalysis.dishes && finalAnalysis.dishes.length > 0;
          const nextRoute = hasDishes ? '/meal-correction' : (
            (state.selectedMembers && state.selectedMembers.length > 1) ? '/portion-confirm' : '/results/analysis'
          );
          navigate(nextRoute, {
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
    <div className="min-h-screen flex flex-col max-w-md mx-auto w-full" style={{ backgroundColor: '#faf8f3' }}>
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        {apiError ? (
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center w-10 h-10 rounded-full border text-neutral-600 hover:bg-beige-100 shadow-card"
            style={{ borderColor: '#e8e2d8' }}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center justify-center w-10 h-10 rounded-full border text-neutral-400 cursor-not-allowed"
            style={{ borderColor: '#e8e2d8' }}
            aria-label="Back (disabled during analysis)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="font-serif text-lg font-bold" style={{ color: '#3d5a47' }}>{apiError ? 'Something went wrong' : 'Analyzing Your Meal'}</h1>
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
                  className="px-6 py-3 rounded-full border-2 font-semibold hover:bg-olive-50"
                  style={{ borderColor: '#5a7c65', color: '#5a7c65' }}
                >
                  Back to Dashboard
                </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 w-full">
            {/* Pulsing botanical leaf */}
            <div style={{
              fontSize: 56,
              animation: 'leafPulse 2s ease-in-out infinite',
              marginBottom: 24,
            }}>
              🌿
            </div>

            {/* Serif loading text */}
            <p style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 18,
              color: '#3d5a47',
              fontStyle: 'italic',
              margin: '0 0 8px',
              textAlign: 'center',
            }}>
              Understanding how this meal
            </p>
            <p style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 18,
              color: '#5a7c65',
              fontStyle: 'italic',
              textAlign: 'center',
            }}>
              nourishes your family...
            </p>

            {/* Subtle dots animation */}
            <div style={{ marginTop: 20, color: '#a8c4a0', fontSize: 14, letterSpacing: 4 }}>
              <span style={{ animation: 'dotPulse 1.5s infinite', animationDelay: '0s' }}>●</span>
              <span style={{ animation: 'dotPulse 1.5s infinite', animationDelay: '0.3s' }}>●</span>
              <span style={{ animation: 'dotPulse 1.5s infinite', animationDelay: '0.6s' }}>●</span>
            </div>

            {/* Warm subtext */}
            <p className="text-xs mt-6" style={{ color: '#7a8c7e' }}>This usually takes 5-10 seconds</p>

            {selectedMember && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mt-8 w-full max-w-sm card-warm">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: selectedMember.avatar_color || '#5a7c65' }}
                >
                  {selectedMember.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="font-medium" style={{ color: '#2c3e2d' }}>{selectedMember.name}</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
