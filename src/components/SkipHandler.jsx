import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { createSession, updateSession, getSession } from '../utils/session';

const SkipHandler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    const handleSkip = async () => {
      const skipParam = searchParams.get('skip');
      
      // Only proceed if skip=true
      if (skipParam !== 'true') {
        navigate('/');
        return;
      }

      // Get game type from URL parameter first
      let gameType = searchParams.get('game');
      
      // If no game parameter, try to infer from current path
      if (!gameType) {
        if (location.pathname.includes('detection-game')) {
          gameType = 'detection';
        } else if (location.pathname.includes('elicitation-game')) {
          gameType = 'elicitation';
        }
      }
      
      // If still no game type, assign randomly
      if (!gameType || (gameType !== 'detection' && gameType !== 'elicitation')) {
        gameType = Math.random() < 0.5 ? 'detection' : 'elicitation';
      }

      // Check for demo mode
      const isDemo = searchParams.get('demo') === 'true';

      try {
        // Check if session already exists
        let session = getSession();
        
        if (!session) {
          // Create new session
          session = await createSession(gameType, isDemo);
        }

        // Set minimal demographics data to bypass demographics page
        const minimalDemographics = {
          age: 'skipped',
          gender: 'skipped',
          education: 'skipped',
          field: 'skipped',
          aiExperience: 'skipped',
          programmingExperience: 'skipped',
          priorKnowledge: 'skipped',
          skipped: true
        };

        // Update session with minimal demographics
        updateSession({ demographics: minimalDemographics });

        // Preserve URL parameters when navigating to game
        const gameParams = new URLSearchParams();
        
        // Preserve demo flag
        if (isDemo) {
          gameParams.set('demo', 'true');
        }
        
        // Preserve sp parameter if it exists
        const spParam = searchParams.get('sp');
        if (spParam) {
          gameParams.set('sp', spParam);
        }
        
        // Also preserve skip flag for consistency
        gameParams.set('skip', 'true');
        
        const paramString = gameParams.toString() ? '?' + gameParams.toString() : '';
        navigate(`/${gameType}-game${paramString}`, { replace: true });
      } catch (error) {
        console.error('Error in skip handler:', error);
        // Fallback to normal flow
        navigate('/');
      }
    };

    handleSkip();
  }, [navigate, searchParams]);

  return (
    <div className="max-w-1000 mx-auto p-4">
      <div className="container text-center">
        <span className="loading"></span>
        <p className="mt-3">Loading...</p>
      </div>
    </div>
  );
};

export default SkipHandler;