// ============================================
// MY HEALTH BUDDY - Meal Input / Dashboard
// Main home screen after login: snap meal or describe, then analyze
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import type { FamilyMember } from '../types';

const COMMON_MEALS = {
  Breakfast: ['Idli & Sambar', 'Dosa & Chutney', 'Upma', 'Pesarattu', 'Pongal'],
  Lunch: ['Rice & Dal', 'Sambar Rice', 'Curd Rice', 'Pulihora', 'Veg Biryani'],
  Dinner: ['Roti & Curry', 'Rice & Rasam', 'Chapati & Dal'],
  Snacks: ['Vada', 'Samosa', 'Bajji', 'Punugulu'],
};

export default function MealInput() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { members } = useFamily();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);


  useEffect(() => {
    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setManualText('');
    }
    e.target.value = '';
  };

  const handleAnalyze = () => {
    if (!imageFile && !manualText.trim()) return;
    navigate('/scan/confirm', {
      state: {
        imageFile: imageFile ?? undefined,
        imagePreview: imagePreview ?? undefined,
        manualText: manualText.trim() || undefined,
        selectedMemberId: selectedMemberId ?? undefined,
      },
    });
  };

  const handleSelectMeal = (mealName: string) => {
    setManualText(mealName);
    setShowMealModal(false);
    // Auto-navigate to portion selection (skip photo confirmation if no photo)
    navigate('/scan/portion', {
      state: {
        manualText: mealName,
        selectedMemberId: selectedMemberId ?? undefined,
      },
    });
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  const canAnalyze = !!imageFile || manualText.trim().length > 0;

  return (
    <div className="min-h-screen bg-beige flex flex-col pb-24 max-w-md mx-auto w-full">
      <header className="px-5 pt-6 pb-3">
        <h1 className="font-heading text-xl font-bold text-olive-800">
          What did you cook today?
        </h1>
        <p className="text-neutral-600 text-sm mt-0.5">{today}</p>
      </header>

      <section className="px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
          {members.map((member) => (
            <MemberChip
              key={member.id}
              member={member}
              isSelected={selectedMemberId === member.id}
              onSelect={() => setSelectedMemberId(member.id)}
            />
          ))}
          {members.length === 0 && (
            <p className="text-sm text-neutral-500 py-2">No family members yet</p>
          )}
        </div>
      </section>

      <main className="flex-1 px-5">
        <input
          type="text"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Tell us about your culinary creation..."
          className="input-field w-full rounded-full py-3.5"
        />

        <div className="flex gap-3 mt-3">
          <button
            type="button"
            onClick={() => setShowMealModal(true)}
            className="flex-1 py-3 rounded-full border-2 border-beige-300 bg-beige-50 text-neutral-600 font-medium hover:border-olive-400 hover:bg-olive-50/50 transition-colors"
          >
            Choose common meal
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-3 rounded-full border-2 border-beige-300 bg-beige-50 text-neutral-600 font-medium hover:border-olive-400 hover:bg-olive-50/50 transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Add photo (optional)
          </button>
        </div>

        {imagePreview && (
          <div className="mt-4 rounded-2xl overflow-hidden border border-beige-300 shadow-card aspect-[4/3] max-h-48">
            <img src={imagePreview} alt="Your meal" className="w-full h-full object-cover" />
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="mt-6 w-full py-3.5 rounded-full btn-primary font-semibold disabled:opacity-50 disabled:pointer-events-none"
        >
          LOG MEAL
        </button>
      </main>

      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 mx-auto max-w-sm bg-neutral-800 text-white text-sm font-medium py-3 px-4 rounded-xl text-center shadow-lg z-50"
          role="status"
        >
          {toast}
        </div>
      )}

      {/* Common Meals Bottom Sheet Modal */}
      {showMealModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowMealModal(false)}
            aria-hidden
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-beige-50 rounded-t-3xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-beige-50 border-b border-beige-300 px-5 py-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-olive-800">Choose a Common Meal</h2>
              <button
                type="button"
                onClick={() => setShowMealModal(false)}
                className="p-2 rounded-full hover:bg-beige-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>
            <div className="p-5 space-y-6">
              {Object.entries(COMMON_MEALS).map(([category, meals]) => (
                <div key={category}>
                  <h3 className="font-heading font-semibold text-olive-800 mb-3">{category}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {meals.map((meal) => (
                      <button
                        key={meal}
                        type="button"
                        onClick={() => handleSelectMeal(meal)}
                        className="card text-left p-3 hover:shadow-card-hover transition-shadow"
                      >
                        <span className="text-sm font-medium text-neutral-800">{meal}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

function MemberChip({
  member,
  isSelected,
  onSelect,
}: {
  member: FamilyMember;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const initial = member.name?.charAt(0)?.toUpperCase() || '?';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-shrink-0 flex items-center gap-2 rounded-full pl-1 pr-3 py-1.5 border-2 transition-colors ${
        isSelected
          ? 'border-olive-500 bg-olive-50 text-olive-700'
          : 'border-beige-300 bg-beige-50 text-neutral-600 hover:border-olive-400'
      }`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
        style={{ backgroundColor: member.avatar_color || '#4A5D3A' }}
      >
        {initial}
      </div>
      <span className="text-sm font-medium">{member.name}</span>
    </button>
  );
}
