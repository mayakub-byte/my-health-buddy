// ============================================
// Password validation + strength meter helpers
// ============================================

export interface PasswordRules {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function validatePassword(pw: string): PasswordRules {
  return {
    minLength: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasNumber: /\d/.test(pw),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\;'/]/.test(pw),
  };
}

export function isPasswordValid(pw: string): boolean {
  const rules = validatePassword(pw);
  return Object.values(rules).every(Boolean);
}

export function getPasswordStrength(pw: string): 'weak' | 'fair' | 'strong' {
  if (!pw) return 'weak';
  const rules = validatePassword(pw);
  const passed = Object.values(rules).filter(Boolean).length;
  if (passed <= 2) return 'weak';
  if (passed <= 4) return 'fair';
  return 'strong';
}

export const STRENGTH_CONFIG = {
  weak: { color: '#EF4444', bg: '#FEE2E2', label: 'Weak' },
  fair: { color: '#F59E0B', bg: '#FEF3C7', label: 'Fair' },
  strong: { color: '#22C55E', bg: '#DCFCE7', label: 'Strong' },
} as const;

export const PASSWORD_RULES_LABELS: { key: keyof PasswordRules; label: string }[] = [
  { key: 'minLength', label: 'At least 8 characters' },
  { key: 'hasUpper', label: 'One uppercase letter' },
  { key: 'hasLower', label: 'One lowercase letter' },
  { key: 'hasNumber', label: 'One number' },
  { key: 'hasSpecial', label: 'One special character' },
];
