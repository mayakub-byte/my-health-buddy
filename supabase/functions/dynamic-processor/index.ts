import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');

const JSON_SYSTEM_PROMPT = 'You are a food recognition API. Respond with ONLY valid JSON. No text before or after the JSON object. No markdown backticks. No explanation. No commentary. Just the raw JSON object starting with { and ending with }.';

// Robust JSON extraction — handles text before/after JSON, markdown fences, etc.
function extractJSON(raw: string): any {
  let text = raw.trim();

  // 1. Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // 2. Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {
    // continue to fallback strategies
  }

  // 3. Extract JSON using regex — find the outermost { ... }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      // continue
    }
  }

  // 4. Strip everything before first '{' and after last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const sliced = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(sliced);
    } catch (_) {
      // continue
    }
  }

  // 5. All strategies failed
  throw new Error(`Failed to extract JSON from Claude response. Raw start: "${text.substring(0, 100)}..."`);
}

const FOOD_RECOGNITION_PROMPT = `You are a world-class food recognition AI and a culturally-aware Telugu family nutrition companion.

YOUR PRIMARY JOB: Identify EXACTLY what food is in this image with high accuracy.
YOUR SECONDARY JOB: Provide practical, small modifications — NOT lectures about calories.

CONTEXT: You're helping a busy working mother in urban Hyderabad/Telangana
who cooks ONE meal for the entire family. She already knows what she's cooking.
She wants validation + small, actionable tweaks she can implement NOW.

═══════════════════════════════════════════
STEP 1: FOOD RECOGNITION (BE PRECISE)
═══════════════════════════════════════════

VISUAL ANALYSIS RULES:
- Look at COLOR, TEXTURE, SHAPE, CONTAINER, GARNISH, and STEAM/MOISTURE
- Identify EACH distinct dish separately (a thali may have 4-6 items)
- For each dish, assess your confidence: high (>85%), medium (60-85%), low (<60%)
- If confidence is medium or low, provide 2-3 alternatives with reasoning

COMMON MISIDENTIFICATION TRAPS — BE CAREFUL:
- Green chutney (mint/coriander) vs guacamole vs palak paste
- Falafel vs vada vs aloo tikki vs dal vada
- Naan vs pita vs kulcha vs parotta
- Sambar vs rasam vs dal vs curry (look at thickness and color)
- Idli vs appam vs puttu (shape and texture matter)
- Dosa vs crepe vs uttapam (look at thickness, holes, toppings)
- Biryani vs pulao vs fried rice (look at layering, color, spices visible)
- Chapati vs roti vs phulka vs paratha (look at layers, oil sheen, thickness)
- Paneer vs tofu vs cheese (look at texture, browning pattern)
- Upma vs poha vs sevai (look at grain shape and color)

BREAD TYPE DISAMBIGUATION:
If bread is detected, specify EXACTLY which type:
- Chapati/Roti (thin, round, dry-cooked, slight char marks)
- Paratha (layered, flaky, oil/ghee sheen, golden-brown)
- Naan (teardrop shape, charred spots from tandoor, thicker)
- Kulcha (round naan-like, often stuffed, softer)
- Puri (small, round, puffed, deep-fried, golden)
- Bhature (large, puffed, deep-fried, slightly crispy)
- Parotta/Porotta (layered, torn look, Kerala/South Indian style)
- Dosa (thin, crispy, large, fermented rice-lentil batter)
- Pesarattu (green moong dal dosa, speckled)
- Appam (bowl-shaped, lacy edges, soft center)

GLOBAL CUISINE SUPPORT:
Recognize foods from ALL cuisines accurately:
- South Indian: idli, dosa, vada, uttapam, pesarattu, appam, puttu, upma
- Telugu: pappu, kura, pulusu, pachadi, perugu, gongura, gutti vankaya
- North Indian: roti, paratha, dal makhani, paneer dishes, chole, rajma
- Chinese/Indo-Chinese: fried rice, noodles, manchurian, chilli chicken
- Continental: pasta, pizza, burgers, sandwiches, salads
- Middle Eastern: hummus, falafel, shawarma, pita
- South East Asian: pad thai, sushi, ramen, pho
- Street food: pani puri, chaat, samosa, vada pav, dosa variations

═══════════════════════════════════════════
STEP 2: RESPOND WITH THIS EXACT JSON
═══════════════════════════════════════════
{
  "detected_dishes": [
    {
      "name": "Specific dish name",
      "name_telugu": "తెలుగు పేరు or null if not Telugu",
      "confidence": "high/medium/low",
      "confidence_pct": 92,
      "alternatives": [
        {"name": "Alternative dish name", "reason": "Why it could be this instead"}
      ],
      "portion": "small/medium/large",
      "estimated_calories": 250,
      "protein_g": 8,
      "carbs_g": 40,
      "fat_g": 6,
      "fiber_g": 3,
      "visual_cues": "Golden brown, layered texture, oil sheen suggests paratha not roti"
    }
  ],
  "verification_questions": [
    "Is the green paste mint chutney or something else?",
    "Is this made with oil or ghee?"
  ],
  "meal_name": "Descriptive meal name",
  "meal_name_telugu": "తెలుగు పేరు",
  "dishes": [
    {
      "name": "Dish name",
      "name_telugu": "తెలుగు పేరు",
      "portion": "small/medium/large",
      "estimated_calories": 250,
      "protein_g": 8,
      "carbs_g": 40,
      "fat_g": 6,
      "fiber_g": 3
    }
  ],
  "total_calories": 500,
  "total_protein_g": 15,
  "total_carbs_g": 65,
  "total_fat_g": 12,
  "total_fiber_g": 5,
  "glycemic_index": "low/medium/high",
  "traffic_light": "green/yellow/red",
  "traffic_light_reason": "Brief reason for the rating",
  "quick_verdict": "One-line friendly verdict like a friend would say",
  "before_cooking_tips": [
    "Add 10-12 almonds to chutney WHILE grinding for extra protein",
    "Use brown rice instead of white rice for better fiber"
  ],
  "per_member_guidance": {
    "diabetic": {
      "traffic_light": "yellow",
      "tip": "Reduce rice to half cup, extra sambar for protein",
      "avoid": "Skip the pickle — high sodium"
    },
    "hypertension": {
      "traffic_light": "red",
      "tip": "Skip pickle, add cucumber raita instead",
      "avoid": "Papad has high sodium"
    },
    "child": {
      "traffic_light": "green",
      "tip": "Good balanced meal! Add a glass of milk",
      "avoid": null
    },
    "senior": {
      "traffic_light": "yellow",
      "tip": "Soft idlis are good, add warm dal for easier digestion",
      "avoid": "Reduce oil in tempering"
    },
    "weight_loss": {
      "traffic_light": "yellow",
      "tip": "Reduce rice portion by 1/4, increase dal portion",
      "avoid": "Skip the fried items"
    },
    "general_adult": {
      "traffic_light": "green",
      "tip": "Well-balanced Telugu meal!",
      "avoid": null
    }
  },
  "culturally_appropriate_swaps": [
    "Use pesarattu instead of regular dosa for more protein",
    "Add gongura (sorrel leaves) for iron and vitamin C",
    "Try ragi mudde instead of rice once a week"
  ],
  "is_telugu_meal": true,
  "ayurvedic_note": "Specific note about this meal's properties"
}

═══════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════

1. ACCURATE FOOD IDENTIFICATION:
   - When unsure, say so! Use "medium" or "low" confidence
   - ALWAYS provide alternatives for medium/low confidence items
   - Include visual_cues explaining WHY you identified each dish
   - verification_questions: Ask 1-3 clarifying questions if ANY item is ambiguous

2. ACCURATE CALORIES — use real nutritional data:
   - 1 idli = 60-70 kcal, 1 dosa = 120-150 kcal
   - 1 cup rice = 200-240 kcal, 1 roti = 100-120 kcal
   - 1 paratha = 200-260 kcal (higher than roti due to oil/ghee)
   - Chicken biryani (1 serving) = 500-700 kcal
   - Mutton biryani (1 serving) = 600-800 kcal
   - Sambar (1 cup) = 120-150 kcal
   - Dal (1 cup) = 150-180 kcal
   - 1 puri = 100-120 kcal (deep-fried)
   - Paneer curry (1 cup) = 300-400 kcal
   - Curd rice (1 cup) = 200-250 kcal

3. CULTURALLY APPROPRIATE suggestions only:
   ✅ Brown rice, ragi, jowar, bajra, pesarattu, gongura, palak
   ❌ Quinoa, kale, chia seeds, avocado, tofu

4. SMALL MODIFICATIONS only — never suggest completely different meals:
   ✅ "Add almonds to chutney while grinding"
   ✅ "Reduce rice portion by 1/4 cup"
   ✅ "Skip pickle for BP patient"
   ❌ "Replace biryani with salad"
   ❌ "Don't eat rice, switch to quinoa"

5. FRIENDLY TONE — like a knowledgeable friend, not a strict nutritionist
   ✅ "Great choice! Just add some dal for extra protein"
   ❌ "This meal is deficient in protein and exceeds carbohydrate limits"

6. TRAFFIC LIGHT must be accurate:
   🟢 Green: Balanced, within healthy range
   🟡 Yellow: Acceptable but one area needs attention
   🔴 Red: Multiple nutritional concerns

7. per_member_guidance: Only include guidance types relevant to the
   detected meal. Always include "general_adult" and "child".
   Include condition-specific ones only when relevant.

8. before_cooking_tips: Frame as things to do WHILE cooking, not after.
   These should be implementable RIGHT NOW.

9. detected_dishes vs dishes: "detected_dishes" has full confidence + alternatives info.
   "dishes" is the simplified nutrition-only array (for backward compat). Keep BOTH in sync.

10. If FAMILY_MEMBER_PROFILES are provided below, ALSO return a "family_member_scores"
    array with a SEPARATE entry per named member. Each member gets their OWN score and
    suggestion based on their age and health conditions. A diabetic elder eating rice
    should score MUCH LOWER than a growing child eating the same meal.`;

