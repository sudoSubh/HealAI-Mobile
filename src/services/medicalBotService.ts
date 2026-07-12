import { callGemini } from './gemini';

export async function generateMedicalResponse(prompt: string, systemContext?: string, language: string = 'English'): Promise<string> {
  try {
    let finalContext = systemContext || MEDICAL_CONTEXT;
    if (language && language.toLowerCase() !== 'english') {
      finalContext += `\n\nCRITICAL REQUIREMENT: You MUST formulate your entire response in the ${language} language. Write all headings, explanations, points, and advice in ${language} only.`;
    }
    const fullPrompt = `${finalContext}\n\nUser question: ${prompt}`;
    const content = await callGemini(fullPrompt, undefined, undefined, 'medical-bot');
    if (content) return content;
    throw new Error('Empty response from model');
  } catch (error) {
    throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateMedicalResponseWithImage(
  imageData: string,
  prompt: string,
  systemContext?: string,
  language: string = 'English'
): Promise<string> {
  try {
    let finalContext = systemContext || MEDICAL_CONTEXT;
    if (language && language.toLowerCase() !== 'english') {
      finalContext += `\n\nCRITICAL REQUIREMENT: You MUST formulate your entire response in the ${language} language. Write all headings, explanations, points, and advice in ${language} only.`;
    }
    const fullPrompt = `${finalContext}\n\nUser question: ${prompt}`;
    const content = await callGemini(fullPrompt, imageData, 'image/jpeg', 'medical-bot');
    if (content) return content;
    throw new Error('Empty response from model');
  } catch (error) {
    throw new Error(`Failed to generate response with image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const MEDICAL_CONTEXT = `You are an advanced medical AI assistant named HealAI Assistant powered by Google's Gemini API. Format your responses using proper medical terminology:

Formatting Guidelines:
- Use ## for section headers
- Use **bold** for emphasis
- Use proper bullet points with "-" or numbered lists with "1."
- Use > for important quotes or warnings
- Use proper line breaks between sections

Your responses should be:
1. Professional yet friendly and empathetic
2. Structured with clear sections
3. Include relevant medical terminology with layman explanations
4. Use proper formatting for clarity
5. Provide actionable recommendations

Focus on natural remedies, home treatments, and lifestyle changes rather than medications. Provide holistic health advice that empowers users to take charge of their well-being through:
- Dietary recommendations
- Exercise and movement suggestions
- Stress management techniques
- Sleep hygiene tips
- Herbal and natural remedies (when appropriate)
- Preventive care measures

Remember to:
- Immediately identify emergency situations
- Cite general medical guidelines when relevant
- Explain both benefits and risks
- Use simple language while being thorough
- Never recommend specific medications or dosages

Example format:
## Symptoms
- First symptom
- Second symptom

**Important:** Key information here

> Warning: Emergency information here`;
