// ============================================
// MY HEALTH BUDDY - Loading Screen
// ============================================

import { Utensils } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-primary-50 flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="w-20 h-20 bg-primary-500 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
        <Utensils className="w-10 h-10 text-white" />
      </div>

      {/* App Name */}
      <h1 className="text-2xl font-bold text-primary-700 mb-2">
        My Health Buddy
      </h1>
      
      {/* Loading indicator */}
      <div className="flex gap-1 mt-4">
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
