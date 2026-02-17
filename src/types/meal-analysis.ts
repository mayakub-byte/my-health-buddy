// Claude Vision meal analysis response shape

// New: Detailed detected dish with confidence scoring
export interface DetectedDish {
  name: string;
  name_telugu?: string | null;
  confidence: 'high' | 'medium' | 'low';
  confidence_pct?: number;
  alternatives?: Array<{
    name: string;
    reason: string;
  }>;
  portion: string;
  estimated_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  visual_cues?: string;
}

export interface MealAnalysisResponse {
  // New: Enhanced detection with confidence
  detected_dishes?: DetectedDish[];
  verification_questions?: string[];

  // Standard format fields (from updated prompt)
  meal_name?: string;
  meal_name_telugu?: string;
  dishes?: Array<{
    name: string;
    name_telugu?: string;
    portion: string;
    estimated_calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  }>;
  total_calories?: number;
  total_protein_g?: number;
  total_carbs_g?: number;
  total_fat_g?: number;
  total_fiber_g?: number;
  traffic_light?: 'green' | 'yellow' | 'red';
  traffic_light_reason?: string;
  quick_verdict?: string;
  before_cooking_tips?: string[];
  per_member_guidance?: {
    diabetic?: { traffic_light: string; tip: string; avoid: string | null };
    hypertension?: { traffic_light: string; tip: string; avoid: string | null };
    child?: { traffic_light: string; tip: string; avoid: string | null };
    senior?: { traffic_light: string; tip: string; avoid: string | null };
    weight_loss?: { traffic_light: string; tip: string; avoid: string | null };
    general_adult?: { traffic_light: string; tip: string; avoid: string | null };
  };
  culturally_appropriate_swaps?: string[];
  is_telugu_meal?: boolean;
  ayurvedic_note?: string;

  // Per-member personalized scores (when member profiles are provided)
  family_member_scores?: Array<{
    name: string;
    score: number;
    traffic_light: string;
    tip: string;
    avoid: string | null;
    reason: string;
  }>;

  // Legacy format fields (for backward compatibility)
  food_name?: string;
  food_items?: { name: string; quantity: string }[];
  calories?: number;
  macros?: {
    carbs_g: number;
    protein_g: number;
    fat_g: number;
    fiber_g: number;
  };
  micronutrients?: {
    name: string;
    amount: string;
    daily_value_percent: number;
  }[];
  glycemic_index?: string;
  health_scores?: {
    general: number;
    diabetic: number;
    hypertension: number;
    cholesterol: number;
  };
  detailed_guidance?: {
    condition: string;
    score: number;
    explanation: string;
    suggestions: string[];
  }[];
  best_paired_with?: string[];
}
