import { callGemini } from './gemini';

export interface AnalysisData {
  symptoms: string[];
  severity: string;
  duration: string;
  medicalHistory: {
    conditions: string[];
    medications: string[];
    allergies: string[];
  };
  lifestyle: {
    smoking: boolean;
    alcohol: string;
    exercise: string;
    diet: string;
    stress: string;
    sleep: string;
  };
  recentChanges: string;
  familyHistory: string[];
}

export interface AnalysisResponse {
  conditions: Array<{
    condition: string;
    probability: 'High' | 'Moderate' | 'Low';
    description: string;
    reasoning: string[];
    riskFactors: string[];
    suggestedTests?: string[];
  }>;
  urgencyLevel: {
    level: 'Emergency' | 'Urgent' | 'Soon' | 'Routine';
    reasoning: string[];
    timeframe: string;
  };
  lifestyleImpact: Array<{
    factor: string;
    impact: string;
    recommendations: string[];
  }>;
  remedyRecommendations: Array<{
    type: string;
    warning: string;
    recommendation: string;
  }>;
  preventiveMeasures: string[];
  followUpRecommendations: string[];
  specialistReferrals?: string[];
  redFlags: string[];
  disclaimer: string;
}

const DEFAULT_ANALYSIS_RESPONSE: AnalysisResponse = {
  conditions: [],
  urgencyLevel: {
    level: 'Routine',
    reasoning: ['Insufficient information to determine urgency level.'],
    timeframe: 'Not specified',
  },
  lifestyleImpact: [],
  remedyRecommendations: [],
  preventiveMeasures: [
    'Maintain a balanced diet',
    'Stay hydrated',
    'Get adequate sleep',
    'Exercise regularly',
    'Manage stress levels',
  ],
  followUpRecommendations: [
    'Monitor symptoms for any changes',
    'Consult with a healthcare provider if symptoms persist or worsen',
  ],
  specialistReferrals: [],
  redFlags: [],
  disclaimer:
    'This tool provides health information & awareness only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for any medical concerns. In case of a medical emergency, seek immediate professional help.',
};

const MEDICAL_ANALYSIS_PROMPT = `You are an advanced medical analysis system. Analyze the following patient data and provide a comprehensive medical assessment. 

Patient Data:
Symptoms: {symptoms}
Severity: {severity}
Duration: {duration}
Medical History:
- Conditions: {conditions}
- Medications: {medications}
- Allergies: {allergies}
Lifestyle Factors:
- Smoking: {smoking}
- Alcohol: {alcohol}
- Exercise: {exercise}
- Diet: {diet}
- Stress: {stress}
- Sleep: {sleep}
Recent Changes: {recentChanges}
Family History: {familyHistory}

Return a detailed JSON response with the following structure:
{
  "conditions": [
    {
      "condition": "Name of condition",
      "probability": "High/Moderate/Low",
      "description": "Detailed description",
      "reasoning": ["Specific symptom matches", "Risk factor correlations"],
      "riskFactors": ["Age-related factors", "Lifestyle impacts"],
      "suggestedTests": ["Specific diagnostic tests"]
    }
  ],
  "urgencyLevel": {
    "level": "Emergency/Urgent/Soon/Routine",
    "reasoning": ["Detailed reason for urgency level"],
    "timeframe": "Specific timeframe recommendation"
  },
  "lifestyleImpact": [
    {
      "factor": "Specific lifestyle factor",
      "impact": "How this factor affects the condition",
      "recommendations": ["Specific actionable change"]
    }
  ],
  "remedyRecommendations": [
    {
      "type": "Category of remedy",
      "warning": "Specific caution or contraindication",
      "recommendation": "Detailed remedy guidance focusing on natural treatments"
    }
  ],
  "preventiveMeasures": ["Specific preventive action"],
  "followUpRecommendations": ["Timeframe for follow-up"],
  "specialistReferrals": ["Specific type of specialist"],
  "redFlags": ["Critical warning signs"],
  "disclaimer": "Medical disclaimer text"
}

Provide 3-5 conditions, at least 4 lifestyle factors, and at least 3 remedy types. Focus on natural remedies and lifestyle changes.`;

export async function analyzeSymptomsWithGemini(data: AnalysisData, language: string = 'English'): Promise<AnalysisResponse> {
  try {
    let prompt = MEDICAL_ANALYSIS_PROMPT
      .replace('{symptoms}', data.symptoms.join(', '))
      .replace('{severity}', data.severity)
      .replace('{duration}', data.duration)
      .replace('{conditions}', data.medicalHistory.conditions.join(', ') || 'None')
      .replace('{medications}', data.medicalHistory.medications.join(', ') || 'None')
      .replace('{allergies}', data.medicalHistory.allergies.join(', ') || 'None')
      .replace('{smoking}', data.lifestyle.smoking.toString())
      .replace('{alcohol}', data.lifestyle.alcohol)
      .replace('{exercise}', data.lifestyle.exercise)
      .replace('{diet}', data.lifestyle.diet)
      .replace('{stress}', data.lifestyle.stress)
      .replace('{sleep}', data.lifestyle.sleep)
      .replace('{recentChanges}', data.recentChanges || 'None reported')
      .replace('{familyHistory}', data.familyHistory.join(', ') || 'None reported');

    if (language && language.toLowerCase() !== 'english') {
      prompt += `\n\nCRITICAL REQUIREMENT: You MUST write all the output values and descriptions in the JSON response in the ${language} language. For example, the condition names, descriptions, reasoning lists, timeframe, recommendations, remedy details, and disclaimer MUST be written in ${language} language. Keep only the JSON keys in English as specified.`;
    }

    const text = await callGemini(prompt, undefined, undefined, 'symptom-checker');

    if (text) {
      try {
        const cleanedText = text
          .replace(/```json\n?|\n?```/g, '')
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/\n\s*/g, ' ')
          .trim();

        const parsedResponse = JSON.parse(cleanedText);

        const validatedResponse: AnalysisResponse = {
          conditions: Array.isArray(parsedResponse.conditions) ? parsedResponse.conditions : DEFAULT_ANALYSIS_RESPONSE.conditions,
          urgencyLevel: parsedResponse.urgencyLevel && typeof parsedResponse.urgencyLevel === 'object'
            ? {
                level: parsedResponse.urgencyLevel.level || DEFAULT_ANALYSIS_RESPONSE.urgencyLevel.level,
                reasoning: Array.isArray(parsedResponse.urgencyLevel.reasoning) ? parsedResponse.urgencyLevel.reasoning : DEFAULT_ANALYSIS_RESPONSE.urgencyLevel.reasoning,
                timeframe: parsedResponse.urgencyLevel.timeframe || DEFAULT_ANALYSIS_RESPONSE.urgencyLevel.timeframe,
              }
            : DEFAULT_ANALYSIS_RESPONSE.urgencyLevel,
          lifestyleImpact: Array.isArray(parsedResponse.lifestyleImpact) ? parsedResponse.lifestyleImpact : DEFAULT_ANALYSIS_RESPONSE.lifestyleImpact,
          remedyRecommendations: Array.isArray(parsedResponse.remedyRecommendations) ? parsedResponse.remedyRecommendations : DEFAULT_ANALYSIS_RESPONSE.remedyRecommendations,
          preventiveMeasures: Array.isArray(parsedResponse.preventiveMeasures) ? parsedResponse.preventiveMeasures : DEFAULT_ANALYSIS_RESPONSE.preventiveMeasures,
          followUpRecommendations: Array.isArray(parsedResponse.followUpRecommendations) ? parsedResponse.followUpRecommendations : DEFAULT_ANALYSIS_RESPONSE.followUpRecommendations,
          specialistReferrals: Array.isArray(parsedResponse.specialistReferrals) ? parsedResponse.specialistReferrals : DEFAULT_ANALYSIS_RESPONSE.specialistReferrals,
          redFlags: Array.isArray(parsedResponse.redFlags) ? parsedResponse.redFlags : DEFAULT_ANALYSIS_RESPONSE.redFlags,
          disclaimer: typeof parsedResponse.disclaimer === 'string' ? parsedResponse.disclaimer : DEFAULT_ANALYSIS_RESPONSE.disclaimer,
        };

        return validatedResponse;
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return {
          ...DEFAULT_ANALYSIS_RESPONSE,
          conditions: [{
            condition: 'Analysis Error',
            probability: 'Low',
            description: 'We encountered an issue processing your symptoms analysis.',
            reasoning: ['The AI service response could not be parsed correctly.'],
            riskFactors: ['Service unavailability'],
            suggestedTests: ['Retry the analysis'],
          }],
          redFlags: ['System error occurred during analysis. Please try again.'],
        };
      }
    } else {
      throw new Error('Empty response from Gemini');
    }
  } catch (error: any) {
    console.error('Error analyzing symptoms with Gemini:', error);
    return {
      ...DEFAULT_ANALYSIS_RESPONSE,
      conditions: [{
        condition: 'Connection Error',
        probability: 'Low',
        description: 'We encountered an issue connecting to the analysis service.',
        reasoning: [error?.message || 'Unknown error'],
        riskFactors: ['Network issues'],
        suggestedTests: ['Check internet connection', 'Retry the analysis'],
      }],
      redFlags: [`Connection error: ${error?.message || 'Unknown'}`],
    };
  }
}
