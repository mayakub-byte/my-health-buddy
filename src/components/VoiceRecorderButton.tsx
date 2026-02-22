// ============================================
// MY HEALTH BUDDY - Voice Recorder Button Component
// Drop-in voice input button for any screen
// ============================================

import { Mic, Square, Loader2 } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import type { UseVoiceRecorderOptions } from '../hooks/useVoiceRecorder';

interface VoiceRecorderButtonProps extends UseVoiceRecorderOptions {
  /** Button size: 'sm' (32px), 'md' (40px), 'lg' (48px) */
  size?: 'sm' | 'md' | 'lg';
  /** Show duration while recording */
  showDuration?: boolean;
  /** Custom class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function VoiceRecorderButton({
  size = 'md',
  showDuration = true,
  className = '',
  disabled = false,
  onTranscript,
  onError,
  maxDuration = 60,
}: VoiceRecorderButtonProps) {
  const {
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
    duration,
    error,
  } = useVoiceRecorder({ onTranscript, onError, maxDuration });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = async () => {
    if (disabled) return;
    
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const isLoading = isTranscribing;
  const isActive = isRecording;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          flex items-center justify-center 
          flex-shrink-0
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isActive 
            ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30' 
            : isLoading
            ? 'bg-amber-500'
            : 'bg-[#6ab08c] hover:bg-[#4a6c55]'
          }
          ${className}
        `}
        aria-label={
          isLoading 
            ? 'Transcribing...' 
            : isActive 
            ? 'Stop recording' 
            : 'Start voice recording'
        }
      >
        {isLoading ? (
          <Loader2 className={`${iconSizes[size]} text-white animate-spin`} />
        ) : isActive ? (
          <Square className={`${iconSizes[size]} text-white`} fill="white" />
        ) : (
          <Mic className={`${iconSizes[size]} text-white`} />
        )}
      </button>

      {/* Duration indicator */}
      {showDuration && isActive && (
        <span className="text-xs font-mono text-red-500 min-w-[40px]">
          {formatDuration(duration)}
        </span>
      )}

      {/* Transcribing indicator */}
      {isLoading && (
        <span className="text-xs text-amber-600 italic">
          Transcribing...
        </span>
      )}

      {/* Error indicator */}
      {error && !isActive && !isLoading && (
        <span className="text-xs text-red-500">
          {error}
        </span>
      )}
    </div>
  );
}

// ============================================
// Standalone hook export for custom UI implementations
// ============================================
export { useVoiceRecorder } from '../hooks/useVoiceRecorder';
export type { UseVoiceRecorderOptions, UseVoiceRecorderReturn } from '../hooks/useVoiceRecorder';

export default VoiceRecorderButton;
