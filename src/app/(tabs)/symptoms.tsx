import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, useColorScheme, TouchableOpacity, Alert, Share, Image, Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  Text, Surface, Button, TextInput, Chip, ProgressBar, Card, Divider, useTheme, ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useHealTheme, Colors } from '../../theme';
import { analyzeSymptomsWithGemini, AnalysisResponse, AnalysisData } from '../../services/symptomCheckerService';
import { generateSOAPNote, SOAPNote } from '../../services/soapService';
import { saveSymptomCheckToNeo4j } from '../../services/neo4jService';
import { useTranslation } from '../../localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Location from 'expo-location';

// UI Primitives
import { AppText } from '../../components/ui/AppText';
import { GradientButton } from '../../components/ui/GradientButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { EsiBadge } from '../../components/ui/EsiBadge';
import { PressableScale } from '../../components/ui/PressableScale';
import { StateView } from '../../components/ui/StateView';

type BodyPartId = 'head' | 'eyes' | 'ears' | 'nose' | 'mouth' | 'neck' | 'chest' | 'shoulders' | 'abdomen' | 'digestive' | 'respiratory' | 'upper_back' | 'lower_back' | 'arms' | 'elbows' | 'wrists' | 'hips' | 'legs' | 'knees' | 'ankles' | 'skin' | 'joints' | 'urinary' | 'general';

interface BodyPart {
  id: BodyPartId;
  name: string;
  icon: string;
  color: string;
}

const BODY_PARTS: BodyPart[] = [
  { id: 'head', name: 'Head & Face', icon: 'brain', color: Colors.blue[600] },
  { id: 'eyes', name: 'Eyes', icon: 'eye', color: Colors.blue[500] },
  { id: 'ears', name: 'Ears', icon: 'ear-hearing', color: Colors.blue[400] },
  { id: 'nose', name: 'Nose & Sinuses', icon: 'allergy', color: Colors.teal[500] },
  { id: 'mouth', name: 'Mouth & Throat', icon: 'tooth', color: Colors.teal[600] },
  { id: 'neck', name: 'Neck', icon: 'tie', color: Colors.teal[700] },
  { id: 'chest', name: 'Chest & Heart', icon: 'heart-pulse', color: Colors.rose[600] },
  { id: 'shoulders', name: 'Shoulders', icon: 'weight-lifter', color: Colors.violet[600] },
  { id: 'abdomen', name: 'Abdomen', icon: 'stomach', color: Colors.amber[600] },
  { id: 'digestive', name: 'Digestive', icon: 'bacteria', color: Colors.amber[700] },
  { id: 'respiratory', name: 'Respiratory', icon: 'lungs', color: Colors.blue[600] },
  { id: 'upper_back', name: 'Upper Back', icon: 'bone', color: Colors.slate[600] },
  { id: 'lower_back', name: 'Lower Back', icon: 'human-child', color: Colors.slate[700] },
  { id: 'arms', name: 'Arms & Hands', icon: 'arm-flex', color: Colors.emerald[600] },
  { id: 'legs', name: 'Legs & Feet', icon: 'run', color: Colors.emerald[700] },
  { id: 'skin', name: 'Skin & Hair', icon: 'palette', color: Colors.rose[500] },
  { id: 'joints', name: 'Joints & Muscles', icon: 'dumbbell', color: '#ea580c' },
  { id: 'urinary', name: 'Urinary System', icon: 'water', color: '#4f46e5' },
  { id: 'general', name: 'General / Whole Body', icon: 'pill', color: '#9333ea' },
];

const SYMPTOMS_BY_BODY_PART: Record<BodyPartId, string[]> = {
  head: ['Headache', 'Migraine', 'Dizziness', 'Confusion', 'Memory problems'],
  eyes: ['Blurred vision', 'Eye pain', 'Red eyes', 'Dry eyes', 'Vision changes', 'Light sensitivity'],
  ears: ['Ear pain', 'Hearing loss', 'Ringing in ears', 'Ear discharge', 'Vertigo'],
  nose: ['Nasal congestion', 'Runny nose', 'Loss of smell', 'Nosebleeds', 'Sinus pressure'],
  mouth: ['Sore throat', 'Difficulty swallowing', 'Mouth ulcers', 'Bad breath', 'Dry mouth', 'Taste changes'],
  neck: ['Neck pain', 'Stiff neck', 'Neck swelling', 'Limited neck mobility', 'Neck muscle spasms'],
  chest: ['Chest pain', 'Shortness of breath', 'Heart palpitations', 'Chest tightness', 'Irregular heartbeat'],
  shoulders: ['Shoulder pain', 'Limited shoulder mobility', 'Shoulder stiffness', 'Joint pain', 'Muscle weakness'],
  abdomen: ['Abdominal pain', 'Bloating', 'Nausea', 'Vomiting', 'Loss of appetite'],
  digestive: ['Diarrhea', 'Constipation', 'Acid reflux', 'Indigestion', 'Stomach cramps', 'Changes in bowel habits'],
  respiratory: ['Cough', 'Wheezing', 'Difficulty breathing', 'Rapid breathing', 'Chest congestion'],
  upper_back: ['Upper back pain', 'Muscle tension', 'Stiffness', 'Burning sensation', 'Radiating pain'],
  lower_back: ['Lower back pain', 'Sciatica', 'Muscle spasms', 'Limited mobility', 'Chronic pain'],
  arms: ['Arm pain', 'Muscle weakness', 'Numbness', 'Tingling', 'Limited mobility'],
  elbows: ['Elbow pain', 'Joint stiffness', 'Swelling', 'Limited mobility'],
  wrists: ['Wrist pain', 'Joint stiffness', 'Numbness', 'Tingling', 'Weakness'],
  hips: ['Hip pain', 'Joint stiffness', 'Limited mobility', 'Difficulty walking'],
  legs: ['Leg pain', 'Muscle cramps', 'Weakness', 'Swelling', 'Numbness'],
  knees: ['Knee pain', 'Swelling', 'Joint stiffness', 'Limited mobility'],
  ankles: ['Ankle pain', 'Swelling', 'Joint stiffness', 'Limited mobility'],
  skin: ['Rash', 'Itching', 'Dry skin', 'Skin changes', 'Excessive sweating'],
  joints: ['Joint pain', 'Stiffness', 'Swelling', 'Limited mobility', 'Inflammation'],
  urinary: ['Frequent urination', 'Painful urination', 'Blood in urine', 'Urgency', 'Incontinence'],
  general: ['Fever', 'Fatigue', 'Weight changes', 'Night sweats', 'General weakness'],
};

const SEVERITY_LEVELS = [
  {
    value: 'Mild',
    desc: "Noticeable but doesn't interfere with daily activities",
    examples: ['Can work and socialize normally', 'Symptoms are annoying but manageable'],
    color: Colors.emerald[600],
  },
  {
    value: 'Moderate',
    desc: 'Affects daily activities but doesn\'t prevent them',
    examples: ['May need to modify some activities', 'Regular use of OTC remedies'],
    color: Colors.amber[600],
  },
  {
    value: 'Severe',
    desc: 'Significantly impacts or prevents daily activities',
    examples: ['Unable to work or perform basic tasks', 'Requires immediate medical review'],
    color: Colors.rose[600],
  },
];

const DURATION_OPTIONS = [
  'Less than 24 hours',
  '1-3 days',
  '3-7 days',
  '1-2 weeks',
  '2-4 weeks',
  'More than a month',
];

