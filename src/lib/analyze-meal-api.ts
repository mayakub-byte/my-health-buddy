// Call Supabase Edge Function to analyze meal image with Claude Vision.
// API key is kept server-side (CLAUDE_API_KEY in Supabase Edge Function secrets).

import { resizeImage } from './claude-vision';
import type { MealAnalysisResponse } from '../types/meal-analysis';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function analyzeMealImage(
  imageBase64: string,
  mediaType: string = 'image/jpeg'
): Promise<MealAnalysisResponse> {
  const url = `${SUPABASE_URL}/functions/v1/dynamic-processor`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || 'Analysis failed');
  }
  const data = await res.json() as { dishes: { name: string; name_telugu?: string; portion: string; confidence: number }[]; meal_summary: string; is_telugu_meal: boolean };
  // Map Supabase Edge Function response to MealAnalysisResponse
  const foodItems = (data.dishes || []).map((d) => ({ name: d.name, quantity: d.portion }));
  const foodName = data.meal_summary || (data.dishes?.[0]?.name) || 'Meal';
  const estimatedCal = data.dishes?.length ? 200 + data.dishes.length * 80 : 400;
  return {
    food_name: foodName,
    food_items: foodItems,
    calories: estimatedCal,
    macros: { carbs_g: 40, protein_g: 12, fat_g: 10, fiber_g: 4 },
    micronutrients: [],
    glycemic_index: 'medium',
    health_scores: { general: 75, diabetic: 72, hypertension: 74, cholesterol: 76 },
    detailed_guidance: [],
    ayurvedic_note: data.is_telugu_meal ? 'Traditional South Indian meal.' : '',
    best_paired_with: [],
  };
}

export async function imageFileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const resizedBlob = await resizeImage(file);
  const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mediaType = header?.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      resolve({ base64: base64 || '', mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(resizedFile);
  });
}

export async function blobUrlToBase64(url: string): Promise<{ base64: string; mediaType: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  const file = new File([blob], 'meal.jpg', { type: blob.type || 'image/jpeg' });
  return imageFileToBase64(file);
}
