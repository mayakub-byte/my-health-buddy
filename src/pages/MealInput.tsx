// ============================================
// MY HEALTH BUDDY - Meal Input / Dashboard
// Main home screen after login: snap meal or describe, then analyze
// ============================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Mic, Type } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import PageHeader from '../components/PageHeader';
import MemberAvatar from '../components/MemberAvatar';
import { VoiceRecorderButton } from '../components/VoiceRecorderButton';
import { supabase } from '../lib/supabase';
import { getDashboardGreeting, buildCopyContext } from '../utils/personalizedCopy';

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
  const [voiceContext, setVoiceContext] = useState('');
  const [inputMode, setInputMode] = useState<'none' | 'voice' | 'text'>('none');


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
          voiceContext: voiceContext || undefined,
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
          voiceContext: voiceContext || undefined,
        },
      });
    }
  };

  const handleSelectMeal = (mealName: string) => {
    setManualText(mealName);
    setShowMealModal(false);
    // User can then add photo or go straight to "LOG MEAL"
  };

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
    <div className="min-h-screen flex flex-col pb-24 max-w-md mx-auto w-full" style={{ backgroundColor: '#f4f6f4' }}>
      {/* Who's eating? — ABOVE heading */}
      <section className="px-5 pt-6 mb-4">
        <p className="text-sm font-medium mb-2" style={{ color: '#7a8c7e' }}>Who&apos;s eating?</p>
        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-5 px-5">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => toggleMember(member.id)}
              className={`flex flex-col items-center min-w-[64px] p-2 rounded-xl transition-all flex-shrink-0 ${
                selectedMembers.includes(member.id)
                  ? 'shadow-sm'
                  : 'opacity-50'
              }`}
              style={{
                border: selectedMembers.includes(member.id) ? '2px solid #6ab08c' : '1px solid #e8e2d8',
                backgroundColor: selectedMembers.includes(member.id) ? '#ffffff' : 'transparent',
              }}
            >
              <div className="mb-1">
                <MemberAvatar name={member.name} relationship={member.relationship} size={40} />
              </div>
              <span className="text-xs font-medium truncate max-w-[56px]" style={{ color: '#143628' }}>
                {member.name}
              </span>
              {selectedMembers.includes(member.id) && (
                <span className="text-xs mt-0.5" style={{ color: '#6ab08c' }}>✓</span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate('/family', { state: { addMember: true } })}
            className="flex flex-col items-center justify-center min-w-[64px] p-2 rounded-xl border-2 border-dashed border-brand-border opacity-60 hover:opacity-100 flex-shrink-0"
          >
            <span className="text-xl mb-1">+</span>
            <span className="text-xs text-brand-text">Add</span>
          </button>
        </div>
        {members.length === 0 && (
          <p className="text-sm text-brand-text py-2">No family members yet</p>
        )}
      </section>

      {/* Profile completion prompt */}
      {(() => {
        const pm = members.find((m) => m.is_primary);
        const needsProfile = pm && pm.age === 25 && (!pm.health_conditions || pm.health_conditions.length === 0) && !localStorage.getItem('mhb_profile_completed');
        return needsProfile ? (
          <section className="px-5 mb-4">
            <div className="p-4 rounded-2xl border-2 border-dashed" style={{ borderColor: '#6ab08c', backgroundColor: '#f5f0e8' }}>
              <p className="font-semibold text-sm" style={{ color: '#143628' }}>
                Complete your profile for personalized advice
              </p>
              <p className="text-xs mt-1" style={{ color: '#7a8c7e' }}>
                Add your health conditions so we can give better meal guidance
              </p>
              <button
                type="button"
                onClick={() => navigate('/complete-profile')}
                className="mt-2 px-4 py-2 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: '#6ab08c' }}
              >
                Complete Profile
              </button>
            </div>
          </section>
        ) : null;
      })()}

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
                  ? 'bg-brand-light0 text-white shadow-sm'
                  : 'bg-brand-light text-brand-text border border-brand-border'
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
        {/* Hidden file input for camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Three input method cards */}
        <p className="text-xs font-medium mb-2" style={{ color: '#7a8c7e' }}>How would you like to log?</p>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
            style={{
              borderColor: imagePreview ? '#6ab08c' : '#e8e2d8',
              backgroundColor: imagePreview ? '#e8f0e5' : '#ffffff',
            }}
          >
            <Camera className="w-7 h-7" style={{ color: '#6ab08c' }} />
            <span className="text-xs font-medium" style={{ color: '#143628' }}>Snap meal</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode(inputMode === 'voice' ? 'none' : 'voice')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
            style={{
              borderColor: inputMode === 'voice' ? '#6ab08c' : '#e8e2d8',
              backgroundColor: inputMode === 'voice' ? '#e8f0e5' : '#ffffff',
            }}
          >
            <Mic className="w-7 h-7" style={{ color: '#6ab08c' }} />
            <span className="text-xs font-medium" style={{ color: '#143628' }}>Say it</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode(inputMode === 'text' ? 'none' : 'text')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
            style={{
              borderColor: inputMode === 'text' || manualText.trim() ? '#6ab08c' : '#e8e2d8',
              backgroundColor: inputMode === 'text' || manualText.trim() ? '#e8f0e5' : '#ffffff',
            }}
          >
            <Type className="w-7 h-7" style={{ color: '#6ab08c' }} />
            <span className="text-xs font-medium" style={{ color: '#143628' }}>Type it</span>
          </button>
        </div>

        {/* Voice input area */}
        {inputMode === 'voice' && (
          <div className="mt-3 p-4 rounded-2xl border border-dashed flex flex-col items-center gap-2" style={{ borderColor: '#a8c4a0', backgroundColor: '#f5f0e8' }}>
            <p className="text-xs" style={{ color: '#3d5a47' }}>Tap the mic and describe your meal</p>
            <VoiceRecorderButton
              size="lg"
              showDuration
              onTranscript={(text) => {
                setManualText((prev) => prev ? `${prev} ${text}` : text);
                setInputMode('none');
              }}
              onError={(err) => setToast(err)}
            />
            {manualText && (
              <p className="text-xs italic mt-1" style={{ color: '#666' }}>&quot;{manualText}&quot;</p>
            )}
          </div>
        )}

        {/* Text input area */}
        {(inputMode === 'text' || manualText.trim()) && (
          <div className="mt-3 relative">
            <label htmlFor="meal-description" className="sr-only">Describe your meal</label>
            <input
              id="meal-description"
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Tell us about your culinary creation..."
              className="input-field w-full rounded-full py-3.5 pr-12"
              aria-label="Describe your meal"
              autoFocus={inputMode === 'text'}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <VoiceRecorderButton
                size="md"
                showDuration={false}
                onTranscript={(text) => setManualText((prev) => prev ? `${prev} ${text}` : text)}
                onError={(err) => setToast(err)}
              />
            </div>
          </div>
        )}

        {/* Common meal button */}
        <button
          type="button"
          onClick={() => setShowMealModal(true)}
          className="w-full mt-3 py-3 rounded-full border-2 border-brand-border bg-white text-brand-text font-medium hover:border-brand-green transition-colors"
        >
          Or choose a common meal
        </button>

        {/* Image preview */}
        {imagePreview && (
          <div className="mt-4 rounded-2xl overflow-hidden border border-brand-border shadow-card aspect-[4/3] max-h-48">
            <img src={imagePreview} alt="Your meal" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Voice Context — always visible when photo or text exists */}
        {(imagePreview || manualText.trim()) && (
          <div className="mt-3 p-3 rounded-xl border border-dashed" style={{ borderColor: '#a8c4a0', backgroundColor: '#f5f0e8' }}>
            <p className="text-xs mb-2" style={{ color: '#3d5a47' }}>
              <span role="img" aria-hidden>🎤</span> Add context? (e.g. &quot;This is sourdough, not regular bread&quot; or &quot;Extra ghee added&quot;)
            </p>
            <div className="flex gap-2 items-start">
              <input
                type="text"
                value={voiceContext}
                onChange={(e) => setVoiceContext(e.target.value)}
                placeholder="Tap to describe what AI might miss..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                style={{ color: '#2D3319' }}
              />
              <VoiceRecorderButton
                size="md"
                showDuration={false}
                onTranscript={(text) => setVoiceContext((prev) => prev ? `${prev} ${text}` : text)}
                onError={(err) => console.error('Voice error:', err)}
              />
            </div>
            {voiceContext && (
              <p className="mt-2 text-xs italic" style={{ color: '#666' }}>
                <span role="img" aria-hidden>📝</span> &quot;{voiceContext}&quot;
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="mt-6 w-full py-3.5 rounded-full btn-primary font-semibold disabled:opacity-50 disabled:pointer-events-none"
        >
          LOG MEAL
        </button>

        {/* Today's stats card */}
        <div className="mt-4 card-warm" style={{ padding: 16 }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: '#7a8c7e' }}>Today so far</span>
            {filteredTodayMeals.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#f5f0e8', color: '#6ab08c' }}>
                {filteredTodayMeals.length} meal{filteredTodayMeals.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {filteredTodayMeals.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="text-center flex-1">
                <p className="text-2xl font-bold" style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#143628' }}>{totalCalories}</p>
                <p className="text-xs" style={{ color: '#7a8c7e' }}>calories</p>
              </div>
              <div className="w-px h-10" style={{ backgroundColor: '#e8e2d8' }} />
              <div className="text-center flex-1">
                <p className="text-2xl font-bold" style={{ color: '#6ab08c' }}>
                  {filteredTodayMeals.length < 3 ? '🟡' : '🟢'}
                </p>
                <p className="text-xs" style={{ color: '#7a8c7e' }}>
                  {filteredTodayMeals.length < 2 ? 'Log more meals' : filteredTodayMeals.length < 3 ? 'Almost there!' : 'On track!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm" style={{ color: '#7a8c7e' }}>No meals logged yet today</p>
              <p className="text-xs mt-1" style={{ color: '#a8c4a0' }}>📸 Snap your first meal to get started!</p>
            </div>
          )}
        </div>

        {/* Quick Links: History + Weekly */}
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex-1 p-3 rounded-xl flex items-center gap-2 hover:bg-brand-light transition-colors"
            style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8' }}
          >
            <span className="text-lg" role="img" aria-hidden>📋</span>
            <span className="text-xs font-medium" style={{ color: '#143628' }}>View History</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/weekly')}
            className="flex-1 p-3 rounded-xl flex items-center gap-2 hover:bg-brand-light transition-colors"
            style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8' }}
          >
            <span className="text-lg" role="img" aria-hidden>📊</span>
            <span className="text-xs font-medium" style={{ color: '#143628' }}>Weekly Progress</span>
          </button>
        </div>

        {/* Last meal shortcut */}
        {lastMeal && (
          <button
            type="button"
            onClick={() => setManualText(lastMeal.food_name)}
            className="mt-3 w-full p-3 bg-[#FDFBF7] rounded-xl border border-brand-border flex items-center gap-3 text-left hover:bg-brand-light transition-colors"
          >
            <span className="text-2xl">🔄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-dark truncate">{lastMeal.food_name}</p>
              <p className="text-xs text-brand-text">Tap to log similar meal</p>
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
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-brand-light rounded-t-3xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-brand-light border-b border-brand-border px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-heading text-lg font-bold text-brand-dark">Choose a Telugu Meal</h2>
              <button
                type="button"
                onClick={() => setShowMealModal(false)}
                className="p-2 rounded-full hover:bg-brand-light transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-brand-text" />
              </button>
            </div>

            {/* Tabs */}
            <div className="sticky top-[73px] bg-brand-light border-b border-brand-border px-5 py-2 flex gap-2 overflow-x-auto z-10">
              {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealTime[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-colors min-h-[48px] ${
                    selectedTab === tab
                      ? 'bg-brand-light0 text-white'
                      : 'bg-brand-light text-brand-text hover:bg-brand-light'
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
                        <p className="text-sm font-semibold text-brand-dark mb-0.5">{meal.name}</p>
                        <p className="text-xs text-brand-text">{meal.telugu}</p>
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

