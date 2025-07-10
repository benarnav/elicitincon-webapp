import { v4 as uuidv4 } from 'uuid';
import { api } from './api';

const SESSION_KEY = 'llm_safety_session';

export const createSession = async (gameType, isDemo = false) => {
  const sessionId = uuidv4();
  const session = {
    sessionId: sessionId,
    gameType: gameType,
    startTime: new Date().toISOString(),
    completionStatus: 'in_progress',
    demographics: null,
    responses: [],
    isDemo: isDemo,
    airtableRecordId: null // Store the Airtable record ID
  };
  
  // Save session to Airtable
  try {
    const result = await api.createSession(sessionId, gameType, isDemo);
    if (result.success && result.recordId) {
      session.airtableRecordId = result.recordId;
    }
  } catch (error) {
    console.error('Error creating session in Airtable:', error);
    // Continue with local session even if Airtable fails
  }
  
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const getSession = () => {
  const sessionData = sessionStorage.getItem(SESSION_KEY);
  return sessionData ? JSON.parse(sessionData) : null;
};

export const updateSession = (updates) => {
  const session = getSession();
  if (!session) return null;
  
  const updatedSession = { ...session, ...updates };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
  return updatedSession;
};

export const updateDemographics = (demographics) => {
  return updateSession({ demographics });
};

export const addResponse = (response) => {
  const session = getSession();
  if (!session) return null;
  
  const updatedSession = {
    ...session,
    responses: [...session.responses, response]
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
  return updatedSession;
};

export const completeSession = async () => {
  const session = getSession();
  if (!session) {
    console.error('No session found to complete');
    return null;
  }
  
  
  // Mark session as completed in Airtable
  try {
    const result = await api.completeSession(session.sessionId, session.airtableRecordId);
  } catch (error) {
    console.error('Error completing session in Airtable:', error);
    // Continue with local completion even if Airtable fails
  }
  
  const completedSession = updateSession({
    completionStatus: 'completed',
    endTime: new Date().toISOString()
  });
  
  return completedSession;
};

export const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};