// ============================================
// MY HEALTH BUDDY - Transcribe Edge Function
// Receives audio blob, calls OpenAI Whisper, returns text
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error('No audio file provided');
    }

    // Validate file size (max 25MB for Whisper)
    if (audioFile.size > 25 * 1024 * 1024) {
      throw new Error('Audio file too large (max 25MB)');
    }

    // Validate minimum size (avoid empty recordings)
    if (audioFile.size < 1000) {
      throw new Error('Audio file too small - recording may be empty');
    }

    console.log(`Transcribing audio: ${audioFile.size} bytes, type: ${audioFile.type}`);

    // Prepare form data for OpenAI
    const whisperFormData = new FormData();
    
    // Convert to a format Whisper accepts
    // Whisper supports: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });
    
    // Determine file extension from mime type
    let extension = 'webm';
    if (audioFile.type.includes('mp4')) extension = 'mp4';
    else if (audioFile.type.includes('ogg')) extension = 'ogg';
    else if (audioFile.type.includes('wav')) extension = 'wav';
    
    whisperFormData.append('file', audioBlob, `audio.${extension}`);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'en'); // Default to English, can be made configurable
    whisperFormData.append('response_format', 'json');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', response.status, errorText);
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const data = await response.json();
    const transcript = data.text?.trim() || '';

    console.log(`Transcription complete: "${transcript.substring(0, 50)}..."`);

    return new Response(
      JSON.stringify({ 
        transcript,
        duration_seconds: data.duration || null,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Transcribe function error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
