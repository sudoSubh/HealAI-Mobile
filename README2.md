# HealAI Mobile — Hackathon README

## One-line pitch

**HealAI is an AI-assisted, multilingual health-navigation app that turns a patient’s symptoms, records, and care needs into a safer next step—self-care guidance, clinical documentation, emergency escalation, or community-health follow-up.**

> Important: HealAI is decision-support software, not a diagnostic tool or replacement for a qualified clinician. Emergency signs are always surfaced for urgent in-person care.

## The problem

People often face three connected gaps: they do not know how urgent symptoms are, they struggle to explain their history clearly, and community health workers need a simple way to prioritize follow-up. These gaps become harder with language barriers, fragmented records, and limited access to timely guidance.

## What we built

HealAI brings the patient, caregiver, and CHW/ASHA workflow into one mobile experience.

- Guided symptom intake captures symptoms, severity, duration, medical history, lifestyle context, family history, and optional location.
- AI-assisted triage returns possible conditions, urgency, ESI-style triage score, confidence, red flags, care guidance, follow-up suggestions, and referrals.
- A clinical-summary workflow turns an assessment into a structured SOAP note and PDF-ready report.
- Lab-report and skin-image analysis extend the experience beyond text-only symptom entry.
- Multilingual AI chat and voice capabilities make health guidance more accessible.
- CHW/ASHA views, notifications, outbreak-pattern checks, and AI nurse calls support population-level follow-up.
- Neo4j persists connected care records when online; local storage provides a fallback for offline continuity.

## Primary workflow

```text
Login / consent
      ↓
Home → “Check symptoms”
      ↓
Guided intake: symptoms + severity + duration + history + lifestyle
      ↓
AI symptom analysis
      ↓
Urgency + ESI + confidence gate + red flags
      ↓
┌────────────────┬────────────────────┬─────────────────────┐
│ Emergency      │ Needs follow-up    │ Lower-acuity        │
│ clear warning  │ notify / CHW view  │ recovery roadmap    │
│ & urgent care  │ & clinical record  │ & care reminders    │
└────────────────┴────────────────────┴─────────────────────┘
      ↓
SOAP note / PDF / history / care-team follow-up
```

### Safety logic

1. The app asks for enough context before analysis.
2. Clinical-oriented AI calls use deterministic generation settings in the current implementation.
3. Low reported confidence triggers an insufficient-information response instead of overconfident guidance.
4. Red flags and urgency are highlighted prominently.
5. Recovery-roadmap guidance is shown only for lower-acuity cases; it includes medication disclaimers and does not prescribe doses.

## Key pages and features

| Page | What it does |
| --- | --- |
| Login & consent | Captures credentials, role details, and privacy consent before entering the app. |
| Home | Launchpad for symptom checks, records, CHW dashboard, daily insights, and health tools. |
| Symptom checker | Multi-step intake for body area, symptoms, severity, duration, history, lifestyle, and optional location. |
| Diagnosis result | Displays possible conditions, urgency, ESI, confidence, red flags, recommendations, and the recovery roadmap where appropriate. |
| SOAP / clinical report | Generates a structured Subjective–Objective–Assessment–Plan note and supports PDF export. |
| Reports | Analyzes uploaded health reports and offers AI-generated explanations, diet-plan support, and advice. |
| Skin AI scanner | Lets a user choose a skin image for AI-assisted analysis, with safety guidance. |
| AI health chat | Conversational health navigation with multilingual support and optional voice features. |
| Case history | Retrieves previous checks and reports so a patient can review continuity of care. |
| Medication reminders | Schedules local reminder notifications for medicine name, dosage, and time. |
| Healthcare resources | Provides nearby-care and emergency calling pathways. |
| Education hub | Curates health articles and videos on prevention, maternal health, mental health, nutrition, and more. |
| CHW/ASHA dashboard | Presents urgency-sorted patient records and notification context for community-health follow-up. |
| AI nurse consultation | Registers family members or a direct number, triggers a call workflow, records a transcript, summarizes it, and persists the result. |
| More & language settings | Includes language selection, distribution sharing, emergency contacts, privacy, and app information. |

## Technical architecture

```text
React Native + Expo Router mobile client
        │
        ├── Guided UI, localization, theme, local notifications
        ├── Gemini service: symptom analysis, chat, report/skin analysis,
        │   daily insights, SOAP generation
        ├── Sarvam service: speech-to-text, text-to-speech, translation
        ├── Twilio service: outbound AI nurse calling
        └── Neo4j service: patient, symptom-check, condition, family,
            nurse-call, dashboard, and audit relationships
                    │
          AsyncStorage fallback for offline/local continuity
```

## Data flow

1. The client collects only the context needed for the selected workflow.
2. A service formats that context for the relevant AI or communications provider.
3. The app validates and renders a structured response rather than showing raw model output.
4. A symptom check is written to Neo4j as linked patient, check, and potential-condition data; if that fails, it is cached locally.
5. CHW views and outbreak checks query connected records to surface follow-up priorities and recurring symptom signals.

## Tech stack

- React Native, Expo, Expo Router, TypeScript
- React Native Paper, Reanimated, Expo Notifications, Expo Location, Expo Image Picker
- Google Generative AI integration
- Neo4j Query API and AsyncStorage fallback
- Sarvam translation / speech services
- Twilio calling integration

## Hackathon demo flow

1. Sign in and open the symptom checker from the Home tab.
2. Enter a non-emergency sample case; show structured intake and analysis.
3. Point out urgency, ESI, confidence, red flags, and the appropriate-care guidance.
4. Generate a SOAP note or clinical PDF summary.
5. Open Case History and the CHW/ASHA dashboard to show connected care continuity.
6. Briefly show the AI nurse consultation or multilingual chat as the accessibility and follow-up layer.

## Responsible-use notes

- Do not use HealAI for emergency diagnosis; call local emergency services or seek immediate care for serious symptoms.
- AI outputs should be reviewed by a qualified clinician before clinical decisions.
- Production deployment should keep provider credentials in a secure server-side secret manager—never in the mobile bundle—and enforce consent, retention, access-control, audit, and regional data-governance policies.

## Local development

```bash
npm install
npx expo start
```

See `package.json` and `app.json` for project configuration and available scripts.
