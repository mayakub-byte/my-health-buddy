// ============================================
// MY HEALTH BUDDY - Signup Page
// Email/password registration with Supabase
// ============================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  validatePassword,
  isPasswordValid,
  getPasswordStrength,
  STRENGTH_CONFIG,
  PASSWORD_RULES_LABELS,
} from '../lib/passwordValidation';

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isPasswordValid(password)) {
      setError('Password does not meet all requirements.');
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;

      // Auto-create family for new user
      if (authData.user) {
        const userName = email.trim().split('@')[0]; // "shireenyakub0" from email
        const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

        try {
          // Create family
          const { data: family, error: familyError } = await supabase
            .from('families')
            .insert({
              name: `${displayName}'s Family`,
              user_id: authData.user.id,
              primary_user_email: email.trim(),
            })
            .select()
            .single();

          if (familyError) {
            console.error('Failed to create family:', familyError);
            // Continue anyway - user can create family later
          } else if (family) {
            // Add the user as first member
            const avatarColors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];
            const { error: memberError } = await supabase
              .from('family_members')
              .insert({
                family_id: family.id,
                name: displayName,
                age: 25, // Default age
                health_conditions: [],
                dietary_preferences: [],
                is_primary: true,
                avatar_color: avatarColors[0],
              });

            if (memberError) {
              console.error('Failed to create family member:', memberError);
            } else {
              // Save to localStorage so app knows they're onboarded
              localStorage.setItem('mhb_family_id', family.id);
            }
          }
        } catch (familyErr) {
          console.error('Error during family creation:', familyErr);
          // Don't block signup if family creation fails
        }
      }

      setSuccess(true);
      // Navigate directly to dashboard (will auto-login after email verification)
      // For now, still redirect to login since email verification is required
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-brand-light">
        <div className="text-center">
          <p className="text-[#5C6B4A] font-medium mb-2">Check your email to verify your account.</p>
          <p className="text-brand-text text-sm">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-light">
      <div className="pt-6 px-4">
        <Link
          to="/login"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-brand-border text-brand-text hover:bg-neutral-50"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>

      <div className="flex-1 px-5 pt-4 pb-8 max-w-sm mx-auto w-full">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-700 shadow-md shadow-green-500/20">
            <span className="text-3xl" aria-hidden>🍽️</span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-brand-dark text-center mb-1">Create account</h1>
        <p className="text-brand-text text-sm text-center mb-6">
          Sign up to start your health journey
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-email" className="label sr-only">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password" className="label sr-only">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10 pr-11"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-brand-text"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {password && (() => {
              const strength = getPasswordStrength(password);
              const config = STRENGTH_CONFIG[strength];
              const rules = validatePassword(password);
              return (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: strength === 'weak' ? '33%' : strength === 'fair' ? '66%' : '100%',
                          backgroundColor: config.color,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium" style={{ color: config.color }}>
                      {config.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {PASSWORD_RULES_LABELS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1.5">
                        {rules[key] ? (
                          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0" />
                        )}
                        <span className={`text-xs ${rules[key] ? 'text-green-600' : 'text-neutral-400'}`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div>
            <label htmlFor="signup-confirm" className="label sr-only">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="signup-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field pl-10 pr-11"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-brand-text"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center py-3 rounded-xl text-white font-semibold disabled:opacity-70"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-brand-text pb-8">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-brand-green hover:text-[#599A7A] underline underline-offset-2"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
