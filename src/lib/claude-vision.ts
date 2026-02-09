// ============================================
// MY HEALTH BUDDY - Claude Vision API Service
// AI-powered Telugu food recognition via Supabase Edge Function
// ============================================

import { supabase } from './supabase';
import type { IdentifiedDish, TeluguDish, NutritionInfo } from '../types';

// Supabase Edge Function URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Convert image file to base64
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/xxx;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Get media type from file
function getMediaType(file: File): string {
  const type = file.type;
  if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg';
  if (type === 'image/png') return 'image/png';
  if (type === 'image/webp') return 'image/webp';
  if (type === 'image/gif') return 'image/gif';
  return 'image/jpeg'; // Default
}

// Call Supabase Edge Function to analyze image
export async function analyzeImageWithClaude(file: File): Promise<{
  dishes: Array<{
    name: string;
    name_telugu?: string;
    portion: string;
    confidence: number;
  }>;
  meal_summary: string;
  is_telugu_meal: boolean;
}> {
  try {
    const base64Image = await imageToBase64(file);
    const mediaType = getMediaType(file);

    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/dynamic-processor`;
    console.log('Calling Edge Function:', edgeFunctionUrl);

    // Call Supabase Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        image_base64: base64Image,
        media_type: mediaType,
      }),
    });

    console.log('Edge Function response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      let parsed: { error?: string } = {};
      try {
        parsed = JSON.parse(errorBody);
      } catch {
        parsed = { error: errorBody || `HTTP ${response.status}` };
      }
      console.error('Edge Function error:', { status: response.status, body: errorBody, parsed });
      throw new Error(parsed.error || `Failed to analyze image (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    const details = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    };
    console.error('Error analyzing image – full details:', details);
    throw new Error('Meal analysis failed: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Match identified dishes with our Telugu dishes knowledge base
export async function matchWithKnowledgeBase(
  identifiedDishes: Array<{
    name: string;
    name_telugu?: string;
    portion: string;
    confidence: number;
  }>
): Promise<IdentifiedDish[]> {
  // Get all dishes from knowledge base
  const { data: teluguDishes, error } = await supabase
    .from('telugu_dishes')
    .select('*');

  if (error) {
    console.error('Error fetching Telugu dishes:', error);
  }

  const kb: TeluguDish[] = teluguDishes || [];

  return identifiedDishes.map((dish) => {
    // Try to find a match in the knowledge base
    const match = findBestMatch(dish.name, dish.name_telugu, kb);

    if (match) {
      // Use nutrition from knowledge base
      const portionMultiplier = getPortionMultiplier(dish.portion);
      const nutrition = scaleNutrition(match.nutrition_per_serving, portionMultiplier);

      return {
        name: match.name,
        name_telugu: match.name_telugu || undefined,
        confidence: dish.confidence,
        portion: dish.portion,
        nutrition,
        dish_id: match.id,
        health_tags: match.health_tags,
        warnings: match.warnings,
      };
    } else {
      // No match found, use estimated nutrition
      return {
        name: dish.name,
        name_telugu: dish.name_telugu || undefined,
        confidence: dish.confidence,
        portion: dish.portion,
        nutrition: estimateNutrition(dish.name, dish.portion),
      };
    }
  });
}

// Find best matching dish in knowledge base
function findBestMatch(
  name: string,
  nameTelugu: string | undefined,
  kb: TeluguDish[]
): TeluguDish | null {
  const searchTerms = [
    name.toLowerCase(),
    nameTelugu?.toLowerCase(),
  ].filter(Boolean) as string[];

  for (const dish of kb) {
    // Check exact name match
    if (searchTerms.includes(dish.name.toLowerCase())) {
      return dish;
    }

    // Check Telugu name match
    if (dish.name_telugu && searchTerms.includes(dish.name_telugu.toLowerCase())) {
      return dish;
    }

    // Check aliases
    if (dish.aliases) {
      for (const alias of dish.aliases) {
        if (searchTerms.some(term => term.includes(alias.toLowerCase()) || alias.toLowerCase().includes(term))) {
          return dish;
        }
      }
    }

    // Fuzzy match on name
    for (const term of searchTerms) {
      if (
        dish.name.toLowerCase().includes(term) ||
        term.includes(dish.name.toLowerCase())
      ) {
        return dish;
      }
    }
  }

  return null;
}

// Get portion multiplier
function getPortionMultiplier(portion: string): number {
  switch (portion) {
    case 'small':
      return 0.7;
    case 'large':
      return 1.3;
    default:
      return 1.0;
  }
}

// Scale nutrition values
function scaleNutrition(nutrition: NutritionInfo, multiplier: number): NutritionInfo {
  return {
    carbs: Math.round(nutrition.carbs * multiplier),
    protein: Math.round(nutrition.protein * multiplier),
    fat: Math.round(nutrition.fat * multiplier),
    fiber: Math.round(nutrition.fiber * multiplier),
    calories: Math.round(nutrition.calories * multiplier),
  };
}

// Estimate nutrition when no match found
function estimateNutrition(name: string, portion: string): NutritionInfo {
  const portionMultiplier = getPortionMultiplier(portion);
  const nameLower = name.toLowerCase();

  // Basic estimation based on food type
  let base: NutritionInfo = { carbs: 30, protein: 5, fat: 5, fiber: 2, calories: 180 };

  if (nameLower.includes('rice') || nameLower.includes('annam')) {
    base = { carbs: 45, protein: 4, fat: 0.5, fiber: 1, calories: 200 };
  } else if (nameLower.includes('dal') || nameLower.includes('pappu')) {
    base = { carbs: 20, protein: 9, fat: 5, fiber: 4, calories: 160 };
  } else if (nameLower.includes('curry') || nameLower.includes('kura')) {
    base = { carbs: 15, protein: 4, fat: 8, fiber: 3, calories: 140 };
  } else if (nameLower.includes('chutney') || nameLower.includes('pachadi')) {
    base = { carbs: 8, protein: 2, fat: 4, fiber: 1, calories: 70 };
  } else if (nameLower.includes('sambar')) {
    base = { carbs: 18, protein: 6, fat: 4, fiber: 4, calories: 130 };
  } else if (nameLower.includes('rasam')) {
    base = { carbs: 8, protein: 2, fat: 2, fiber: 1, calories: 55 };
  } else if (nameLower.includes('donut') || nameLower.includes('doughnut')) {
    base = { carbs: 35, protein: 3, fat: 18, fiber: 1, calories: 300 };
  } else if (nameLower.includes('cake') || nameLower.includes('pastry')) {
    base = { carbs: 40, protein: 4, fat: 15, fiber: 1, calories: 280 };
  }

  return scaleNutrition(base, portionMultiplier);
}

// Main function to analyze a meal photo
export async function analyzeMealPhoto(file: File): Promise<{
  dishes: IdentifiedDish[];
  summary: string;
  isTeluguMeal: boolean;
}> {
  // Step 1: Call Edge Function (which calls Claude Vision API)
  const aiResponse = await analyzeImageWithClaude(file);

  // Step 2: Match with knowledge base for accurate nutrition
  const dishes = await matchWithKnowledgeBase(aiResponse.dishes);

  return {
    dishes,
    summary: aiResponse.meal_summary,
    isTeluguMeal: aiResponse.is_telugu_meal,
  };
}
