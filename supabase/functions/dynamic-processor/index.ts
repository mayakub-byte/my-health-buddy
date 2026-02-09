import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');

const FOOD_RECOGNITION_PROMPT = `You are an expert in Telugu/South Indian cuisine. 
Analyze this food photo and identify ALL dishes accurately.

For each dish you identify:
1. Provide the English name (be specific — e.g. "Masala Dosa" not just "Dosa")
2. Provide the Telugu name if applicable
3. Estimate the portion size (small/medium/large)
4. Rate your confidence (0.0 to 1.0)

Common Telugu/South Indian dishes:
- Rice: Plain rice, Pulihora, Curd rice, Sambar rice, Lemon rice, Tomato rice
- Dals: Pappu, Tomato pappu, Mudda pappu, Kandhi pappu
- Curries: Gongura, Bendakaya, Vankaya, Gutti vankaya, Dondakaya, Aloo, Paneer
- Breakfast: Pesarattu, Idli, Masala Dosa, Plain Dosa, Upma, Pongal, Vada, Uttapam
- Chutneys: Coconut chutney, Tomato chutney, Peanut chutney, Gongura chutney
- Sambar and Rasam varieties
- Sweets: Gulab jamun, Jalebi, Laddu, Payasam
- Snacks: Samosa, Vada, Pakora, Bajji, Punugulu, Bonda

Respond ONLY in this JSON format:
{
  "dishes": [
    {"name": "Masala Dosa", "name_telugu": "మసాలా దోశ", "portion": "medium", "confidence": 0.92}
  ],
  "meal_summary": "South Indian breakfast with dosa and sides",
  "is_telugu_meal": true
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured in secrets');
    }

    const { image_base64, media_type } = await req.json();

    if (!image_base64) {
      throw new Error('No image provided');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: media_type || 'image/jpeg', data: image_base64 }
            },
            { type: 'text', text: FOOD_RECOGNITION_PROMPT }
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
    const parsed = JSON.parse(textContent.text);

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
