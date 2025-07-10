// Import mock data
import { detectionGameTurns } from '../data/detectionGameTurns';
import { elicitationQuestions } from '../data/dataConversion';
import { getSystemPrompt } from './systemPrompts';
import { airtableApi } from './airtableApi';
import { OPENAI_CONFIG } from '../config/config';

// OpenAI API configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// OpenAI API function
const callOpenAI = async ({ message, conversationHistory, questionId, systemPromptId }) => {
  const systemPrompt = getSystemPrompt(systemPromptId);
  
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured, falling back to mock responses');
    return mockChatResponse({ message, conversationHistory, questionId });
  }

  // Find the current question for context
  const currentQuestion = elicitationQuestions.find(q => q.questionId === questionId);
  
  // Build the messages array for OpenAI
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Add the question context as the first user message
  if (currentQuestion) {
    messages.push({
      role: 'user',
      content: `Please answer this question: ${currentQuestion.questionText}\n\nOptions:\n${Object.entries(currentQuestion.options).map(([key, value]) => `${key.toUpperCase()}) ${value}`).join('\n')}`
    });
  }
  
  // Add conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.message
      });
    });
  }
  
  // Add the current user message
  messages.push({ role: 'user', content: message });
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.model,
        messages: messages,
        max_tokens: OPENAI_CONFIG.maxTokens,
        temperature: OPENAI_CONFIG.temperature
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);
      throw new Error(`OpenAI API Error: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    return {
      response: aiResponse,
      messageCount: (conversationHistory?.length || 0) + 2, // +2 for user message and AI response
      maxReached: ((conversationHistory?.length || 0) + 2) >= 20
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    // Fallback to mock response
    return mockChatResponse({ message, conversationHistory, questionId });
  }
};

// Mock chat response function (fallback when no API key)
const mockChatResponse = ({ message, conversationHistory, questionId }) => {
  const currentQuestion = elicitationQuestions.find(q => q.questionId === questionId);
  const correctAnswer = currentQuestion ? currentQuestion.correctAnswer : 'a';
  const optionsObj = currentQuestion ? currentQuestion.options : {};
  
  let response;
  const messageCount = (conversationHistory?.length || 0) + 2;
  
  if (messageCount === 2) {
    // First interaction - provide incorrect answer
    const wrongOptions = Object.keys(optionsObj).filter(key => key.toLowerCase() !== correctAnswer.toLowerCase());
    const wrongAnswer = wrongOptions[0] || 'b';
    response = `Looking at this question, I believe the answer is ${wrongAnswer.toUpperCase()}. ${optionsObj[wrongAnswer.toLowerCase()]} seems to be the most relevant option based on my understanding.`;
  } else if (message.toLowerCase().includes('sure') || message.toLowerCase().includes('certain')) {
    response = `Yes, I'm quite confident in this assessment. The evidence supports this conclusion based on the biological mechanisms involved.`;
  } else if (message.toLowerCase().includes('why') || message.toLowerCase().includes('explain')) {
    response = `The reasoning behind this is that biological systems often work through specific pathways, and this option aligns with what we understand about the underlying mechanisms.`;
  } else if (message.toLowerCase().includes('other') || message.toLowerCase().includes('alternative')) {
    response = `While other options might seem plausible at first glance, they don't capture the full complexity of the biological processes involved here.`;
  } else {
    response = `I understand your question. From my knowledge of this topic, the evidence points in this direction, though biological systems can be complex.`;
  }
  
  return {
    response,
    messageCount,
    maxReached: messageCount >= 20
  };
};

// Simple mock API implementation that doesn't save data
const mockApiCall = async (endpoint, options = {}) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (endpoint.includes('/question-set')) {
    const params = new URLSearchParams(endpoint.split('?')[1]);
    const turnNumber = parseInt(params.get('turn')) || 1;
    
    // Get the specific turn data
    const turn = detectionGameTurns.find(t => t.turnNumber === turnNumber);
    if (!turn) {
      throw new Error(`Turn ${turnNumber} not found`);
    }
    
    return {
      turnId: turn.turnId,
      turnNumber: turn.turnNumber,
      modelType: turn.modelType,
      totalTurns: detectionGameTurns.length,
      questions: turn.questions
    };
  }

  if (endpoint.includes('/questions')) {
    const params = new URLSearchParams(endpoint.split('?')[1]);
    const gameType = params.get('gameType');
    
    if (gameType === 'elicitation') {
      return elicitationQuestions;
    } else if (gameType === 'detection') {
      return detectionGameTurns;
    } else {
      return [];
    }
  }
  
  if (endpoint.includes('/question')) {
    const questionNumber = parseInt(new URLSearchParams(endpoint.split('?')[1]).get('questionNumber')) || 1;
    const questionIndex = (questionNumber - 1) % elicitationQuestions.length;
    const question = elicitationQuestions[questionIndex];
    
    return {
      questionId: question.questionId,
      questionType: question.questionType,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      questionNumber,
      totalQuestions: 10
    };
  }
  
  if (endpoint.includes('/chat')) {
    // Use OpenAI API for chat responses
    const { message, conversationHistory, questionId, systemPromptId } = JSON.parse(options.body);
    return callOpenAI({ message, conversationHistory, questionId, systemPromptId });
  }
  
  // For all other endpoints (session, demographics, response), just return success without saving
  return { success: true };
};

// API methods - using Airtable for data persistence
export const api = {
  // Session management
  createSession: (sessionId, gameType, isDemo = false) => 
    airtableApi.createSession({ sessionId, gameType, isDemo }),
  
  // Demographics
  submitDemographics: (sessionId, demographics) =>
    airtableApi.submitDemographics(sessionId, demographics),
  
  // Detection game - still using mock data for questions
  getQuestionSet: (sessionId, turnNumber = 1) =>
    mockApiCall(`/question-set?sessionId=${sessionId}&gameType=detection&turn=${turnNumber}`),
  
  // Elicitation game - still using mock data for questions
  getQuestion: (sessionId, questionNumber) =>
    mockApiCall(`/question?sessionId=${sessionId}&gameType=elicitation&questionNumber=${questionNumber}`),
  getQuestions: (sessionId, gameType) =>
    mockApiCall(`/questions?sessionId=${sessionId}&gameType=${gameType}`),
  
  // Chat (Elicitation game) - using serverless function in production
  sendChatMessage: async (sessionId, questionId, message, conversationHistory, systemPromptId) => {
    const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
    const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
    
    if (USE_MOCK_DATA) {
      // Use existing mock API call for development
      return mockApiCall('/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          questionId,
          message,
          conversationHistory,
          systemPromptId
        })
      });
    }
    
    // Use Netlify function in production
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          questionId,
          message,
          conversationHistory,
          systemPromptId,
          gameType: 'elicitation'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling chat function:', error);
      // Fallback to mock response
      return mockChatResponse({ message, conversationHistory, questionId });
    }
  },
  
  // Submit responses - using Airtable
  submitResponse: (sessionId, gameType, response) => {
    if (gameType === 'detection') {
      return airtableApi.submitDetectionResponse(sessionId, response);
    } else if (gameType === 'elicitation') {
      return airtableApi.submitElicitationResponse(sessionId, response);
    }
    return Promise.resolve({ success: false, error: 'Unknown game type' });
  },
  
  // Complete session
  completeSession: async (sessionId, recordId = null) => {
    const result = await airtableApi.completeSession(sessionId, recordId);
    return result;
  }
};
