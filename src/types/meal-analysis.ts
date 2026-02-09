// Claude Vision meal analysis response shape
export interface MealAnalysisResponse {
  food_name: string;
  food_items: { name: string; quantity: string }[];
  calories: number;
  macros: {
    carbs_g: number;
    protein_g: number;
    fat_g: number;
    fiber_g: number;
  };
  micronutrients: {
    name: string;
    amount: string;
    daily_value_percent: number;
  }[];
  glycemic_index: string;
  health_scores: {
    general: number;
    diabetic: number;
    hypertension: number;
    cholesterol: number;
  };
  detailed_guidance: {
    condition: string;
    score: number;
    explanation: string;
    suggestions: string[];
  }[];
  ayurvedic_note: string;
  best_paired_with: string[];
}
