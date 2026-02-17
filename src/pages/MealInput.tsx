// ============================================
// MY HEALTH BUDDY - Meal Input / Dashboard
// Main home screen after login: snap meal or describe, then analyze
// ============================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Mic } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import PageHeader from '../components/PageHeader';
import { supabase } from '../lib/supabase';
import { getDashboardGreeting, buildCopyContext } from '../utils/personalizedCopy';

// TypeScript declarations for Web Speech API
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

const TELUGU_MEALS = {
  breakfast: [
    { name: "Idli & Sambar", telugu: "ఇడ్లీ & సాంబార్", emoji: "🫓" },
    { name: "Dosa & Chutney", telugu: "దోస & చట్నీ", emoji: "🥞" },
    { name: "Pesarattu & Upma", telugu: "పెసరట్టు & ఉప్మా", emoji: "🫓" },
    { name: "Upma", telugu: "ఉప్మా", emoji: "🍚" },
    { name: "Pongal", telugu: "పొంగల్", emoji: "🍲" },
    { name: "Poha", telugu: "పోహా", emoji: "🍚" },
    { name: "Roti & Curry", telugu: "రోటీ & కూర", emoji: "🫓" },
  ],
  lunch: [
    { name: "Rice & Dal", telugu: "అన్నం & పప్పు", emoji: "🍚" },
    { name: "Sambar Rice", telugu: "సాంబార్ అన్నం", emoji: "🍛" },
    { name: "Curd Rice", telugu: "పెరుగు అన్నం", emoji: "🍚" },
    { name: "Pulihora", telugu: "పులిహోర", emoji: "🍋" },
    { name: "Veg Biryani", telugu: "వెజ్ బిర్యానీ", emoji: "🍛" },
    { name: "Chicken Biryani", telugu: "చికెన్ బిర్యానీ", emoji: "🍗" },
    { name: "Chapati & Sabzi", telugu: "చపాతీ & కూర", emoji: "🫓" },
  ],
  dinner: [
    { name: "Roti & Dal", telugu: "రోటీ & పప్పు", emoji: "🫓" },
    { name: "Rice & Rasam", telugu: "అన్నం & రసం", emoji: "🍲" },
    { name: "Chapati & Curry", telugu: "చపాతీ & కూర", emoji: "🫓" },
    { name: "Khichdi", telugu: "కిచిడి", emoji: "🍚" },
    { name: "Roti & Egg Curry", telugu: "రోటీ & ఎగ్ కర్రీ", emoji: "🥚" },
  ],
  snacks: [
    { name: "Vada", telugu: "వడ", emoji: "🍩" },
    { name: "Samosa", telugu: "సమోసా", emoji: "🥟" },
    { name: "Bajji", telugu: "బజ్జి", emoji: "🍟" },
    { name: "Punugulu", telugu: "పునుగులు", emoji: "🧆" },
    { name: "Murukku", telugu: "మురుక్కు", emoji: "🥨" },
  ]
};

type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

// Get current meal time based on hour
const getCurrentMealTime = (): MealTime => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snacks';
  return 'dinner';
};

