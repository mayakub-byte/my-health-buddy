// ============================================
// MY HEALTH BUDDY - Voice Recorder Hook
// Modular voice-to-text: record → transcribe → return string
// Can be used on any screen, output feeds to any LLM
// ============================================

import { useState, useRef, useCallback } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface UseVoiceRecorderOptions {
  /** Max recording duration in seconds (default: 60) */
  maxDuration?: number;
  /** Seconds of continuous silence after speech to auto-stop (default: 3) */
  silenceTimeout?: number;
  /** RMS volume threshold below which counts as silence (default: 0.015) */
  silenceThreshold?: number;
  /** Called when transcript is ready */
  onTranscript?: (text: string) => void;
  /** Called on any error */
  onError?: (error: string) => void;
}

export interface UseVoiceRecorderReturn {
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording and get transcript */
  stopRecording: () => Promise<string | null>;
  /** Cancel recording without transcribing */
  cancelRecording: () => void;
  /** Current transcript text */
  transcript: string;
  /** Clear the transcript */
  clearTranscript: () => void;
  /** Recording in progress */
  isRecording: boolean;
  /** Transcription in progress */
  isTranscribing: boolean;
  /** Error message if any */
  error: string | null;
  /** Recording duration in seconds */
  duration: number;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const {
    maxDuration = 60,
    silenceTimeout = 3,
    silenceThreshold = 0.015,
    onTranscript,
    onError,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Silence detection refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechDetectedRef = useRef(false);
  const silentSinceRef = useRef<number | null>(null);
  // Guard: prevent stopRecording from being called multiple times
  const stoppingRef = useRef(false);

  const cleanup = useCallback(() => {
    // Stop silence monitoring
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    speechDetectedRef.current = false;
    silentSinceRef.current = null;
    stoppingRef.current = false;

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Clear timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (durationRef.current) {
      clearInterval(durationRef.current);
      durationRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Transcription failed' }));
      throw new Error(errData.error || `Transcription failed: ${response.status}`);
    }

    const data = await response.json();
    return data.transcript || '';
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setDuration(0);
      audioChunksRef.current = [];
      speechDetectedRef.current = false;
      silentSinceRef.current = null;
      stoppingRef.current = false;

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Create MediaRecorder with best available format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Duration counter
      durationRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      // Auto-stop at max duration
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, maxDuration * 1000);

      // ---- Silence detection via Web Audio API ----
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const dataArray = new Float32Array(analyser.fftSize);
      const recordingStartTime = Date.now();

      const monitorSilence = () => {
        // Bail if no longer recording
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          return;
        }

        analyser.getFloatTimeDomainData(dataArray);

        // Calculate RMS volume
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sumSquares += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);

        const now = Date.now();
        const elapsed = now - recordingStartTime;

        if (rms > silenceThreshold) {
          // Voice detected
          speechDetectedRef.current = true;
          silentSinceRef.current = null;
        } else if (speechDetectedRef.current && elapsed > 1000) {
          // Silence after speech was detected (and at least 1s has elapsed)
          if (silentSinceRef.current === null) {
            silentSinceRef.current = now;
          } else if (now - silentSinceRef.current > silenceTimeout * 1000) {
            // Sustained silence — auto-stop
            if (!stoppingRef.current) {
              stoppingRef.current = true;
              stopRecording();
            }
            return; // Don't schedule next frame
          }
        }

        animFrameRef.current = requestAnimationFrame(monitorSilence);
      };

      animFrameRef.current = requestAnimationFrame(monitorSilence);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      onError?.(message);
      cleanup();
    }
  }, [maxDuration, silenceTimeout, silenceThreshold, onError, cleanup]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || 'audio/webm'
          });

          // Skip if recording too short (less than 0.5 seconds of audio)
          if (audioBlob.size < 5000) {
            setError('Recording too short');
            onError?.('Recording too short');
            resolve(null);
            return;
          }

          const text = await transcribeAudio(audioBlob);
          setTranscript(text);
          onTranscript?.(text);
          resolve(text);

        } catch (err) {
          const message = err instanceof Error ? err.message : 'Transcription failed';
          setError(message);
          onError?.(message);
          resolve(null);
        } finally {
          setIsTranscribing(false);
          cleanup();
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [transcribeAudio, onTranscript, onError, cleanup]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsTranscribing(false);
    cleanup();
  }, [cleanup]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    transcript,
    clearTranscript,
    isRecording,
    isTranscribing,
    error,
    duration,
  };
}

export default useVoiceRecorder;
