import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

export type GeminiTask = 'medical-bot' | 'symptom-checker' | 'report-analyzer' | 'daily-insight';

// Map specific tasks to prioritized backup key lists to split the rate limit budget
const TASK_KEYS: Record<GeminiTask, string[]> = {
  'symptom-checker': [
    'AQ.Ab8RN6LO2t2nKXGDvpQC7KDXewYWragzRJ-FyPHMQ4SkzrPAoA', // Primary key for symptoms
    'AQ.Ab8RN6KZQ3SFdYK3_nynkCUHzkVy72zES73b_t1p8c2qHvEKvA', // Backup 1
    'AQ.Ab8RN6LFgFLdCVqRxsCJsXOI73TBk7Pud2rG0kBQ8k7DLePzZQ'  // Backup 2
  ],
  'medical-bot': [
    'AQ.Ab8RN6KZQ3SFdYK3_nynkCUHzkVy72zES73b_t1p8c2qHvEKvA', // Primary key for Chatbot
    'AQ.Ab8RN6LO2t2nKXGDvpQC7KDXewYWragzRJ-FyPHMQ4SkzrPAoA', // Backup 1
    'AQ.Ab8RN6LFgFLdCVqRxsCJsXOI73TBk7Pud2rG0kBQ8k7DLePzZQ'  // Backup 2
  ],
  'report-analyzer': [
    'AQ.Ab8RN6LFgFLdCVqRxsCJsXOI73TBk7Pud2rG0kBQ8k7DLePzZQ', // Primary key for reports/scans
    'AQ.Ab8RN6KZQ3SFdYK3_nynkCUHzkVy72zES73b_t1p8c2qHvEKvA', // Backup 1
    'AQ.Ab8RN6LO2t2nKXGDvpQC7KDXewYWragzRJ-FyPHMQ4SkzrPAoA'  // Backup 2
  ],
  'daily-insight': [
    'AQ.Ab8RN6LFgFLdCVqRxsCJsXOI73TBk7Pud2rG0kBQ8k7DLePzZQ', // Primary key for daily dashboard tools & UI translator
    'AQ.Ab8RN6KZQ3SFdYK3_nynkCUHzkVy72zES73b_t1p8c2qHvEKvA', // Backup 1
    'AQ.Ab8RN6LO2t2nKXGDvpQC7KDXewYWragzRJ-FyPHMQ4SkzrPAoA'  // Backup 2
  ]
};

// Track failover rotation offsets per task
const taskKeyOffsets: Record<GeminiTask, number> = {
  'symptom-checker': 0,
  'medical-bot': 0,
  'report-analyzer': 0,
  'daily-insight': 0
};

function getActiveKey(task: GeminiTask): string {
  // If user configured a root environment variable override, prioritize it
  const envKey = Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (envKey) return envKey;
  
  const keyRing = TASK_KEYS[task];
  const offset = taskKeyOffsets[task];
  return keyRing[offset % keyRing.length];
}

export async function callGemini(
  prompt: string,
  imageBase64?: string,
  mimeType = 'image/jpeg',
  task: GeminiTask = 'daily-insight'
): Promise<string> {
  const modelName = 'gemini-3.5-flash';
  const keyRing = TASK_KEYS[task];
  let attempts = 0;
  const maxAttempts = keyRing.length;

  while (attempts < maxAttempts) {
    const key = getActiveKey(task);
    if (!key) {
      throw new Error(`[HealAI] No API key provided for task: ${task}`);
    }

    try {
      const client = new GoogleGenerativeAI(key);
      const model = client.getGenerativeModel({ model: modelName });

      const parts: any[] = [];
      if (imageBase64 && typeof imageBase64 === 'string') {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
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

      if (isQuotaError && !Constants.expoConfig?.extra?.GEMINI_API_KEY && !process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
        attempts++;
        taskKeyOffsets[task]++; // Rotate this specific task's offset key ring
        console.warn(`[HealAI] Task "${task}" primary key rate-limited. Rotating offset to backup key index ${taskKeyOffsets[task] % keyRing.length}...`);
        continue; // Retry with next key in the task's ring
      }

      console.error(`[HealAI] Gemini call failed for task ${task}:`, err);
      throw err;
    }
  }

  throw new Error(`[HealAI] All backup keys allocated for task "${task}" are rate-limited or out of quota. Please retry shortly.`);
}
