// ============================================
// MY HEALTH BUDDY - Baseline Screen
// Second onboarding step: record baseline audio with mic
// ============================================

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function BaselineScreen() {
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecorded(true);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
      setMicError('Microphone not available. You can still continue.');
      setRecorded(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setRecording(false);
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { baseline_recorded: true };
      if (user) {
        await supabase.auth.updateUser({ data: { onboarding_baseline: payload } });
      } else {
        localStorage.setItem('mhb_onboarding_baseline', JSON.stringify(payload));
      }
      navigate('/complete', { replace: true });
    } catch (err) {
      console.error('Baseline save error:', err);
      localStorage.setItem('mhb_onboarding_baseline', JSON.stringify({ baseline_recorded: true }));
      navigate('/complete', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col px-5 pt-10 pb-8 max-w-md mx-auto w-full"
      style={{ backgroundColor: '#F4F1EA' }}
    >
      <h1 className="font-serif text-2xl font-bold text-brand-dark mb-1">
        Record your baseline
      </h1>
      <p className="text-brand-text text-sm mb-6">
        We&apos;ll use your voice to personalize your experience. Tap the mic when ready.
      </p>

      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-all ${
            recording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-[#5C6B4A] text-white hover:bg-[#4A5D3A]'
          }`}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          🎤
        </button>
        <p className="mt-4 text-sm text-brand-text">
          {recording ? 'Recording… Tap to stop' : recorded ? 'Baseline recorded ✓' : 'Tap to record'}
        </p>
        {micError && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg max-w-[320px]">
            {micError}
          </p>
        )}
      </div>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="w-full py-3.5 bg-[#5C6B4A] text-white rounded-full font-semibold disabled:opacity-70"
        >
          {loading ? 'Saving…' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
