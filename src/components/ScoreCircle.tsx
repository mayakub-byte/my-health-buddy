// ============================================
// MY HEALTH BUDDY - SVG Score Circle Component
// Animated circular progress with count-up & glow
// ============================================

import { useState, useEffect, useRef } from 'react';

interface ScoreCircleProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  showEmoji?: boolean;
  animate?: boolean;
}

export default function ScoreCircle({
  score,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  showEmoji = true,
  animate = true,
}: ScoreCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const targetOffset = circumference - (clampedScore / 100) * circumference;

  const [displayScore, setDisplayScore] = useState(animate ? 0 : clampedScore);
  const [currentOffset, setCurrentOffset] = useState(animate ? circumference : targetOffset);
  const animStarted = useRef(false);

  useEffect(() => {
    if (!animate || animStarted.current) return;
    animStarted.current = true;

    // Delay to let the component mount, then animate
    const delay = setTimeout(() => {
      setCurrentOffset(targetOffset);
    }, 100);

    // Count-up number
    let start = 0;
    const duration = 1200;
    const stepTime = clampedScore > 0 ? duration / clampedScore : duration;
    const timer = setInterval(() => {
      start++;
      setDisplayScore(start);
      if (start >= clampedScore) clearInterval(timer);
    }, stepTime);

    return () => {
      clearTimeout(delay);
      clearInterval(timer);
    };
  }, [animate, clampedScore, targetOffset, circumference]);

  // Non-animated mode
  useEffect(() => {
    if (!animate) {
      setDisplayScore(clampedScore);
      setCurrentOffset(targetOffset);
    }
  }, [animate, clampedScore, targetOffset]);

  const getColor = (s: number) => {
    if (s >= 70) return { stroke: '#5a7c65', bg: '#e8f0e5', text: '#3d5a47' }; // sage green
    if (s >= 40) return { stroke: '#c4956a', bg: '#fdf3eb', text: '#8a6840' }; // warm amber
    return { stroke: '#c45c5c', bg: '#fce8e8', text: '#8b3a3a' }; // warm red
  };

  const getEmoji = (s: number) => {
    if (s >= 70) return '🌟';
    if (s >= 40) return '👍';
    return '💪';
  };

  const colors = getColor(clampedScore);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{ animation: animate ? 'scoreGlow 2s ease-in-out 1.2s 1' : undefined }}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border-warm, #e8e2d8)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={currentOffset}
            style={{
              transition: animate ? 'stroke-dashoffset 1.2s ease-out' : 'stroke-dashoffset 0.8s ease-out',
              filter: `drop-shadow(0 0 6px ${colors.stroke}40)`,
            }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showEmoji && <span className="text-lg mb-0.5">{getEmoji(clampedScore)}</span>}
          <span
            className="font-bold"
            style={{
              color: colors.text,
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: size >= 140 ? '2rem' : '1.5rem',
            }}
          >
            {displayScore}
          </span>
        </div>
      </div>
      {label && (
        <p className="text-sm font-semibold mt-2" style={{ color: 'var(--text-main, #2c3e2d)' }}>{label}</p>
      )}
      {sublabel && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted, #7a8c7e)' }}>{sublabel}</p>
      )}
    </div>
  );
}
