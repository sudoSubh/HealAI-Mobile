import { callGemini } from './gemini';

// Force Metro bundle cache reload
export interface AnalysisData {
  symptoms: string[];
  severity: string;
  duration: string;
  age?: string;
  gender?: string;
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
  patientName?: string;
  patientAddress?: string;
}

export interface RecoveryRoadmap {
  precautions: string[];
  dietaryGuidelines: string[];
  followUpTiming: string;
  generalCategoryGuidance: string;   // General class of care (e.g. "OTC analgesics may help") — no dosing
  medicationDisclaimer: string;       // Mandatory: "Consult a pharmacist or doctor before taking any medication"
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
  /**
   * ESI Triage Score (Emergency Severity Index, 1–5)
   * 1 = Resuscitation (immediate life threat)
   * 2 = Emergency
   * 3 = Urgent
   * 4 = Less Urgent / Soon
   * 5 = Non-Urgent / Routine
   * Used to gate the Recovery Roadmap (only ESI 4-5 receive it).
   */
  esiScore: 1 | 2 | 3 | 4 | 5;
  /**
   * "I don't know over guessing" principle (adapted from Healix AI)
   * The LLM self-reports its confidence (0–100). If below CONFIDENCE_THRESHOLD,
   * the entire assessment is overridden with an "insufficient information" message
   * and the user is directed to consult a doctor in person.
   */
  selfReportedConfidence: number;   // 0–100
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
  /**
   * 360° Recovery Roadmap — only populated for ESI 4–5 (low-urgency) cases.
   * Explicitly excludes specific medication dosing; general category guidance only.
   * Concept adapted from Healix AI's "360° recovery roadmap" feature.
   */
  recoveryRoadmap?: RecoveryRoadmap;
  disclaimer: string;
  /**
   * If true, confidence was below threshold and the raw LLM assessment has been
   * replaced with an "insufficient information — consult a doctor in person" override.
   */
  insufficientInformation?: boolean;
}

/**
 * Minimum confidence the LLM must self-report to return a usable assessment.
 * Below this value, the "I don't know over guessing" override is triggered.
 */
const CONFIDENCE_THRESHOLD = 70;

const DEFAULT_ANALYSIS_RESPONSE: AnalysisResponse = {
  conditions: [],
  urgencyLevel: {
    level: 'Routine',
    reasoning: ['Insufficient information to determine urgency level.'],
    timeframe: 'Not specified',
  },
  esiScore: 5,
  selfReportedConfidence: 0,
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

const MEDICAL_ANALYSIS_PROMPT = `You are an advanced medical analysis system operating under strict clinical guidelines.

CRITICAL — TEMPERATURE IS LOCKED AT 0.0 (DETERMINISTIC MODE):
Your output must be fully deterministic. Do not speculate or vary answers across runs.

CRITICAL — CONFIDENCE SELF-CHECK ("I don't know over guessing" principle):
You MUST self-assess your confidence in this analysis from 0 to 100.
If you are uncertain due to vague symptoms, insufficient history, or multiple equally-likely conditions,
report a low confidence score. The application will override the assessment rather than show a forced diagnosis.

Patient Data:
Age: {age}
Gender: {gender}
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
  "selfReportedConfidence": <integer 0–100; be honest, rate low if unsure>,
  "esiScore": <integer 1–5; ESI triage level: 1=Resuscitation, 2=Emergency, 3=Urgent, 4=Less Urgent, 5=Non-Urgent>,
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
  "recoveryRoadmap": {
    "precautions": ["List of specific precautions to take during recovery"],
    "dietaryGuidelines": ["List of specific food/drink guidance during recovery"],
    "followUpTiming": "e.g. 'Return to doctor if not improved in 48 hours' or 'Schedule follow-up within 1 week'",
    "generalCategoryGuidance": "General class of care suggestion WITHOUT specific drug names or dosing (e.g. 'Over-the-counter pain relief may help manage discomfort')",
    "medicationDisclaimer": "Always consult a pharmacist or doctor before starting, changing, or stopping any medication."
  },
  "disclaimer": "Medical disclaimer text"
}

IMPORTANT: Include recoveryRoadmap ONLY if esiScore is 4 or 5. For ESI 1–3, set recoveryRoadmap to null.
Provide 3–5 conditions, at least 4 lifestyle factors, and at least 3 remedy types. Focus on natural remedies and lifestyle changes.
DO NOT include specific medication names or dosing in the recoveryRoadmap.`;

export async function analyzeSymptomsWithGemini(data: AnalysisData, language: string = 'English'): Promise<AnalysisResponse> {
  try {
    let prompt = MEDICAL_ANALYSIS_PROMPT
      .replace('{age}', data.age || 'Not specified')
      .replace('{gender}', data.gender || 'Not specified')
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

    // temperature: 0 is applied automatically by callGemini for 'symptom-checker' task
    // — implements the T=0.0 deterministic reasoning principle from Healix AI
    const text = await callGemini(prompt, undefined, undefined, 'symptom-checker');

    if (text) {
      try {
        const cleanedText = text
          .replace(/```json\n?|\n?```/g, '')
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/\n\s*/g, ' ')
          .trim();

        const parsedResponse = JSON.parse(cleanedText);

        // ── "I don't know over guessing" confidence check (Healix AI principle) ──
        // If the LLM's self-reported confidence is below threshold, we override
        // the entire output with an "insufficient information" response.
        // This prevents the model from forcing a diagnosis when it isn't confident.
        const confidence = typeof parsedResponse.selfReportedConfidence === 'number'
          ? parsedResponse.selfReportedConfidence
          : 100;  // default to trusting if field missing (backwards compat)

        if (confidence < CONFIDENCE_THRESHOLD) {
          return {
            ...DEFAULT_ANALYSIS_RESPONSE,
            selfReportedConfidence: confidence,
            esiScore: 5,
            insufficientInformation: true,
            conditions: [{
              condition: 'Insufficient Information',
              probability: 'Low',
              description:
                'The provided symptom information is not specific enough for a reliable assessment. ' +
                'Please consult a doctor in person for an accurate evaluation.',
              reasoning: [
                `AI confidence was ${confidence}% — below the minimum ${CONFIDENCE_THRESHOLD}% threshold.`,
                'This prevents displaying a potentially incorrect or forced diagnosis.',
              ],
              riskFactors: ['Vague or incomplete symptom history'],
              suggestedTests: ['In-person clinical examination'],
            }],
            urgencyLevel: {
              level: 'Routine',
              reasoning: ['Consult a doctor in person for a proper assessment.'],
              timeframe: 'Schedule an appointment at your earliest convenience.',
            },
            redFlags: ['If symptoms worsen or you experience severe pain, difficulty breathing, or chest pain — seek emergency care immediately.'],
          };
        }

        const esiScore = [1, 2, 3, 4, 5].includes(parsedResponse.esiScore)
          ? parsedResponse.esiScore as 1 | 2 | 3 | 4 | 5
          : 5;

        const validatedResponse: AnalysisResponse = {
          selfReportedConfidence: confidence,
          esiScore,
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
          // 360° Recovery Roadmap — only included for ESI 4–5 (concept from Healix AI)
          // For ESI 1–3 cases, the roadmap is omitted as the patient needs urgent care, not self-help guidance.
          recoveryRoadmap: (esiScore >= 4 && parsedResponse.recoveryRoadmap && typeof parsedResponse.recoveryRoadmap === 'object')
            ? {
                precautions: Array.isArray(parsedResponse.recoveryRoadmap.precautions) ? parsedResponse.recoveryRoadmap.precautions : [],
                dietaryGuidelines: Array.isArray(parsedResponse.recoveryRoadmap.dietaryGuidelines) ? parsedResponse.recoveryRoadmap.dietaryGuidelines : [],
                followUpTiming: parsedResponse.recoveryRoadmap.followUpTiming || '',
                generalCategoryGuidance: parsedResponse.recoveryRoadmap.generalCategoryGuidance || '',
                medicationDisclaimer: parsedResponse.recoveryRoadmap.medicationDisclaimer || 'Always consult a pharmacist or doctor before taking any medication.',
              }
            : undefined,
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