const URGENCY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  Emergency: { bg: '#fef2f2', text: '#dc2626', icon: 'alert-circle' },
  Urgent: { bg: '#fff7ed', text: '#ea580c', icon: 'alert' },
  Soon: { bg: '#fefce8', text: '#ca8a04', icon: 'clock-alert' },
  Routine: { bg: '#f0fdf4', text: '#16a34a', icon: 'check-circle' },
};

export default function SymptomsScreen() {
  const SHOW_DISCLAIMERS = false;
  const { t, locale } = useTranslation();
  const { isDark, colors, spacing, radii, typeScale } = useHealTheme();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [soapLoading, setSoapLoading] = useState(false);
  const [showSoap, setShowSoap] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Rather not say');
  const [patientName, setPatientName] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const address = geocode[0];
        const formattedAddress = [
          address.name,
          address.street,
          address.district,
          address.city,
          address.region,
          address.country,
        ].filter(Boolean).join(', ');
        setPatientAddress(formattedAddress || `${loc.coords.latitude}, ${loc.coords.longitude}`);
      } else {
        setPatientAddress(`${loc.coords.latitude}, ${loc.coords.longitude}`);
      }
    } catch (err) {
      console.warn('Failed to detect location:', err);
      Alert.alert('Location Error', 'Failed to auto-detect location. Please type manually.');
    } finally {
      setDetectingLocation(false);
    }
  };

  useEffect(() => {
    async function loadSessionData() {
      try {
        const sessionStr = await AsyncStorage.getItem('user_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session.name) setPatientName(session.name);
          if (session.address) setPatientAddress(session.address);
        }
      } catch (err) {
        console.warn('Failed to load prefilled session details:', err);
      }
    }
    loadSessionData();
  }, []);

  const getLanguageName = () => {
    switch (locale) {
      case 'hi': return 'Hindi';
      case 'bn': return 'Bengali';
      case 'te': return 'Telugu';
      case 'mr': return 'Marathi';
      case 'ta': return 'Tamil';
      case 'gu': return 'Gujarati';
      case 'kn': return 'Kannada';
      case 'or': return 'Odia';
      case 'ml': return 'Malayalam';
      case 'pa': return 'Punjabi';
      default: return 'English';
    }
  };

  // Form state
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPartId | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [severity, setSeverity] = useState('Moderate');
  const [duration, setDuration] = useState('1-3 days');
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [tempInput, setTempInput] = useState('');
  const [recentChanges, setRecentChanges] = useState('');
  const [lifestyle, setLifestyle] = useState({
    smoking: false,
    alcohol: 'None',
    exercise: 'Moderate',
    diet: 'Balanced',
    stress: 'Moderate',
    sleep: '7-8 hours',
  });

  const totalSteps = 6;

  const toggleSymptom = (s: string) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const addCustomSymptom = () => {
    if (customSymptom.trim() && !symptoms.includes(customSymptom.trim())) {
      setSymptoms([...symptoms, customSymptom.trim()]);
      setCustomSymptom('');
    }
  };

  const addTag = (setter: (v: string[]) => void, arr: string[]) => {
    if (tempInput.trim() && !arr.includes(tempInput.trim())) {
      setter([...arr, tempInput.trim()]);
      setTempInput('');
    }
  };

  const handleAnalyze = async () => {
    if (symptoms.length === 0) {
      Alert.alert('No Symptoms', 'Please select at least one symptom.');
      return;
    }
    if (Platform.OS === 'web') {
      (document.activeElement as HTMLElement)?.blur();
    }
    setLoading(true);
    try {
      const data: AnalysisData = {
        symptoms,
        severity,
        duration,
        age: age || undefined,
        gender: gender || undefined,
        medicalHistory: { conditions, medications, allergies },
        lifestyle,
        recentChanges,
        familyHistory: [],
        patientName: patientName || undefined,
        patientAddress: patientAddress || undefined,
      };
      const res = await analyzeSymptomsWithGemini(data, getLanguageName());
      setResult(res);

      // Save to AsyncStorage for the multi-screen flow
      await AsyncStorage.setItem('latest_analysis', JSON.stringify({ data, result: res }));

      // Save to Neo4j Aura DB (non-blocking)
      saveSymptomCheckToNeo4j(data, res).catch(err =>
        console.warn('[Symptoms] Neo4j save failed (non-blocking):', err)
      );

      // Navigate to the new multi-screen diagnosis flow
      router.push('/diagnosis-result');
    } catch (e) {
      Alert.alert('Error', 'Failed to analyze symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareReport = async () => {
    if (!result) return;
    const reportText = `
MEDICAL ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}

URGENCY LEVEL: ${result.urgencyLevel.level}
Timeframe: ${result.urgencyLevel.timeframe}
Reasoning: ${result.urgencyLevel.reasoning.join('\n')}

POTENTIAL CONDITIONS:
${result.conditions.map(c => `- ${c.condition} (${c.probability} Probability): ${c.description}`).join('\n')}

REMEDY RECOMMENDATIONS:
${result.remedyRecommendations.map(r => `- [${r.type}]: ${r.recommendation}`).join('\n')}
`;

    try {
      await Share.share({ message: reportText });
    } catch {}
  };

  const handleDownloadPDF = async () => {
    if (!result) return;

    const reasoningHtml = (result.urgencyLevel && result.urgencyLevel.reasoning)
      ? result.urgencyLevel.reasoning.map(r => '<li>' + r + '</li>').join('')
      : '';

    const conditionsHtml = (result.conditions || []).map(c => {
      const testsListHtml = (c.suggestedTests || []).map(t => '<li>' + t + '</li>').join('');
      const testsHtml = testsListHtml
        ? '<div style="margin-top: 10px; font-size: 12px;"><strong style="color: #0f172a;">Suggested Diagnostic Tests:</strong><ul class="bullet-list" style="margin-top: 4px;">' + testsListHtml + '</ul></div>'
        : '';
      return '<div class="card"><div class="card-header"><span>' + c.condition + '</span><span class="probability-badge prob-' + c.probability + '">' + c.probability + ' Probability</span></div><p style="margin: 0; font-size: 13px; color: #475569;">' + c.description + '</p>' + testsHtml + '</div>';
    }).join('');

    const lifestyleHtml = (result.lifestyleImpact || []).map(li => {
      const recsHtml = (li.recommendations || []).map(rec => '<li>' + rec + '</li>').join('');
      return '<div class="card" style="background-color: #f0fdfa; border-color: #ccfbf1;"><div style="font-weight: bold; color: #0f766e; margin-bottom: 4px;">' + li.factor + '</div><p style="margin: 0 0 8px 0; font-size: 13px;">' + li.impact + '</p><strong style="font-size: 12px; color: #0f172a;">Recommendations:</strong><ul class="bullet-list" style="margin-top: 4px;">' + recsHtml + '</ul></div>';
    }).join('');

    const remediesHtml = (result.remedyRecommendations || []).map(rem => {
      const warningHtml = rem.warning
        ? '<div style="font-size: 11px; color: #b45309; font-weight: 500;">⚠️ Note: ' + rem.warning + '</div>'
        : '';
      return '<div class="remedy-card"><div class="remedy-type">' + rem.type + '</div><p style="margin: 0 0 6px 0; font-size: 13px;">' + rem.recommendation + '</p>' + warningHtml + '</div>';
    }).join('');

    const redFlagsHtml = (result.redFlags || []).map(rf => '<li>' + rf + '</li>').join('');

    const historyHtml = conditions.length > 0
      ? '<div class="meta-item" style="grid-column: span 2;"><strong>Medical History Conditions:</strong> ' + conditions.join(', ') + '</div>'
      : '';

    const medicationsHtml = medications.length > 0
      ? '<div class="meta-item" style="grid-column: span 2;"><strong>Active Medications:</strong> ' + medications.join(', ') + '</div>'
      : '';

    const lifestyleSectionHtml = lifestyleHtml
      ? '<div class="section-title">Lifestyle Impacts</div>' + lifestyleHtml
      : '';

    const remediesSectionHtml = remediesHtml
      ? '<div class="section-title">Ayurvedic & Lifestyle Remedies</div>' + remediesHtml
      : '';

    const redFlagsSectionHtml = redFlagsHtml
      ? '<div class="section-title" style="color: #dc2626; border-left-color: #dc2626;">🚨 Emergency warning signs (Red Flags)</div><div class="card" style="background-color: #fef2f2; border-color: #fee2e2;"><ul class="bullet-list" style="color: #991b1b; font-weight: 500;">' + redFlagsHtml + '</ul></div>'
      : '';

    const htmlContent = '<html>' +
      '<head>' +
      '  <meta charset="utf-8">' +
      '  <title>HealAI - Medical Analysis Report</title>' +
      '  <style>' +
      '    body { font-family: Arial, sans-serif; padding: 30px; color: #334155; background-color: #ffffff; }' +
      '    .header { border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px; }' +
      '    .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; }' +
      '    .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }' +
      '    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background-color: #f8fafc; padding: 15px; border-radius: 12px; }' +
      '    .meta-item strong { color: #0f172a; }' +
      '    .urgency-badge { display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 16px; margin-bottom: 20px; }' +
      '    .urgency-Emergency { background-color: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }' +
      '    .urgency-Urgent { background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }' +
      '    .urgency-Soon { background-color: #fefce8; color: #ca8a04; border: 1px solid #fef9c3; }' +
      '    .urgency-Routine { background-color: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }' +
      '    .section-title { font-size: 18px; font-weight: 700; color: #0f172a; border-left: 4px solid #0d9488; padding-left: 10px; margin-top: 30px; margin-bottom: 15px; }' +
      '    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 12px; background-color: #ffffff; }' +
      '    .card-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 6px; color: #0f172a; }' +
      '    .probability-badge { font-size: 11px; padding: 2px 8px; border-radius: 6px; }' +
      '    .prob-High { background-color: #fef2f2; color: #dc2626; }' +
      '    .prob-Medium { background-color: #fff7ed; color: #ea580c; }' +
      '    .prob-Low { background-color: #f0fdf4; color: #16a34a; }' +
      '    .bullet-list { padding-left: 20px; margin: 8px 0; }' +
      '    .bullet-list li { margin-bottom: 4px; }' +
      '    .remedy-card { border: 1px solid #fee2e2; background-color: #fff5f5; padding: 15px; border-radius: 12px; margin-bottom: 12px; }' +
      '    .remedy-type { font-weight: bold; color: #991b1b; margin-bottom: 4px; }' +
      '    .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }' +
      '  </style>' +
      '</head>' +
      '<body>' +
      '  <div class="header">' +
      '    <h1 class="title">HealAI Clinic Report</h1>' +
      '    <p class="subtitle">Generated securely inside HealAI app</p>' +
      '  </div>' +
      '  <div class="meta-grid">' +
      '    <div class="meta-item">' +
      '      <strong>Selected Area:</strong> ' + (selectedBodyPart || 'N/A') +
      '    </div>' +
      '    <div class="meta-item">' +
      '      <strong>Severity & Duration:</strong> ' + severity + ' (' + duration + ')' +
      '    </div>' +
      '    <div class="meta-item" style="grid-column: span 2;">' +
      '      <strong>Symptoms Analyzed:</strong> ' + symptoms.join(', ') +
      '    </div>' +
      '    ' + historyHtml +
      '    ' + medicationsHtml +
      '  </div>' +
      '  <div class="urgency-badge urgency-' + result.urgencyLevel.level + '">' +
      '    Urgency: ' + result.urgencyLevel.level + ' (Timeframe: ' + result.urgencyLevel.timeframe + ')' +
      '  </div>' +
      '  <div class="section-title">Reasoning & Guidance</div>' +
      '  <ul class="bullet-list">' +
      '    ' + reasoningHtml +
      '  </ul>' +
      '  <div class="section-title">Matched Potential Conditions</div>' +
      '  ' + conditionsHtml +
      '  ' + lifestyleSectionHtml +
      '  ' + remediesSectionHtml +
      '  ' + redFlagsSectionHtml +
      '  <div class="footer" style="margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">' +
      '    <div style="font-size: 18px; font-weight: 900; color: #0d9488; margin-bottom: 2px;">Heal<span style="color: #0f172a;">AI</span></div>' +
      '    <div style="font-size: 9px; color: #64748b; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Health Intelligence Report</div>' +
      '    <div style="font-size: 9px; color: #94a3b8; margin-top: 6px;">© 2026 HealAI. Confidential client reference.</div>' +
      '  </div>' +
      '</body>' +
      '</html>';

    try {
      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Download Medical Report' });
      }
    } catch (e) {
      console.error('Failed to generate PDF:', e);
      Alert.alert('Export Failed', 'Could not generate or download PDF report.');
    }
  };

  const handleGenerateSOAP = async () => {
    if (!result) return;
    if (Platform.OS === 'web') {
      (document.activeElement as HTMLElement)?.blur();
    }
    setSoapLoading(true);
    setShowSoap(true);
    try {
      const data: AnalysisData = {
        symptoms,
        severity,
        duration,
        medicalHistory: { conditions, medications, allergies },
        lifestyle,
        recentChanges,
        familyHistory: [],
      };
      const note = await generateSOAPNote(data, result, getLanguageName());
      setSoapNote(note);
    } catch (e) {
      Alert.alert('SOAP Error', 'Could not generate SOAP note. Please try again.');
      setShowSoap(false);
    } finally {
      setSoapLoading(false);
    }
  };

  const handleDownloadSOAP = async () => {
    if (!soapNote) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SOAP Note - Clinical Documentation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background-color: #ffffff; line-height: 1.6; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 13px; color: #64748b; font-weight: 600; margin: 5px 0 0 0; }
          .meta-info { font-size: 12px; color: #94a3b8; margin-top: 15px; }
          .section { margin-bottom: 25px; padding-left: 15px; }
          .section-S { border-left: 4px solid #3b82f6; }
          .section-O { border-left: 4px solid #10b981; }
          .section-A { border-left: 4px solid #f59e0b; }
          .section-P { border-left: 4px solid #8b5cf6; }
          .section-header { font-size: 16px; font-weight: 800; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header-S { color: #2563eb; }
          .header-O { color: #059669; }
          .header-A { color: #d97706; }
          .header-P { color: #7c3aed; }
          .content { font-size: 14px; color: #334155; white-space: pre-wrap; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 10px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Clinical SOAP Note</h1>
          <p class="subtitle">HealAI Clinic Assistant • Deterministic Reasoning (T=0.0)</p>
          <div class="meta-info">
            Generated: ${new Date(soapNote.generatedAt).toLocaleString()}
          </div>
        </div>
        
        <div class="section section-S">
          <div class="section-header header-S">S: Subjective</div>
          <div class="content">${soapNote.subjective}</div>
        </div>
        
        <div class="section section-O">
          <div class="section-header header-O">O: Objective</div>
          <div class="content">${soapNote.objective}</div>
        </div>
        
        <div class="section section-A">
          <div class="section-header header-A">A: Assessment</div>
          <div class="content">${soapNote.assessment}</div>
        </div>
        
        <div class="section section-P">
          <div class="section-header header-P">P: Plan</div>
          <div class="content">${soapNote.plan}</div>
        </div>
        
        <div class="footer">
          This document is generated for professional clinical documentation and clinician review. 
          Confidentiality applies under standard patient privacy rules.
        </div>
      </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Download SOAP Note' });
      }
    } catch (e) {
      console.error('Failed to export SOAP PDF:', e);
      Alert.alert('Export Failed', 'Could not generate or download SOAP PDF.');
    }
  };


  const reset = () => {
    setStep(0);
    setResult(null);
    setSoapNote(null);
    setShowSoap(false);
    setSelectedBodyPart(null);
    setSymptoms([]);
    setSeverity('Moderate');
    setDuration('1-3 days');
    setConditions([]);
    setMedications([]);
    setAllergies([]);
    setRecentChanges('');
    setAge('');
    setGender('Rather not say');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.border }]} elevation={0}>
        <View style={styles.headerRow}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="stethoscope" size={18} color="#fff" />
          </View>
          <View>
            <AppText variant="title" style={{ fontWeight: '800' }}>{t('symptomCheckerHeader')}</AppText>
            <AppText variant="micro" color={colors.textMuted}>Web-matching clinic protocol</AppText>
          </View>
        </View>
        {step < totalSteps && (
          <View style={styles.progressRow}>
            <ProgressBar progress={(step + 1) / totalSteps} color={colors.primary} style={[styles.progressBar, { height: 6 }]} />
            <AppText variant="micro" color={colors.textMuted} style={{ marginTop: 4 }}>
              Step {step + 1} of {totalSteps}
            </AppText>
          </View>
        )}
      </Surface>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Disclaimer Warning */}
        {SHOW_DISCLAIMERS && step < totalSteps && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Surface style={[styles.disclaimer, { backgroundColor: isDark ? '#451a0380' : '#fffbeb' }]} elevation={0}>
              <MaterialCommunityIcons name="alert" size={16} color={Colors.amber[600]} />
              <Text style={{ fontSize: 11, color: Colors.amber[700], flex: 1, lineHeight: 16 }}>
                {t('disclaimerWarning')}
              </Text>
            </Surface>
          </Animated.View>
        )}

        {/* Step 0: Body Part Selector */}
        {step === 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <GlassCard padded={false} style={{ marginBottom: 16, borderColor: colors.border }}>
              <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : '#f8fafc' }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="stethoscope" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" style={{ fontWeight: '800' }}>Clinical Intake Protocol</AppText>
                  <AppText variant="micro" color={colors.textMuted} style={{ marginTop: 2 }}>Secure AI assessment powered by Gemini</AppText>
                </View>
              </View>
            </GlassCard>
            <AppText variant="headline" style={{ marginBottom: 4 }}>{t('selectBodyPart')}</AppText>
            <AppText variant="body" color={colors.textMuted} style={{ marginBottom: 16 }}>{t('selectBodyPartDesc')}</AppText>
            <View style={styles.grid}>
              {BODY_PARTS.map(part => (
                <View key={part.id} style={{ width: '48%', marginBottom: 10 }}>
                  <PressableScale
                    onPress={() => {
                      setSelectedBodyPart(part.id);
                      setStep(1);
                    }}
                  >
                    <GlassCard padded={false} style={[styles.gridItem, { width: '100%', backgroundColor: colors.surface, borderColor: colors.border }] as any}>
                      <View style={[styles.partIconBox, { backgroundColor: part.color + '15' }]}>
                        <MaterialCommunityIcons name={part.icon as any} size={22} color={part.color} />
                      </View>
                      <AppText variant="caption" style={{ fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                        {part.name}
                      </AppText>
                    </GlassCard>
                  </PressableScale>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Step 1: Select Symptoms */}
        {step === 1 && selectedBodyPart && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <AppText variant="headline" style={{ marginBottom: 4 }}>{t('selectSymptoms')}</AppText>
            <AppText variant="body" color={colors.textMuted} style={{ marginBottom: 16 }}>{t('selectSymptomsDesc')} {BODY_PARTS.find(p => p.id === selectedBodyPart)?.name}</AppText>
            <View style={styles.chipsWrap}>
              {(SYMPTOMS_BY_BODY_PART[selectedBodyPart] || []).map(s => (
                <Chip
                  key={s}
                  selected={symptoms.includes(s)}
                  onPress={() => toggleSymptom(s)}
                  style={[styles.symptomChip, { borderColor: colors.border, borderWidth: 1 }, symptoms.includes(s) && { backgroundColor: colors.primary }]}
                  textStyle={{ color: symptoms.includes(s) ? '#fff' : colors.text, fontSize: 12 }}
                  showSelectedCheck={false}
                >
                  {s}
                </Chip>
              ))}
            </View>
            <View style={styles.customInputRow}>
              <TextInput
                value={customSymptom}
                onChangeText={setCustomSymptom}
                placeholder={t('typeSymptomPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={[styles.customInput, { backgroundColor: colors.surface, color: colors.text }]}
                onSubmitEditing={addCustomSymptom}
                mode="outlined"
                outlineStyle={{ borderRadius: 12, borderColor: colors.border }}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                dense
              />
              <Button mode="contained" onPress={addCustomSymptom} style={[styles.addBtn, { backgroundColor: colors.primary }]} compact>{t('add')}</Button>
            </View>
            {symptoms.length > 0 && (
              <View style={styles.selectedWrap}>
                <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700', marginBottom: 8 }}>Selected Symptoms ({symptoms.length}):</AppText>
                <View style={styles.chipsWrap}>
                  {symptoms.map(s => (
                    <Chip key={s} onClose={() => toggleSymptom(s)} style={{ backgroundColor: isDark ? colors.border : '#eef2ff' }} textStyle={{ color: colors.primary, fontSize: 11 }}>
                      {s}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* Step 2: Severity & Duration */}
        {step === 2 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <AppText variant="headline" style={{ marginBottom: 4 }}>{t('severityDuration')}</AppText>
            <AppText variant="body" color={colors.textMuted} style={{ marginBottom: 16 }}>{t('severityDurationDesc') || 'Configure severity and timeline metrics'}</AppText>
            
            <AppText variant="title" style={{ marginBottom: 10, fontWeight: '800' }}>{t('selectSeverity')}</AppText>
            <View style={{ gap: 10, marginBottom: 20 }}>
              {SEVERITY_LEVELS.map(item => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setSeverity(item.value)}
                  activeOpacity={0.85}
                >
                  <GlassCard
                    padded={false}
                    style={[
                      styles.severityCard,
                      { padding: 14, backgroundColor: colors.surface, borderColor: severity === item.value ? item.color : colors.border },
                      severity === item.value && { borderWidth: 2 },
                    ] as any}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AppText variant="body" style={{ fontWeight: '800', color: item.color }}>{item.value}</AppText>
                      {severity === item.value && <MaterialCommunityIcons name="check-circle" size={16} color={item.color} />}
                    </View>
                    <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>{item.desc}</AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {item.examples.map((ex, j) => (
                        <Chip key={j} style={{ backgroundColor: isDark ? colors.border : Colors.slate[50] }} textStyle={{ fontSize: 9, color: colors.text }}>{ex}</Chip>
                      ))}
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>

            <AppText variant="title" style={{ marginBottom: 10, fontWeight: '800' }}>{t('selectDuration')}</AppText>
            <View style={styles.optionsWrap}>
              {DURATION_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: duration === d ? colors.primary : colors.surface,
                      borderColor: duration === d ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <AppText variant="caption" color={duration === d ? '#fff' : colors.text} style={{ fontWeight: '600' }}>{d}</AppText>
                </TouchableOpacity>
              ))}
            </View>

            <AppText variant="title" style={{ marginTop: 24, marginBottom: 8, fontWeight: '800' }}>Patient Identity & Details</AppText>
            <TextInput
              value={patientName}
              onChangeText={setPatientName}
              placeholder="Patient Full Name"
              style={{ backgroundColor: colors.surface, height: 44, marginBottom: 10 }}
              textColor={colors.text}
              mode="outlined"
              outlineStyle={{ borderRadius: 12, borderColor: colors.border }}
              activeOutlineColor={colors.primary}
              dense
            />
            <TextInput
              value={patientAddress}
              onChangeText={setPatientAddress}
              placeholder="Patient Location / Village / Address"
              style={{ backgroundColor: colors.surface, height: 44, marginBottom: 14 }}
              textColor={colors.text}
              mode="outlined"
              outlineStyle={{ borderRadius: 12, borderColor: colors.border }}
              activeOutlineColor={colors.primary}
              right={
                <TextInput.Icon 
                  icon={detectingLocation ? "loading" : "map-marker-radius"} 
                  color={colors.primary}
                  onPress={handleDetectLocation}
                  disabled={detectingLocation}
                />
              }
              dense
            />

            <AppText variant="title" style={{ marginBottom: 8, fontWeight: '800' }}>Age & Gender</AppText>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="Age"
                keyboardType="numeric"
                style={{ flex: 1, backgroundColor: colors.surface, height: 44 }}
                textColor={colors.text}
                mode="outlined"
                outlineStyle={{ borderRadius: 12, borderColor: colors.border }}
                activeOutlineColor={colors.primary}
                dense
              />
              <View style={{ flex: 2, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {['Male', 'Female', 'Other'].map(g => (
                  <Chip
                    key={g}
                    selected={gender === g}
                    onPress={() => setGender(g)}
                    style={{ backgroundColor: gender === g ? (isDark ? colors.border : '#eef2ff') : colors.surface, borderColor: gender === g ? colors.primary : colors.border, borderWidth: 1 }}
                    selectedColor={colors.primary}
                    textStyle={{ fontSize: 11, color: gender === g ? colors.primary : colors.text }}
                    showSelectedOverlay
                  >
                    {g}
                  </Chip>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Step 3: Medical History */}
        {step === 3 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <AppText variant="headline" style={{ marginBottom: 4 }}>{t('medicalHistory')}</AppText>
            <AppText variant="body" color={colors.textMuted} style={{ marginBottom: 16 }}>{t('medicalHistoryDesc')}</AppText>
            {[
              { label: t('existingConditions'), arr: conditions, setter: setConditions, placeholder: t('conditionsPlaceholder') },
              { label: t('currentMedications'), arr: medications, setter: setMedications, placeholder: t('medicationsPlaceholder') },
              { label: t('allergies'), arr: allergies, setter: setAllergies, placeholder: t('allergiesPlaceholder') },
            ].map(({ label, arr, setter, placeholder }) => (
              <View key={label} style={styles.historySection}>
                <AppText variant="caption" color={colors.text} style={{ fontWeight: '800', marginBottom: 10 }}>{label}</AppText>
                <View style={styles.customInputRow}>
                  <TextInput
                    value={tempInput}
                    onChangeText={setTempInput}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.customInput, { backgroundColor: colors.surface, color: colors.text }]}
                    onSubmitEditing={() => addTag(setter, arr)}
                    mode="outlined"
                    outlineStyle={{ borderRadius: 12, borderColor: colors.border }}
                    activeOutlineColor={colors.primary}
                    textColor={colors.text}
                    dense
                  />
                  <Button mode="contained" onPress={() => addTag(setter, arr)} style={[styles.addBtn, { backgroundColor: colors.primary }]} compact>{t('add')}</Button>
                </View>
                <View style={styles.chipsWrap}>
                  {arr.map(item => (
                    <Chip key={item} onClose={() => setter(arr.filter(x => x !== item))} style={{ backgroundColor: isDark ? colors.border : Colors.emerald[50] }} textStyle={{ color: isDark ? Colors.emerald[300] : Colors.emerald[700], fontSize: 11 }}>
                      {item}
                    </Chip>
                  ))}
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Step 4: Lifestyle Factors */}
        {step === 4 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <AppText variant="headline" style={{ marginBottom: 16 }}>{t('lifestyleFactors')}</AppText>
            {[
              { label: t('exerciseLevel'), key: 'exercise', options: ['None', 'Light', 'Moderate', 'Heavy'] },
              { label: t('stressLevel'), key: 'stress', options: ['Low', 'Moderate', 'High', 'Very High'] },
              { label: t('dietType'), key: 'diet', options: ['Poor', 'Average', 'Balanced', 'Strict/Clean'] },
              { label: t('alcoholIntake'), key: 'alcohol', options: ['None', 'Occasionally', 'Regularly', 'Daily'] },
            ].map(({ label, key, options }) => (
              <View key={key} style={{ marginBottom: 14 }}>
                <AppText variant="caption" color={colors.text} style={{ fontWeight: '800', marginBottom: 10 }}>{label}</AppText>
                <View style={styles.optionsWrap}>
                  {options.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setLifestyle(prev => ({ ...prev, [key]: opt }))}
                      style={[
                        styles.optionCardSmall,
                        {
                          backgroundColor: (lifestyle as any)[key] === opt ? colors.primary : colors.surface,
                          borderColor: (lifestyle as any)[key] === opt ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <AppText variant="micro" color={(lifestyle as any)[key] === opt ? '#fff' : colors.text} style={{ fontWeight: '700' }}>{opt}</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setLifestyle(prev => ({ ...prev, smoking: !prev.smoking }))}
              style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <AppText variant="caption" style={{ fontWeight: '700' }}>{t('smokingUse')}</AppText>
              <View style={[styles.toggleDot, { backgroundColor: lifestyle.smoking ? colors.danger : colors.success }]}>
                <AppText variant="micro" color="#fff" style={{ fontWeight: '800' }}>{lifestyle.smoking ? 'YES' : 'NO'}</AppText>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Step 5: Recent Changes / Additional Info */}
        {step === 5 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <AppText variant="headline" style={{ marginBottom: 4 }}>{t('additionalContext')}</AppText>
            <AppText variant="body" color={colors.textMuted} style={{ marginBottom: 16 }}>{t('additionalContextDesc')}</AppText>
            <TextInput
              value={recentChanges}
              onChangeText={setRecentChanges}
              placeholder={t('contextPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={6}
              mode="outlined"
              outlineStyle={{ borderRadius: 16, borderColor: colors.border }}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text }]}
            />
          </Animated.View>
        )}

        {/* Results Screen */}
        {step === totalSteps && result && (
          <Animated.View entering={FadeInDown.duration(600)} style={styles.stepContent}>
            {/* Header actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.stepTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('analysisResults')}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Button mode="outlined" onPress={handleDownloadPDF} icon="file-pdf-box" compact style={{ borderRadius: 16 }}>PDF</Button>
                <Button mode="outlined" onPress={handleShareReport} icon="share-variant" compact style={{ borderRadius: 16 }}>Share</Button>
              </View>
            </View>

            {/* ── Insufficient Information Banner (Healix: "I don't know over guessing") ── */}
            {result.insufficientInformation && (
              <Surface style={[styles.insufficientBanner, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]} elevation={0}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <MaterialCommunityIcons name="brain" size={20} color={Colors.amber[600]} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.amber[700] }}>Insufficient Information</Text>
                </View>
                <Text style={{ fontSize: 12, color: isDark ? Colors.amber[300] : Colors.amber[800], lineHeight: 18 }}>
                  The AI confidence was too low to generate a reliable diagnosis. This is by design —{' '}
                  <Text style={{ fontWeight: '700' }}>"I don't know over guessing"</Text> principle protects you from incorrect assessments.
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? Colors.amber[300] : Colors.amber[800], marginTop: 8, fontWeight: '600' }}>
                  👨‍⚕️ Please consult a doctor in person for an accurate diagnosis.
                </Text>
              </Surface>
            )}

            {/* ── ESI Triage Score + AI Confidence Row ── */}
            <View style={styles.esiBadgeRow}>
              <View style={[styles.esiBadge, {
                backgroundColor:
                  result.esiScore <= 2 ? Colors.rose[600] :
                  result.esiScore === 3 ? Colors.amber[500] :
                  Colors.emerald[600],
              }]}>
                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '800', opacity: 0.85 }}>ESI SCORE</Text>
                <Text style={{ fontSize: 22, color: '#fff', fontWeight: '900', lineHeight: 26 }}>{result.esiScore}</Text>
                <Text style={{ fontSize: 8, color: '#fff', fontWeight: '600', opacity: 0.85 }}>
                  {result.esiScore === 1 ? 'RESUSCITATE' :
                   result.esiScore === 2 ? 'EMERGENCY' :
                   result.esiScore === 3 ? 'URGENT' :
                   result.esiScore === 4 ? 'LESS URGENT' : 'ROUTINE'}
                </Text>
              </View>
              <View style={[styles.confidenceCard, { backgroundColor: isDark ? '#18181b' : Colors.slate[50], flex: 1 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? Colors.slate[400] : Colors.slate[500] }}>AI Confidence</Text>
                  <Text style={{
                    fontSize: 13, fontWeight: '800',
                    color: result.selfReportedConfidence >= 80 ? Colors.emerald[600] :
                           result.selfReportedConfidence >= 70 ? Colors.amber[600] :
                           Colors.rose[600],
                  }}>{result.selfReportedConfidence}%</Text>
                </View>
                <View style={[styles.confidenceBar, { backgroundColor: isDark ? '#27272a' : Colors.slate[200] }]}>
                  <View style={[styles.confidenceFill, {
                    width: `${result.selfReportedConfidence}%` as any,
                    backgroundColor: result.selfReportedConfidence >= 80 ? Colors.emerald[500] :
                                     result.selfReportedConfidence >= 70 ? Colors.amber[500] :
                                     Colors.rose[500],
                  }]} />
                </View>
                <Text style={{ fontSize: 9, color: isDark ? Colors.slate[500] : Colors.slate[400], marginTop: 4 }}>
                  T=0.0 deterministic · Threshold: 70%
                </Text>
              </View>
            </View>

            {/* Urgency */}
            <Surface style={[styles.urgencyCard, { backgroundColor: isDark ? '#1a0a0a' : URGENCY_COLORS[result.urgencyLevel.level]?.bg }]} elevation={1}>
              <View style={styles.urgencyHeader}>
                <MaterialCommunityIcons name={URGENCY_COLORS[result.urgencyLevel.level]?.icon as any || 'check-circle'} size={24} color={URGENCY_COLORS[result.urgencyLevel.level]?.text} />
                <View>
                  <Text style={[styles.urgencyLevel, { color: URGENCY_COLORS[result.urgencyLevel.level]?.text }]}>{result.urgencyLevel.level}</Text>
                  <Text style={{ fontSize: 11, color: isDark ? Colors.slate[400] : Colors.slate[500] }}>{result.urgencyLevel.timeframe}</Text>
                </View>
              </View>
              {result.urgencyLevel.reasoning.map((r, i) => (
                <Text key={i} style={[styles.urgencyReason, { color: isDark ? Colors.slate[300] : Colors.slate[600] }]}>• {r}</Text>
              ))}
            </Surface>

            {/* Potential Conditions */}
            <Text style={[styles.resultSection, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('potentialConditions')}</Text>
            {result.conditions.map((c, i) => (
              <Card key={i} style={[styles.conditionCard, { backgroundColor: isDark ? '#121214' : '#fff' }]} mode="contained">
                <Card.Content>
                  <View style={styles.conditionHeader}>
                    <Text style={[styles.conditionName, { color: isDark ? '#fff' : Colors.slate[800] }]}>{c.condition}</Text>
                    <Chip compact style={{
                      backgroundColor: c.probability === 'High' ? Colors.rose[50] : c.probability === 'Moderate' ? Colors.amber[50] : Colors.emerald[50],
                    }} textStyle={{
                      color: c.probability === 'High' ? Colors.rose[700] : c.probability === 'Moderate' ? Colors.amber[700] : Colors.emerald[700],
                      fontSize: 10, fontWeight: '700',
                    }}>{c.probability}</Chip>
                  </View>
                  <Text style={[styles.conditionDesc, { color: isDark ? Colors.slate[300] : Colors.slate[600] }]}>{c.description}</Text>
                  {c.suggestedTests && c.suggestedTests.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.blue[600], marginBottom: 4 }}>Suggested Diagnostic Tests:</Text>
                      {c.suggestedTests.map((t, j) => (
                        <Text key={j} style={{ fontSize: 11, color: isDark ? Colors.slate[400] : Colors.slate[500] }}>• {t}</Text>
                      ))}
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))}

            {/* Lifestyle Impact */}
            {result.lifestyleImpact.length > 0 && (
              <>
                <Text style={[styles.resultSection, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('lifestyleImpact')}</Text>
                {result.lifestyleImpact.map((li, i) => (
                  <Surface key={i} style={[styles.liCard, { backgroundColor: isDark ? '#18181b' : Colors.teal[50] }]} elevation={0}>
                    <Text style={[styles.liFactor, { color: isDark ? Colors.teal[300] : Colors.teal[700] }]}>{li.factor}</Text>
                    <Text style={[styles.liImpact, { color: isDark ? Colors.slate[300] : Colors.slate[600] }]}>{li.impact}</Text>
                    {li.recommendations.map((r, j) => (
                      <Text key={j} style={[styles.liRec, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>✓ {r}</Text>
                    ))}
                  </Surface>
                ))}
              </>
            )}

            {/* Remedies */}
            {result.remedyRecommendations.length > 0 && (
              <>
                <Text style={[styles.resultSection, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('remediesTitle')}</Text>
                {result.remedyRecommendations.map((rem, i) => (
                  <Surface key={i} style={[styles.remedyCard, { backgroundColor: isDark ? '#1a0f0f' : Colors.rose[50] }]} elevation={0}>
                    <Text style={[styles.remedyType, { color: isDark ? Colors.rose[300] : Colors.rose[700] }]}>{rem.type}</Text>
                    <Text style={[styles.remedyDesc, { color: isDark ? Colors.slate[300] : Colors.slate[600] }]}>{rem.recommendation}</Text>
                    {rem.warning && (
                      <View style={styles.warningRow}>
                        <MaterialCommunityIcons name="alert" size={12} color={Colors.amber[600]} />
                        <Text style={{ fontSize: 11, color: Colors.amber[700], flex: 1 }}>{rem.warning}</Text>
                      </View>
                    )}
                  </Surface>
                ))}
              </>
            )}

            {/* ── 360° Recovery Roadmap (ESI 4–5 only — Healix AI concept) ── */}
            {result.recoveryRoadmap && (
              <Animated.View entering={FadeInDown.duration(500)}>
                <Text style={[styles.resultSection, { color: isDark ? '#fff' : Colors.slate[800] }]}>🗺 360° Recovery Roadmap</Text>
                <Surface style={[styles.roadmapCard, { backgroundColor: isDark ? '#0c1a14' : '#f0fdf4' }]} elevation={0}>
                  {result.recoveryRoadmap.precautions.length > 0 && (
                    <View style={styles.roadmapSection}>
                      <View style={styles.roadmapSectionHeader}>
                        <MaterialCommunityIcons name="shield-check" size={16} color={Colors.emerald[600]} />
                        <Text style={[styles.roadmapSectionTitle, { color: isDark ? Colors.emerald[300] : Colors.emerald[700] }]}>Precautions</Text>
                      </View>
                      {result.recoveryRoadmap.precautions.map((p, i) => (
                        <Text key={i} style={[styles.roadmapItem, { color: isDark ? Colors.slate[300] : Colors.slate[700] }]}>• {p}</Text>
                      ))}
                    </View>
                  )}
                  {result.recoveryRoadmap.dietaryGuidelines.length > 0 && (
                    <View style={styles.roadmapSection}>
                      <View style={styles.roadmapSectionHeader}>
                        <MaterialCommunityIcons name="food-apple" size={16} color={Colors.teal[600]} />
                        <Text style={[styles.roadmapSectionTitle, { color: isDark ? Colors.teal[300] : Colors.teal[700] }]}>Dietary Guidelines</Text>
                      </View>
                      {result.recoveryRoadmap.dietaryGuidelines.map((d, i) => (
                        <Text key={i} style={[styles.roadmapItem, { color: isDark ? Colors.slate[300] : Colors.slate[700] }]}>• {d}</Text>
                      ))}
                    </View>
                  )}
                  {!!result.recoveryRoadmap.followUpTiming && (
                    <View style={styles.roadmapSection}>
                      <View style={styles.roadmapSectionHeader}>
                        <MaterialCommunityIcons name="calendar-clock" size={16} color={Colors.blue[600]} />
                        <Text style={[styles.roadmapSectionTitle, { color: isDark ? Colors.blue[300] : Colors.blue[700] }]}>Follow-Up Timing</Text>
                      </View>
                      <Text style={[styles.roadmapItem, { color: isDark ? Colors.slate[300] : Colors.slate[700] }]}>{result.recoveryRoadmap.followUpTiming}</Text>
                    </View>
                  )}
                  {!!result.recoveryRoadmap.generalCategoryGuidance && (
                    <View style={[styles.roadmapSection, { backgroundColor: isDark ? '#162032' : '#eff6ff', borderRadius: 10, padding: 10 }]}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: Colors.blue[600], marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>General Care Guidance</Text>
                      <Text style={{ fontSize: 12, color: isDark ? Colors.slate[300] : Colors.slate[700], lineHeight: 18 }}>{result.recoveryRoadmap.generalCategoryGuidance}</Text>
                    </View>
                  )}
                  <View style={[styles.roadmapDisclaimer, { backgroundColor: isDark ? '#27272a' : Colors.slate[100] }]}>
                    <MaterialCommunityIcons name="pill" size={12} color={isDark ? Colors.slate[400] : Colors.slate[500]} />
                    <Text style={{ fontSize: 10, color: isDark ? Colors.slate[400] : Colors.slate[500], flex: 1, lineHeight: 14 }}>{result.recoveryRoadmap.medicationDisclaimer}</Text>
                  </View>
                </Surface>
              </Animated.View>
            )}

            {/* Red Flags */}
            {result.redFlags.length > 0 && (
              <Surface style={[styles.redFlagCard, { backgroundColor: isDark ? '#450a0a80' : '#fef2f2' }]} elevation={0}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.rose[600], marginBottom: 6 }}>{t('emergencySigns')}</Text>
                {result.redFlags.map((rf, i) => (
                  <Text key={i} style={{ fontSize: 12, color: Colors.rose[700], lineHeight: 18 }}>• {rf}</Text>
                ))}
              </Surface>
            )}

            {SHOW_DISCLAIMERS && (
              <Surface style={[styles.disclaimerBox, { backgroundColor: isDark ? '#18181b' : Colors.slate[50] }]} elevation={0}>
                <Text style={{ fontSize: 10, color: isDark ? Colors.slate[500] : Colors.slate[500], lineHeight: 14 }}>{result.disclaimer}</Text>
              </Surface>
            )}

            {/* ── SOAP Note Generator (Healix AI SOAP Scribe concept) ── */}
            <View style={[styles.soapGeneratorCard, { backgroundColor: isDark ? '#0f172a' : '#f0f9ff', borderColor: isDark ? '#1e3a5f' : Colors.blue[100] }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={[styles.soapIconBox, { backgroundColor: Colors.blue[600] }]}>
                  <MaterialCommunityIcons name="file-document-edit" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#fff' : Colors.slate[800] }}>SOAP Note Generator</Text>
                  <Text style={{ fontSize: 10, color: isDark ? Colors.slate[400] : Colors.slate[500] }}>Clinical documentation · T=0.0 deterministic</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: isDark ? Colors.slate[400] : Colors.slate[600], lineHeight: 17, marginBottom: 12 }}>
                Generate a structured S.O.A.P. clinical note from this analysis — standard medical documentation format.
              </Text>
              <Button
                mode="contained"
                onPress={handleGenerateSOAP}
                loading={soapLoading}
                disabled={soapLoading}
                icon="clipboard-pulse"
                style={{ borderRadius: 20, backgroundColor: Colors.blue[600] }}
                labelStyle={{ fontSize: 13, fontWeight: '700' }}
              >
                {showSoap && soapNote ? 'Regenerate SOAP Note' : 'Generate SOAP Note'}
              </Button>

              {showSoap && soapLoading && (
                <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
                  <ActivityIndicator size="small" color={Colors.blue[600]} />
                  <Text style={{ fontSize: 12, color: Colors.blue[600], fontWeight: '600' }}>Generating clinical SOAP note (T=0.0)…</Text>
                </View>
              )}

              {showSoap && soapNote && !soapLoading && (
                <Animated.View entering={FadeInDown.duration(400)} style={[styles.soapNotePanel, { backgroundColor: isDark ? '#070f1a' : '#fff', borderColor: isDark ? '#1e3a5f' : Colors.blue[100] }]}>
                  <View style={[styles.soapSectionBlock, { borderLeftColor: Colors.blue[500] }]}>
                    <Text style={[styles.soapSectionLabel, { color: Colors.blue[600] }]}>S — Subjective</Text>
                    <Text style={[styles.soapSectionText, { color: isDark ? Colors.slate[300] : Colors.slate[700] }]}>{soapNote.subjective}</Text>
                  </View>
                  <View style={[styles.soapSectionBlock, { borderLeftColor: Colors.emerald[500] }]}>
                    <Text style={[styles.soapSectionLabel, { color: Colors.emerald[600] }]}>O — Objective</Text>
                    <Text style={[styles.soapSectionText, { color: isDark ? Colors.slate[300] : Colors.slate[700] }]}>{soapNote.objective}</Text>
                  </View>
                  <View style={[styles.soapSectionBlock, { borderLeftColor: Colors.amber[500] }]}>
                    <Text style={[styles.soapSectionLabel, { color: Colors.amber[600] }]}>A — Assessment</Text>
                    <Text style={[styles.soapSectionText, { color: isDark ? Colors.slate[300] : Colors.slate[700] }]}>{soapNote.assessment}</Text>
                  </View>
                  <View style={[styles.soapSectionBlock, { borderLeftColor: '#7c3aed' }]}>
                    <Text style={[styles.soapSectionLabel, { color: '#7c3aed' }]}>P — Plan</Text>
                    <Text style={[styles.soapSectionText, { color: isDark ? Colors.slate[300] : Colors.slate[700] }]}>{soapNote.plan}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#1e293b' : '#f1f5f9', paddingTop: 10 }}>
                    <TouchableOpacity
                      onPress={handleDownloadSOAP}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.blue[600], paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}
                    >
                      <MaterialCommunityIcons name="download" size={14} color="#fff" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Export PDF</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 9, color: isDark ? Colors.slate[600] : Colors.slate[400] }}>
                      Generated {new Date(soapNote.generatedAt).toLocaleTimeString()} · SOAP Scribe
                    </Text>
                  </View>
                </Animated.View>
              )}
            </View>

            <Button mode="contained" onPress={reset} style={{ marginTop: 20, borderRadius: 28, backgroundColor: Colors.teal[600] }} icon="refresh">
              {t('newAnalysisBtn')}
            </Button>
          </Animated.View>
        )}


        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Navigation footer */}
      {step < totalSteps && !loading && (
        <Surface style={[styles.navBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]} elevation={4}>
          <Button 
            mode="outlined" 
            onPress={() => setStep(Math.max(0, step - 1))} 
            disabled={step === 0}
            style={[styles.navBtn, { borderColor: colors.border, borderRadius: 24 }]} 
            labelStyle={{ fontSize: 13, color: colors.text }}
          >
            {t('back')}
          </Button>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1.5 }}>
            {step < totalSteps - 1 ? (
              <GradientButton
                label={t('next')}
                onPress={() => {
                  if (step === 1 && symptoms.length === 0) {
                    Alert.alert('Required', 'Please select at least one symptom.');
                    return;
                  }
                  setStep(step + 1);
                }}
                icon="arrow-right"
              />
            ) : (
              <GradientButton 
                label={t('analyzeBtn')} 
                onPress={handleAnalyze} 
                icon="brain"
              />
            )}
          </View>
        </Surface>
      )}

      {loading && (
        <Surface style={[styles.navBar, { backgroundColor: colors.surface, borderTopColor: colors.border, justifyContent: 'center' }]} elevation={4}>
          <View style={{ alignItems: 'center', paddingVertical: 8, flexDirection: 'row', gap: 10 }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="body" color={colors.primary} style={{ fontWeight: '600' }}>{t('geminiRunning')}</AppText>
          </View>
        </Surface>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bannerContainer: { width: '100%', height: 160, borderRadius: 24, overflow: 'hidden', borderWidth: 1, marginBottom: 16, backgroundColor: '#000' },
  bannerImage: { width: '100%', height: '100%' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  progressRow: { marginTop: 12 },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  scrollContent: { flex: 1 },
  disclaimer: { flexDirection: 'row', gap: 8, padding: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 12, alignItems: 'flex-start' },
  stepContent: { padding: 16 },
  stepTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  stepDesc: { fontSize: 13, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  gridItem: { width: '48%', padding: 14, borderRadius: 16, borderStyle: 'solid', borderWidth: 1, alignItems: 'center', gap: 8, marginBottom: 8 },
  partIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  partName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomChip: { borderRadius: 20 },
  customInputRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  customInput: { flex: 1 },
  addBtn: { borderRadius: 12, backgroundColor: Colors.teal[600] },
  selectedWrap: { marginTop: 16 },
  severityCard: { padding: 12, borderRadius: 16, borderWidth: 1, gap: 4 },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  optionCardSmall: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  historySection: { marginBottom: 20 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  toggleDot: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  textArea: { minHeight: 120, fontSize: 13, padding: 10, textAlignVertical: 'top' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.06)' },
  navBtn: { borderRadius: 24, flex: 1, marginHorizontal: 4 },
  urgencyCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  urgencyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  urgencyLevel: { fontSize: 18, fontWeight: '800' },
  urgencyReason: { fontSize: 12, lineHeight: 18, marginLeft: 8 },
  resultSection: { fontSize: 16, fontWeight: '800', marginTop: 20, marginBottom: 12 },
  conditionCard: { borderRadius: 16, marginBottom: 10 },
  conditionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  conditionName: { fontSize: 14, fontWeight: '700', flex: 1 },
  conditionDesc: { fontSize: 12, lineHeight: 18 },
  liCard: { borderRadius: 14, padding: 14, marginBottom: 8 },
  liFactor: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  liImpact: { fontSize: 12, lineHeight: 17, marginBottom: 6 },
  liRec: { fontSize: 11, lineHeight: 16, marginLeft: 4 },
  remedyCard: { borderRadius: 14, padding: 14, marginBottom: 8 },
  remedyType: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  remedyDesc: { fontSize: 12, lineHeight: 17 },
  warningRow: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'flex-start' },
  redFlagCard: { borderRadius: 14, padding: 14, marginTop: 16 },
  disclaimerBox: { borderRadius: 12, padding: 12, marginTop: 16 },
  // ── Insufficient information override banner ──
  insufficientBanner: { borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#f59e0b40' },
  // ── ESI Badge + AI Confidence row ──
  esiBadgeRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'stretch' },
  esiBadge: { borderRadius: 14, padding: 12, alignItems: 'center', justifyContent: 'center', minWidth: 82 },
  confidenceCard: { borderRadius: 14, padding: 12 },
  confidenceBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  confidenceFill: { height: 6, borderRadius: 3 },
  // ── 360° Recovery Roadmap ──
  roadmapCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#6ee7b730' },
  roadmapSection: { marginBottom: 12 },
  roadmapSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  roadmapSectionTitle: { fontSize: 12, fontWeight: '800' },
  roadmapItem: { fontSize: 12, lineHeight: 18, marginLeft: 4 },
  roadmapDisclaimer: { flexDirection: 'row', gap: 6, padding: 8, borderRadius: 8, marginTop: 8, alignItems: 'flex-start' },
  // ── SOAP Note Generator ──
  soapGeneratorCard: { borderRadius: 18, padding: 16, marginTop: 20, borderWidth: 1 },
  soapIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  soapNotePanel: { marginTop: 16, borderRadius: 14, padding: 14, borderWidth: 1 },
  soapSectionBlock: { borderLeftWidth: 3, paddingLeft: 10, marginBottom: 14 },
  soapSectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  soapSectionText: { fontSize: 12, lineHeight: 18 },
});