function buildMemberBlock(memberProfiles: any[]): string {
  if (!memberProfiles || memberProfiles.length === 0) return '';
  const lines = memberProfiles.map((m: any) => {
    const conditions = Array.isArray(m.conditions) ? m.conditions.filter((c: string) => c !== 'none').join(', ') : 'none';
    return `- ${m.name} (age ${m.age}, relationship: ${m.relationship || 'family'}, health: ${conditions || 'none'})`;
  }).join('\n');
  return `

FAMILY MEMBER PROFILES EATING THIS MEAL:
${lines}

CRITICAL: In addition to per_member_guidance, return a "family_member_scores" array:
[
  {
    "name": "Member Name",
    "score": 75,
    "traffic_light": "green",
    "tip": "Personalized tip for THIS specific member based on their age and conditions",
    "avoid": "What this member should avoid or null",
    "reason": "Why this score for this member"
  }
]
RULES for family_member_scores:
- A diabetic person eating rice/biryani scores 30-45 (RED). A healthy child eating the same meal scores 70-85 (GREEN).
- Someone with hypertension eating pickles/papad gets a WARNING and lower score.
- Growing children (age <18) generally score HIGHER on carb-heavy meals.
- Seniors (age >60) with conditions get LOWER scores than healthy adults.
- Each member MUST get a DIFFERENT score and DIFFERENT tip specific to their condition.
- NEVER give the same score to members with different health profiles.`;
}

