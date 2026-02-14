// ============================================
// MY HEALTH BUDDY - Main App Component
// ============================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
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
import GroceryList from './pages/GroceryList';
import Settings from './pages/Settings';

// Components
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';

// Hooks & Utils
import { useFamily } from './hooks/useFamily';

function App() {
  const { family, loading, autoCreateDefaultFamily } = useFamily();
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session?.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-create family if user is signed in but has no family
  useEffect(() => {
    if (isSignedIn && !loading && !family && !isCreatingFamily) {
      setIsCreatingFamily(true);
      autoCreateDefaultFamily()
        .then((createdFamily) => {
          if (!createdFamily) {
            console.warn('Failed to auto-create family. User can still access app.');
          }
        })
        .catch((err) => {
          console.error('Error auto-creating family:', err);
        })
        .finally(() => {
          setIsCreatingFamily(false);
        });
    }
  }, [isSignedIn, loading, family, isCreatingFamily, autoCreateDefaultFamily]);

  if (isSignedIn === null || (isSignedIn && (loading || isCreatingFamily))) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return (
      <Router>
        <div className="min-h-screen bg-beige">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    );
  }

  // If still no family after auto-create attempt, allow access to setup (but don't force)
  // User can still access dashboard and other routes
  if (!family) {
    return (
      <Router>
        <div className="min-h-screen bg-beige">
          <Routes>
            <Route path="/setup" element={<FamilySetup />} />
            <Route path="/dashboard" element={<MealInput />} />
            <Route path="/home" element={<MealInput />} />
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
            <Route path="/grocery" element={<GroceryList />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <BottomNav />
        </div>
      </Router>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-beige">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/onboarding" element={<Onboarding onComplete={() => {}} />} />
          <Route path="/setup" element={<FamilySetup />} />
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
            <Route path="/grocery" element={<GroceryList />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
