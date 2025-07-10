import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { createSession } from '../utils/session';

const Landing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  
  
  useEffect(() => {
    // Check if user is trying to return to landing with existing session
    const existingSession = sessionStorage.getItem('llm_safety_session');
    if (existingSession) {
      const session = JSON.parse(existingSession);
      
      // Preserve URL parameters when redirecting
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
      
      if (session.demographics) {
        // Redirect to appropriate game
        navigate(`/${session.gameType}-game${paramString}`);
      } else {
        navigate(`/demographics${paramString}`);
      }
    }
  }, [navigate]);
  
  const handleBegin = async () => {
    if (!consent || loading) return;
    
    setLoading(true);
    
    // Get game type from URL parameter or from state if redirected from a game route
    let gameType = searchParams.get('game');
    
    // Check if we were redirected from a specific game route
    if (!gameType && location.state?.intendedGame) {
      gameType = location.state.intendedGame;
    }
    
    // If no game parameter, randomly assign
    if (!gameType) {
      gameType = Math.random() < 0.5 ? 'detection' : 'elicitation';
    }
    
    // Check for demo mode
    const isDemo = searchParams.get('demo') === 'true' || location.state?.isDemo;
    
    try {
      const session = await createSession(gameType, isDemo);
      
      // Preserve URL parameters when navigating to demographics
      const currentParams = new URLSearchParams(window.location.search);
      const demographicsParams = new URLSearchParams();
      
      
      // Preserve demo flag
      if (isDemo) {
        demographicsParams.set('demo', 'true');
      }
      
      // Preserve sp parameter if it exists
      const spParam = currentParams.get('sp');
      if (spParam) {
        demographicsParams.set('sp', spParam);
      } else {
      }
      
      const demographicsUrl = `/demographics${demographicsParams.toString() ? '?' + demographicsParams.toString() : ''}`;
      navigate(demographicsUrl);
    } catch (error) {
      console.error('Error creating session:', error);
      // Still navigate even if session creation fails
      navigate('/demographics');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-1000 mx-auto p-4">
      <div className="container">
        <div className="text-center mb-5">
          <h1>LLM Safety Research Study</h1>
          <p className="mt-2">ML Alignment & Theory Scholars</p>
          <p className="mt-2">Estimated time: 15-30 minutes</p>
        </div>
        
        <div className="mb-5">
          <h2 className="mb-3">About This Study</h2>
          <p className="mb-3">
            This research study investigates how people interact with AI language models 
            and their ability to identify different model behaviors.
          </p>
          
          <p className="mb-3">
            You will participate in one of two experimental games:
          </p>
          
          <ul className="mb-3" style={{ paddingLeft: '20px' }}>
            <li className="mb-2">
              <strong>Detection Game:</strong> You'll examine how an AI model responds to 
              sets of questions and determine if it's behaving normally or withholding 
              information across multiple questions.
            </li>
            <li className="mb-2">
              <strong>Elicitation Game:</strong> You'll chat with an AI to try to determine 
              the correct answer to questions it might be avoiding.
            </li>
          </ul>
          
          <p className="mb-3">
            Questions may be multiple choice (A, B, C, D) or open-ended.
          </p>
          
          <h3 className="mb-2 mt-4">Data Collection & Privacy</h3>
          <p className="mb-3">
            <strong>What data we collect:</strong> We collect your responses, interaction data, 
            chat conversations, and basic demographic information. All data is collected 
            anonymously - we never collect names, email addresses, or any personal identifiers.
          </p>
          
          <p className="mb-3">
            <strong>Third-party processing:</strong> During the elicitation game, your chat 
            messages may be processed by third-party AI services (OpenAI, Anthropic) to 
            generate responses. These services may temporarily process your messages 
            according to their privacy policies.
          </p>
          
          <p className="mb-3">
            <strong>Data retention:</strong> Anonymous research data will be retained 
            indefinitely for scientific research purposes.
          </p>
          
          <p className="mb-3">
            <strong>Your rights:</strong> You may withdraw from the study at any time before 
            final submission. Simply close your browser window to exit without submitting 
            any data. Once you complete the study and submit your final responses, 
            withdrawal is not possible as all data is immediately anonymized.
          </p>
          
          <p className="mb-3">
            <strong>Legal basis:</strong> This research is conducted under GDPR Article 6(1)(e) 
            (public interest) and Article 9(2)(j) (scientific research) for legitimate 
            scientific research purposes.
          </p>
          
          <p className="mb-3">
            <strong>Contact:</strong> For data protection inquiries, contact the research team 
            at research-mats@benjaminarnav.com. Your participation is voluntary.
          </p>
          
          <p className="mb-3" style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
            ⚠️ <strong>Important:</strong> Please do not include any personal information in your 
            messages or responses to questions. If you do, it may be stored as part of this research.
          </p>
        </div>
        
        <div className="mb-4">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I consent to participate in this research study and understand that my 
              data may be processed by third-party AI services (OpenAI, Anthropic) 
              during the elicitation game. I understand I can withdraw at any time 
              before final submission by closing my browser window.
            </span>
          </label>
        </div>
        
        <div className="text-center">
          <button
            onClick={handleBegin}
            disabled={!consent || loading}
            className="btn-large"
            style={{ padding: '12px 32px', fontSize: '18px' }}
          >
            {loading ? <span className="loading"></span> : 'Begin Study'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;