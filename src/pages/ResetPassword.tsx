// ============================================
// MY HEALTH BUDDY - Reset Password Page
// Set new password after clicking email reset link
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  validatePassword,
  isPasswordValid,
  getPasswordStrength,
  STRENGTH_CONFIG,
  PASSWORD_RULES_LABELS,
} from '../lib/passwordValidation';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends user here with access_token in URL hash
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    // Also check if we already have a session (user may have arrived via the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

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
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-brand-light">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <p className="text-[#5C6B4A] font-medium mb-2">Password updated successfully!</p>
          <p className="text-brand-text text-sm">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-brand-light">
        <div className="text-center">
          <p className="text-brand-text text-sm">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light flex flex-col max-w-md mx-auto w-full">
      <div className="flex-1 px-5 pt-12 pb-8 w-full">
        <div className="card rounded-2xl p-6 shadow-sm">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-light0 shadow-card">
              <Lock className="w-7 h-7 text-white" />
            </div>
          </div>

          <h1 className="font-serif text-xl font-bold text-brand-dark text-center mb-1">
            Set New Password
          </h1>
          <p className="text-brand-text text-sm text-center mb-6">
            Choose a strong password for your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="label sr-only">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-12 rounded-full"
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
              <label htmlFor="confirm-password" className="label sr-only">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-11 rounded-full"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center py-3 rounded-full font-semibold"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
