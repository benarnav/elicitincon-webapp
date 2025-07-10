// Airtable API configuration
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const airtableRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${AIRTABLE_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Airtable API error: ${response.status} ${response.statusText}`, errorText);
    let errorDetails;
    try {
      errorDetails = JSON.parse(errorText);
    } catch (e) {
      errorDetails = errorText;
    }
    throw new Error(`Airtable API error: ${response.statusText} - ${JSON.stringify(errorDetails)}`);
  }

  const result = await response.json();
  return result;
};

export const airtableApi = {
  // Sessions
  createSession: async (sessionData) => {
    try {
      const result = await airtableRequest('/Sessions', {
        method: 'POST',
        body: JSON.stringify({
          fields: {
            session_id: sessionData.sessionId,
            game_type: sessionData.gameType,
            is_demo: sessionData.isDemo,
            created_at: new Date().toISOString(),
            status: 'active'
          }
        })
      });
      // Return the Airtable record ID along with the result
      return { success: true, data: result, recordId: result.id };
    } catch (error) {
      console.error('Error creating session:', error);
      return { success: false, error: error.message };
    }
  },

  // Demographics
  submitDemographics: async (sessionId, demographics) => {
    try {
      const result = await airtableRequest('/Demographics', {
        method: 'POST',
        body: JSON.stringify({
          fields: {
            record_id: `demo_${sessionId}`,
            session_id: sessionId,
            age_range: demographics.age,
            bio_experience: demographics.bioExperience,
            chem_experience: demographics.chemExperience,
            cybersec_experience: demographics.cybersecurityExperience,
            ai_safety_exposure: demographics.aiSafetyExposure ? 'yes' : 'no',
            programming_experience: demographics.programmingExperience,
            professional_background: demographics.background,
            submitted_at: new Date().toISOString()
          }
        })
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Error submitting demographics:', error);
      return { success: false, error: error.message };
    }
  },

  // Detection game responses
  submitDetectionResponse: async (sessionId, response) => {
    try {
      const result = await airtableRequest('/Detection_Responses', {
        method: 'POST',
        body: JSON.stringify({
          fields: {
            record_id: `det_${sessionId}_${response.turnId}`,
            session_id: sessionId,
            turn_id: response.turnId,
            turn_number: response.turnNumber,
            model_type: response.modelType,
            user_guess: response.userGuess,
            confidence: response.confidence,
            is_correct: response.isCorrect,
            questions_data: JSON.stringify(response.questionsData),
            response_time: response.responseTime,
            submitted_at: new Date().toISOString()
          }
        })
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Error submitting detection response:', error);
      return { success: false, error: error.message };
    }
  },

  // Helper function to infer question type from answer format
  inferQuestionType: (correctAnswer, questionText) => {
    // Check if correct answer is a single letter (A, B, C, D) - indicates MCQ
    if (correctAnswer && correctAnswer.length === 1 && /^[a-dA-D]$/.test(correctAnswer)) {
      return 'MCQ';
    }
    
    // Check if question text contains option patterns (A), B), C), D) - indicates MCQ
    if (questionText && /[A-D]\)\s/.test(questionText)) {
      return 'MCQ';
    }
    
    // Default to open ended
    return 'open ended';
  },

  // Elicitation game responses
  submitElicitationResponse: async (sessionId, response) => {
    try {
      // Infer question type from answer format
      const inferredQuestionType = airtableApi.inferQuestionType(response.correctAnswer, response.questionText);
      
      const fields = {
        record_id: `elic_${sessionId}_${response.questionId}`,
        session_id: sessionId,
        question_id: response.questionId,
        question_text: response.questionText,
        correct_answer: response.correctAnswer,
        final_answer: response.finalAnswer,
        is_correct: response.isCorrect,
        conversation_data: JSON.stringify(response.conversation),
        message_count: response.messageCount,
        total_time: response.totalTime,
        system_prompt_id: response.systemPromptId || 1,
        system_prompt_text: response.systemPromptText || '',
        model: response.model || '',
        submitted_at: new Date().toISOString()
      };
      
      // Try to include question_type, but handle permission errors gracefully
      const questionType = response.questionType || inferredQuestionType;
      
      try {
        // First attempt: include question_type
        fields.question_type = questionType;
        const result = await airtableRequest('/Elicitation_Responses', {
          method: 'POST',
          body: JSON.stringify({ fields })
        });
        return { success: true, data: result };
      } catch (typeError) {
        // If it fails due to select option permissions, retry without question_type
        if (typeError.message.includes('INVALID_MULTIPLE_CHOICE_OPTIONS')) {
          console.warn(`Cannot set question_type to "${questionType}" - retrying without question_type field`);
          delete fields.question_type;
          
          const result = await airtableRequest('/Elicitation_Responses', {
            method: 'POST',
            body: JSON.stringify({ fields })
          });
          return { success: true, data: result, warning: `Question type "${questionType}" not saved due to permissions` };
        } else {
          throw typeError; // Re-throw if it's a different error
        }
      }
    } catch (error) {
      console.error('Error submitting elicitation response:', error);
      return { success: false, error: error.message };
    }
  },

  // Mark session as completed - now accepts either sessionId or recordId
  completeSession: async (sessionId, recordId = null) => {
    try {
      
      // If we have the record ID, use it directly (avoids permission issues)
      if (recordId) {
        
        const updateData = {
          fields: {
            status: 'completed',
            completed_at: new Date().toISOString()
          }
        };
        
        const result = await airtableRequest(`/Sessions/${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify(updateData)
        });
        
        return { success: true, data: result };
      }
      
      // Fallback: try to find by session_id (may fail due to permissions)
      const filterFormula = encodeURIComponent(`{session_id}="${sessionId}"`);
      
      try {
        const sessions = await airtableRequest(`/Sessions?filterByFormula=${filterFormula}`);
        
        if (sessions.records.length > 0) {
          const foundRecordId = sessions.records[0].id;
          
          // Recursively call with the found record ID
          return airtableApi.completeSession(sessionId, foundRecordId);
        } else {
          return { success: false, error: 'Session not found' };
        }
      } catch (filterError) {
        return { success: false, error: 'Cannot find session - missing record ID and search permissions' };
      }
    } catch (error) {
      console.error('Error completing session:', error);
      return { success: false, error: error.message };
    }
  }
};