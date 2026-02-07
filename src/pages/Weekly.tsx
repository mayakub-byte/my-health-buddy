// ============================================
// MY HEALTH BUDDY - Weekly View
// ============================================

import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

export default function Weekly() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="p-4 border-b border-neutral-100 bg-white">
        <h1 className="text-xl font-bold text-neutral-800">Weekly</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Your week at a glance</p>
      </header>
      <main className="p-4">
        <div className="card text-center py-12">
          <BarChart3 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">Weekly view coming soon</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-green-600 font-medium"
          >
            Back to Home
          </button>
        </div>
      </main>
    </div>
  );
}
