// ============================================
// MY HEALTH BUDDY - Upload Page
// Photo upload with REAL AI recognition
// ============================================

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { supabase, uploadFile } from '../lib/supabase';
import { analyzeMealPhoto } from '../lib/claude-vision';
import type { MealType, ConfirmedDish, IdentifiedDish, NutritionInfo } from '../types';

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🍪' },
];

export default function Upload() {
  const navigate = useNavigate();
  const { family } = useFamily();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'analyzing' | 'confirm' | 'saving'>('upload');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [dishes, setDishes] = useState<IdentifiedDish[]>([]);
  const [mealSummary, setMealSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError(null);
      await analyzePhoto(file);
    }
  };

  const analyzePhoto = async (file: File) => {
    setStep('analyzing');
    setError(null);

    try {
      // Call REAL Claude Vision API
      const result = await analyzeMealPhoto(file);
      
      setDishes(result.dishes);
      setMealSummary(result.summary);
      setStep('confirm');
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze image. Please try again.');
      setStep('upload');
    }
  };

  const updateDishPortion = (index: number, portion: 'small' | 'medium' | 'large') => {
    const portionMultiplier: Record<string, number> = {
      small: 0.7,
      medium: 1.0,
      large: 1.3,
    };

    setDishes(
      dishes.map((d, i) => {
        if (i !== index) return d;
        
        // Recalculate nutrition based on portion change
        const currentMultiplier = portionMultiplier[d.portion];
        const newMultiplier = portionMultiplier[portion];
        const ratio = newMultiplier / currentMultiplier;

        return {
          ...d,
          portion,
          nutrition: {
            carbs: Math.round(d.nutrition.carbs * ratio),
            protein: Math.round(d.nutrition.protein * ratio),
            fat: Math.round(d.nutrition.fat * ratio),
            fiber: Math.round(d.nutrition.fiber * ratio),
            calories: Math.round(d.nutrition.calories * ratio),
          },
        };
      })
    );
  };

  const removeDish = (index: number) => {
    setDishes(dishes.filter((_, i) => i !== index));
  };

  const calculateTotalNutrition = (): NutritionInfo => {
    return dishes.reduce(
      (total, dish) => ({
        carbs: total.carbs + dish.nutrition.carbs,
        protein: total.protein + dish.nutrition.protein,
        fat: total.fat + dish.nutrition.fat,
        fiber: total.fiber + dish.nutrition.fiber,
        calories: total.calories + dish.nutrition.calories,
      }),
      { carbs: 0, protein: 0, fat: 0, fiber: 0, calories: 0 }
    );
  };

  const handleSave = async () => {
    if (!family || !photoFile) return;

    setStep('saving');

    try {
      // Upload photo to Supabase Storage
      const fileName = `${family.id}/${Date.now()}_${photoFile.name}`;
      const photoUrl = await uploadFile('meal-photos', fileName, photoFile);

      // Convert to confirmed dishes format
      const confirmedDishes: ConfirmedDish[] = dishes.map((d) => ({
        dish_id: (d as any).dish_id || undefined,
        name: d.name,
        name_telugu: d.name_telugu,
        portion: d.portion as 'small' | 'medium' | 'large',
        servings: 1,
        nutrition: d.nutrition,
      }));

      // Create meal record
      const today = new Date().toISOString().split('T')[0];
      const { data: meal, error } = await supabase
        .from('meals')
        .insert({
          family_id: family.id,
          photo_url: photoUrl,
          meal_type: mealType,
          meal_date: today,
          ai_identified_dishes: dishes,
          confirmed_dishes: confirmedDishes,
          total_nutrition: calculateTotalNutrition(),
          notes: mealSummary,
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to results page
      navigate(`/results/${meal.id}`);
    } catch (err) {
      console.error('Error saving meal:', err);
      setStep('confirm');
      alert('Failed to save meal. Please try again.');
    }
  };

  const resetUpload = () => {
    setStep('upload');
    setPhotoFile(null);
    setPhotoPreview(null);
    setDishes([]);
    setMealSummary('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-800">Log Meal</h1>
          {step !== 'upload' && (
            <button onClick={resetUpload} className="text-neutral-500">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Analysis Failed</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Upload Photo */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Photo Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[4/3] bg-white rounded-2xl border-2 border-dashed border-neutral-200 
                         flex flex-col items-center justify-center cursor-pointer
                         hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-primary-600" />
              </div>
              <p className="font-medium text-neutral-700 mb-1">
                Take a photo or upload
              </p>
              <p className="text-sm text-neutral-400">
                Tap here to capture your meal
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Meal Type Selection */}
            <div>
              <label className="label">What meal is this?</label>
              <div className="grid grid-cols-4 gap-2">
                {MEAL_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setMealType(type.value)}
                    className={`p-3 rounded-xl text-center transition-colors
                      ${
                        mealType === type.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-white border border-neutral-200 text-neutral-700'
                      }`}
                  >
                    <span className="text-xl block mb-1">{type.emoji}</span>
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Badge */}
            <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span>Powered by Claude AI • Telugu cuisine expert</span>
            </div>
          </div>
        )}

        {/* Analyzing State */}
        {step === 'analyzing' && (
          <div className="text-center py-12">
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Analyzing"
                className="w-48 h-48 object-cover rounded-2xl mx-auto mb-6 opacity-75"
              />
            )}
            <div className="flex items-center justify-center gap-3 mb-4">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <Sparkles className="w-6 h-6 text-accent-500 animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-800 mb-2">
              AI is analyzing your meal...
            </h2>
            <p className="text-neutral-500">
              Identifying Telugu dishes and calculating nutrition
            </p>
          </div>
        )}

        {/* Step 2: Confirm Dishes */}
        {step === 'confirm' && (
          <div className="space-y-6">
            {/* Photo Preview */}
            {photoPreview && (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Meal"
                  className="w-full aspect-[4/3] object-cover rounded-2xl"
                />
                <div className="absolute top-3 right-3 bg-black/50 text-white px-3 py-1 rounded-full text-sm capitalize flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Analyzed
                </div>
                <div className="absolute bottom-3 left-3 bg-black/50 text-white px-3 py-1 rounded-full text-sm capitalize">
                  {mealType}
                </div>
              </div>
            )}

            {/* AI Summary */}
            {mealSummary && (
              <div className="bg-primary-50 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-primary-800">{mealSummary}</p>
              </div>
            )}

            {/* Identified Dishes */}
            <div>
              <h2 className="font-semibold text-neutral-800 mb-1">
                Found {dishes.length} dish{dishes.length !== 1 ? 'es' : ''}
              </h2>
              <p className="text-sm text-neutral-500 mb-4">
                Adjust portions or remove incorrect items
              </p>

              <div className="space-y-3">
                {dishes.map((dish, index) => (
                  <div key={index} className="card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-neutral-800">
                            {dish.name}
                          </h3>
                          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                            {Math.round(dish.confidence * 100)}% match
                          </span>
                        </div>
                        {dish.name_telugu && (
                          <p className="text-sm text-neutral-500">
                            {dish.name_telugu}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeDish(index)}
                        className="p-1 text-neutral-400 hover:text-red-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Portion Size */}
                    <div className="flex gap-2 mb-3">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => updateDishPortion(index, size)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                            ${
                              dish.portion === size
                                ? 'bg-primary-500 text-white'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Nutrition for this dish */}
                    <div className="flex justify-between text-xs text-neutral-500 bg-neutral-50 rounded-lg p-2">
                      <span>{dish.nutrition.calories} kcal</span>
                      <span>C: {dish.nutrition.carbs}g</span>
                      <span>P: {dish.nutrition.protein}g</span>
                      <span>F: {dish.nutrition.fat}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Nutrition Summary */}
            <div className="card bg-primary-50 border-primary-100">
              <h3 className="font-semibold text-primary-800 mb-3">
                Total Nutrition
              </h3>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-primary-700">
                    {Math.round(calculateTotalNutrition().calories)}
                  </p>
                  <p className="text-xs text-primary-600">kcal</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary-700">
                    {Math.round(calculateTotalNutrition().carbs)}g
                  </p>
                  <p className="text-xs text-primary-600">Carbs</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary-700">
                    {Math.round(calculateTotalNutrition().protein)}g
                  </p>
                  <p className="text-xs text-primary-600">Protein</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary-700">
                    {Math.round(calculateTotalNutrition().fat)}g
                  </p>
                  <p className="text-xs text-primary-600">Fat</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary-700">
                    {Math.round(calculateTotalNutrition().fiber)}g
                  </p>
                  <p className="text-xs text-primary-600">Fiber</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={dishes.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Save & Get Family Scores
            </button>
          </div>
        )}

        {/* Saving State */}
        {step === 'saving' && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-neutral-800 mb-2">
              Saving your meal...
            </h2>
            <p className="text-neutral-500">
              Calculating personalized scores for your family
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
