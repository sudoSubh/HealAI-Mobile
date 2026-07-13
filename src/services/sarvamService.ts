import { Platform } from 'react-native';

const SARVAM_API_KEY = process.env.EXPO_PUBLIC_SARVAM_API_KEY ?? ''; // Set EXPO_PUBLIC_SARVAM_API_KEY in .env
const BASE_URL = 'https://api.sarvam.ai';

// Mapping of languages to Sarvam BCP-47 codes
export const SARVAM_LANGUAGES: Record<string, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Bengali: 'bn-IN',
  Telugu: 'te-IN',
  Marathi: 'mr-IN',
  Tamil: 'ta-IN',
  Gujarati: 'gu-IN',
  Kannada: 'kn-IN',
  Odia: 'or-IN',
  Malayalam: 'ml-IN',
  Punjabi: 'pa-IN',
};

// Map BCP-47 codes to default speaker voices in Sarvam (e.g. bulbul:v3 voices: 'shubh', 'arvind', 'sangeeta', 'diksha')
const DEFAULT_SPEAKERS: Record<string, string> = {
  'hi-IN': 'shubh',
  'en-IN': 'arvind',
  'bn-IN': 'diksha',
  'te-IN': 'sangeeta',
  'ta-IN': 'diksha',
  'mr-IN': 'shubh',
  'gu-IN': 'arvind',
  'kn-IN': 'sangeeta',
  'ml-IN': 'diksha',
  'or-IN': 'shubh',
  'pa-IN': 'arvind',
};

/**
 * Text-to-Speech via Sarvam API
 * Converts text response into playable audio base64 or returns mock stream
 */
export async function textToSpeech(text: string, languageCode: string): Promise<string | null> {
  if (Platform.OS === 'web' || !SARVAM_API_KEY) {
    console.log(`[Sarvam TTS Mock] Speaking in ${languageCode}: "${text}"`);
    return null;
  }

  try {
    const speaker = DEFAULT_SPEAKERS[languageCode] || 'shubh';
    const response = await fetch(`${BASE_URL}/text-to-speech`, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        target_language_code: languageCode,
        speaker,
        pace: 1.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sarvam TTS request failed: ${response.statusText}`);
    }

    const resData = await response.json();
    return resData.audio || null; // Returns base64 string
  } catch (err) {
    console.warn('[Sarvam TTS] API request failed:', err);
    return null;
  }
}

/**
 * Speech-to-Text via Sarvam API
 * Transcribes audio base64 payload into text
 */
export async function speechToText(audioUri: string, languageCode: string): Promise<string | null> {
  if (Platform.OS === 'web' || !SARVAM_API_KEY) {
    console.log('[Sarvam STT Mock] Simulating speech-to-text transcription...');
    return null;
  }

  try {
    const formData = new FormData();
    // In React Native, we append the file URI as a form parameter
    formData.append('file', {
      uri: audioUri,
      name: 'audio.wav',
      type: 'audio/wav',
    } as any);
    formData.append('model', 'saaras:v3');
    formData.append('mode', 'transcribe');
    formData.append('language_code', languageCode);

    const response = await fetch(`${BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Sarvam STT request failed: ${response.statusText}`);
    }

    const resData = await response.json();
    return resData.transcript || null;
  } catch (err) {
    console.warn('[Sarvam STT] API request failed:', err);
    return null;
  }
}

/**
 * Translate Text via Sarvam API (Mayura model)
 */
import { callGemini } from './gemini';

/**
 * Translate Text via Sarvam API (Mayura model)
 */
export async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (!SARVAM_API_KEY) return text;
  try {
    const response = await fetch(`${BASE_URL}/translate`, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        source_language_code: sourceLang,
        target_language_code: targetLang,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sarvam translation failed: ${response.statusText}`);
    }

    const resData = await response.json();
    return resData.translated_text || text;
  } catch (err) {
    console.warn('[Sarvam Translate] API failed:', err);
    return text;
  }
}

export interface NurseCallAnalysis {
  esiScore: number;
  summary: string;
  conditions: string[];
}

export async function analyzeNurseCallTranscript(transcript: string): Promise<NurseCallAnalysis> {
  const prompt = `
    You are an expert clinical triage nurse. Analyze the following conversation transcript between an AI Nurse and a patient/elder.
    Identify:
    1. The clinical emergency severity index (ESI) score on a scale of 1 to 5:
       - 1: Immediate life-saving intervention needed (e.g. cardiac arrest, respiratory failure)
       - 2: High risk, severe distress, chest pain, stroke signs
       - 3: Stable but requires multiple resources (e.g. high fever, severe pain, vomiting)
       - 4: Stable, single resource (e.g. minor trauma, cough, mild sore throat)
       - 5: Stable, routine/no resources (e.g. general questions, prescription check)
    2. A brief, clear clinical summary of the consultation (2 sentences maximum).
    3. Potential conditions discussed (maximum 3).

    Output the response STRICTLY as a JSON object with this exact structure:
    {
      "esiScore": number,
      "summary": "string",
      "conditions": ["string"]
    }

    Do not include any markdown format tags like \`\`\`json. Return only raw JSON.
    
    Transcript:
    ${transcript}
  `;

  try {
    const rawRes = await callGemini(prompt, undefined, undefined, 'symptom-checker', 0.0);
    const cleanJson = rawRes.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      esiScore: Number(parsed.esiScore) || 5,
      summary: parsed.summary || 'Consultation completed.',
      conditions: parsed.conditions || [],
    };
  } catch (err) {
    console.warn('[Sarvam Service] Failed to parse nurse call transcript:', err);
    return {
      esiScore: 5,
      summary: 'Voice consultation recorded.',
      conditions: [],
    };
  }
}
