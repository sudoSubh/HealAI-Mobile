import { callGemini } from './gemini';
import { AnalysisData, AnalysisResponse } from './symptomCheckerService';

export interface SOAPNote {
  subjective: string;    // S: Patient history and complaints
  objective: string;     // O: Clinical findings and biomarkers
  assessment: string;    // A: Diagnosis / differential diagnoses
  plan: string;          // P: Treatment plan — general class only, no specific dosing
  generatedAt: string;
}

/**
 * SOAP SCRIBE SERVICE (adapted from Healix AI's SOAP agent)
 *
 * Generates structured clinical documentation using the S.O.A.P. format.
 * Template structure is adapted from Healix AI's SOAP Note agent (see rag.py).
 *
 * T=0.0 DETERMINISTIC REASONING:
 * Temperature is automatically set to 0 via callGemini for 'report-analyzer' task.
 * This guarantees identical SOAP note structure for identical clinical inputs.
 *
 * IMPORTANT: The Plan (P) section contains only general care category guidance.
 * No specific drug names or dosing are included — patients must consult a doctor.
 */

const SOAP_SYSTEM_PROMPT = `You are a Clinical Documentation Specialist — a SOAP Scribe AI.

TASK: Generate a professional, concise SOAP note based ONLY on the clinical context provided, following rigorous clinical history-taking standards.

T=0.0 DETERMINISTIC MODE: Your output must be structured, consistent, and reproducible.
Do not add introductory phrases, greetings, closing remarks, or any markdown styling (like bolding headers).

STRICT FORMATTING RULES:
- Use EXACTLY these headers on new lines: "S:", "O:", "A:", "P:"
- Do NOT use markdown bolding (e.g. **S:**) on the headers
- Do NOT include an introduction or conclusion paragraph
- Do NOT recommend specific drug names or dosages in the P section (general care category guidance only).

S: (Subjective)
Format this section cleanly using the following clinical structure:
• CHIEF COMPLAINT (CC): Stated in patient's quotes.
• HISTORY OF PRESENT ILLNESS (HPI): Onset, duration, location, character, severity, and temporal patterns of symptoms.
• PAST MEDICAL HISTORY (PMH) & ALLERGIES: Relevant medical conditions, current medications, and known allergies.
• REVIEW OF SYSTEMS (ROS): Positives and pertinent negatives based on reported symptoms.
• SOCIAL HISTORY (SH): Pertinent lifestyle factors (smoking, alcohol, stress, sleep).

O: (Objective)
Format this section with:
• PHYSICAL SIGNS / VITALS: ESI Triage Score (1-5) and Urgency level.
• CLINICAL DATA: Results from reports, key findings, and self-reported biomarkers or symptoms.

A: (Assessment)
Format this section with:
• WORKING DIAGNOSIS: Most likely condition with brief differential diagnoses and clinical reasoning.

P: (Plan)
Format this section with:
• DIAGNOSTICS: Recommended workup, labs, or imaging tests.
• THERAPEUTICS: General treatment class recommendations (no specific drug names/dosages), lifestyle modifications, and activity changes.
• FOLLOW-UP: Specific follow-up timeframe and red flags/safety netting.`;

export async function generateSOAPNote(
  data: AnalysisData,
  analysisResult: AnalysisResponse,
  language: string = 'English'
): Promise<SOAPNote> {
  // Build a rich clinical context string from the symptom data + AI analysis
  const clinicalContext = `
PATIENT HISTORY:
Symptoms: ${data.symptoms.join(', ')}
Severity: ${data.severity}
Duration: ${data.duration}
Medical History — Conditions: ${data.medicalHistory.conditions.join(', ') || 'None reported'}
Medical History — Medications: ${data.medicalHistory.medications.join(', ') || 'None reported'}
Medical History — Allergies: ${data.medicalHistory.allergies.join(', ') || 'None reported'}
Lifestyle: Smoking=${data.lifestyle.smoking}, Alcohol=${data.lifestyle.alcohol}, Exercise=${data.lifestyle.exercise}, Diet=${data.lifestyle.diet}, Stress=${data.lifestyle.stress}, Sleep=${data.lifestyle.sleep}
Recent Changes: ${data.recentChanges || 'None reported'}

AI ANALYSIS FINDINGS:
ESI Triage Score: ${analysisResult.esiScore} (1=Resuscitation, 5=Non-Urgent)
Urgency Level: ${analysisResult.urgencyLevel.level} — ${analysisResult.urgencyLevel.timeframe}
AI Confidence: ${analysisResult.selfReportedConfidence}%

Potential Conditions:
${analysisResult.conditions.map(c =>
  `- ${c.condition} (${c.probability} probability): ${c.description}`
).join('\n')}

Suggested Diagnostic Tests:
${analysisResult.conditions.flatMap(c => c.suggestedTests || []).map(t => `- ${t}`).join('\n') || 'None specified'}

Specialist Referrals Suggested: ${(analysisResult.specialistReferrals || []).join(', ') || 'None'}

Red Flags Identified:
${analysisResult.redFlags.map(r => `- ${r}`).join('\n') || 'None'}

Follow-Up Recommendations:
${analysisResult.followUpRecommendations.map(r => `- ${r}`).join('\n')}
${analysisResult.recoveryRoadmap ? `
Recovery Roadmap (ESI 4–5):
Follow-up Timing: ${analysisResult.recoveryRoadmap.followUpTiming}
General Care Guidance: ${analysisResult.recoveryRoadmap.generalCategoryGuidance}
` : ''}`;

  const fullPrompt = `${SOAP_SYSTEM_PROMPT}

CLINICAL CONTEXT TO DOCUMENT:
${clinicalContext}
${language && language.toLowerCase() !== 'english'
    ? `\nWrite the SOAP note content in ${language} language. Keep the S:, O:, A:, P: header labels in English.`
    : ''}

Now generate the SOAP note:`;

  // Uses report-analyzer task → temperature=0 auto-applied (T=0.0 principle)
  const raw = await callGemini(fullPrompt, undefined, undefined, 'report-analyzer');

  return parseSOAPResponse(raw);
}

function parseSOAPResponse(raw: string): SOAPNote {
  // Extract each section using header-based splitting
  const sMatch = raw.match(/\bS:\s*([\s\S]*?)(?=\bO:|$)/i);
  const oMatch = raw.match(/\bO:\s*([\s\S]*?)(?=\bA:|$)/i);
  const aMatch = raw.match(/\bA:\s*([\s\S]*?)(?=\bP:|$)/i);
  const pMatch = raw.match(/\bP:\s*([\s\S]*?)$/i);

  return {
    subjective: sMatch ? sMatch[1].trim() : 'Could not extract Subjective section.',
    objective: oMatch ? oMatch[1].trim() : 'Could not extract Objective section.',
    assessment: aMatch ? aMatch[1].trim() : 'Could not extract Assessment section.',
    plan: pMatch ? pMatch[1].trim() : 'Could not extract Plan section.',
    generatedAt: new Date().toISOString(),
  };
}
