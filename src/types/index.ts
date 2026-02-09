// ============================================
// MY HEALTH BUDDY - TypeScript Types
// Matches Supabase database schema
// ============================================

// Family types
export interface Family {
  id: string;
  name: string;
  user_id?: string;
  primary_user_email?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  role?: 'father' | 'mother' | 'son' | 'daughter' | 'grandfather' | 'grandmother' | 'other';
  health_conditions: HealthCondition[];
  dietary_preferences: DietaryPreference[];
  is_primary: boolean;
  avatar_color: string;
  created_at: string;
}

export type HealthCondition = 
  | 'diabetes' 
  | 'pre_diabetic'
  | 'bp' 
  | 'cholesterol' 
  | 'weight_management'
  | 'thyroid'
  | 'none';

export type DietaryPreference = 
  | 'vegetarian' 
  | 'eggetarian' 
  | 'non_vegetarian'
  | 'vegan'
  | 'no_onion_garlic';

// Telugu Dishes types
export interface TeluguDish {
  id: string;
  name: string;
  name_telugu?: string;
  aliases: string[];
  category: DishCategory;
  description?: string;
  main_ingredients: string[];
  nutrition_per_serving: NutritionInfo;
  serving_size: string;
  health_tags: string[];
  warnings: string[];
  is_verified: boolean;
  created_at: string;
}

export type DishCategory = 
  | 'breakfast' 
  | 'lunch' 
  | 'dinner' 
  | 'curry' 
  | 'rice' 
  | 'snack' 
  | 'sweet' 
  | 'chutney' 
  | 'dal';

export interface NutritionInfo {
  carbs: number;      // grams
  protein: number;    // grams
  fat: number;        // grams
  fiber: number;      // grams
  calories: number;   // kcal
}

// Meal types
export interface Meal {
  id: string;
  family_id: string;
  photo_url?: string;
  meal_type: MealType;
  meal_date: string;
  meal_time?: string;
  ai_identified_dishes: IdentifiedDish[];
  confirmed_dishes: ConfirmedDish[];
  total_nutrition: NutritionInfo;
  notes?: string;
  created_at: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface IdentifiedDish {
  name: string;
  name_telugu?: string;
  confidence: number;  // 0-1
  portion: string;
  nutrition: NutritionInfo;
}

export interface ConfirmedDish {
  dish_id?: string;    // Reference to telugu_dishes table if matched
  name: string;
  name_telugu?: string;
  portion: 'small' | 'medium' | 'large';
  servings: number;
  nutrition: NutritionInfo;
}

// Meal Score types
export interface MealScore {
  id: string;
  meal_id: string;
  member_id: string;
  overall_score: number;  // 1-10
  score_breakdown: ScoreBreakdown;
  macros: NutritionInfo;
  key_insight: string;
  suggestions: string[];
  created_at: string;
}

export interface ScoreBreakdown {
  carb_score: number;
  protein_score: number;
  fiber_score: number;
  balance_score: number;
}

// UI State types
export interface OnboardingState {
  step: number;
  familyName: string;
  members: Partial<FamilyMember>[];
}

export interface MealAnalysisState {
  photoUrl: string;
  photoFile?: File;
  isAnalyzing: boolean;
  identifiedDishes: IdentifiedDish[];
  confirmedDishes: ConfirmedDish[];
  mealType: MealType;
}

// API Response types
export interface ClaudeVisionResponse {
  dishes: IdentifiedDish[];
  meal_summary: string;
  confidence: number;
}

// Helper type for creating new records (without id and timestamps)
export type NewFamily = Omit<Family, 'id' | 'created_at' | 'updated_at'>;
export type NewFamilyMember = Omit<FamilyMember, 'id' | 'created_at'>;
export type NewMeal = Omit<Meal, 'id' | 'created_at'>;
export type NewMealScore = Omit<MealScore, 'id' | 'created_at'>;
