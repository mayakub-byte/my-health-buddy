// ============================================
// MY HEALTH BUDDY - Signup Page
// Email/password registration with Supabase
// ============================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <p className="text-green-600 font-medium mb-2">Check your email to verify your account.</p>
          <p className="text-neutral-500 text-sm">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <div className="pt-6 px-4">
        <Link
          to="/login"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
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

        <h1 className="text-xl font-bold text-neutral-800 text-center mb-1">Create account</h1>
        <p className="text-neutral-500 text-sm text-center mb-6">
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
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10 pr-11"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
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
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
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
            className="btn-primary w-full flex items-center justify-center py-3 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold disabled:opacity-70"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-neutral-500 pb-8">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-green-600 hover:text-green-700 underline underline-offset-2"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
