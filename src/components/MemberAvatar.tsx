// ============================================
// MY HEALTH BUDDY - Member Avatar Component
// Gradient backgrounds + relationship-based emoji
// ============================================

const AVATAR_CONFIG: Record<string, { gradient: string; emoji: string }> = {
  self: { gradient: 'linear-gradient(135deg, #7c9a82, #6ab08c)', emoji: '🧑' },
  parent: { gradient: 'linear-gradient(135deg, #7c9a82, #6ab08c)', emoji: '👩' },
  child: { gradient: 'linear-gradient(135deg, #e8c47c, #d4a373)', emoji: '👧' },
  spouse: { gradient: 'linear-gradient(135deg, #8ea4c8, #6b8ab8)', emoji: '👨' },
  grandparent: { gradient: 'linear-gradient(135deg, #c49a82, #a87c65)', emoji: '👴' },
  sibling: { gradient: 'linear-gradient(135deg, #b8a4c8, #9684b0)', emoji: '🧑' },
  other: { gradient: 'linear-gradient(135deg, #a8c4a0, #7c9a82)', emoji: '😊' },
  member: { gradient: 'linear-gradient(135deg, #a8c4a0, #7c9a82)', emoji: '😊' },
};

interface MemberAvatarProps {
  name: string;
  relationship?: string | null;
  avatarUrl?: string | null;
  size?: number;
}

export default function MemberAvatar({ name, relationship, avatarUrl, size = 44 }: MemberAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          boxShadow: '0 2px 8px rgba(90, 70, 50, 0.15)',
          flexShrink: 0,
        }}
      />
    );
  }

  const key = (relationship ?? 'member').toLowerCase();
  const config = AVATAR_CONFIG[key] ||
    { gradient: 'linear-gradient(135deg, #a8c4a0, #7c9a82)', emoji: name[0]?.toUpperCase() || '?' };

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: config.gradient,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.45,
      color: 'white',
      fontWeight: 600,
      boxShadow: '0 2px 8px rgba(90, 70, 50, 0.15)',
      flexShrink: 0,
    }}>
      {config.emoji}
    </div>
  );
}
