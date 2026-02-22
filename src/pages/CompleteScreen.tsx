// ============================================
// MY HEALTH BUDDY - Complete Screen
// Third onboarding step: AI analyzes baseline, then redirect
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function CompleteScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'analyzing' | 'ready'>('analyzing');

  useEffect(() => {
    const t = setTimeout(() => setStatus('ready'), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data: { user }, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('CompleteScreen auth check failed:', error);
          navigate('/signup', { replace: true, state: { fromOnboarding: true } });
          return;
        }
        if (user) {
          navigate('/home', { replace: true });
        } else {
          navigate('/signup', { replace: true, state: { fromOnboarding: true } });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('CompleteScreen redirect error:', err);
        navigate('/signup', { replace: true, state: { fromOnboarding: true } });
      });
    return () => {
      cancelled = true;
    };
  }, [status, navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 max-w-md mx-auto w-full"
      style={{ backgroundColor: '#F4F1EA' }}
    >
      <div className="w-20 h-20 rounded-full bg-[#5C6B4A]/20 flex items-center justify-center mb-6">
        <span className="text-4xl animate-bounce" aria-hidden>🍽️</span>
      </div>
      <h1 className="font-serif text-2xl font-bold text-brand-dark mb-2">
        {status === 'analyzing' ? 'Analyzing your baseline…' : 'Almost ready!'}
      </h1>
      <p className="text-brand-text text-sm text-center">
        {status === 'analyzing'
          ? 'Our AI is personalizing your experience.'
          : 'Redirecting you to get started…'}
      </p>
    </div>
  );
}
