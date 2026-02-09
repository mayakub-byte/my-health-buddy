// ============================================
// MY HEALTH BUDDY - Main App Component
// ============================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import FamilySetup from './pages/FamilySetup';
import MealInput from './pages/MealInput';
import Upload from './pages/Upload';
import Results from './pages/Results';
import FamilyGuidanceResult from './pages/FamilyGuidanceResult';
import Family from './pages/Family';
import MealHistory from './pages/MealHistory';
import PhotoConfirmation from './pages/PhotoConfirmation';
import PortionSelection from './pages/PortionSelection';
import AnalysisLoading from './pages/AnalysisLoading';
import Weekly from './pages/Weekly';
import Settings from './pages/Settings';

// Components
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';

// Hooks & Utils
import { useFamily } from './hooks/useFamily';

function App() {
  const { family, loading } = useFamily();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has completed onboarding
    if (!loading) {
      setIsOnboarded(!!family);
    }
  }, [family, loading]);

  if (loading || isOnboarded === null) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-neutral-50">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/" 
            element={isOnboarded ? <Navigate to="/dashboard" /> : <Landing />} 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route 
            path="/onboarding" 
            element={<Onboarding onComplete={() => setIsOnboarded(true)} />} 
          />
          <Route path="/setup" element={<FamilySetup />} />

          {/* Protected routes (require onboarding) */}
          {isOnboarded ? (
            <>
              <Route path="/home" element={<MealInput />} />
              <Route path="/dashboard" element={<MealInput />} />
              <Route path="/scan/confirm" element={<PhotoConfirmation />} />
              <Route path="/scan/portion" element={<PortionSelection />} />
              <Route path="/scan/loading" element={<AnalysisLoading />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/results" element={<FamilyGuidanceResult />} />
              <Route path="/results/analysis" element={<FamilyGuidanceResult />} />
              <Route path="/results/:mealId" element={<Results />} />
              <Route path="/family" element={<Family />} />
              <Route path="/history" element={<MealHistory />} />
              <Route path="/weekly" element={<Weekly />} />
              <Route path="/settings" element={<Settings />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/" />} />
          )}
        </Routes>

        {/* Bottom navigation - only show when onboarded */}
        {isOnboarded && <BottomNav />}
      </div>
    </Router>
  );
}

export default App;
