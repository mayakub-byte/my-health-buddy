// ============================================
// MY HEALTH BUDDY - Main App Component
// ============================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';

// Eager imports — critical path (auth + main dashboard)
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MealInput from './pages/MealInput';
import NotFound from './pages/NotFound';

// Lazy imports — loaded on demand when user navigates
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const GoalsScreen = lazy(() => import('./pages/GoalsScreen'));
const BaselineScreen = lazy(() => import('./pages/BaselineScreen'));
const CompleteScreen = lazy(() => import('./pages/CompleteScreen'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const FamilySetup = lazy(() => import('./pages/FamilySetup'));
const Upload = lazy(() => import('./pages/Upload'));
const Results = lazy(() => import('./pages/Results'));
const FamilyGuidanceResult = lazy(() => import('./pages/FamilyGuidanceResult'));
const Family = lazy(() => import('./pages/Family'));
const MealHistory = lazy(() => import('./pages/MealHistory'));
const PhotoConfirmation = lazy(() => import('./pages/PhotoConfirmation'));
const PortionSelection = lazy(() => import('./pages/PortionSelection'));
const AnalysisLoading = lazy(() => import('./pages/AnalysisLoading'));
const Weekly = lazy(() => import('./pages/Weekly'));
const MonthlyOverview = lazy(() => import('./pages/MonthlyOverview'));
const PortionConfirmation = lazy(() => import('./pages/PortionConfirmation'));
const MealCorrection = lazy(() => import('./pages/MealCorrection'));
const ProgressScreen = lazy(() => import('./pages/ProgressScreen'));
const ProfileScreen = lazy(() => import('./pages/ProfileScreen'));
const GroceryList = lazy(() => import('./pages/GroceryList'));
const Settings = lazy(() => import('./pages/Settings'));
const ProfileCompletion = lazy(() => import('./pages/ProfileCompletion'));

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
    }).catch((err) => {
      console.error('getSession failed:', err);
      setIsSignedIn(false);
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
        .then(() => { })
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
        <div className="min-h-screen bg-brand-light">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/goals" element={<GoalsScreen />} />
              <Route path="/baseline" element={<BaselineScreen />} />
              <Route path="/complete" element={<CompleteScreen />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    );
  }

  // If still no family after auto-create attempt, allow access to setup (but don't force)
  // User can still access dashboard and other routes
  if (!family) {
    return (
      <Router>
        <div className="min-h-screen bg-brand-light">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/goals" element={<Navigate to="/home" replace />} />
              <Route path="/baseline" element={<Navigate to="/home" replace />} />
              <Route path="/complete" element={<Navigate to="/home" replace />} />
              <Route path="/setup" element={<FamilySetup />} />
              <Route path="/dashboard" element={<MealInput />} />
              <Route path="/home" element={<MealInput />} />
              <Route path="/scan/confirm" element={<PhotoConfirmation />} />
              <Route path="/scan/portion" element={<PortionSelection />} />
              <Route path="/scan/loading" element={<AnalysisLoading />} />
              <Route path="/portion-confirm" element={<PortionConfirmation />} />
              <Route path="/meal-correction" element={<MealCorrection />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/results" element={<FamilyGuidanceResult />} />
              <Route path="/results/analysis" element={<FamilyGuidanceResult />} />
              <Route path="/results/:mealId" element={<Results />} />
              <Route path="/family" element={<Family />} />
              <Route path="/history" element={<MealHistory />} />
              <Route path="/weekly" element={<Weekly />} />
              <Route path="/monthly" element={<MonthlyOverview />} />
              <Route path="/progress" element={<ProgressScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/grocery" element={<GroceryList />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <BottomNav />
        </div>
      </Router>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-brand-light">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/goals" element={<Navigate to="/home" replace />} />
            <Route path="/baseline" element={<Navigate to="/home" replace />} />
            <Route path="/complete" element={<Navigate to="/home" replace />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/onboarding" element={<Onboarding onComplete={() => { }} />} />
            <Route path="/setup" element={<FamilySetup />} />
            <Route path="/complete-profile" element={<ProfileCompletion />} />
            <Route path="/home" element={<MealInput />} />
            <Route path="/dashboard" element={<MealInput />} />
            <Route path="/scan/confirm" element={<PhotoConfirmation />} />
            <Route path="/scan/portion" element={<PortionSelection />} />
            <Route path="/scan/loading" element={<AnalysisLoading />} />
            <Route path="/portion-confirm" element={<PortionConfirmation />} />
            <Route path="/meal-correction" element={<MealCorrection />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/results" element={<FamilyGuidanceResult />} />
            <Route path="/results/analysis" element={<FamilyGuidanceResult />} />
            <Route path="/results/:mealId" element={<Results />} />
            <Route path="/family" element={<Family />} />
            <Route path="/history" element={<MealHistory />} />
            <Route path="/weekly" element={<Weekly />} />
            <Route path="/monthly" element={<MonthlyOverview />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/grocery" element={<GroceryList />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Navigate to="/home" replace />} />
            <Route path="/signup" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
