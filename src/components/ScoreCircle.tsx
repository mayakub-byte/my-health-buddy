// ============================================
// MY HEALTH BUDDY - SVG Score Circle Component
// Circular progress indicator for health scores
// ============================================

interface ScoreCircleProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  showEmoji?: boolean;
}

export default function ScoreCircle({
  score,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  showEmoji = true,
}: ScoreCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (clampedScore / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 70) return { stroke: '#10B981', bg: '#D1FAE5', text: '#065F46' }; // emerald
    if (s >= 40) return { stroke: '#F59E0B', bg: '#FEF3C7', text: '#92400E' }; // amber
    return { stroke: '#EF4444', bg: '#FEE2E2', text: '#991B1B' }; // red
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
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
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
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showEmoji && <span className="text-lg mb-0.5">{getEmoji(clampedScore)}</span>}
          <span className="text-2xl font-bold" style={{ color: colors.text }}>
            {clampedScore}
          </span>
        </div>
      </div>
      {label && (
        <p className="text-sm font-semibold text-neutral-800 mt-2">{label}</p>
      )}
      {sublabel && (
        <p className="text-xs text-neutral-500 mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}
