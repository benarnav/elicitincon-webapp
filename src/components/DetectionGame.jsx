import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, addResponse } from '../utils/session';
import { api } from '../utils/api';
import ProgressBar from './common/ProgressBar';
import './DetectionGame.css';

const DetectionGame = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [turnData, setTurnData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [modelAssessment, setModelAssessment] = useState('');
  const [confidence, setConfidence] = useState(5);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [totalTurns, setTotalTurns] = useState(0);
  const [turnSet, setTurnSet] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [questionsViewed, setQuestionsViewed] = useState(new Set());
  const [completedTurns, setCompletedTurns] = useState([]);
  const [turnStartTime, setTurnStartTime] = useState(null);
  
  useEffect(() => {
    const session = getSession();
    if (!session || !session.demographics) {
      navigate('/');
      return;
    }

    if (session.gameType !== 'detection') {
      navigate(`/${session.gameType}-game`);
      return;
    }

    const fetchAndSetTurns = async () => {
      setLoading(true);
      try {
        const allTurns = await api.getQuestions(session.sessionId, 'detection');
        
        const shuffled = allTurns.sort(() => 0.5 - Math.random());

        const urlParams = new URLSearchParams(window.location.search);
        const isDemo = urlParams.get('demo') === 'true';
        const finalTurns = isDemo ? shuffled.slice(0, 3) : shuffled;
        
        // Renumber turns to be sequential (1, 2, 3, etc.)
        const renumberedTurns = finalTurns.map((turn, index) => ({
          ...turn,
          turnNumber: index + 1
        }));
        
        setTurnSet(renumberedTurns);
        setTotalTurns(renumberedTurns.length);
        
        if (renumberedTurns.length > 0) {
          loadTurn(1);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading turns:', error);
        setLoading(false);
      }
    };

    fetchAndSetTurns();
  }, [navigate]);

  useEffect(() => {
    if (turnSet.length > 0) {
      loadTurn(currentTurn);
    }
  }, [currentTurn, turnSet]);
  
  useEffect(() => {
    if (turnData && currentQuestionIndex < turnData.questions.length) {
      setQuestionsViewed(prev => new Set([...prev, turnData.questions[currentQuestionIndex].questionId]));
    }
  }, [currentQuestionIndex, turnData]);
  
  const loadTurn = (turnNumber) => {
    if (turnNumber < 1 || turnNumber > totalTurns) return;

    setLoading(true);
    const turn = turnSet[turnNumber - 1];
    setTurnData(turn);
    setCurrentQuestionIndex(0);
    setModelAssessment('');
    setConfidence(5);
    setQuestionsViewed(new Set());
    setTurnStartTime(Date.now()); // Track when turn started
    setLoading(false);
  };
  
  const handleQuestionSelect = (index) => {
    setCurrentQuestionIndex(index);
  };
  
  const handleSubmitTurn = async () => {
    if (!modelAssessment) return;
    
    setSubmitting(true);
    try {
      const session = getSession();
      const responseTime = turnStartTime ? Date.now() - turnStartTime : 0; // Calculate time spent on turn
      const response = {
        turnId: turnData.turnId,
        turnNumber: turnData.turnNumber,
        modelType: turnData.modelType,
        userAssessment: modelAssessment,
        confidence: confidence,
        questionsExamined: Array.from(questionsViewed),
        totalQuestionsInTurn: turnData.questions.length,
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      };
      
      // Save response locally
      addResponse(response);
      
      // Submit to API
      await api.submitResponse(session.sessionId, 'detection', {
        turnId: turnData.turnId,
        turnNumber: turnData.turnNumber,
        modelType: turnData.modelType,
        userGuess: modelAssessment,
        confidence: confidence,
        isCorrect: modelAssessment === turnData.modelType,
        questionsData: turnData.questions,
        responseTime: responseTime
      });
      
      // Update completed turns
      const newCompletedTurns = [...completedTurns, currentTurn];
      setCompletedTurns(newCompletedTurns);
      
      if (currentTurn >= totalTurns) {
        // Game complete
        navigate('/complete');
      } else {
        // Move to next turn
        setCurrentTurn(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error submitting turn:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="detection-game-container">
        <div className="text-center p-5">
          <div className="loading"></div>
          <p className="mt-3">Loading turn {currentTurn}...</p>
        </div>
      </div>
    );
  }
  
  if (!turnData) {
    return (
      <div className="detection-game-container">
        <div className="text-center p-5">
          <p>Error loading turn. Please refresh the page.</p>
        </div>
      </div>
    );
  }
  
  const currentQuestion = turnData.questions[currentQuestionIndex];
  
  return (
    <div className="detection-game-container">
      <div className="progress-section">
        <ProgressBar 
          current={completedTurns.length} 
          total={totalTurns}
          label={`Turn ${currentTurn} of ${totalTurns}`}
        />
      </div>
      
      <div className="game-content">
        <div className="question-sidebar">
          <div className="container">
            <h3 className="mb-3">Questions</h3>
            <div className="question-list">
              {turnData.questions.map((question, index) => (
                <div
                  key={question.questionId}
                  className={`question-item ${index === currentQuestionIndex ? 'active' : ''}`}
                  onClick={() => handleQuestionSelect(index)}
                >
                  Question {index + 1}
                </div>
              ))}
            </div>
            
          </div>
        </div>
        
        <div className="main-content">
          <div className="response-container">
            <div className="container">
              <div className="question-section mb-4">
                <h3 className="mb-3">Question {currentQuestionIndex + 1}</h3>
                <p className="question-text">{currentQuestion.questionText}</p>
                
                {currentQuestion.questionType === 'multiple_choice' && (
                  <div className="options-list mt-3">
                    <div>A. {currentQuestion.options.a}</div>
                    <div>B. {currentQuestion.options.b}</div>
                    <div>C. {currentQuestion.options.c}</div>
                    <div>D. {currentQuestion.options.d}</div>
                  </div>
                )}
              </div>
              
              <div className="responses-section">
                <h4 className="mb-3">Model Responses (Epochs)</h4>
                <div className="response-grid">
                  {currentQuestion.responses.map((response, index) => (
                    <div key={response.responseId} className="response-item container">
                      <div className="response-header">
                        <strong>Epoch {index + 1}</strong>
                      </div>
                      <div className="response-answer">{response.answer}</div>
                      <div className="response-justification">{response.justification}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="assessment-container">
            <div className="container">
              <div className="assessment-content">
                <div className="assessment-section">
                  <span className="assessment-label">Model Assessment:</span>
                  <div className="radio-group-horizontal">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="modelAssessment"
                        value="normal"
                        checked={modelAssessment === 'normal'}
                        onChange={(e) => setModelAssessment(e.target.value)}
                      />
                      <span>Normal</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="modelAssessment"
                        value="sandbagging"
                        checked={modelAssessment === 'sandbagging'}
                        onChange={(e) => setModelAssessment(e.target.value)}
                      />
                      <span>Sandbagging</span>
                    </label>
                  </div>
                </div>
                
                <div className="confidence-section">
                  <span className="assessment-label">Confidence (1-10):</span>
                  <div className="slider-container">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={confidence}
                      onChange={(e) => setConfidence(parseInt(e.target.value))}
                      className="confidence-slider"
                    />
                    <div className="slider-labels">
                      <span>1 (Less confident)</span>
                      <span className="confidence-display">{confidence}</span>
                      <span>10 (More confident)</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleSubmitTurn}
                  disabled={!modelAssessment || submitting}
                  className="submit-btn"
                >
                  {submitting ? <span className="loading"></span> : 
                   currentTurn >= totalTurns ? 'Complete Game' : 'Submit & Next Turn'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetectionGame;