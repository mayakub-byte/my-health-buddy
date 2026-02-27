// Call Supabase Edge Function to analyze meal image with Claude Vision.
// API key is kept server-side (CLAUDE_API_KEY in Supabase Edge Function secrets).

import { resizeImage } from './claude-vision';
import { fetchWithRetry } from './fetchWithRetry';
import type { MealAnalysisResponse } from '../types/meal-analysis';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface MemberProfile {
  name: string;
  age: number;
  conditions: string[];
  relationship?: string;
}

export interface FoodProfile {
  recentMeals?: string[];
  preferredCuisine?: string;
  commonDishes?: string[];
}

export async function analyzeMealImage(
  imageBase64: string,
  mediaType: string = 'image/jpeg',
  memberProfiles?: MemberProfile[],
  voiceContext?: string,
  foodProfile?: FoodProfile,
): Promise<MealAnalysisResponse> {
  const url = `${SUPABASE_URL}/functions/v1/dynamic-processor`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      type: 'image',
      image_base64: imageBase64,
      media_type: mediaType,
      memberProfiles: memberProfiles ?? [],
      voiceContext: voiceContext ?? '',
      foodProfile: foodProfile ?? undefined,
    }),
  }, { timeout: 60000, maxRetries: 1 });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || 'Analysis failed');
  }
  return await res.json() as MealAnalysisResponse;
}

export async function analyzeMealText(
  mealDescription: string,
  portionSize: 'small' | 'medium' | 'large' = 'medium',
  memberProfiles?: MemberProfile[],
  voiceContext?: string,
  foodProfile?: FoodProfile,
): Promise<MealAnalysisResponse> {
  const url = `${SUPABASE_URL}/functions/v1/dynamic-processor`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      type: 'text',
      mealDescription,
      portion: portionSize,
      memberProfiles: memberProfiles ?? [],
      voiceContext: voiceContext ?? '',
      foodProfile: foodProfile ?? undefined,
    }),
  }, { timeout: 60000, maxRetries: 1 });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || 'Analysis failed');
  }
  return await res.json() as MealAnalysisResponse;
}

export async function reAnalyzeWithCorrection(
  correctionText: string,
  originalDishes: Array<{ name: string; portion: string; estimated_calories: number }>,
  memberProfiles?: MemberProfile[],
  imageBase64?: string,
  mediaType?: string,
): Promise<MealAnalysisResponse> {
  const url = `${SUPABASE_URL}/functions/v1/dynamic-processor`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      type: 'correction',
      correction_text: correctionText,
      original_dishes: originalDishes,
      image_base64: imageBase64 ?? undefined,
      media_type: mediaType ?? undefined,
      memberProfiles: memberProfiles ?? [],
    }),
  }, { timeout: 60000, maxRetries: 1 });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || 'Correction analysis failed');
  }
  return await res.json() as MealAnalysisResponse;
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
