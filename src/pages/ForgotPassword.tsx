// ============================================
// AROGYA - Forgot Password
// Reset password via email
// ============================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-beige flex flex-col max-w-md mx-auto w-full">
      <div className="pt-6 px-5">
        <Link
          to="/login"
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
              <Mail className="w-7 h-7 text-white" />
            </div>
          </div>

          <h1 className="font-heading text-2xl font-bold text-olive-800 text-center mb-1">
            Reset Password
          </h1>
          <p className="text-neutral-600 text-sm text-center mb-6">
            Enter your email and we&apos;ll send you a reset link
          </p>

          {success ? (
            <div className="text-center py-4">
              <p className="text-olive-600 font-medium mb-4">
                Check your email for reset link
              </p>
              <Link
                to="/login"
                className="btn-primary w-full flex items-center justify-center py-3 rounded-full font-semibold"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="label sr-only">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-11 rounded-full"
                    required
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
                {loading ? 'Sending…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
