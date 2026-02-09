// Call Netlify function to analyze meal image with Claude Vision.
// API key is kept server-side (CLAUDE_API_KEY or VITE_CLAUDE_API_KEY in Netlify env).

import type { MealAnalysisResponse } from '../types/meal-analysis';

export async function analyzeMealImage(
  imageBase64: string,
  mediaType: string = 'image/jpeg'
): Promise<MealAnalysisResponse> {
  const base =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : '';
  const res = await fetch(`${base}/.netlify/functions/analyze-meal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || 'Analysis failed');
  }
  return res.json() as Promise<MealAnalysisResponse>;
}

export async function imageFileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mediaType = header?.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      resolve({ base64: base64 || '', mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function blobUrlToBase64(url: string): Promise<{ base64: string; mediaType: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  const file = new File([blob], 'meal.jpg', { type: blob.type || 'image/jpeg' });
  return imageFileToBase64(file);
}
