import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Landing from './components/Landing';
import Demographics from './components/Demographics';
import DetectionGame from './components/DetectionGame';
import ElicitationGame from './components/ElicitationGame';
import ThankYou from './components/ThankYou';
import SkipHandler from './components/SkipHandler';
import { getSession, createSession } from './utils/session';

// Protected Route component
const ProtectedRoute = ({ children, requireDemographics = true, gameType: expectedGameType }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check if skip=true is present
  const skipParam = searchParams.get('skip') === 'true';
  
  // Get existing session
  const session = getSession();
  
  // Handle game type mismatch
  useEffect(() => {
    if (session && expectedGameType && session.gameType !== expectedGameType) {
      // Preserve URL parameters when redirecting to correct game
      const currentParams = new URLSearchParams(window.location.search);
      const redirectParams = new URLSearchParams();
      
      // Preserve demo flag from session
      if (session.isDemo) {
        redirectParams.set('demo', 'true');
      }
      
      // Preserve sp parameter if it exists
      const spParam = currentParams.get('sp');
      if (spParam) {
        redirectParams.set('sp', spParam);
      }
      
      const paramString = redirectParams.toString() ? '?' + redirectParams.toString() : '';
      navigate(`/${session.gameType}-game${paramString}`, { replace: true });
    }
  }, [session, expectedGameType, navigate]);

  if (!session) {
    // If skip=true is present, handle it with SkipHandler
    if (skipParam) {
      return <SkipHandler />;
    }
    
    // Pass intended game type and demo mode to landing page
    const state = {
      intendedGame: expectedGameType,
      isDemo: searchParams.get('demo') === 'true'
    };
    
    // Preserve URL parameters when redirecting to landing
    const currentParams = new URLSearchParams(window.location.search);
    const redirectParams = new URLSearchParams();
    
    // Preserve demo flag
    if (searchParams.get('demo') === 'true') {
      redirectParams.set('demo', 'true');
    }
    
    // Preserve sp parameter if it exists
    const spParam = currentParams.get('sp');
    if (spParam) {
      redirectParams.set('sp', spParam);
    }
    
    const paramString = redirectParams.toString() ? '?' + redirectParams.toString() : '';
    return <Navigate to={`/${paramString}`} replace state={state} />;
  }
  
  if (requireDemographics && !session.demographics) {
    // If skip=true is present, handle it with SkipHandler
    if (skipParam) {
      return <SkipHandler />;
    }
    
    // Preserve URL parameters when redirecting to demographics
    const currentParams = new URLSearchParams(window.location.search);
    const redirectParams = new URLSearchParams();
    
    // Preserve demo flag from session
    if (session.isDemo) {
      redirectParams.set('demo', 'true');
    }
    
    // Preserve sp parameter if it exists
    const spParam = currentParams.get('sp');
    if (spParam) {
      redirectParams.set('sp', spParam);
    }
    
    const paramString = redirectParams.toString() ? '?' + redirectParams.toString() : '';
    return <Navigate to={`/demographics${paramString}`} replace />;
  }
  
  return children;
};

// Root component that checks for skip parameter
const RootHandler = () => {
  const [searchParams] = useSearchParams();
  
  // Check if skip=true is present
  if (searchParams.get('skip') === 'true') {
    return <SkipHandler />;
  }
  
  return <Landing />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootHandler />} />
        
        <Route 
          path="/demographics" 
          element={
            <ProtectedRoute requireDemographics={false}>
              <Demographics />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/detection-game" 
          element={
            <ProtectedRoute gameType="detection">
              <DetectionGame />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/elicitation-game" 
          element={
            <ProtectedRoute gameType="elicitation">
              <ElicitationGame />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/complete" 
          element={
            <ProtectedRoute>
              <ThankYou />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;