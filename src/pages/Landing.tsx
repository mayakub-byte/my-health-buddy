// ============================================
// AROGYA / MY HEALTH BUDDY - Landing Page
// Complete Rewrite based on Mockups
// ============================================

import { Link } from 'react-router-dom';
import { Camera, Sparkles, Users, Check } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-dark selection:bg-brand-green/20">

      {/* 1. HEADER & HERO SECTION */}
      <header className="w-full flex justify-end px-6 sm:px-12 py-4">
        <Link
          to="/login"
          className="px-6 py-2 rounded-lg font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          Log In
        </Link>
      </header>

      {/* Decorative top border pattern placeholder */}
      <div className="w-full h-1.5" style={{ backgroundImage: 'radial-gradient(circle, #b8c5bd 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div className="max-w-xl">
          <h1 className="text-5xl md:text-6xl lg:text-[72px] font-bold leading-tight tracking-tight text-brand-dark mb-6">
            Your Family's<br />
            Food.<br />
            Understood.<br />
            Gently.
          </h1>
          <p className="text-lg md:text-xl text-[#3b5246] font-medium mb-4 pr-4">
            AI-powered meal insights for modern Hyderabad families.
          </p>
          <p className="text-base text-[#526b5d] mb-10 pr-4 leading-relaxed">
            Analyze your home-cooked meals and receive personalized guidance for every member of your family — without calorie obsession.
          </p>
          <div className="flex items-center gap-6">
            <Link
              to="/signup"
              className="px-8 py-3.5 bg-brand-green text-white font-semibold rounded-xl hover:bg-[#599A7A] transition-colors shadow-sm"
            >
              Get Started
            </Link>
            <button className="text-[#4367b1] font-medium border border-[#4367b1] rounded px-2 py-0.5 text-sm hover:bg-blue-50 transition-colors flex items-center gap-1">
              See how it works <span className="text-xs">↓</span>
            </button>
          </div>
        </div>

        {/* Hero Illustration */}
        <div className="relative w-full aspect-[4/3] rounded-2xl flex items-center justify-center overflow-hidden bg-[#fbf9f4]">
          <img
            src="/FamilyDining.png"
            alt="A family dining together"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* 2. KITCHEN FEATURES & THREE CARDS */}
      <section className="bg-brand-light pb-24 pt-8">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 text-center">
          <h3 className="text-[#526b5d] font-semibold mb-6">Built for real Hyderabad kitchens.</h3>
          <div className="flex flex-wrap justify-center gap-3 mb-20">
            {['Rice-based meals', 'Multi-generational families', 'Diabetes-aware', 'Telugu cuisine smart'].map((tag) => (
              <span key={tag} className="px-5 py-2 bg-[#d6e0db] text-[#3b5246] rounded-full text-sm font-semibold">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white py-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-12">
            <h2 className="text-4xl md:text-5xl font-bold text-center text-brand-dark mb-16 tracking-tight">
              Simple. Thoughtful. Personal.
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="bg-white p-10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#cfdbd5] rounded-2xl flex items-center justify-center mb-8">
                  <Camera className="w-8 h-8 text-[#3b5246]" />
                </div>
                <h3 className="text-2xl font-bold text-brand-dark mb-4">Snap Your Meal</h3>
                <p className="text-[#526b5d] leading-relaxed">
                  Upload a photo or describe what<br />you cooked.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white p-10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#cfdbd5] rounded-2xl flex items-center justify-center mb-8">
                  <Sparkles className="w-8 h-8 text-[#3b5246]" />
                </div>
                <h3 className="text-2xl font-bold text-brand-dark mb-4">Smart Recognition</h3>
                <p className="text-[#526b5d] leading-relaxed">
                  Our AI understands dal, sabzi, rice,<br />and traditional dishes.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white p-10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#cfdbd5] rounded-2xl flex items-center justify-center mb-8">
                  <Users className="w-8 h-8 text-[#3b5246]" />
                </div>
                <h3 className="text-2xl font-bold text-brand-dark mb-4">Family-Specific Guidance</h3>
                <p className="text-[#526b5d] leading-relaxed">
                  Different insights for mom, dad,<br />child, and elders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MOBILE APP SHOWCASE */}
      <section className="bg-brand-light py-24">
        <div className="max-w-6xl mx-auto px-6 sm:px-12 grid md:grid-cols-2 gap-16 items-center">
          {/* Mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-0 bg-black/5 blur-2xl rounded-full transform translate-y-12"></div>
            <div className="relative bg-white rounded-[40px] p-4 shadow-xl border border-gray-100 pb-10">
              {/* Notch placeholder */}
              <div className="w-24 h-6 bg-gray-100 rounded-b-xl mx-auto mb-6"></div>

              {/* App UI */}
              <div className="h-64 bg-[#bccac2] rounded-2xl mb-6"></div>
              <div className="px-4">
                <h4 className="text-xl font-bold text-brand-dark mb-1">Rajma Chawal</h4>
                <p className="text-sm text-gray-500 mb-6">Confirm your meal</p>

                <div className="flex gap-2 mb-8">
                  <span className="px-4 py-1.5 bg-[#cfdbd5] rounded-full text-sm font-semibold text-[#3b5246]">Small</span>
                  <span className="px-4 py-1.5 bg-brand-green text-white rounded-full text-sm font-semibold">Medium</span>
                  <span className="px-4 py-1.5 bg-[#cfdbd5] rounded-full text-sm font-semibold text-[#3b5246]">Large</span>
                </div>

                <button className="w-full py-4 bg-brand-green text-white font-semibold rounded-2xl">
                  Continue
                </button>
              </div>
            </div>
          </div>

          {/* Checklist content */}
          <div className="pl-4">
            <h2 className="text-4xl md:text-5xl font-bold text-brand-dark mb-10 tracking-tight">
              Designed for Indian Homes
            </h2>
            <ul className="space-y-6 mb-12">
              {[
                'Handles shared plates',
                'Understands rice-heavy meals',
                'Suggests gentle improvements',
                'No extreme dieting language',
                'Weekly family snapshot'
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-4 text-xl text-[#4a6355]">
                  <div className="bg-[#e4ece8] rounded-full p-1 border border-white">
                    <Check className="w-4 h-4 text-brand-green stroke-[3]" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="inline-block px-8 py-4 bg-brand-green text-white text-lg font-semibold rounded-2xl hover:bg-[#599A7A] transition-colors shadow-sm"
            >
              Experience Arogya
            </Link>
          </div>
        </div>
      </section>

      {/* 4. WELLNESS SECTION */}
      <section className="bg-brand-light py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-brand-dark mb-16 tracking-tight">
            Wellness That Includes Everyone
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {/* Persona 1 */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm flex flex-col items-center">
              <div className="w-16 h-16 bg-[#cfdbd5] rounded-full flex items-center justify-center text-3xl mb-4">
                👩🏼
              </div>
              <h4 className="text-lg font-bold text-brand-dark mb-1">Mom</h4>
              <p className="text-sm text-[#526b5d]">Small improvement</p>
            </div>

            {/* Persona 2 */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm flex flex-col items-center">
              <div className="w-16 h-16 bg-[#cfdbd5] rounded-full flex items-center justify-center text-3xl mb-4">
                👨🏻
              </div>
              <h4 className="text-lg font-bold text-brand-dark mb-1">Dad</h4>
              <p className="text-sm text-[#526b5d]">Balanced</p>
            </div>

            {/* Persona 3 */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm flex flex-col items-center">
              <div className="w-16 h-16 bg-[#cfdbd5] rounded-full flex items-center justify-center text-3xl mb-4">
                👧🏻
              </div>
              <h4 className="text-lg font-bold text-brand-dark mb-1">Daughter</h4>
              <p className="text-sm text-[#526b5d]">Fiber low</p>
            </div>

            {/* Persona 4 */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm flex flex-col items-center">
              <div className="w-16 h-16 bg-[#cfdbd5] rounded-full flex items-center justify-center text-3xl mb-4">
                👵🏼
              </div>
              <h4 className="text-lg font-bold text-brand-dark mb-1">Grandparent</h4>
              <p className="text-sm text-[#526b5d]">Sugar mindful</p>
            </div>
          </div>

          <p className="text-xl text-[#4a6355] font-medium">
            Every meal is a small opportunity to care for each other.
          </p>
        </div>
      </section>

      {/* 5. TESTIMONIALS SECTION */}
      <section className="bg-white pb-32 pt-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-[#4a6355] mb-16">
            Made for families balancing careers, children, and health.
          </h3>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="bg-white p-10 rounded-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col h-full">
              <div className="w-14 h-14 bg-[#cfdbd5] rounded-full flex items-center justify-center text-brand-dark font-bold mb-8">
                PR
              </div>
              <p className="text-lg text-[#3b5246] italic mb-10 flex-grow">
                "I finally understand how to adjust one meal for my diabetic father and my growing child."
              </p>
              <div className="text-brand-dark font-bold">
                — Priya, Hyderabad
              </div>
            </div>

            <div className="bg-white p-10 rounded-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col h-full">
              <div className="w-14 h-14 bg-[#cfdbd5] rounded-full flex items-center justify-center text-brand-dark font-bold mb-8">
                AN
              </div>
              <p className="text-lg text-[#3b5246] italic mb-10 flex-grow">
                "No more guilt about rice. Arogya showed me how to balance it with the right sabzi."
              </p>
              <div className="text-brand-dark font-bold">
                — Anand, Hyderabad
              </div>
            </div>

            <div className="bg-white p-10 rounded-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col h-full">
              <div className="w-14 h-14 bg-[#cfdbd5] rounded-full flex items-center justify-center text-brand-dark font-bold mb-8">
                ME
              </div>
              <p className="text-lg text-[#3b5246] italic mb-10 flex-grow">
                "My mother-in-law feels included in our health goals now. That means everything."
              </p>
              <div className="text-brand-dark font-bold">
                — Meera, Secunderabad
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA SECTION */}
      <section className="bg-brand-light py-32 text-center">
        <div className="max-w-4xl mx-auto px-6 sm:px-12">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#143628] mb-12 tracking-tight">
            Start understanding your<br />family's meals today.
          </h2>

          <Link
            to="/signup"
            className="inline-block px-10 py-4 bg-[#6ab08c] text-white text-lg font-bold rounded-[20px] hover:bg-[#599A7A] transition-colors shadow-sm mb-6"
          >
            Get Started
          </Link>

          <p className="text-[#526b5d] font-medium text-lg">
            No crash diets. No guilt. Just clarity.
          </p>
        </div>
      </section>

    </div>
  );
}
