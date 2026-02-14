// ============================================
// MY HEALTH BUDDY - Photo Confirmation
// Shown after user captures a food photo
// ============================================

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export interface PhotoConfirmState {
  imageFile?: File;
  imagePreview?: string;
  manualText?: string;
  selectedMemberId?: string;
  selectedMembers?: string[];
  mealTime?: 'breakfast' | 'lunch' | 'snack' | 'dinner';
}

export default function PhotoConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as PhotoConfirmState;
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const imagePreview = state.imagePreview ?? filePreview;
  const hasImage = !!imagePreview || !!state.imageFile;

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

  const handleYesAnalyze = () => {
    navigate('/scan/portion', { state });
  };

  if (!hasImage) {
    return null;
  }

  const previewUrl = imagePreview;
  const suggestedDishName = state.manualText?.trim() || 'Your meal';

  return (
    <div className="min-h-screen bg-beige flex flex-col max-w-md mx-auto w-full">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link
          to="/dashboard"
          className="flex items-center justify-center w-10 h-10 rounded-full border border-beige-300 text-neutral-600 hover:bg-beige-100 shadow-card"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-heading text-lg font-bold text-olive-800">Confirm Your Meal</h1>
      </header>

      <main className="flex-1 px-5 py-6">
        <div className="card p-4">
          {/* Food photo in rounded frame */}
          <div className="rounded-2xl overflow-hidden bg-beige-100 border border-beige-300 aspect-square max-w-xs mx-auto flex items-center justify-center">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Your meal"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-neutral-500 text-sm">Loading…</span>
            )}
          </div>

          <p className="font-heading text-center text-olive-800 font-medium mt-4">
            Our AI thinks you&apos;ll love: {suggestedDishName}
          </p>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 rounded-full border-2 border-olive-500 text-olive-600 font-semibold hover:bg-olive-50 transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleYesAnalyze}
              className="flex-1 py-3 rounded-full btn-primary font-semibold"
            >
              Yes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
