// Netlify serverless function: calls Claude Vision API for meal analysis.
// Set CLAUDE_API_KEY in Netlify env (or VITE_CLAUDE_API_KEY - we check both).

const PROMPT = `You are a Telugu food nutrition expert. Analyze this meal photo and return a JSON response with: { "food_name": string (identify the dish in English and Telugu, e.g. "Rice with Dal (అన్నం పప్పు)"), "food_items": [{ "name": string, "quantity": string }] (list each item on the plate), "calories": number, "macros": { "carbs_g": number, "protein_g": number, "fat_g": number, "fiber_g": number }, "micronutrients": [{ "name": string, "amount": string, "daily_value_percent": number }] (top 5 vitamins/minerals), "glycemic_index": string ("low" or "medium" or "high"), "health_scores": { "general": number, "diabetic": number, "hypertension": number, "cholesterol": number } (0-100 scores based on health conditions), "detailed_guidance": [{ "condition": string, "score": number, "explanation": string, "suggestions": string[] }], "ayurvedic_note": string, "best_paired_with": string[] (suggestions to complete the meal) }. Return only valid JSON, no markdown or extra text.`;

async function callClaude(imageBase64, mediaType) {
  const apiKey = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY (or VITE_CLAUDE_API_KEY) not set in environment');
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64,
              },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errText}`);
  }
  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('No text in Claude response');
  // Strip markdown code block if present
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(jsonStr);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const { imageBase64, mediaType = 'image/jpeg' } = body;
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'imageBase64 required' }) };
    }
    const analysis = await callClaude(imageBase64, mediaType);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysis),
    };
  } catch (err) {
    console.error('analyze-meal error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Analysis failed' }),
    };
  }
};
