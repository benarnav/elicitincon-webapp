import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, addResponse } from '../utils/session';
import { api } from '../utils/api';
import ProgressBar from './common/ProgressBar';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getSystemPrompt, SYSTEM_PROMPTS } from '../utils/systemPrompts';
import { OPENAI_CONFIG } from '../config/config';
import './ElicitationGame.css';

const ElicitationGame = () => {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questionSet, setQuestionSet] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [apiConversationHistory, setApiConversationHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [finalAnswer, setFinalAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [systemPromptId, setSystemPromptId] = useState(null);
  const [systemPromptText, setSystemPromptText] = useState('');
  const maxMessages = 20;
  
  useEffect(() => {
    const session = getSession();
    if (!session || !session.demographics) {
      navigate('/');
      return;
    }

    if (session.gameType !== 'elicitation') {
      navigate(`/${session.gameType}-game`);
      return;
    }

    // Initialize system prompt tracking
    const urlParams = new URLSearchParams(window.location.search);
    const spParam = urlParams.get('sp');
    const promptId = parseInt(spParam) || 1;
    const promptText = SYSTEM_PROMPTS[promptId] || SYSTEM_PROMPTS[1];
    
    setSystemPromptId(promptId);
    setSystemPromptText(promptText);
    

    const fetchAndSetQuestions = async () => {
      setLoading(true);
      try {
        const allQuestions = await api.getQuestions(session.sessionId, 'elicitation');
        
        const shuffled = allQuestions.sort(() => 0.5 - Math.random());

        const urlParams = new URLSearchParams(window.location.search);
        const isDemo = urlParams.get('demo') === 'true';
        const finalQuestions = isDemo ? shuffled.slice(0, 3) : shuffled.slice(0, 10);
        
        setQuestionSet(finalQuestions);
        setTotalQuestions(finalQuestions.length);
        
        if (finalQuestions.length > 0) {
          loadQuestion(1);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
        setLoading(false);
      }
    };

    fetchAndSetQuestions();
  }, [navigate]);

  useEffect(() => {
    if (questionSet.length > 0) {
      loadQuestion(questionNumber);
    }
  }, [questionNumber, questionSet]);
  
  useEffect(() => {
    // Scroll to bottom of chat when new messages are added
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);
  
  const loadQuestion = (qNumber) => {
    if (qNumber < 1 || qNumber > totalQuestions) return;
    
    setLoading(true);
    const question = questionSet[qNumber - 1];
    setCurrentQuestion(question);
    setConversation([]);
    setApiConversationHistory([]);
    setFinalAnswer('');
    setMessageCount(0);
    setQuestionStartTime(Date.now()); // Track when question started
    setLoading(false);
    
    // Focus the input when a new question loads
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }, 100);
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || sendingMessage || messageCount >= maxMessages) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSendingMessage(true);
    
    // Add user message to conversation
    const newUserMessage = {
      role: 'user',
      message: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setConversation(prev => [...prev, newUserMessage]);
    
    try {
      const session = getSession();
      const response = await api.sendChatMessage(
        session.sessionId,
        currentQuestion.questionId,
        userMessage,
        apiConversationHistory,
        systemPromptId
      );
      
      // Add AI response to conversation
      const aiMessage = {
        role: 'assistant',
        message: response.response,
        timestamp: new Date().toISOString()
      };
      
      setConversation(prev => [...prev, aiMessage]);
      
      // Update API conversation history with both user and AI messages
      setApiConversationHistory(prev => [
        ...prev,
        { role: 'user', message: userMessage, timestamp: new Date().toISOString() },
        aiMessage
      ]);
      
      setMessageCount(response.messageCount || messageCount + 1);
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message
      const errorMessage = {
        role: 'system',
        message: 'Error: Could not send message. Please try again.',
        timestamp: new Date().toISOString()
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setSendingMessage(false);
      
      // Refocus on input after response is received
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }, 100);
    }
  };
  
  const handleSubmitAnswer = async () => {
    if (!finalAnswer || submitting) return;
    
    setSubmitting(true);
    try {
      const session = getSession();
      const totalTime = questionStartTime ? Date.now() - questionStartTime : 0; // Calculate time spent on question
      const response = {
        questionId: currentQuestion.questionId,
        questionType: currentQuestion.questionType,
        questionText: currentQuestion.questionText,
        correctAnswer: currentQuestion.correctAnswer,
        conversation: conversation,
        finalAnswer: finalAnswer,
        isCorrect: finalAnswer === currentQuestion.correctAnswer,
        messageCount: messageCount,
        totalTime: totalTime,
        systemPromptId: systemPromptId,
        systemPromptText: systemPromptText,
        model: OPENAI_CONFIG.model,
        timestamp: new Date().toISOString()
      };
      
      // Save response locally
      addResponse(response);
      
      // Submit to API
      const apiPayload = {
        questionId: currentQuestion.questionId,
        questionText: currentQuestion.questionText,
        questionType: currentQuestion.questionType,
        correctAnswer: currentQuestion.correctAnswer,
        finalAnswer: finalAnswer,
        isCorrect: finalAnswer === currentQuestion.correctAnswer,
        conversation: conversation,
        messageCount: messageCount,
        totalTime: totalTime,
        systemPromptId: systemPromptId,
        systemPromptText: systemPromptText,
        model: OPENAI_CONFIG.model
      };
      
      await api.submitResponse(session.sessionId, 'elicitation', apiPayload);
      
      // Check if more questions
      if (questionNumber >= totalQuestions) {
        navigate('/complete');
      } else {
        setQuestionNumber(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleQuestionNavigate = (qNum) => {
    if (qNum < 1 || qNum > totalQuestions || qNum === questionNumber) return;
    if (conversation.length > 0 && !window.confirm('Are you sure you want to leave this question? Your conversation will be lost.')) {
      return;
    }
    setQuestionNumber(qNum);
  };
  
  const handleResetContext = () => {
    // Clear API conversation history but keep visual conversation
    setApiConversationHistory([]);
    
    // Add visual separator to the conversation
    const resetSeparator = {
      role: 'system',
      message: 'CONTEXT_RESET',
      timestamp: new Date().toISOString()
    };
    
    setConversation(prev => [...prev, resetSeparator]);
  };
  
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    // Auto-resize the textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  
  if (loading) {
    return (
      <div className="elicitation-game-container">
        <div className="text-center p-5">
          <div className="loading"></div>
          <p className="mt-3">Loading question...</p>
        </div>
      </div>
    );
  }
  
  if (!currentQuestion) {
    return (
      <div className="elicitation-game-container">
        <div className="text-center p-5">
          <p>Error loading question. Please refresh the page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="elicitation-game-container">
      <div className="progress-section">
        <ProgressBar 
          current={questionNumber - 1} 
          total={totalQuestions}
          label={`Question ${questionNumber} of ${totalQuestions} completed`}
        />
      </div>
      
      <div className="game-content">
        <div className="question-sidebar">
          <div className="container">
            <h3 className="mb-3">Questions</h3>
            <div className="question-list">
              {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(num => (
                <div
                  key={num}
                  className={`question-item ${num === questionNumber ? 'active' : ''} ${num < questionNumber ? 'completed' : ''}`}
                  onClick={() => handleQuestionNavigate(num)}
                >
                  Question {num}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="main-content">
          <div className="chat-container">
            <div className="container">
              <div className="question-context mb-3">
                <h3 className="mb-2">Question {questionNumber}</h3>
                <p className="question-text">{currentQuestion.questionText}</p>
                
                {currentQuestion.questionType === 'multiple_choice' && (
                  <div className="options-list mt-2">
                    <div>A. {currentQuestion.options.a}</div>
                    <div>B. {currentQuestion.options.b}</div>
                    <div>C. {currentQuestion.options.c}</div>
                    <div>D. {currentQuestion.options.d}</div>
                  </div>
                )}
              </div>
              
              <div className="chat-interface">
                <div className="message-history">
                  {conversation.length === 0 && (
                    <div className="empty-chat">
                      <p>Start a conversation to elicit the correct answer from the AI.</p>
                      <p className="mt-2">You have {maxMessages} messages available.</p>
                    </div>
                  )}
                  
                  {conversation.map((msg, index) => {
                    if (msg.message === 'CONTEXT_RESET') {
                      return (
                        <div key={index} className="context-reset-separator">
                          <div className="reset-line"></div>
                          <div className="reset-text">Context Reset</div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={index} className={`message ${msg.role}`}>
                        <div className="message-content">
                          {msg.role === 'assistant' ? (
                            <ReactMarkdown
                              components={{
                                code({node, inline, className, children, ...props}) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      style={tomorrow}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{
                                        margin: '0.5em 0',
                                        borderRadius: '4px',
                                        fontSize: '0.9em',
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #ffffff',
                                      }}
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {msg.message}
                            </ReactMarkdown>
                          ) : (
                            msg.message
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {sendingMessage && (
                    <div className="message assistant">
                      <div className="message-content">
                        <span className="loading"></span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>
                
                <form onSubmit={handleSendMessage} className="message-input-form">
                  <textarea
                    ref={messageInputRef}
                    value={inputMessage}
                    onChange={handleInputChange}
                    placeholder={messageCount >= maxMessages ? "Maximum messages reached" : "Type your message..."}
                    disabled={sendingMessage || messageCount >= maxMessages}
                    maxLength={500}
                    rows={3}
                    style={{
                      resize: 'none',
                      overflow: 'hidden',
                      minHeight: '72px', // Approximately 3 lines
                      maxHeight: '200px', // Limit maximum height
                      lineHeight: '1.4',
                      padding: '8px',
                      wordWrap: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={!inputMessage.trim() || sendingMessage || messageCount >= maxMessages}
                  >
                    Send
                  </button>
                </form>
                
                <div className="message-info">
                  <span>{inputMessage.length}/500 characters</span>
                  <span>{messageCount}/{maxMessages} messages used</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="answer-container">
            <div className="container">
              <div className="answer-content">
                <span className="answer-label">Final Answer:</span>
                
                {currentQuestion.questionType === 'multiple_choice' ? (
                  <div className="radio-group-horizontal">
                    {['A', 'B', 'C', 'D'].map(option => (
                      <label key={option} className="radio-label">
                        <input
                          type="radio"
                          name="finalAnswer"
                          value={option}
                          checked={finalAnswer === option}
                          onChange={(e) => setFinalAnswer(e.target.value)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={finalAnswer}
                    onChange={(e) => setFinalAnswer(e.target.value)}
                    placeholder="Enter your answer..."
                    className="text-answer"
                  />
                )}
                
                <div className="answer-buttons">
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!finalAnswer || submitting}
                    className="submit-btn"
                  >
                    {submitting ? <span className="loading"></span> : 'Submit Final Answer'}
                  </button>
                  <button
                    onClick={handleResetContext}
                    disabled={sendingMessage}
                    className="reset-context-btn"
                  >
                    Reset Context
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElicitationGame;