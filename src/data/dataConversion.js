// Import and process the elicitation data
import elicitationData from './elicitation_data.json';

// Convert elicitation_data.json to elicitation game format
const convertedElicitationData = elicitationData.map((item, index) => {
  const options = {};
  item.choices.forEach((choice, choiceIndex) => {
    options[String.fromCharCode(97 + choiceIndex)] = choice; // a, b, c, d
  });
  
  return {
    questionId: `eq_${String(item.id).padStart(3, '0')}`,
    questionType: "multiple_choice",
    questionText: item.question.split('\n\n')[0], // Get question without options
    options: options,
    correctAnswer: item.target,
    dataset: "wmdp-bio"
  };
});

export const elicitationQuestions = convertedElicitationData;