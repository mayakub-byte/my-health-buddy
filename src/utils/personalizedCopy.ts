// ============================================
// MY HEALTH BUDDY - Personalized Copy Utility
// Dynamic, warm messages based on user context
// ============================================

interface CopyContext {
  userName: string;
  familyMembers: { name: string; id: string }[];
  todayMealsCount: number;
  yesterdayTopMeal?: string;
  weeklyMealsCount?: number;
  bestDayThisWeek?: string;
  bestScore?: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

function getTimeOfDay(): CopyContext['timeOfDay'] {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildCopyContext(
  userName: string,
  familyMembers: { name: string; id: string }[],
  todayMealsCount: number,
  opts?: {
    yesterdayTopMeal?: string;
    weeklyMealsCount?: number;
    bestDayThisWeek?: string;
    bestScore?: number;
  }
): CopyContext {
  return {
    userName: userName || 'there',
    familyMembers,
    todayMealsCount,
    yesterdayTopMeal: opts?.yesterdayTopMeal,
    weeklyMealsCount: opts?.weeklyMealsCount,
    bestDayThisWeek: opts?.bestDayThisWeek,
    bestScore: opts?.bestScore,
    timeOfDay: getTimeOfDay(),
  };
}

export function getDashboardGreeting(ctx: CopyContext): string {
  const { userName, todayMealsCount, timeOfDay } = ctx;

  if (timeOfDay === 'morning' && todayMealsCount === 0) {
    return pick([
      `Good morning, ${userName}! What's the family having for breakfast?`,
      `Morning, ${userName}! Ready to start the day with a healthy meal?`,
      `Rise and shine, ${userName}! Let's fuel the family right today.`,
    ]);
  }

  if (timeOfDay === 'morning' && todayMealsCount > 0) {
    return `Great start, ${userName}! ${todayMealsCount} meal${todayMealsCount > 1 ? 's' : ''} logged already this morning.`;
  }

  if (timeOfDay === 'afternoon' && todayMealsCount === 0) {
    return pick([
      `Afternoon, ${userName}! Nothing logged yet — quick snap before lunch?`,
      `Hey ${userName}, lunchtime! Don't forget to log what you're having.`,
    ]);
  }

  if (timeOfDay === 'afternoon' && todayMealsCount > 0) {
    return `Afternoon, ${userName}! ${todayMealsCount} meal${todayMealsCount > 1 ? 's' : ''} tracked so far. Keep it going!`;
  }

  if (timeOfDay === 'evening' && todayMealsCount === 0) {
    return pick([
      `Hey ${userName}, nothing logged today. Quick snap before dinner?`,
      `Evening, ${userName}! It's not too late to start tracking today.`,
    ]);
  }

  if (timeOfDay === 'evening' && todayMealsCount > 0) {
    return `Evening, ${userName}! Great day — ${todayMealsCount} meal${todayMealsCount > 1 ? 's' : ''} tracked. What's for dinner?`;
  }

  if (timeOfDay === 'night') {
    return todayMealsCount > 0
      ? `Nice work today, ${userName}! ${todayMealsCount} meals logged. Rest well!`
      : `Good night, ${userName}! Tomorrow's a fresh start for healthy eating.`;
  }

  return `Hey ${userName}! What did you cook today?`;
}

export function getHistoryHeader(ctx: CopyContext): string {
  const { weeklyMealsCount, bestDayThisWeek, bestScore, userName } = ctx;

  if (weeklyMealsCount && weeklyMealsCount > 0) {
    if (bestDayThisWeek && bestScore) {
      return `This week: ${weeklyMealsCount} meals logged. Best day: ${bestDayThisWeek} (score ${bestScore}). Keep it up!`;
    }
    return `Your family logged ${weeklyMealsCount} meals this week. Great progress, ${userName}!`;
  }

  return `Your family's meal log — every scan tells a story.`;
}

export function getEmptyStateMessage(ctx: CopyContext): string {
  const { userName } = ctx;
  return pick([
    `Nothing here yet, ${userName}. Snap your first meal to get started!`,
    `Your meal history starts with one photo. Ready, ${userName}?`,
    `Empty plate! Snap a meal and let's fill this up, ${userName}.`,
  ]);
}

export function getMealAnalysisCelebration(memberName: string, score: number): string {
  if (score >= 70) {
    return pick([
      `Excellent choice for ${memberName}! This is exactly what they need.`,
      `Amazing meal for ${memberName}! Nutritionally on point.`,
      `${memberName} is eating like a champ! Great balance.`,
    ]);
  }
  if (score >= 40) {
    return pick([
      `Good meal for ${memberName}! A little more protein next time would make it perfect.`,
      `Decent pick for ${memberName}. Try adding some greens for a boost.`,
      `Not bad for ${memberName}! Small tweaks can take this to the next level.`,
    ]);
  }
  return pick([
    `Noted for ${memberName}. Try adding some greens next time for a boost.`,
    `Room to improve for ${memberName} — consider more veggies and protein.`,
    `Let's aim higher for ${memberName} next meal. Every step counts!`,
  ]);
}
