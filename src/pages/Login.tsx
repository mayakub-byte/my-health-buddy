// ============================================
// AROGYA - Login Page
// Welcome back, minimal card, olive button
// ============================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-beige flex flex-col max-w-md mx-auto w-full">
      <div className="pt-6 px-5">
        <Link
          to="/"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-beige-50 border border-beige-300 text-neutral-600 hover:bg-beige-200 shadow-card"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>

      <div className="flex-1 px-5 pt-4 pb-8 w-full">
        <div className="card rounded-2xl p-6 shadow-sm">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-olive-500 shadow-card">
              <span className="text-3xl" aria-hidden>🍽️</span>
            </div>
          </div>

          <h1 className="font-serif text-xl font-bold text-olive-800 text-center mb-1">
            Welcome back
          </h1>
          <p className="text-neutral-500 text-sm text-center mb-6">
            Sign in to continue your health journey
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label sr-only">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Phone or Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11 rounded-full"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label sr-only">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-12 rounded-full"
                  required
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
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-gold-600 hover:text-gold-700"
                >
                  Forgot password?
                </Link>
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
              {loading ? 'Signing in…' : 'Log In'}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-sm text-neutral-500 pb-8">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-medium text-olive-600 hover:text-olive-700 underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </div>
  );
}
