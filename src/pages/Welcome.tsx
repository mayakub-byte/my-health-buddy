// ============================================
// MY HEALTH BUDDY - Welcome Page
// First screen users see
// ============================================

import { useNavigate } from 'react-router-dom';
import { Utensils, Heart, Users, ArrowRight } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
        {/* Logo/Icon */}
        <div className="w-24 h-24 bg-primary-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
          <Utensils className="w-12 h-12 text-white" />
        </div>

        {/* App Name */}
        <h1 className="text-3xl font-bold text-neutral-800 mb-2">
          My Health Buddy
        </h1>
        <p className="text-neutral-500 text-center mb-8">
          Make your family meals healthier
        </p>

        {/* Features */}
        <div className="w-full max-w-sm space-y-4 mb-8">
          <FeatureItem
            icon={<Utensils className="w-5 h-5" />}
            title="Snap your meal"
            description="Take a photo of what you cooked"
          />
          <FeatureItem
            icon={<Users className="w-5 h-5" />}
            title="Personalized scores"
            description="Each family member gets their own health score"
          />
          <FeatureItem
            icon={<Heart className="w-5 h-5" />}
            title="Small improvements"
            description="Gentle suggestions, not strict diets"
          />
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 pb-8 space-y-3">
        <button
          onClick={() => navigate('/onboarding')}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </button>
        
        <p className="text-center text-sm text-neutral-400">
          Free • No login required • Telugu cuisine
        </p>
      </div>
    </div>
  );
}

// Feature item component
function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm">
      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-neutral-800">{title}</h3>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>
    </div>
  );
}
