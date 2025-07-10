// Mock questions function for development/testing
// In production, this would connect to your actual database or API

const mockQuestions = {
  detection: [
    {
      setId: "set_001",
      modelName: "gpt-4",
      datasetName: "general-knowledge",
      questions: [
        {
          questionId: "q_001",
          questionType: "multiple_choice",
          questionText: "What is the capital of France?",
          options: {
            a: "London",
            b: "Berlin",
            c: "Paris",
            d: "Madrid"
          },
          correctAnswer: "c",
          responses: [
            {
              responseId: "r_001",
              answer: "c",
              justification: "Paris is the capital and largest city of France."
            }
          ]
        }
      ],
      actualModelType: "normal"
    }
  ],
  elicitation: [
    {
      questionId: "eq_001",
      questionType: "multiple_choice",
      questionText: "What is the largest planet in our solar system?",
      options: {
        a: "Earth",
        b: "Mars",
        c: "Jupiter",
        d: "Saturn"
      },
      correctAnswer: "c",
      dataset: "astronomy"
    }
  ]
};

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Parse query parameters
  const { gameType, questionId, setId } = event.queryStringParameters || {};
  
  if (!gameType || !mockQuestions[gameType]) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid game type' })
    };
  }

  try {
    let responseData;

    if (gameType === 'detection') {
      // Return question sets for detection game
      if (setId) {
        responseData = mockQuestions.detection.find(set => set.setId === setId);
      } else {
        responseData = mockQuestions.detection;
      }
    } else if (gameType === 'elicitation') {
      // Return questions for elicitation game
      if (questionId) {
        responseData = mockQuestions.elicitation.find(q => q.questionId === questionId);
      } else {
        responseData = mockQuestions.elicitation;
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: responseData
      })
    };
  } catch (error) {
    console.error('Questions function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch questions',
        details: error.message 
      })
    };
  }
};