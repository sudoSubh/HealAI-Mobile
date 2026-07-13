import { callGemini } from './gemini';

// ─── Voice Server URL loaded from .env ─────────────────────────────────────
// Set EXPO_PUBLIC_VOICE_SERVER_URL=https://your-tunnel.ngrok-free.app in .env
export const VOICE_SERVER_URL: string =
  process.env.EXPO_PUBLIC_VOICE_SERVER_URL ?? 'http://localhost:5050';

export interface NurseCallAnalysis {
  esiScore: number;
  summary: string;
  conditions: string[];
}

/**
 * Triggers a real outbound AI nursing call via our backend server.
 * The backend server handles the Twilio API call and routes the webhook
 * to our multilingual Gemini AI conversation loop.
 */
export async function triggerTwilioCall(toNumber: string, languageCode: string, name: string): Promise<boolean> {
  if (VOICE_SERVER_URL === 'https://YOUR_TUNNEL_URL_HERE') {
    console.warn('[Voice] VOICE_SERVER_URL not set — falling back to simulation mode.');
    return false;
  }

  try {
    const response = await fetch(`${VOICE_SERVER_URL}/trigger-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toNumber, name, langCode: languageCode }),
    });

    const result = await response.json();

    if (!response.ok) {
      if (result.code === 21219 || (result.error || '').includes('unverified')) {
        throw new Error('TWILIO_UNVERIFIED_NUMBER');
      }
      throw new Error(result.error || 'Call trigger failed');
    }

    console.log('[Voice] Outbound AI call placed! CallSid:', result.callSid);
    return true;
  } catch (err: any) {
    console.warn('[Voice] Call trigger failed:', err);
    if (err?.message === 'TWILIO_UNVERIFIED_NUMBER') {
      throw new Error('TWILIO_UNVERIFIED_NUMBER');
    }
    return false;
  }
}

/**
 * Uses Gemini LLM to analyze the conversational transcript between the elder and the AI Nurse.
 * Computes the clinical ESI score (1 to 5), discussing conditions, and summary.
 */
export async function analyzeCallTranscript(transcript: string): Promise<NurseCallAnalysis> {
  const prompt = `
    You are an expert clinical triage nurse. Analyze the following conversation transcript between an AI Nurse and an elderly patient.
    Identify:
    1. The clinical emergency severity index (ESI) score on a scale of 1 to 5:
       - 1: Immediate life-saving intervention needed (respiratory arrest, cardiac symptoms)
       - 2: High risk, severe distress, disoriented, chest pain
       - 3: Stable but requires multiple resources (e.g. high fever, severe pain, active vomiting)
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
    console.warn('[Voice Call Service] Failed to parse nurse call transcript:', err);
    return {
      esiScore: 5,
      summary: 'Voice consultation recorded.',
      conditions: [],
    };
  }
}
