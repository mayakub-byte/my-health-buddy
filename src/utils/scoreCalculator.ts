// ============================================
// MY HEALTH BUDDY - Score Calculator Utility
// Derive weekly and monthly health scores
// ============================================

interface MealRecord {
  id: string;
  food_name: string;
  calories: number | null;
  macros: { carbs?: number; protein?: number; fat?: number } | null;
  health_score: number | null;
  created_at: string;
  family_member_id: string | null;
}

export function getTrafficLight(score: number | null): 'green' | 'yellow' | 'red' {
  if (score == null) return 'yellow';
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

export function calculateFamilyScore(meals: MealRecord[]): number {
  if (meals.length === 0) return 0;
  const greenCount = meals.filter((m) => getTrafficLight(m.health_score) === 'green').length;
  const yellowCount = meals.filter((m) => getTrafficLight(m.health_score) === 'yellow').length;
  const redCount = meals.filter((m) => getTrafficLight(m.health_score) === 'red').length;
  return Math.round(
    ((greenCount * 10 + yellowCount * 6 + redCount * 2) / (meals.length * 10)) * 100
  );
}

export function calculateAvgCalories(meals: MealRecord[]): number {
  if (meals.length === 0) return 0;
  return Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0) / meals.length);
}

export function calculateMacroBreakdown(meals: MealRecord[]): {
  carbs: number;
  protein: number;
  fat: number;
  carbsPct: number;
  proteinPct: number;
  fatPct: number;
} {
  const totals = meals.reduce(
    (acc, m) => {
      const macros = m.macros || {};
      return {
        carbs: acc.carbs + (macros.carbs || 0),
        protein: acc.protein + (macros.protein || 0),
        fat: acc.fat + (macros.fat || 0),
      };
    },
    { carbs: 0, protein: 0, fat: 0 }
  );

  const avg = meals.length > 0
    ? { carbs: totals.carbs / meals.length, protein: totals.protein / meals.length, fat: totals.fat / meals.length }
    : { carbs: 0, protein: 0, fat: 0 };

  const totalGrams = avg.carbs + avg.protein + avg.fat;
  const carbsPct = totalGrams > 0 ? Math.round((avg.carbs / totalGrams) * 100) : 33;
  const proteinPct = totalGrams > 0 ? Math.round((avg.protein / totalGrams) * 100) : 33;
  const fatPct = Math.max(0, 100 - carbsPct - proteinPct);

  return { ...avg, carbsPct, proteinPct, fatPct };
}

export function getDailyCalories(meals: MealRecord[], numDays: number, startDate: Date): number[] {
  const dailyCals: number[] = new Array(numDays).fill(0);
  meals.forEach((meal) => {
    const mealDate = new Date(meal.created_at);
    const dayIndex = Math.floor((mealDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dayIndex >= 0 && dayIndex < numDays) {
      dailyCals[dayIndex] += meal.calories || 0;
    }
  });
  return dailyCals;
}

export function getTopDish(meals: MealRecord[]): { name: string; count: number } | null {
  const counts: Record<string, number> = {};
  meals.forEach((m) => {
    counts[m.food_name] = (counts[m.food_name] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? { name: top[0], count: top[1] } : null;
}

export function getMemberScore(meals: MealRecord[], memberId: string): number {
  const memberMeals = meals.filter((m) => m.family_member_id === memberId);
  return calculateFamilyScore(memberMeals);
}

export function getWeeklyTrend(meals: MealRecord[], weeksBack: number = 4): {
  week: string;
  score: number;
  meals: number;
}[] {
  const now = new Date();
  const trend: { week: string; score: number; meals: number }[] = [];

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekMeals = meals.filter((m) => {
      const d = new Date(m.created_at);
      return d >= weekStart && d <= weekEnd;
    });

    trend.push({
      week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: calculateFamilyScore(weekMeals),
      meals: weekMeals.length,
    });
  }

  return trend;
}