function buildVoiceBlock(voiceContext: string): string {
  if (!voiceContext || voiceContext.trim() === '') return '';
  return `

USER VOICE CONTEXT: "${voiceContext.trim()}"
The user has provided additional context about this meal. Use this to correct any AI misidentification and adjust the analysis accordingly. For example, if the user says "this is sourdough bread, not regular bread" — trust the user's correction.`;
}

function buildFoodProfileBlock(foodProfile: any): string {
  if (!foodProfile) return '';
  const { recentMeals, preferredCuisine, commonDishes } = foodProfile;
  const parts: string[] = [];
  if (preferredCuisine) {
    parts.push(`Preferred cuisine: ${preferredCuisine}`);
  }
  if (commonDishes && Array.isArray(commonDishes) && commonDishes.length > 0) {
    parts.push(`Commonly eaten dishes: ${commonDishes.join(', ')}`);
  }
  if (recentMeals && Array.isArray(recentMeals) && recentMeals.length > 0) {
    parts.push(`Recent meals this week: ${recentMeals.slice(0, 10).join(', ')}`);
  }
  if (parts.length === 0) return '';
  return `

USER FOOD PROFILE (use this to improve dish identification — if a family regularly eats Telugu meals, an ambiguous item is more likely to be a Telugu dish):
${parts.join('\n')}`;
}

