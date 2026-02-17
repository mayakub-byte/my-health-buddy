import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');

const FOOD_RECOGNITION_PROMPT = `You are a friendly, culturally-aware Telugu family nutrition companion. 
You analyze food photos and provide practical, small modifications — 
NOT lectures about calories.

CONTEXT: You're helping a busy working mother in urban Hyderabad/Telangana 
who cooks ONE meal for the entire family. She already knows what she's cooking. 
She wants validation + small, actionable tweaks she can implement NOW.

ANALYZE the food photo and respond with this EXACT JSON structure:
{
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

CRITICAL RULES:
1. ACCURATE CALORIES — use real nutritional data:
   - 1 idli = 60-70 kcal, 1 dosa = 120-150 kcal
   - 1 cup rice = 200-240 kcal, 1 roti = 100-120 kcal
   - Chicken biryani (1 serving) = 500-700 kcal
   - Mutton biryani (1 serving) = 600-800 kcal
   - Sambar (1 cup) = 120-150 kcal
   - Dal (1 cup) = 150-180 kcal

2. CULTURALLY APPROPRIATE suggestions only:
   ✅ Brown rice, ragi, jowar, bajra, pesarattu, gongura, palak
   ❌ Quinoa, kale, chia seeds, avocado, tofu

3. SMALL MODIFICATIONS only — never suggest completely different meals:
   ✅ "Add almonds to chutney while grinding"
   ✅ "Reduce rice portion by 1/4 cup" 
   ✅ "Skip pickle for BP patient"
   ❌ "Replace biryani with salad"
   ❌ "Don't eat rice, switch to quinoa"

4. FRIENDLY TONE — like a knowledgeable friend, not a strict nutritionist
   ✅ "Great choice! Just add some dal for extra protein"
   ❌ "This meal is deficient in protein and exceeds carbohydrate limits"

5. TRAFFIC LIGHT must be accurate:
   🟢 Green: Balanced, within healthy range
   🟡 Yellow: Acceptable but one area needs attention
   🔴 Red: Multiple nutritional concerns

6. per_member_guidance: Only include guidance types relevant to the
   detected meal. Always include "general_adult" and "child".
   Include condition-specific ones only when relevant.

7. before_cooking_tips: Frame as things to do WHILE cooking, not after.
   These should be implementable RIGHT NOW.

8. If FAMILY_MEMBER_PROFILES are provided below, ALSO return a "family_member_scores"
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured in secrets');
    }

    const body = await req.json();
    const { type, image_base64, media_type, mealDescription, portion, mealNames, memberCount, memberProfiles, voiceContext } = body;

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
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const parsed = JSON.parse(jsonText);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Text-only analysis
    if (type === 'text') {
      if (!mealDescription) {
        throw new Error('No meal description provided');
      }

      const textPrompt = `${FOOD_RECOGNITION_PROMPT}${buildMemberBlock(memberProfiles)}${buildVoiceBlock(voiceContext)}

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
      let jsonText = textContent.text.trim();
      // Remove markdown code fences if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const parsed = JSON.parse(jsonText);

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Image-based analysis (legacy support)
    if (!image_base64) {
      throw new Error('No image provided');
    }

    const fullImagePrompt = `${FOOD_RECOGNITION_PROMPT}${buildMemberBlock(memberProfiles)}${buildVoiceBlock(voiceContext)}`;

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
    let jsonText = textContent.text.trim();
    // Remove markdown code fences if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const parsed = JSON.parse(jsonText);

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
