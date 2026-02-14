// ============================================
// MY HEALTH BUDDY - Results Page
// THE WOW MOMENT - Personalized family scores
// ============================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { supabase } from '../lib/supabase';
import type { Meal, MealScore, FamilyMember } from '../types';

export default function Results() {
  const { mealId } = useParams<{ mealId: string }>();
  const navigate = useNavigate();
  const { family, members } = useFamily();

  const [meal, setMeal] = useState<Meal | null>(null);
  const [scores, setScores] = useState<MealScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (mealId && family) {
      loadMealAndScores();
    }
  }, [mealId, family]);

  const loadMealAndScores = async () => {
    if (!mealId || !family) return;
    setLoadError(null);
    try {
      const { data: mealData, error: mealError } = await supabase
        .from('meals')
        .select('*')
        .eq('id', mealId)
        .single();

      if (mealError) {
        console.error('Results meals query failed:', mealError.message);
        setLoadError(mealError.message);
        return;
      }
      setMeal(mealData);

      const { data: existingScores, error: scoresError } = await supabase
        .from('meal_scores')
        .select('*')
        .eq('meal_id', mealId);

      if (scoresError) {
        console.error('Results meal_scores query failed:', scoresError.message);
        setLoadError(scoresError.message);
        return;
      }
      if (existingScores && existingScores.length > 0) {
        setScores(existingScores);
      } else {
        const generatedScores = await generateScoresForFamily(mealData, members);
        setScores(generatedScores);
      }
    } catch (err) {
      console.error('Error loading meal:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // Generate personalized scores based on health conditions
  const generateScoresForFamily = async (
    meal: Meal,
    familyMembers: FamilyMember[]
  ): Promise<MealScore[]> => {
    const newScores: MealScore[] = [];

    for (const member of familyMembers) {
      const score = calculatePersonalizedScore(meal, member);
      
      // Save to database
      const { data, error } = await supabase
        .from('meal_scores')
        .insert({
          meal_id: meal.id,
          member_id: member.id,
          ...score,
        })
        .select()
        .single();

      if (error) {
        console.error('meal_scores insert failed for member', member.id, error.message);
      }
      if (!error && data) {
        newScores.push(data);
      }
    }

    return newScores;
  };

  // Calculate personalized score based on health conditions
  const calculatePersonalizedScore = (
    meal: Meal,
    member: FamilyMember
  ): Omit<MealScore, 'id' | 'meal_id' | 'member_id' | 'created_at'> => {
    const nutrition = meal.total_nutrition;
    const conditions = member.health_conditions || [];

    let baseScore = 7; // Start with a good score
    const suggestions: string[] = [];
    let keyInsight = 'Balanced meal!';

    // Adjust based on health conditions
    if (conditions.includes('diabetes') || conditions.includes('pre_diabetic')) {
      if (nutrition.carbs > 50) {
        baseScore -= 2;
        suggestions.push('Reduce rice portion by half for better sugar control');
        keyInsight = 'High carbs - watch your sugar levels';
      }
      if (nutrition.fiber > 5) {
        baseScore += 1;
        suggestions.push('Great fiber content! Keep it up');
      }
    }

    if (conditions.includes('bp')) {
      suggestions.push('Good choice! Avoid adding extra salt');
      if (nutrition.fat > 15) {
        baseScore -= 1;
        keyInsight = 'Moderate the oil/ghee in cooking';
      }
    }

    if (conditions.includes('weight_management')) {
      if (nutrition.calories > 400) {
        baseScore -= 1;
        suggestions.push('Consider smaller portions for calorie control');
        keyInsight = 'Calories are on the higher side';
      }
      if (nutrition.protein > 10) {
        baseScore += 1;
        suggestions.push('Good protein! Keeps you full longer');
      }
    }

    if (conditions.includes('cholesterol')) {
      if (nutrition.fat > 12) {
        baseScore -= 1;
        suggestions.push('Try using less oil in cooking');
      }
    }

    // Age-based adjustments
    if (member.age && member.age < 12) {
      if (nutrition.protein < 8) {
        suggestions.push('Add curd or dal for growing kids');
      }
      baseScore = Math.min(baseScore + 1, 10); // Kids get a bonus!
      keyInsight = 'Good meal for growing up strong! 💪';
    }

    if (member.age && member.age > 60) {
      suggestions.push('Easy to digest - good choice!');
    }

    // Ensure score is within bounds
    const finalScore = Math.max(1, Math.min(10, baseScore));

    // Add a general positive suggestion if none exist
    if (suggestions.length === 0) {
      suggestions.push('Add a small serving of curd for probiotics');
    }

    return {
      overall_score: finalScore,
      score_breakdown: {
        carb_score: nutrition.carbs < 45 ? 8 : 5,
        protein_score: nutrition.protein > 8 ? 8 : 5,
        fiber_score: nutrition.fiber > 4 ? 8 : 5,
        balance_score: finalScore,
      },
      macros: nutrition,
      key_insight: keyInsight,
      suggestions,
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'score-great';
    if (score >= 5) return 'score-good';
    return 'score-needs-attention';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 8) return '🌟';
    if (score >= 5) return '👍';
    return '💪';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F1EA' }}>
        <div className="flex justify-center py-12">
          <span className="animate-bounce text-2xl" aria-hidden>🍽️</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F4F1EA' }}>
        <div className="text-center py-12">
          <span className="text-3xl" aria-hidden>😕</span>
          <p className="text-gray-600 mt-2">Something went wrong</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-[#5C6B4A] text-white rounded-full text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F4F1EA' }}>
        <div className="text-center py-12">
          <span className="text-3xl" aria-hidden>🍽️</span>
          <p className="text-gray-600 mt-2">Meal not found</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-3 px-4 py-2 bg-[#5C6B4A] text-white rounded-full text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Header */}
      <div className="bg-[#FDFBF7] px-6 py-4 border-b border-neutral-100 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2" aria-label="Go back">
            <ArrowLeft className="w-6 h-6 text-neutral-600" />
          </button>
          <h1 className="text-lg font-semibold text-neutral-800">Meal Analysis</h1>
          <button type="button" className="p-2 -mr-2" aria-label="Share">
            <Share2 className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Meal Photo & Info */}
        {meal.photo_url && (
          <div className="relative">
            <img
              src={meal.photo_url}
              alt="Meal"
              className="w-full aspect-video object-cover rounded-2xl"
            />
            <div className="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm capitalize">
              {meal.meal_type} • {meal.confirmed_dishes?.length || 0} dishes
            </div>
          </div>
        )}

        {/* Family Scores - THE WOW MOMENT! */}
        <div>
          <h2 className="text-xl font-bold text-neutral-800 mb-1">
            Scores for {family?.name}
          </h2>
          <p className="text-neutral-500 text-sm mb-4">
            Same meal, personalized for each member
          </p>

          <div className="space-y-4">
            {members.map((member) => {
              const memberScore = scores.find((s) => s.member_id === member.id);
              if (!memberScore) return null;

              return (
                <ScoreCard
                  key={member.id}
                  member={member}
                  score={memberScore}
                  getScoreColor={getScoreColor}
                  getScoreEmoji={getScoreEmoji}
                />
              );
            })}
          </div>
        </div>

        {/* One Small Change */}
        <div className="bg-gradient-to-r from-primary-50 to-green-50 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-800 mb-1">
                One small change for everyone
              </h3>
              <p className="text-sm text-primary-700">
                Add a small bowl of curd (50g) to boost protein and probiotics for the whole family! 🥛
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual score card component
function ScoreCard({
  member,
  score,
  getScoreColor,
  getScoreEmoji,
}: {
  member: FamilyMember;
  score: MealScore;
  getScoreColor: (score: number) => string;
  getScoreEmoji: (score: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4"
        aria-label={expanded ? `Collapse details for ${member.name}` : `Expand details for ${member.name}`}
      >
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: member.avatar_color }}
        >
          {member.name.charAt(0).toUpperCase()}
        </div>

        {/* Name & Insight */}
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-neutral-800">{member.name}</h3>
          <p className="text-sm text-neutral-500">{score.key_insight}</p>
        </div>

        {/* Score Badge */}
        <div className="flex items-center gap-2">
          <div className={`score-badge ${getScoreColor(score.overall_score)}`}>
            {score.overall_score}
          </div>
          <span className="text-xl">{getScoreEmoji(score.overall_score)}</span>
        </div>

        {/* Expand Icon */}
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-neutral-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-400" />
        )}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          {/* Macros */}
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
            <div className="rounded-lg p-2" style={{ backgroundColor: '#FDFBF7' }}>
              <p className="text-lg font-bold text-neutral-800">
                {Math.round(score.macros.carbs)}g
              </p>
              <p className="text-xs text-neutral-500">Carbs</p>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: '#FDFBF7' }}>
              <p className="text-lg font-bold text-neutral-800">
                {Math.round(score.macros.protein)}g
              </p>
              <p className="text-xs text-neutral-500">Protein</p>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: '#FDFBF7' }}>
              <p className="text-lg font-bold text-neutral-800">
                {Math.round(score.macros.fat)}g
              </p>
              <p className="text-xs text-neutral-500">Fat</p>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: '#FDFBF7' }}>
              <p className="text-lg font-bold text-neutral-800">
                {Math.round(score.macros.fiber)}g
              </p>
              <p className="text-xs text-neutral-500">Fiber</p>
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-2">
              Suggestions for {member.name}
            </h4>
            <ul className="space-y-2">
              {score.suggestions.map((suggestion, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-neutral-600"
                >
                  <span className="text-primary-500">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {/* Health Conditions */}
          {member.health_conditions && member.health_conditions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {member.health_conditions
                .filter((c) => c !== 'none')
                .map((condition) => (
                  <span key={condition} className="health-tag capitalize">
                    {condition.replace('_', ' ')}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
