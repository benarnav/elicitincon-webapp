import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, completeSession, clearSession } from '../utils/session';

const ThankYou = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  
  useEffect(() => {
    // Check if session exists and has been completed
    const currentSession = getSession();
    if (!currentSession || !currentSession.demographics) {
      navigate('/');
      return;
    }
    
    // Mark session as complete
    const handleCompletion = async () => {
      try {
        const completedSession = await completeSession();
        setSession(completedSession);
        
        // Calculate score
        if (completedSession.responses && completedSession.responses.length > 0) {
          const calculatedScore = calculateScore(completedSession);
          setScore(calculatedScore);
        }
      } catch (error) {
        console.error('Error completing session:', error);
        // Still show results even if completion fails
        setSession(currentSession);
        if (currentSession.responses && currentSession.responses.length > 0) {
          const calculatedScore = calculateScore(currentSession);
          setScore(calculatedScore);
        }
      }
    };
    
    handleCompletion();
  }, [navigate]);
  
  const calculateScore = (session) => {
    const responses = session.responses || [];
    if (responses.length === 0) return null;
    
    if (session.gameType === 'detection') {
      // Detection game scoring
      const correctResponses = responses.filter(r => r.userAssessment === r.modelType);
      const accuracy = (correctResponses.length / responses.length) * 100;
      
      // Calculate confidence calibration
      const confidenceSum = responses.reduce((sum, r) => sum + r.confidence, 0);
      const avgConfidence = confidenceSum / responses.length;
      
      // Calculate engagement score based on questions examined
      const avgQuestionsExamined = responses.reduce((sum, r) => sum + r.questionsExamined.length, 0) / responses.length;
      const maxQuestionsPerTurn = responses.length > 0 ? responses[0].totalQuestionsInTurn : 1;
      const engagementScore = (avgQuestionsExamined / maxQuestionsPerTurn) * 100;
      
      // Create detailed results for each turn
      const detailedResults = responses.map(r => ({
        turnNumber: r.turnNumber,
        turnId: r.turnId,
        userAnswer: r.userAssessment,
        correctAnswer: r.modelType,
        isCorrect: r.userAssessment === r.modelType,
        confidence: r.confidence
      }));
      
      return {
        type: 'detection',
        accuracy: Math.round(accuracy),
        totalResponses: responses.length,
        correctResponses: correctResponses.length,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        engagementScore: Math.round(engagementScore),
        detailedResults: detailedResults
      };
    } else if (session.gameType === 'elicitation') {
      // Elicitation game scoring
      const correctResponses = responses.filter(r => r.isCorrect);
      const accuracy = (correctResponses.length / responses.length) * 100;
      
      // Calculate efficiency metrics
      const avgMessages = responses.reduce((sum, r) => sum + r.messageCount, 0) / responses.length;
      const avgTime = responses.reduce((sum, r) => sum + r.totalTime, 0) / responses.length;
      
      // Create detailed results for each question
      const detailedResults = responses.map((r, index) => ({
        questionNumber: index + 1,
        userAnswer: r.finalAnswer,
        correctAnswer: r.correctAnswer,
        isCorrect: r.isCorrect,
        messageCount: r.messageCount
      }));
      
      return {
        type: 'elicitation',
        accuracy: Math.round(accuracy),
        totalResponses: responses.length,
        correctResponses: correctResponses.length,
        avgMessages: Math.round(avgMessages * 10) / 10,
        avgTime: Math.round(avgTime / 1000), // Convert to seconds
        detailedResults: detailedResults
      };
    }
    
    return null;
  };
  
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedback.trim()) return;
    
    // In a real implementation, this would send feedback to the server
    setSubmitted(true);
    
    // Clear session after a delay
    setTimeout(() => {
      clearSession();
    }, 3000);
  };
  
  
  if (!session) {
    return null;
  }
  
  return (
    <div className="max-w-800 mx-auto p-4">
      <div className="container text-center">
        <h1 className="mb-4">Thank You for Participating!</h1>
        
        <div className="mb-5">
          <p className="mb-3">
            Your contribution to this research is greatly appreciated. The data you've 
            provided will help us better understand how people interact with AI language 
            models and their ability to identify different model behaviors.
          </p>
          
          <p className="mb-3">
            You completed the <strong>{session.gameType === 'detection' ? 'Detection' : 'Elicitation'}</strong> game.
          </p>
          
          {score && (
            <div className="mb-4">
              <h2 className="mb-3">Your Performance</h2>
              <div className="container" style={{ textAlign: 'left', maxWidth: '800px' }}>
                {score.type === 'detection' ? (
                  <div>
                    <p className="mb-2">
                      <strong>Accuracy:</strong> {score.accuracy}% ({score.correctResponses}/{score.totalResponses} correct)
                    </p>
                    <p className="mb-2">
                      <strong>Average Confidence:</strong> {score.avgConfidence}/10
                    </p>
                    <p className="mb-2">
                      <strong>Engagement Score:</strong> {score.engagementScore}% (questions examined per turn)
                    </p>
                    <p className="mt-3" style={{ fontSize: '14px', opacity: '0.8' }}>
                      You correctly identified {score.correctResponses} out of {score.totalResponses} model types.
                    </p>
                    
                    {score.detailedResults && (
                      <div className="mt-4">
                        <h3 className="mb-3">Turn-by-Turn Results</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {score.detailedResults.map((result, index) => (
                            <div 
                              key={index}
                              style={{
                                padding: '12px',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                backgroundColor: result.isCorrect ? '#225c2b' : '#7a2936',
                                color: 'white'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><strong>Turn {result.turnNumber} (Sample {result.turnId.replace('turn_', '')})</strong></span>
                                <span>{result.isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                              </div>
                              <div style={{ fontSize: '14px', opacity: '0.9', marginTop: '4px' }}>
                                Your answer: <strong>{result.userAnswer}</strong> | 
                                Correct answer: <strong>{result.correctAnswer}</strong> | 
                                Confidence: {result.confidence}/10
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="mb-2">
                      <strong>Success Rate:</strong> {score.accuracy}% ({score.correctResponses}/{score.totalResponses} correct)
                    </p>
                    <p className="mb-2">
                      <strong>Average Messages:</strong> {score.avgMessages} per question
                    </p>
                    <p className="mb-2">
                      <strong>Average Time:</strong> {score.avgTime} seconds per question
                    </p>
                    <p className="mt-3" style={{ fontSize: '14px', opacity: '0.8' }}>
                      You successfully extracted {score.correctResponses} out of {score.totalResponses} correct answers.
                    </p>
                    
                    {score.detailedResults && (
                      <div className="mt-4">
                        <h3 className="mb-3">Question-by-Question Results</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {score.detailedResults.map((result, index) => (
                            <div 
                              key={index}
                              style={{
                                padding: '12px',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                backgroundColor: result.isCorrect ? '#225c2b' : '#7a2936',
                                color: 'white'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><strong>Question {index + 1}</strong></span>
                                <span>{result.isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                              </div>
                              <div style={{ fontSize: '14px', opacity: '0.9', marginTop: '4px' }}>
                                Your answer: <strong>{result.userAnswer}</strong> | 
                                Correct answer: <strong>{result.correctAnswer}</strong> | 
                                Messages used: {result.messageCount}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {session.responses && session.responses.length > 0 && (
            <p className="mb-3">
              Total responses submitted: <strong>{session.responses.length}</strong>
            </p>
          )}
        </div>
        
        {!submitted ? (
          <div className="mb-5">
            <h2 className="mb-3">Optional Feedback</h2>
            <p className="mb-3">
              If you have any feedback about your experience, please share it below:
            </p>
            
            <form onSubmit={handleFeedbackSubmit}>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Your feedback here..."
                rows={4}
                className="mb-3"
                style={{ resize: 'vertical' }}
              />
              
              <div>
                <button type="submit" disabled={!feedback.trim()}>
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mb-5">
            <p className="mb-3">Thank you for your feedback!</p>
          </div>
        )}
        
        <div className="mt-5">
          <h3 className="mb-3">Contact Information</h3>
          <p className="mb-3">
            If you have any questions about this study, please contact:<br />
            research@example.com
          </p>
        </div>
        
      </div>
    </div>
  );
};

export default ThankYou;