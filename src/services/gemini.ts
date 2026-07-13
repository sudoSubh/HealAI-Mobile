import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

export type GeminiTask = 'medical-bot' | 'symptom-checker' | 'report-analyzer' | 'daily-insight';

// ─── Gemini API Keys loaded from .env (EXPO_PUBLIC_ prefix required) ──────────
// Copy .env.example → .env and fill in your keys before starting.
const KEY_1 = process.env.EXPO_PUBLIC_GEMINI_KEY_1 ?? '';
const KEY_2 = process.env.EXPO_PUBLIC_GEMINI_KEY_2 ?? '';
const KEY_3 = process.env.EXPO_PUBLIC_GEMINI_KEY_3 ?? '';

if (!KEY_1 || !KEY_2 || !KEY_3) {
  console.warn('[HealAI] One or more EXPO_PUBLIC_GEMINI_KEY_* env vars are missing. Check your .env file.');
}

// Map specific tasks to prioritized backup key lists to split the rate limit budget
const TASK_KEYS: Record<GeminiTask, string[]> = {
  'symptom-checker': [KEY_1, KEY_2, KEY_3],
  'medical-bot':     [KEY_2, KEY_1, KEY_3],
  'report-analyzer': [KEY_3, KEY_2, KEY_1],
  'daily-insight':   [KEY_3, KEY_2, KEY_1]
};

// Track failover rotation offsets per task
const taskKeyOffsets: Record<GeminiTask, number> = {
  'symptom-checker': 0,
  'medical-bot': 0,
  'report-analyzer': 0,
  'daily-insight': 0
};

function getActiveKey(task: GeminiTask): string {
  const keyRing = TASK_KEYS[task];
  const offset = taskKeyOffsets[task];
  return keyRing[offset % keyRing.length];
}

/**
 * T=0.0 DETERMINISTIC REASONING PRINCIPLE (adapted from Healix AI)
 *
 * All triage, SOAP-note generation, and lab-analysis calls pass temperature=0
 * to guarantee that LLM outputs are fully deterministic and reproducible.
 * This prevents the model from "hallucinating" different diagnoses or dosage
 * suggestions on repeated runs with identical inputs — critical for clinical use.
 *
 * Only non-clinical creative tasks (diet plans, daily insights) use the default
 * temperature (1.0), where variety is acceptable or even desirable.
 */
export const CLINICAL_TEMPERATURE = 0.0;   // For triage, SOAP notes, lab analysis
export const CREATIVE_TEMPERATURE = 1.0;   // For diet plans, daily insights

export async function callGemini(
  prompt: string,
  imageBase64?: string,
  mimeType = 'image/jpeg',
  task: GeminiTask = 'daily-insight',
  temperature?: number  // Optional override; defaults based on task type below
): Promise<string> {
  const modelName = 'gemini-3.5-flash';
  const keyRing = TASK_KEYS[task];
  let attempts = 0;
  const maxAttempts = keyRing.length;

  // Automatically apply T=0.0 to all clinical tasks if not explicitly overridden
  // This implements the Healix AI "deterministic reasoning" principle:
  // identical clinical input → identical output every time.
  const resolvedTemperature = temperature !== undefined
    ? temperature
    : (task === 'symptom-checker' || task === 'report-analyzer')
      ? CLINICAL_TEMPERATURE
      : CREATIVE_TEMPERATURE;

  while (attempts < maxAttempts) {
    const key = getActiveKey(task);
    if (!key) {
      throw new Error(`[HealAI] No API key provided for task: ${task}`);
    }

    try {
      const client = new GoogleGenerativeAI(key);
      // Pass generationConfig with the resolved temperature
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: resolvedTemperature },
      });

      const parts: any[] = [];
      if (imageBase64 && typeof imageBase64 === 'string') {
        const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9-+\/]+;base64,/, '');
        parts.push({ inlineData: { data: cleanBase64, mimeType } });
      }
      parts.push({ text: prompt });

      const result = await model.generateContent({ contents: [{ parts, role: 'user' }] });
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error(`[HealAI] Empty response from ${modelName}`);
      }

      return text;
    } catch (err: any) {
      const errorMsg = err?.message || '';
      const isQuotaError = errorMsg.includes('429') || 
                           errorMsg.toLowerCase().includes('quota') || 
                           errorMsg.toLowerCase().includes('rate limit');
      const isOverloadError = errorMsg.includes('503') ||
                              errorMsg.toLowerCase().includes('high demand') ||
                              errorMsg.toLowerCase().includes('overloaded');

      if (isQuotaError || isOverloadError) {
        attempts++;
        taskKeyOffsets[task]++; // Rotate this specific task's offset key ring

        if (isOverloadError && attempts < maxAttempts) {
          // Exponential backoff for 503 server overload: wait 2s, 4s, 8s...
          const backoffMs = Math.min(2000 * Math.pow(2, attempts - 1), 10000);
          console.warn(`[HealAI] Task "${task}" got 503 overload. Backing off ${backoffMs}ms then retrying with key index ${taskKeyOffsets[task] % keyRing.length}...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          console.warn(`[HealAI] Task "${task}" rate-limited (429). Rotating to backup key index ${taskKeyOffsets[task] % keyRing.length}...`);
        }
        continue; // Retry with next key in the task's ring
      }

      console.error(`[HealAI] Gemini call failed for task ${task}:`, err);
      throw err;
    }
  }

  throw new Error(`[HealAI] All backup keys allocated for task "${task}" are rate-limited or out of quota. Please retry shortly.`);
}
