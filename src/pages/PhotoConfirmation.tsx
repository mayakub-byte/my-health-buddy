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

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header: back + title */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-4 bg-white border-b border-neutral-100">
        <Link
          to="/dashboard"
          className="flex items-center justify-center w-10 h-10 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-neutral-800">Confirm Your Meal</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        {/* Image in large rounded container */}
        <div className="rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 aspect-[4/3] max-h-[50vh] flex items-center justify-center">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Your meal"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-neutral-400 text-sm">Loading…</span>
          )}
        </div>

        <p className="text-center text-neutral-600 font-medium mt-6">
          Does this look right?
        </p>

        {/* Two buttons side by side */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-3.5 rounded-xl border-2 border-neutral-300 font-semibold text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
          >
            Retake
          </button>
          <button
            type="button"
            onClick={handleYesAnalyze}
            className="flex-1 py-3.5 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 font-semibold text-white transition-colors"
          >
            Yes, Analyze
          </button>
        </div>
      </main>
    </div>
  );
}
