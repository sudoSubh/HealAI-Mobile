import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, useColorScheme, TouchableOpacity, Alert, Share, Image,
} from 'react-native';
import {
  Text, Surface, Button, TextInput, Chip, ProgressBar, Card, Divider, ActivityIndicator, useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../../theme';
import { analyzeSymptomsWithGemini, AnalysisResponse, AnalysisData } from '../../services/symptomCheckerService';
import { useTranslation } from '../../localization';

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
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);

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
    setLoading(true);
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
      const res = await analyzeSymptomsWithGemini(data, getLanguageName());
      setResult(res);
      setStep(totalSteps);
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

DISCLAIMER:
${result.disclaimer}
`;
    try {
      await Share.share({ message: reportText });
    } catch {}
  };

  const reset = () => {
    setStep(0);
    setResult(null);
    setSelectedBodyPart(null);
    setSymptoms([]);
    setSeverity('Moderate');
    setDuration('1-3 days');
    setConditions([]);
    setMedications([]);
    setAllergies([]);
    setRecentChanges('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={2}>
        <View style={styles.headerRow}>
          <View style={[styles.headerIcon, { backgroundColor: Colors.blue[600] }]}>
            <MaterialCommunityIcons name="stethoscope" size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('symptomCheckerHeader')}</Text>
            <Text style={{ fontSize: 11, color: isDark ? Colors.slate[500] : Colors.slate[400] }}>Web-matching clinic protocol</Text>
          </View>
        </View>
        {step < totalSteps && (
          <View style={styles.progressRow}>
            <ProgressBar progress={(step + 1) / totalSteps} color={Colors.teal[600]} style={styles.progressBar} />
            <Text style={{ fontSize: 10, color: isDark ? Colors.slate[500] : Colors.slate[400], marginTop: 4 }}>
              Step {step + 1} of {totalSteps}
            </Text>
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
            <View style={[styles.bannerContainer, { borderColor: isDark ? '#27272a' : '#e4e4e7' }]}>
              <Image
                source={require('../../../assets/images/symptoms_header.png')}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.stepTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('selectBodyPart')}</Text>
            <Text style={[styles.stepDesc, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>{t('selectBodyPartDesc')}</Text>
            <View style={styles.grid}>
              {BODY_PARTS.map(part => (
                <TouchableOpacity
                  key={part.id}
                  onPress={() => {
                    setSelectedBodyPart(part.id);
                    setStep(1);
                  }}
                  style={[styles.gridItem, { backgroundColor: isDark ? '#121214' : '#fff', borderColor: isDark ? '#27272a' : Colors.slate[200] }]}
                >
                  <View style={[styles.partIconBox, { backgroundColor: part.color + '15' }]}>
                    <MaterialCommunityIcons name={part.icon as any} size={22} color={part.color} />
                  </View>
                  <Text style={[styles.partName, { color: isDark ? '#fff' : Colors.slate[800] }]} numberOfLines={1}>
                    {part.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Step 1: Select Symptoms */}
        {step === 1 && selectedBodyPart && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('selectSymptoms')}</Text>
            <Text style={[styles.stepDesc, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>{t('selectSymptomsDesc')} {BODY_PARTS.find(p => p.id === selectedBodyPart)?.name}</Text>
            <View style={styles.chipsWrap}>
              {(SYMPTOMS_BY_BODY_PART[selectedBodyPart] || []).map(s => (
                <Chip
                  key={s}
                  selected={symptoms.includes(s)}
                  onPress={() => toggleSymptom(s)}
                  style={[styles.symptomChip, symptoms.includes(s) && { backgroundColor: Colors.teal[600] }]}
                  textStyle={{ color: symptoms.includes(s) ? '#fff' : (isDark ? Colors.slate[300] : Colors.slate[600]), fontSize: 12 }}
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
                placeholderTextColor={isDark ? Colors.slate[600] : Colors.slate[400]}
                style={[styles.customInput, { backgroundColor: isDark ? '#18181b' : '#f8fafc', color: isDark ? '#fff' : '#000' }]}
                onSubmitEditing={addCustomSymptom}
                mode="outlined"
                outlineStyle={{ borderRadius: 12, borderColor: isDark ? Colors.slate[700] : Colors.slate[200] }}
                dense
              />
              <Button mode="contained" onPress={addCustomSymptom} style={styles.addBtn} compact>{t('add')}</Button>
            </View>
            {symptoms.length > 0 && (
              <View style={styles.selectedWrap}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.teal[600], marginBottom: 8 }}>Selected Symptoms ({symptoms.length}):</Text>
                <View style={styles.chipsWrap}>
                  {symptoms.map(s => (
                    <Chip key={s} onClose={() => toggleSymptom(s)} style={{ backgroundColor: Colors.teal[50] }} textStyle={{ color: Colors.teal[700], fontSize: 11 }}>
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
            <Text style={[styles.stepTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('severityDuration')}</Text>
            <Text style={[styles.sectionLabel, { color: isDark ? Colors.slate[300] : Colors.slate[600] }]}>{t('selectSeverity')}</Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
              {SEVERITY_LEVELS.map(item => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setSeverity(item.value)}
                  style={[
                    styles.severityCard,
                    { backgroundColor: isDark ? '#121214' : '#fff', borderColor: severity === item.value ? item.color : (isDark ? '#27272a' : Colors.slate[200]) },
                    severity === item.value && { borderWidth: 2 },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: item.color }}>{item.value}</Text>
                    {severity === item.value && <MaterialCommunityIcons name="check-circle" size={16} color={item.color} />}
                  </View>
                  <Text style={{ fontSize: 11, color: isDark ? Colors.slate[400] : Colors.slate[500], marginTop: 2 }}>{item.desc}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {item.examples.map((ex, j) => (
                      <Chip key={j} style={{ backgroundColor: isDark ? '#18181b' : Colors.slate[50] }} textStyle={{ fontSize: 9, color: isDark ? Colors.slate[300] : Colors.slate[600] }}>{ex}</Chip>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: isDark ? Colors.slate[300] : Colors.slate[600] }]}>{t('selectDuration')}</Text>
            <View style={styles.optionsWrap}>
              {DURATION_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: duration === d ? Colors.teal[600] : (isDark ? '#18181b' : '#f8fafc'),
                      borderColor: duration === d ? Colors.teal[600] : (isDark ? Colors.slate[700] : Colors.slate[200]),
                    },
                  ]}
                >
                  <Text style={{ color: duration === d ? '#fff' : (isDark ? Colors.slate[300] : Colors.slate[600]), fontSize: 12, fontWeight: '600' }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Step 3: Medical History */}
        {step === 3 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('medicalHistory')}</Text>
            <Text style={[styles.stepDesc, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>{t('medicalHistoryDesc')}</Text>
            {[
              { label: t('existingConditions'), arr: conditions, setter: setConditions, placeholder: t('conditionsPlaceholder') },
              { label: t('currentMedications'), arr: medications, setter: setMedications, placeholder: t('medicationsPlaceholder') },
              { label: t('allergies'), arr: allergies, setter: setAllergies, placeholder: t('allergiesPlaceholder') },
            ].map(({ label, arr, setter, placeholder }) => (
              <View key={label} style={styles.historySection}>
                <Text style={[styles.sectionLabel, { color: isDark ? Colors.slate[300] : Colors.slate[600] }]}>{label}</Text>
                <View style={styles.customInputRow}>
                  <TextInput
                    value={tempInput}
                    onChangeText={setTempInput}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? Colors.slate[600] : Colors.slate[400]}
                    style={[styles.customInput, { backgroundColor: isDark ? '#18181b' : '#f8fafc', color: isDark ? '#fff' : '#000' }]}
                    onSubmitEditing={() => addTag(setter, arr)}
                    mode="outlined"
                    outlineStyle={{ borderRadius: 12, borderColor: isDark ? Colors.slate[700] : Colors.slate[200] }}
                    dense
                  />
                  <Button mode="contained" onPress={() => addTag(setter, arr)} style={styles.addBtn} compact>{t('add')}</Button>
                </View>
                <View style={styles.chipsWrap}>
                  {arr.map(item => (
                    <Chip key={item} onClose={() => setter(arr.filter(x => x !== item))} style={{ backgroundColor: isDark ? '#27272a' : Colors.emerald[50] }} textStyle={{ color: isDark ? Colors.emerald[300] : Colors.emerald[700], fontSize: 11 }}>
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
            <Text style={[styles.stepTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('lifestyleFactors')}</Text>
            {[
              { label: t('exerciseLevel'), key: 'exercise', options: ['None', 'Light', 'Moderate', 'Heavy'] },
              { label: t('stressLevel'), key: 'stress', options: ['Low', 'Moderate', 'High', 'Very High'] },
              { label: t('dietType'), key: 'diet', options: ['Poor', 'Average', 'Balanced', 'Strict/Clean'] },
              { label: t('alcoholIntake'), key: 'alcohol', options: ['None', 'Occasionally', 'Regularly', 'Daily'] },
            ].map(({ label, key, options }) => (
              <View key={key} style={{ marginBottom: 14 }}>
                <Text style={[styles.sectionLabel, { color: isDark ? Colors.slate[300] : Colors.slate[600] }]}>{label}</Text>
                <View style={styles.optionsWrap}>
                  {options.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setLifestyle(prev => ({ ...prev, [key]: opt }))}
                      style={[
                        styles.optionCardSmall,
                        {
                          backgroundColor: (lifestyle as any)[key] === opt ? Colors.teal[600] : (isDark ? '#18181b' : '#f8fafc'),
                          borderColor: (lifestyle as any)[key] === opt ? Colors.teal[600] : (isDark ? Colors.slate[700] : Colors.slate[200]),
                        },
                      ]}
                    >
                      <Text style={{ color: (lifestyle as any)[key] === opt ? '#fff' : (isDark ? Colors.slate[300] : Colors.slate[600]), fontSize: 11, fontWeight: '700' }}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setLifestyle(prev => ({ ...prev, smoking: !prev.smoking }))}
              style={[styles.toggleRow, { backgroundColor: isDark ? '#18181b' : '#f8fafc', borderColor: isDark ? '#27272a' : Colors.slate[200] }]}
            >
              <Text style={{ color: isDark ? Colors.slate[300] : Colors.slate[600], fontSize: 13, fontWeight: '700' }}>{t('smokingUse')}</Text>
              <View style={[styles.toggleDot, { backgroundColor: lifestyle.smoking ? Colors.rose[500] : Colors.emerald[500] }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{lifestyle.smoking ? 'YES' : 'NO'}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Step 5: Recent Changes / Additional Info */}
        {step === 5 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('additionalContext')}</Text>
            <Text style={[styles.stepDesc, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>{t('additionalContextDesc')}</Text>
            <TextInput
              value={recentChanges}
              onChangeText={setRecentChanges}
              placeholder={t('contextPlaceholder')}
              placeholderTextColor={isDark ? Colors.slate[600] : Colors.slate[400]}
              multiline
              numberOfLines={6}
              mode="outlined"
              outlineStyle={{ borderRadius: 16, borderColor: isDark ? Colors.slate[700] : Colors.slate[200] }}
              style={[styles.textArea, { backgroundColor: isDark ? '#121214' : '#fff', color: isDark ? '#fff' : '#000' }]}
            />
          </Animated.View>
        )}

        {/* Results Screen */}
        {step === totalSteps && result && (
          <Animated.View entering={FadeInDown.duration(600)} style={styles.stepContent}>
            {/* Header actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.stepTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('analysisResults')}</Text>
              <Button mode="outlined" onPress={handleShareReport} icon="share-variant" compact style={{ borderRadius: 16 }}>Share</Button>
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

            {/* Red Flags */}
            {result.redFlags.length > 0 && (
              <Surface style={[styles.redFlagCard, { backgroundColor: isDark ? '#450a0a80' : '#fef2f2' }]} elevation={0}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.rose[600], marginBottom: 6 }}>{t('emergencySigns')}</Text>
                {result.redFlags.map((rf, i) => (
                  <Text key={i} style={{ fontSize: 12, color: Colors.rose[700], lineHeight: 18 }}>• {rf}</Text>
                ))}
              </Surface>
            )}

            {/* Disclaimer */}
            {SHOW_DISCLAIMERS && (
              <Surface style={[styles.disclaimerBox, { backgroundColor: isDark ? '#18181b' : Colors.slate[50] }]} elevation={0}>
                <Text style={{ fontSize: 10, color: isDark ? Colors.slate[500] : Colors.slate[500], lineHeight: 14 }}>{result.disclaimer}</Text>
              </Surface>
            )}

            <Button mode="contained" onPress={reset} style={{ marginTop: 20, borderRadius: 28, backgroundColor: Colors.teal[600] }} icon="refresh">
              {t('newAnalysisBtn')}
            </Button>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Navigation footer */}
      {step < totalSteps && !loading && (
        <Surface style={[styles.navBar, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={4}>
          <Button mode="outlined" onPress={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
            style={[styles.navBtn, { borderColor: isDark ? Colors.slate[700] : Colors.slate[300] }]} labelStyle={{ fontSize: 13 }}>
            {t('back')}
          </Button>
          {step < totalSteps - 1 ? (
            <Button
              mode="contained"
              onPress={() => {
                if (step === 1 && symptoms.length === 0) {
                  Alert.alert('Required', 'Please select at least one symptom.');
                  return;
                }
                setStep(step + 1);
              }}
              style={[styles.navBtn, { backgroundColor: Colors.teal[600] }]}
              labelStyle={{ fontSize: 13 }}
              icon="arrow-right"
            >
              {t('next')}
            </Button>
          ) : (
            <Button mode="contained" onPress={handleAnalyze} loading={loading}
              style={[styles.navBtn, { backgroundColor: Colors.teal[600] }]} labelStyle={{ fontSize: 13 }} icon="brain">
              {t('analyzeBtn')}
            </Button>
          )}
        </Surface>
      )}

      {loading && (
        <Surface style={[styles.navBar, { backgroundColor: isDark ? '#121214' : '#fff', justifyContent: 'center' }]} elevation={4}>
          <View style={{ alignItems: 'center', paddingVertical: 8, flexDirection: 'row', gap: 10 }}>
            <ActivityIndicator size="small" color={Colors.teal[600]} />
            <Text style={{ fontSize: 13, color: Colors.teal[600], fontWeight: '600' }}>{t('geminiRunning')}</Text>
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
});