const CORRECTION_PROMPT = `You are re-analyzing a meal based on USER CORRECTIONS.
The AI previously detected certain foods, but the user has corrected the identification.

ORIGINAL AI DETECTION:
{ORIGINAL_DISHES}

USER CORRECTION: "{USER_CORRECTION}"

RULES:
1. TRUST THE USER'S CORRECTION over the original AI detection
2. Re-calculate ALL nutrition values based on the corrected food items
3. Keep the same JSON response format as the original analysis
4. Update detected_dishes with corrected items (set confidence to "high" for user-confirmed items)
5. Recalculate total_calories, macros, traffic_light, and all guidance
6. Keep any items the user did NOT correct — only change what they specified
7. If the user says "remove X" — remove that item entirely
8. If the user says "add Y" — add it as a new detected dish
9. If the user says "X is actually Y" — replace X with Y and recalculate

Respond with the COMPLETE updated JSON (same structure as original analysis).`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured in secrets');
    }

    const body = await req.json();
    const { type, image_base64, media_type, mealDescription, portion, mealNames, memberCount, memberProfiles, voiceContext, foodProfile, dietaryPreference } = body;

    // Grocery list generation
    if (type === 'grocery') {
      if (!mealNames || !Array.isArray(mealNames) || mealNames.length === 0) {
        throw new Error('mealNames array required for grocery list');
      }
      const groceryPrompt = `Based on these meals eaten this week by a Telugu family in Hyderabad:
${mealNames.join(', ')}
Generate a grocery shopping list for NEXT WEEK assuming similar meals.
Family size: ${memberCount || 4} members.
RULES:
Use Telugu/Indian ingredient names with English in brackets
Group by store section
Include approximate quantities for the family size
Include estimated costs in INR (Hyderabad prices 2025-26)
Add 2-3 smart suggestions that fill nutrition gaps based on the meals

Respond ONLY with this JSON (no other text, no markdown):
{
  "grocery_list": [
    {
      "category": "Vegetables",
      "emoji": "🥬",
      "items": [
        { "name": "Ullipayalu (Onions)", "quantity": "2 kg", "cost": "₹60" },
        { "name": "Tomatoes", "quantity": "1 kg", "cost": "₹40" }
      ]
    },
    {
      "category": "Rice & Grains",
      "emoji": "🍚",
      "items": []
    },
    {
      "category": "Lentils & Dal",
      "emoji": "🫘",
      "items": []
    },
    {
      "category": "Spices & Masalas",
      "emoji": "🌶️",
      "items": []
    },
    {
      "category": "Dairy & Eggs",
      "emoji": "🥛",
      "items": []
    },
    {
      "category": "Meat & Fish",
      "emoji": "🍗",
      "items": []
    },
    {
      "category": "Oils & Condiments",
      "emoji": "🫒",
      "items": []
    }
  ],
  "estimated_total": "₹2,500",
  "smart_tips": [
    "Add palakura (spinach) — your family's iron intake was low this week",
    "Stock up on pesalu (moong dal) — great for quick pesarattu breakfasts"
  ]
}`;
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: JSON_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: groceryPrompt }],
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude API error:', response.status, errText);
        throw new Error(`Claude API error: ${response.status}`);
      }
      const data = await response.json();
      const textContent = data.content.find((c: any) => c.type === 'text');
      if (!textContent?.text) throw new Error('No text in Claude response');
      const parsed = extractJSON(textContent.text);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Weekly meal plan generation
    if (type === 'meal_plan') {
      const memberBlock = memberProfiles && Array.isArray(memberProfiles) && memberProfiles.length > 0
        ? '\nFamily members:\n' + memberProfiles.map((m: any) =>
            `- ${m.name}: age ${m.age}, conditions: ${(m.conditions || []).join(', ') || 'none'}`
          ).join('\n')
        : '';
      const recentMealsBlock = mealNames && Array.isArray(mealNames) && mealNames.length > 0
        ? `\nRecent meals eaten: ${mealNames.slice(0, 20).join(', ')}`
        : '';
      const dietBlock = dietaryPreference ? `\nDietary preference: ${dietaryPreference}` : '';

      const mealPlanPrompt = `You are a Telugu family nutrition planner. Generate a practical 7-day meal plan for a family in Hyderabad.
${recentMealsBlock}
Family size: ${memberCount || 4} members${memberBlock}${dietBlock}

RULES:
- Use Telugu/South Indian cuisine primarily (idli, dosa, rice, dal, roti, curries, etc.)
- Account for health conditions (low-sugar for diabetics, low-salt for hypertension, etc.)
- Include variety — don't repeat the same dish across days
- Suggest practical, home-cookable meals
- Include Telugu names where applicable
- Balance nutrition across the day

Respond ONLY with this JSON (no other text, no markdown):
{
  "meal_plan": [
    {
      "day": "Monday",
      "breakfast": { "name": "Pesarattu & Upma", "name_telugu": "పెసరట్టు & ఉప్మా", "calories": 280, "health_note": "Rich in protein" },
      "lunch": { "name": "Rice, Dal & Palakura", "name_telugu": "అన్నం, పప్పు & పాలకూర", "calories": 450, "health_note": "Iron-rich greens" },
      "snack": { "name": "Fruit Chaat", "name_telugu": "ఫ్రూట్ చాట్", "calories": 120, "health_note": "Natural sugars" },
      "dinner": { "name": "Roti & Mixed Veg Curry", "name_telugu": "రోటీ & మిక్స్ వెజ్ కర్రీ", "calories": 380, "health_note": "Light dinner" }
    }
  ],
  "weekly_summary": "Brief note about the plan's nutritional balance",
  "health_notes": ["Specific note for family members with conditions"]
}`;
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          system: JSON_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: mealPlanPrompt }],
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude API error:', response.status, errText);
        throw new Error(`Claude API error: ${response.status}`);
      }
      const data = await response.json();
      const textContent = data.content.find((c: any) => c.type === 'text');
      if (!textContent?.text) throw new Error('No text in Claude response');
      const parsed = extractJSON(textContent.text);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Text-only analysis
    if (type === 'text') {
      if (!mealDescription) {
        throw new Error('No meal description provided');
      }

      const textPrompt = `${FOOD_RECOGNITION_PROMPT}${buildMemberBlock(memberProfiles)}${buildFoodProfileBlock(foodProfile)}${buildVoiceBlock(voiceContext)}

IMPORTANT: Analyze this meal based on the TEXT DESCRIPTION only (no image):
Meal description: "${mealDescription}"
Portion size: ${portion || 'medium'}

Respond with the same JSON structure as image analysis. Use your knowledge of Telugu cuisine and nutrition to estimate calories, macros, and provide guidance.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          temperature: 0,
          system: JSON_SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: textPrompt
          }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude API error:', response.status, errText);
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const textContent = data.content.find((c: any) => c.type === 'text');
      if (!textContent?.text) throw new Error('No text in Claude response');
      const parsed = extractJSON(textContent.text);

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Correction re-analysis
    if (type === 'correction') {
      const { correction_text, original_dishes, image_base64: corrImg, media_type: corrMedia } = body;
      if (!correction_text) {
        throw new Error('No correction text provided');
      }
      const originalDishesStr = JSON.stringify(original_dishes || [], null, 2);
      const correctionPrompt = CORRECTION_PROMPT
        .replace('{ORIGINAL_DISHES}', originalDishesStr)
        .replace('{USER_CORRECTION}', correction_text.trim());

      const fullCorrectionPrompt = `${correctionPrompt}${buildMemberBlock(memberProfiles)}`;

      // Build message content — include image if available for visual re-verification
      const messageContent: any[] = [];
      if (corrImg) {
        messageContent.push({
          type: 'image',
          source: { type: 'base64', media_type: corrMedia || 'image/jpeg', data: corrImg }
        });
      }
      messageContent.push({ type: 'text', text: fullCorrectionPrompt });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          temperature: 0,
          system: JSON_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: messageContent }]
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude correction API error:', response.status, errText);
        throw new Error(`Claude API error: ${response.status}`);
      }
      const data = await response.json();
      const textContent = data.content.find((c: any) => c.type === 'text');
      if (!textContent?.text) throw new Error('No text in Claude response');
      const parsed = extractJSON(textContent.text);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Image-based analysis (legacy support)
    if (!image_base64) {
      throw new Error('No image provided');
    }

    const fullImagePrompt = `${FOOD_RECOGNITION_PROMPT}${buildMemberBlock(memberProfiles)}${buildFoodProfileBlock(foodProfile)}${buildVoiceBlock(voiceContext)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0,
        system: JSON_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: media_type || 'image/jpeg', data: image_base64 }
            },
            { type: 'text', text: fullImagePrompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.content.find((c: any) => c.type === 'text');
    if (!textContent?.text) throw new Error('No text in Claude response');
    const parsed = extractJSON(textContent.text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