const MEAL_TIME_PILLS = [
  { key: 'breakfast' as const, label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch' as const, label: 'Lunch', emoji: '☀️' },
  { key: 'snack' as const, label: 'Snack', emoji: '🍪' },
  { key: 'dinner' as const, label: 'Dinner', emoji: '🌙' },
];

interface TodayMealRecord {
  id: string;
  food_name: string;
  calories: number | null;
  created_at: string;
  family_member_id: string | null;
}

export default function MealInput() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { members } = useFamily();

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [mealTime, setMealTime] = useState<'breakfast' | 'lunch' | 'snack' | 'dinner'>(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 18) return 'snack';
    return 'dinner';
  });
  const [todayMeals, setTodayMeals] = useState<TodayMealRecord[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<MealTime>(getCurrentMealTime());
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);


  useEffect(() => {
    if (members.length > 0) {
      setSelectedMembers((prev) => {
        const ids = members.map((m) => m.id);
        if (prev.length === 0) return ids;
        const stillValid = prev.filter((id) => ids.includes(id));
        return stillValid.length > 0 ? stillValid : ids;
      });
    }
  }, [members]);

  // Reset tab to current meal time when modal opens
  useEffect(() => {
    if (showMealModal) {
      setSelectedTab(getCurrentMealTime());
    }
  }, [showMealModal]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load today's meals for stats and last meal shortcut
  useEffect(() => {
    const loadTodayMeals = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data, error } = await supabase
          .from('meal_history')
          .select('id, food_name, calories, created_at, family_member_id')
          .eq('user_id', user.id)
          .gte('created_at', todayStart.toISOString())
          .order('created_at', { ascending: false });
        if (!error) setTodayMeals((data as TodayMealRecord[]) || []);
      } catch (err) {
        console.error('Error loading today meals:', err);
      }
    };
    loadTodayMeals();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setManualText('');
    }
    e.target.value = '';
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleAnalyze = () => {
    if (!imageFile && !manualText.trim()) return;

    const mealText = manualText.trim();
    const hasImage = !!imageFile || !!imagePreview;

    // Text-only flow: skip photo confirmation, go directly to portion selection
    if (!hasImage && mealText) {
      navigate('/scan/portion', {
        state: {
          manualText: mealText,
          selectedMembers,
          selectedMemberId: selectedMembers[0] ?? undefined,
          mealType: 'text' as const,
          mealTime,
        },
      });
      return;
    }

    // Photo flow (with or without text): go to photo confirmation
    if (hasImage) {
      navigate('/scan/confirm', {
        state: {
          imageFile: imageFile ?? undefined,
          imagePreview: imagePreview ?? undefined,
          manualText: mealText || undefined,
          selectedMembers,
          selectedMemberId: selectedMembers[0] ?? undefined,
          mealType: 'photo' as const,
          mealTime,
        },
      });
    }
  };

  const handleSelectMeal = (mealName: string) => {
    setManualText(mealName);
    setShowMealModal(false);
    // User can then add photo or go straight to "LOG MEAL"
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setToast('Voice input not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setManualText(finalTranscript + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setToast('Voice input failed. Please try again.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (finalTranscript) {
        setManualText(finalTranscript);
      }
      setIsListening(false);
    };

    try {
      recognition.start();
      setIsListening(true);
      recognitionRef.current = recognition;
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }
      }, 30000);
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setToast('Failed to start voice input');
      setIsListening(false);
    }
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  const canAnalyze = !!imageFile || manualText.trim().length > 0;
  // Filter today's meals by selected members
  const filteredTodayMeals = selectedMembers.length > 0
    ? todayMeals.filter((m) => m.family_member_id && selectedMembers.includes(m.family_member_id))
    : todayMeals;
  const totalCalories = filteredTodayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const lastMeal = filteredTodayMeals[0] ?? null;

  // Personalized greeting
  const primaryName = members[0]?.name?.split(' ')[0] || 'there';
  const greeting = useMemo(() => {
    const ctx = buildCopyContext(
      primaryName,
      members.map((m) => ({ name: m.name, id: m.id })),
      filteredTodayMeals.length,
    );
    return getDashboardGreeting(ctx);
  }, [primaryName, members.length, filteredTodayMeals.length]);

  return (
    <div className="min-h-screen bg-beige flex flex-col pb-24 max-w-md mx-auto w-full">
      {/* Who's eating? — ABOVE heading */}
      <section className="px-5 pt-6 mb-4">
        <p className="text-sm font-medium text-neutral-600 mb-2">Who&apos;s eating?</p>
        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-5 px-5">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => toggleMember(member.id)}
              className={`flex flex-col items-center min-w-[64px] p-2 rounded-xl transition-all flex-shrink-0 ${
                selectedMembers.includes(member.id)
                  ? 'border-2 border-olive-500 bg-beige-50 shadow-sm'
                  : 'border border-beige-300 opacity-50'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white mb-1"
                style={{ backgroundColor: member.avatar_color || '#5C6B4A' }}
              >
                {member.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-xs font-medium text-neutral-700 truncate max-w-[56px]">
                {member.name}
              </span>
              {selectedMembers.includes(member.id) && (
                <span className="text-xs text-emerald-600 mt-0.5">✓</span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate('/family', { state: { addMember: true } })}
            className="flex flex-col items-center justify-center min-w-[64px] p-2 rounded-xl border-2 border-dashed border-beige-300 opacity-60 hover:opacity-100 flex-shrink-0"
          >
            <span className="text-xl mb-1">+</span>
            <span className="text-xs text-neutral-500">Add</span>
          </button>
        </div>
        {members.length === 0 && (
          <p className="text-sm text-neutral-500 py-2">No family members yet</p>
        )}
      </section>

      {/* Meal time pills */}
      <section className="px-5 mb-4">
        <div className="flex gap-2">
          {MEAL_TIME_PILLS.map((mt) => (
            <button
              key={mt.key}
              type="button"
              onClick={() => setMealTime(mt.key)}
              className={`flex-1 py-2 px-1 rounded-full text-xs font-medium transition-all ${
                mealTime === mt.key
                  ? 'bg-olive-500 text-white shadow-sm'
                  : 'bg-beige-50 text-neutral-600 border border-beige-300'
              }`}
            >
              {mt.emoji} {mt.label}
            </button>
          ))}
        </div>
      </section>

      <header className="px-5 pb-3">
        <PageHeader title={greeting} subtitle={today} />
      </header>

      <main className="flex-1 px-5">
        <div className="relative">
          <label htmlFor="meal-description" className="sr-only">Describe your meal</label>
          <input
            id="meal-description"
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Tell us about your culinary creation..."
            className="input-field w-full rounded-full py-3.5 pr-12"
            aria-label="Describe your meal"
          />
          {/* Voice Input Button */}
          {(window.SpeechRecognition || window.webkitSpeechRecognition) && (
            <button
              type="button"
              onClick={isListening ? stopVoice : startVoice}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-olive-500 text-white hover:bg-olive-600'
              }`}
              aria-label={isListening ? 'Stop recording' : 'Start voice input'}
            >
              <Mic className="w-5 h-5" />
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
              )}
            </button>
          )}
        </div>

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

        {/* Today's stats banner */}
        <div className="mt-4 p-3 bg-beige-50 rounded-xl border border-beige-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">Today so far</span>
            {filteredTodayMeals.length > 0 ? (
              <span className="text-sm font-semibold text-olive-800">
                {filteredTodayMeals.length} meal{filteredTodayMeals.length !== 1 ? 's' : ''} • {totalCalories} cal
              </span>
            ) : (
              <span className="text-sm text-neutral-500">No meals logged yet today ☀️</span>
            )}
          </div>
        </div>

        {/* Last meal shortcut */}
        {lastMeal && (
          <button
            type="button"
            onClick={() => setManualText(lastMeal.food_name)}
            className="mt-3 w-full p-3 bg-[#FDFBF7] rounded-xl border border-beige-200 flex items-center gap-3 text-left hover:bg-beige-100 transition-colors"
          >
            <span className="text-2xl">🔄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-800 truncate">{lastMeal.food_name}</p>
              <p className="text-xs text-neutral-500">Tap to log similar meal</p>
            </div>
            <span className="text-xs text-neutral-400 flex-shrink-0">{lastMeal.calories ?? 0} cal</span>
          </button>
        )}
      </main>

      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 mx-auto max-w-sm bg-neutral-800 text-white text-sm font-medium py-3 px-4 rounded-xl text-center shadow-lg z-50"
          role="status"
        >
          {toast}
        </div>
      )}

      {/* Telugu Meals Bottom Sheet Modal */}
      {showMealModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            role="button"
            tabIndex={0}
            aria-label="Close modal"
            onClick={() => setShowMealModal(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowMealModal(false);
              }
            }}
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-beige-50 rounded-t-3xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-beige-50 border-b border-beige-300 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-heading text-lg font-bold text-olive-800">Choose a Telugu Meal</h2>
              <button
                type="button"
                onClick={() => setShowMealModal(false)}
                className="p-2 rounded-full hover:bg-beige-200 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            {/* Tabs */}
            <div className="sticky top-[73px] bg-beige-50 border-b border-beige-300 px-5 py-2 flex gap-2 overflow-x-auto z-10">
              {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealTime[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-colors min-h-[48px] ${
                    selectedTab === tab
                      ? 'bg-olive-500 text-white'
                      : 'bg-beige-100 text-neutral-600 hover:bg-beige-200'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Meals Grid */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {TELUGU_MEALS[selectedTab].map((meal) => (
                  <button
                    key={meal.name}
                    type="button"
                    onClick={() => handleSelectMeal(meal.name)}
                    className="card text-left p-4 hover:shadow-card-hover transition-shadow min-h-[48px]"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl flex-shrink-0">{meal.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-olive-800 mb-0.5">{meal.name}</p>
                        <p className="text-xs text-neutral-600">{meal.telugu}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
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

