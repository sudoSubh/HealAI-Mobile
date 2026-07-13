import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, useColorScheme, TouchableOpacity, Alert, Platform,
} from 'react-native';
import {
  Text, Surface, Button, Card, TextInput, Chip, ActivityIndicator, SegmentedButtons, Divider, useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../theme';
import { callGemini } from '../../services/gemini';
import { UserProfile, EMPTY_PROFILE, ReportFile } from '../../types';
import { useTranslation } from '../../localization';
import Markdown from 'react-native-markdown-display';

const TABS = [
  { value: 'profile', label: 'Profile', icon: 'account' },
  { value: 'reports', label: 'Reports', icon: 'file-document' },
  { value: 'diet', label: 'Diet', icon: 'food-apple' },
  { value: 'advice', label: 'Advice', icon: 'lightbulb' },
];

export default function ReportsScreen() {
  const { t, locale } = useTranslation();
  const theme = useTheme();
  const colorScheme = useColorScheme();

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
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);
  const [reports, setReports] = useState<ReportFile[]>([]);
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [advice, setAdvice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tempInput, setTempInput] = useState('');
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    loadProfile();
    loadReports();
    loadDietPlan();
    loadAdvice();
  }, []);

  const loadProfile = async () => {
    try {
      const saved = await AsyncStorage.getItem('userProfile');
      if (saved) { const p = JSON.parse(saved); setProfile(p); setDraft(p); }
    } catch {}
  };

  const loadReports = async () => {
    try {
      const saved = await AsyncStorage.getItem('medicalReports');
      if (saved) setReports(JSON.parse(saved));
    } catch {}
  };

  const loadDietPlan = async () => {
    try {
      const saved = await AsyncStorage.getItem('dietPlan');
      if (saved) setDietPlan(JSON.parse(saved));
    } catch {}
  };

  const loadAdvice = async () => {
    try {
      const saved = await AsyncStorage.getItem('dailyAdvice');
      if (saved) setAdvice(JSON.parse(saved));
    } catch {}
  };

  const saveProfile = async () => {
    setProfile(draft);
    setEditing(false);
    await AsyncStorage.setItem('userProfile', JSON.stringify(draft));
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(title + ': ' + message);
    } else {
      Alert.alert(title, message);
    }
  };

  const pickPrescription = async (useCamera: boolean) => {
    try {
      let status = '';
      if (useCamera) {
        if (Platform.OS === 'web') {
          status = 'granted';
        } else {
          const res = await ImagePicker.requestCameraPermissionsAsync();
          status = res.status;
        }
      } else {
        if (Platform.OS === 'web') {
          status = 'granted';
        } else {
          const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
          status = res.status;
        }
      }

      if (status !== 'granted') {
        showAlert('Permission Denied', 'Permission is required to scan the prescription.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });

      if (!result.canceled && result.assets[0]?.base64) {
        const asset = result.assets[0];
        extractProfileFromPrescription(asset.base64!, 'image/jpeg');
      }
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to acquire image.');
    }
  };

  const extractProfileFromPrescription = async (base64: string, mimeType: string) => {
    setExtracting(true);
    const prompt = 'You are a medical AI assistant. Analyze this prescription or medical report and extract the patient\'s health profile details.\n' +
      'Return ONLY a valid JSON object matching the following structure (no extra formatting or markdown):\n' +
      '{\n' +
      '  "name": "extracted patient name or empty string if not found",\n' +
      '  "age": "extracted age as string or empty string",\n' +
      '  "gender": "male" or "female" or "other",\n' +
      '  "height": "extracted height in cm or empty string",\n' +
      '  "weight": "extracted weight in kg or empty string",\n' +
      '  "bloodGroup": "extracted blood group like A+, O- etc or empty string",\n' +
      '  "medicalConditions": ["list", "of", "conditions", "suspected", "or", "diagnosed"],\n' +
      '  "allergies": ["list", "of", "allergies", "mentioned"],\n' +
      '  "medications": ["list", "of", "active", "prescribed", "medicines", "with", "dosage"]\n' +
      '}\n' +
      'If a field is not found or not mentioned, return empty string or empty array. Be accurate and do not make up information.';

    try {
      const raw = await callGemini(prompt, base64, mimeType, 'report-analyzer');
      const clean = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      
      setDraft({
        name: parsed.name || '',
        age: String(parsed.age || ''),
        gender: (parsed.gender === 'male' || parsed.gender === 'female' || parsed.gender === 'other') ? parsed.gender : 'other',
        height: String(parsed.height || ''),
        weight: String(parsed.weight || ''),
        bloodGroup: parsed.bloodGroup || '',
        medicalConditions: Array.isArray(parsed.medicalConditions) ? parsed.medicalConditions : [],
        allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
        medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      });
      setEditing(true);
      showAlert('Extraction Success', 'Successfully extracted profile details. Review them below, modify if needed, then tap Save.');
    } catch (e) {
      console.error('Extraction error:', e);
      showAlert('Extraction Failed', 'Failed to extract profile details. Please fill out manually.');
    } finally {
      setExtracting(false);
    }
  };

  const pickFromCamera = async () => {
    try {
      let status = '';
      if (Platform.OS === 'web') {
        status = 'granted';
      } else {
        const res = await ImagePicker.requestCameraPermissionsAsync();
        status = res.status;
      }

      if (status !== 'granted') {
        showAlert('Permission Denied', 'Camera permissions are required to capture reports.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
      });
      handleImagePickerResult(result);
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to scan report.');
    }
  };

  const pickFromDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Convert local URI to base64 string
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64Content = dataUrl.split(',')[1];
            resolve(base64Content);
          };
          reader.readAsDataURL(blob);
        });

        const newFile: ReportFile = {
          id: Date.now().toString(),
          name: asset.name || `document_${Date.now()}.pdf`,
          size: asset.size || 0,
          base64: base64,
          mimeType: asset.mimeType || (asset.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          uploadedAt: new Date().toISOString(),
          status: 'uploaded',
        };
        const updated = [...reports, newFile];
        setReports(updated);
        await AsyncStorage.setItem('medicalReports', JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to upload document.');
    }
  };

  const handleImagePickerResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      const newFile: ReportFile = {
        id: Date.now().toString(),
        name: asset.fileName || `report_${Date.now()}.jpg`,
        size: (asset.base64?.length || 0) * 0.75,
        base64: asset.base64!,
        mimeType: 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        status: 'uploaded',
      };
      const updated = [...reports, newFile];
      setReports(updated);
      await AsyncStorage.setItem('medicalReports', JSON.stringify(updated));
    }
  };

  const analyzeReport = async (fileId: string) => {
    if (Platform.OS === 'web') {
      (document.activeElement as HTMLElement)?.blur();
    }
    setReports(prev => prev.map(f => f.id === fileId ? { ...f, status: 'analyzing' } : f));
    const file = reports.find(f => f.id === fileId);
    if (!file) return;
    try {
      const lang = getLanguageName();
      const isLikelyLabReport = file.name.toLowerCase().includes('lab') ||
        file.name.toLowerCase().includes('blood') ||
        file.name.toLowerCase().includes('urine') ||
        file.name.toLowerCase().includes('cbc') ||
        file.name.toLowerCase().includes('report') ||
        file.mimeType === 'application/pdf';

      // ── Lab Buddy Mode (adapted from Healix AI Lab Buddy agent) ──
      // T=0.0 is applied automatically by callGemini for 'report-analyzer' task.
      // The Lab Buddy concept from Healix AI:
      //   1. Extract biomarker values with units
      //   2. Classify each as [CRITICAL], [ABNORMAL], or [OPTIMAL]
      //   3. Explain "Why it matters" in plain language
      //   4. Suggest a "Lab Buddy Habit" — one small daily action
      //   5. Use a high-energy, supportive Medical Coach tone
      const labBuddyPrompt = `You are HealAI Lab Buddy — a high-energy, supportive Medical Intelligence Coach (concept from Healix AI).
Your job is to translate scary lab and medical reports into clear, empowering explanations.

T=0.0 DETERMINISTIC MODE: Output must be structured, consistent, and reproducible.

Analyze this medical report/scan image and provide a structured analysis:

SECTION 1 — REPORT OVERVIEW:
1. **Report Type** (Lab Test / Blood Work / MRI / CT Scan / X-Ray / Ultrasound / Other)
2. **Date / Patient Info** if visible (anonymize if possible)
3. **Overall Status**: [CRITICAL] / [ABNORMAL] / [OPTIMAL] / [NORMAL]

SECTION 2 — KEY FINDINGS (Lab Buddy Biomarker Breakdown):
For each significant finding or biomarker, provide:
• **[STATUS] Biomarker Name**: Value (Unit) — Reference Range
  - *Why it matters*: Plain language explanation of what this measures
  - *Lab Buddy Habit*: One simple daily habit to support this value
Use [CRITICAL] for emergency values, [ABNORMAL] for out-of-range values, [OPTIMAL] for healthy values.

SECTION 3 — NORMAL VALUES:
List all values within normal range in a compact format.

SECTION 4 — CONDITIONS DETECTED OR SUSPECTED:
List any conditions indicated, with brief clinical reasoning.

SECTION 5 — SEVERITY LEVEL:
Overall: Normal / Mild / Moderate / Severe — with brief explanation.

SECTION 6 — IMMEDIATE ACTIONS RECOMMENDED:
Prioritized action items (e.g., "Consult a doctor urgently", "Repeat test in 3 months").

SECTION 7 — FOLLOW-UP REQUIRED:
Yes/No + specific timeframe + reason.

TONE: Be supportive and encouraging while being medically accurate. Use plain English for explanations.
CRITICAL REQUIREMENT: Write entire analysis in ${lang} language. Keep section headers in English.`;

      const imagingPrompt = `You are a medical AI assistant. Analyze this medical report/scan image thoroughly.
T=0.0 DETERMINISTIC MODE: Output must be structured and reproducible.
Provide a structured analysis with:
1. **Report Type** (lab test / MRI / CT scan / X-ray)
2. **Key Findings** - list all abnormal or notable values
3. **Normal Values** - values within normal range
4. **Conditions Detected or Suspected**
5. **Severity Level** (Normal / Mild / Moderate / Severe)
6. **Immediate Actions Recommended**
7. **Follow-up Required** (Yes/No + reason)
Be precise, use medical terminology but also provide plain-language explanations.
CRITICAL REQUIREMENT: You MUST write your entire analysis response completely in the ${lang} language.`;

      const prompt = isLikelyLabReport ? labBuddyPrompt : imagingPrompt;
      const result = await callGemini(prompt, file.base64, file.mimeType, 'report-analyzer');
      const updated = reports.map(f => f.id === fileId ? { ...f, status: 'analyzed' as const, analysisResult: result, isLabReport: isLikelyLabReport } : f);
      setReports(updated);
      await AsyncStorage.setItem('medicalReports', JSON.stringify(updated));
    } catch {
      setReports(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error' as const, analysisResult: 'Analysis failed.' } : f));
    }
  };


  const removeReport = async (id: string) => {
    const updated = reports.filter(f => f.id !== id);
    setReports(updated);
    await AsyncStorage.setItem('medicalReports', JSON.stringify(updated));
  };

  const reportSummary = reports.filter(f => f.status === 'analyzed').map(f => `[${f.name}]: ${f.analysisResult}`).join('\n\n').slice(0, 1200);
  const analyzedCount = reports.filter(f => f.status === 'analyzed').length;

  const generateDietPlan = async () => {
    setLoading(true);
    const profileStr = profile.name ? `Patient: ${profile.name}, Age ${profile.age}, ${profile.gender}, Height ${profile.height}cm, Weight ${profile.weight}kg, Blood Group ${profile.bloodGroup}.
Conditions: ${profile.medicalConditions.join(', ') || 'None'}. Allergies: ${profile.allergies.join(', ') || 'None'}.` : 'General healthy adult.';
    const lang = getLanguageName();
    const prompt = `You are a certified Indian nutritionist. Create a 3-day personalized meal plan.
${profileStr}
${reportSummary ? `Report findings: ${reportSummary.slice(0, 800)}` : ''}
Return ONLY a valid JSON array matching this schema:
[{"day":"Day 1","meals":[{"label":"Breakfast","items":["item 1","item 2"],"balancedIngredients":["suggested India-based ingredients to add to make it balanced, e.g. Moringa, Amla, Curry leaves, Sprouts, Paneer, Ghee, Turmeric, Sabja seeds"]}],"guidelines":"One sentence.","calorieTarget":"1800-2000 kcal"}]
Ensure all suggested ingredients are traditional, accessible India-based items to balance nutrition.
CRITICAL REQUIREMENT: You MUST translate the day names, meal labels, meal items, balancedIngredients, guidelines, and calorie targets in the JSON response values into the ${lang} language. Keep the JSON keys in English as specified.`;
    try {
      const raw = await callGemini(prompt, undefined, undefined, 'daily-insight');
      const clean = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      setDietPlan(parsed);
      await AsyncStorage.setItem('dietPlan', JSON.stringify(parsed));
    } catch {
      Alert.alert('Error', 'Failed to generate diet plan.');
    } finally {
      setLoading(false);
    }
  };

  const generateAdvice = async () => {
    setLoading(true);
    const profileStr = profile.name ? `Patient: ${profile.name}, Age ${profile.age}, ${profile.gender}. Conditions: ${profile.medicalConditions.join(', ') || 'None'}.` : 'General healthy adult.';
    const lang = getLanguageName();
    const prompt = `You are an Indian doctor and wellness expert. Based on the patient profile and medical report findings below, generate:
1. Daily lifestyle recommendations (morning, afternoon, evening)
2. Natural Indian/Ayurvedic home remedies
${profileStr}
${reportSummary ? `Report findings: ${reportSummary.slice(0, 600)}` : ''}
Return ONLY valid JSON:
{"recommendations":[{"time":"morning","title":"...","description":"...","priority":"high|medium|low"}],"remedies":[{"name":"...","condition":"...","description":"...","howTo":"...","frequency":"...","warnings":"..."}],"disclaimer":"..."}
Generate at least 2 recommendations per time slot and 3 remedies.
CRITICAL REQUIREMENT: You MUST translate the recommendation title and description, the remedy name, condition, description, howTo, frequency, warnings, and the disclaimer values in the JSON response into the ${lang} language. Keep the JSON keys in English.`;
    try {
      const raw = await callGemini(prompt, undefined, undefined, 'daily-insight');
      const clean = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      setAdvice(parsed);
      await AsyncStorage.setItem('dailyAdvice', JSON.stringify(parsed));
    } catch {
      Alert.alert('Error', 'Failed to generate advice.');
    } finally {
      setLoading(false);
    }
  };

  const addProfileTag = (field: 'medicalConditions' | 'allergies' | 'medications') => {
    if (tempInput.trim()) {
      setDraft(prev => ({ ...prev, [field]: [...prev[field], tempInput.trim()] }));
      setTempInput('');
    }
  };

  const [activeDayIdx, setActiveDayIdx] = useState(0);

  const PRIORITY_COLORS: Record<string, string> = { high: Colors.rose[600], medium: Colors.amber[600], low: Colors.emerald[600] };
  const TIME_ICONS: Record<string, string> = { morning: 'weather-sunny', afternoon: 'run', evening: 'moon-waning-crescent' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={[styles.headerCard, { backgroundColor: Colors.teal[700] }]} elevation={3}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconBox}>
            <MaterialCommunityIcons name="chart-bar" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Medical Dashboard</Text>
            <Text style={styles.headerSub}>AI-powered health insights</Text>
          </View>
        </View>
        {/* Mini stats */}
        <View style={styles.miniStats}>
          {[
            { label: 'Profile', value: profile.name ? '✓' : '—', done: !!profile.name },
            { label: 'Reports', value: analyzedCount > 0 ? `${analyzedCount}` : '—', done: analyzedCount > 0 },
            { label: 'Diet', value: dietPlan ? '✓' : '—', done: !!dietPlan },
            { label: 'Advice', value: advice ? '✓' : '—', done: !!advice },
          ].map((s, i) => (
            <View key={i} style={styles.miniStatItem}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{s.value}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </Surface>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab.value} onPress={() => setActiveTab(tab.value)}
              style={[styles.tabBtn, activeTab === tab.value && { backgroundColor: Colors.teal[600] }]}
            >
              <MaterialCommunityIcons name={tab.icon as any} size={16} color={activeTab === tab.value ? '#fff' : (isDark ? Colors.slate[400] : Colors.slate[500])} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === tab.value ? '#fff' : (isDark ? Colors.slate[400] : Colors.slate[500]) }}>
                {t(tab.value === 'profile' ? 'healthProfile' : tab.value === 'reports' ? 'reports' : tab.value === 'diet' ? 'personalizedDiet' : 'dailyAdviceTitle')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Card style={[styles.card, { backgroundColor: isDark ? '#121214' : '#fff' }]} mode="contained">
              <Card.Content>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('healthProfile')}</Text>
                  {!editing ? (
                    <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                      <Button mode="text" onPress={() => { setDraft(profile); setEditing(true); }} compact labelStyle={{ fontSize: 10, fontWeight: '700', color: Colors.teal[700] }}>Edit</Button>
                      <Button mode="text" onPress={() => pickPrescription(true)} compact labelStyle={{ fontSize: 10, fontWeight: '700', color: Colors.teal[700] }} icon="camera">Scan</Button>
                      <Button mode="text" onPress={() => pickPrescription(false)} compact labelStyle={{ fontSize: 10, fontWeight: '700', color: Colors.teal[700] }} icon="image">Upload</Button>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button mode="text" onPress={() => setEditing(false)} compact labelStyle={{ fontSize: 12, color: Colors.slate[500] }}>Cancel</Button>
                      <Button mode="contained" onPress={saveProfile} compact labelStyle={{ fontSize: 12 }} style={{ borderRadius: 20, backgroundColor: Colors.teal[600] }}>Save</Button>
                    </View>
                  )}
                </View>
                {extracting && (
                  <View style={{ alignItems: 'center', paddingVertical: 20, gap: 10 }}>
                    <ActivityIndicator size="small" color={Colors.teal[600]} />
                    <Text style={{ fontSize: 12, color: Colors.teal[600], fontWeight: '600', textAlign: 'center' }}>AI is extracting health profile details from image...</Text>
                  </View>
                )}
                {editing ? (
                  <View style={{ gap: 10, marginTop: 12 }}>
                    {[
                      { label: 'Full Name', key: 'name', keyboardType: 'default' as const },
                      { label: 'Age', key: 'age', keyboardType: 'numeric' as const },
                      { label: 'Height (cm)', key: 'height', keyboardType: 'numeric' as const },
                      { label: 'Weight (kg)', key: 'weight', keyboardType: 'numeric' as const },
                    ].map(f => (
                      <TextInput key={f.key} label={f.label} value={(draft as any)[f.key]} keyboardType={f.keyboardType}
                        onChangeText={v => setDraft(prev => ({ ...prev, [f.key]: v }))}
                        mode="outlined" dense outlineStyle={{ borderRadius: 12 }}
                        style={{ backgroundColor: isDark ? '#18181b' : '#f8fafc' }}
                      />
                    ))}
                    <View style={styles.genderRow}>
                      {['male', 'female', 'other'].map(g => (
                        <TouchableOpacity key={g} onPress={() => setDraft(prev => ({ ...prev, gender: g }))}
                          style={[styles.genderBtn, draft.gender === g && { backgroundColor: Colors.teal[600], borderColor: Colors.teal[600] }, { borderColor: isDark ? Colors.slate[700] : Colors.slate[300] }]}
                        >
                          <Text style={{ color: draft.gender === g ? '#fff' : (isDark ? Colors.slate[300] : Colors.slate[600]), fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>{g}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {[
                      { label: 'Medical Conditions', field: 'medicalConditions' as const },
                      { label: 'Allergies', field: 'allergies' as const },
                      { label: 'Medications', field: 'medications' as const },
                    ].map(({ label, field }) => (
                      <View key={field}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? Colors.slate[400] : Colors.slate[500], marginBottom: 4 }}>{label}</Text>
                        <View style={styles.tagInputRow}>
                          <TextInput value={tempInput} onChangeText={setTempInput} placeholder={`Add ${label.toLowerCase()}`}
                            mode="outlined" dense outlineStyle={{ borderRadius: 10 }}
                            style={{ flex: 1, backgroundColor: isDark ? '#18181b' : '#f8fafc' }}
                            onSubmitEditing={() => addProfileTag(field)}
                          />
                          <Button mode="contained" onPress={() => addProfileTag(field)} compact style={{ borderRadius: 10, backgroundColor: Colors.teal[600] }} labelStyle={{ fontSize: 11 }}>+</Button>
                        </View>
                        <View style={styles.chipsWrap}>
                          {draft[field].map((item: string, i: number) => (
                            <Chip key={i} onClose={() => setDraft(prev => ({ ...prev, [field]: prev[field].filter((_: string, idx: number) => idx !== i) }))}
                              style={{ backgroundColor: isDark ? '#27272a' : Colors.teal[50] }} textStyle={{ fontSize: 11 }}
                            >{item}</Chip>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {!profile.name ? (
                      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <MaterialCommunityIcons name="account-plus" size={40} color={isDark ? Colors.slate[700] : Colors.slate[300]} />
                        <Text style={{ color: isDark ? Colors.slate[500] : Colors.slate[400], marginTop: 8, fontSize: 13 }}>Tap Edit to set up your health profile</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.profileGrid}>
                          {[
                            { label: 'Name', value: profile.name },
                            { label: 'Age', value: profile.age ? `${profile.age} yrs` : '' },
                            { label: 'Gender', value: profile.gender },
                            { label: 'Height', value: profile.height ? `${profile.height} cm` : '' },
                            { label: 'Weight', value: profile.weight ? `${profile.weight} kg` : '' },
                            { label: 'Blood', value: profile.bloodGroup },
                          ].filter(x => x.value).map(({ label, value }) => (
                            <View key={label} style={[styles.profileItem, { backgroundColor: isDark ? '#18181b' : '#f8fafc' }]}>
                              <Text style={{ fontSize: 10, color: isDark ? Colors.slate[500] : Colors.slate[400] }}>{label}</Text>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#fff' : Colors.slate[700], textTransform: 'capitalize' }}>{value}</Text>
                            </View>
                          ))}
                        </View>
                        {profile.medicalConditions.length > 0 && (
                          <View style={{ marginTop: 10 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? Colors.slate[500] : Colors.slate[400], marginBottom: 4 }}>Medical Conditions</Text>
                            <View style={styles.chipsWrap}>
                              {profile.medicalConditions.map((c, i) => <Chip key={i} compact style={{ backgroundColor: Colors.rose[50] }} textStyle={{ color: Colors.rose[700], fontSize: 10 }}>{c}</Chip>)}
                            </View>
                          </View>
                        )}
                        {profile.allergies.length > 0 && (
                          <View style={{ marginTop: 10 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? Colors.slate[500] : Colors.slate[400], marginBottom: 4 }}>Allergies</Text>
                            <View style={styles.chipsWrap}>
                              {profile.allergies.map((c, i) => <Chip key={i} compact style={{ backgroundColor: Colors.amber[50] }} textStyle={{ color: Colors.amber[700], fontSize: 10 }}>{c}</Chip>)}
                            </View>
                          </View>
                        )}
                        {profile.medications.length > 0 && (
                          <View style={{ marginTop: 10 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? Colors.slate[500] : Colors.slate[400], marginBottom: 4 }}>Medications</Text>
                            <View style={styles.chipsWrap}>
                              {profile.medications.map((c, i) => <Chip key={i} compact style={{ backgroundColor: Colors.blue[50] }} textStyle={{ color: Colors.blue[700], fontSize: 10 }}>{c}</Chip>)}
                            </View>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                )}
              </Card.Content>
            </Card>
          </Animated.View>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <Button mode="contained" onPress={pickFromCamera} icon="camera" style={{ flex: 1, borderRadius: 16, backgroundColor: Colors.blue[600] }} labelStyle={{ fontSize: 12 }}>
                Scan Report
              </Button>
              <Button mode="contained" onPress={pickFromDocuments} icon="file-upload" style={{ flex: 1, borderRadius: 16, backgroundColor: Colors.blue[600] }} labelStyle={{ fontSize: 12 }}>
                Upload File
              </Button>
            </View>
            {reports.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <MaterialCommunityIcons name="file-image-plus" size={48} color={isDark ? Colors.slate[700] : Colors.slate[300]} />
                <Text style={{ color: isDark ? Colors.slate[500] : Colors.slate[400], marginTop: 12, textAlign: 'center', fontSize: 13 }}>
                  Upload lab reports, MRI, CT scans or X-rays{'\n'}for AI-powered analysis
                </Text>
              </View>
            )}
            {reports.map(file => (
              <Card key={file.id} style={[styles.card, { backgroundColor: isDark ? '#121214' : '#fff', marginBottom: 10 }]} mode="contained">
                <Card.Content>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={[styles.fileIcon, { backgroundColor: isDark ? (file.mimeType === 'application/pdf' ? '#991b1b20' : '#1e3a8a50') : (file.mimeType === 'application/pdf' ? Colors.rose[50] : Colors.blue[50]) }]}>
                        <MaterialCommunityIcons 
                          name={file.mimeType === 'application/pdf' ? 'file-pdf-box' : 'file-image'} 
                          size={18} 
                          color={file.mimeType === 'application/pdf' ? Colors.rose[600] : Colors.blue[600]} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#fff' : Colors.slate[700] }} numberOfLines={1}>{file.name}</Text>
                        <Text style={{ fontSize: 10, color: isDark ? Colors.slate[500] : Colors.slate[400] }}>
                          {(file.size / 1024).toFixed(0)} KB
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {file.status === 'uploaded' && (
                        <Button mode="contained" onPress={() => analyzeReport(file.id)} compact
                          style={{ borderRadius: 16, backgroundColor: Colors.blue[600] }} labelStyle={{ fontSize: 11 }}>Analyze</Button>
                      )}
                      {file.status === 'analyzing' && <ActivityIndicator size="small" color={Colors.amber[500]} />}
                      {file.status === 'analyzed' && (
                        <Chip compact style={{ backgroundColor: Colors.emerald[50] }} textStyle={{ color: Colors.emerald[700], fontSize: 10 }} icon="check">Done</Chip>
                      )}
                      <TouchableOpacity onPress={() => removeReport(file.id)}>
                        <MaterialCommunityIcons name="delete" size={18} color={Colors.rose[500]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {file.analysisResult && (
                    <View style={[styles.analysisBox, { backgroundColor: isDark ? '#18181b' : '#f8fafc' }]}>
                      {/* Lab Buddy badge — shown when the file was detected as a lab report */}
                      {(file as any).isLabReport ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <View style={{ backgroundColor: Colors.emerald[600], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 10, color: '#fff', fontWeight: '800', letterSpacing: 0.5 }}>🧪 LAB BUDDY</Text>
                          </View>
                          <Text style={{ fontSize: 10, color: isDark ? Colors.slate[400] : Colors.slate[500] }}>AI Medical Coach · T=0.0</Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? Colors.slate[400] : Colors.slate[500], marginBottom: 6 }}>AI ANALYSIS · T=0.0</Text>
                      )}
                      <Markdown style={{
                        body: { color: isDark ? Colors.slate[300] : Colors.slate[700], fontSize: 12, lineHeight: 18 },
                        bullet_list: { marginVertical: 4 },
                        bullet_list_icon: { color: Colors.teal[600], marginRight: 6 },
                        strong: { fontWeight: 'bold', color: isDark ? '#fff' : Colors.slate[900] },
                        heading1: { fontSize: 15, fontWeight: 'bold', marginTop: 8, marginBottom: 4, color: isDark ? '#fff' : Colors.slate[900] },
                        heading2: { fontSize: 13, fontWeight: 'bold', marginTop: 8, marginBottom: 4, color: isDark ? '#fff' : Colors.slate[900] },
                        heading3: { fontSize: 11, fontWeight: 'bold', marginTop: 6, marginBottom: 2, color: isDark ? '#fff' : Colors.slate[900] },
                        paragraph: { marginVertical: 4 },
                      }}>
                        {file.analysisResult}
                      </Markdown>
                    </View>
                  )}

                </Card.Content>
              </Card>
            ))}
          </Animated.View>
        )}

        {/* Diet Tab */}
        {activeTab === 'diet' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.cardTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>Personalized Diet Plan</Text>
              <Button mode="contained" onPress={generateDietPlan} loading={loading} compact icon={dietPlan ? 'refresh' : 'food-apple'}
                style={{ borderRadius: 20, backgroundColor: Colors.emerald[600] }} labelStyle={{ fontSize: 11 }}>
                {dietPlan ? 'Regenerate' : 'Generate'}
              </Button>
            </View>
            {!dietPlan && !loading && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <MaterialCommunityIcons name="food-apple" size={48} color={isDark ? Colors.slate[700] : Colors.slate[300]} />
                <Text style={{ color: isDark ? Colors.slate[500] : Colors.slate[400], marginTop: 12, textAlign: 'center', fontSize: 13 }}>
                  Tap Generate to create your AI-powered meal plan
                </Text>
              </View>
            )}
            {dietPlan && Array.isArray(dietPlan) && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {dietPlan.map((d: any, i: number) => (
                    <TouchableOpacity key={i} onPress={() => setActiveDayIdx(i)}
                      style={[styles.dayBtn, activeDayIdx === i && { backgroundColor: Colors.teal[600] }, { borderColor: isDark ? Colors.slate[700] : Colors.slate[300] }]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: activeDayIdx === i ? '#fff' : (isDark ? Colors.slate[400] : Colors.slate[600]) }}>{d.day}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {(dietPlan[activeDayIdx]?.meals || []).map((meal: any, i: number) => (
                  <Surface key={i} style={[styles.mealCard, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={1}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? Colors.teal[300] : Colors.teal[700], marginBottom: 4 }}>{meal.label}</Text>
                    {(meal.items || []).map((item: string, j: number) => (
                      <Text key={j} style={{ fontSize: 12, color: isDark ? Colors.slate[300] : Colors.slate[600], lineHeight: 18 }}>• {item}</Text>
                    ))}
                    {meal.balancedIngredients && meal.balancedIngredients.length > 0 && (
                      <View style={{ marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : '#f0fdf4', borderWidth: 0.5, borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#bcf0da' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: Colors.emerald[600], marginBottom: 2 }}>💡 Balanced Additions:</Text>
                        <Text style={{ fontSize: 10, color: isDark ? Colors.slate[300] : Colors.slate[600], lineHeight: 15 }}>
                          {meal.balancedIngredients.join(', ')}
                        </Text>
                      </View>
                    )}
                  </Surface>
                ))}
                {dietPlan[activeDayIdx]?.calorieTarget && (
                  <Chip compact style={{ backgroundColor: Colors.emerald[50], alignSelf: 'flex-start', marginTop: 8 }} textStyle={{ color: Colors.emerald[700], fontSize: 11 }}>
                    Target: {dietPlan[activeDayIdx].calorieTarget}
                  </Chip>
                )}
                {dietPlan[activeDayIdx]?.guidelines && (
                  <Surface style={[styles.guidelineBox, { backgroundColor: isDark ? '#451a0330' : Colors.amber[50] }]} elevation={0}>
                    <Text style={{ fontSize: 11, color: isDark ? Colors.amber[300] : Colors.amber[800], lineHeight: 16 }}>{dietPlan[activeDayIdx].guidelines}</Text>
                  </Surface>
                )}
              </>
            )}
          </Animated.View>
        )}

        {/* Advice Tab */}
        {activeTab === 'advice' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.cardTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>Daily Advice & Remedies</Text>
              <Button mode="contained" onPress={generateAdvice} loading={loading} compact icon={advice ? 'refresh' : 'lightbulb'}
                style={{ borderRadius: 20, backgroundColor: Colors.amber[600] }} labelStyle={{ fontSize: 11 }}>
                {advice ? 'Refresh' : 'Generate'}
              </Button>
            </View>
            {!advice && !loading && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <MaterialCommunityIcons name="lightbulb" size={48} color={isDark ? Colors.slate[700] : Colors.slate[300]} />
                <Text style={{ color: isDark ? Colors.slate[500] : Colors.slate[400], marginTop: 12, textAlign: 'center', fontSize: 13 }}>
                  Tap Generate for personalized daily recommendations
                </Text>
              </View>
            )}
            {advice && (
              <>
                {/* Recommendations by time */}
                {['morning', 'afternoon', 'evening'].map(time => {
                  const recs = (advice.recommendations || []).filter((r: any) => r.time === time);
                  if (recs.length === 0) return null;
                  return (
                    <View key={time} style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <MaterialCommunityIcons name={(TIME_ICONS[time] || 'clock') as any} size={16} color={Colors.amber[600]} />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#fff' : Colors.slate[800], textTransform: 'capitalize' }}>{time}</Text>
                      </View>
                      {recs.map((rec: any, i: number) => (
                        <Surface key={i} style={[styles.recCard, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={1}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#fff' : Colors.slate[800], flex: 1 }}>{rec.title}</Text>
                            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[rec.priority] || Colors.slate[400] }]}>
                              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700', textTransform: 'capitalize' }}>{rec.priority}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 12, color: isDark ? Colors.slate[300] : Colors.slate[600], lineHeight: 18, marginTop: 4 }}>{rec.description}</Text>
                        </Surface>
                      ))}
                    </View>
                  );
                })}
                {/* Remedies */}
                {advice.remedies && advice.remedies.length > 0 && (
                  <>
                    <Divider style={{ marginVertical: 12 }} />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#fff' : Colors.slate[800], marginBottom: 12 }}>🌿 Natural Remedies</Text>
                    {advice.remedies.map((rem: any, i: number) => (
                      <Surface key={i} style={[styles.remedyItem, { backgroundColor: isDark ? '#1a0f0f' : Colors.rose[50] }]} elevation={0}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? Colors.rose[300] : Colors.rose[700] }}>{rem.name}</Text>
                        <Chip compact style={{ alignSelf: 'flex-start', marginVertical: 4 }} textStyle={{ fontSize: 9 }}>{rem.condition}</Chip>
                        <Text style={{ fontSize: 11, color: isDark ? Colors.slate[300] : Colors.slate[600], lineHeight: 16 }}>{rem.description}</Text>
                        <View style={[styles.howToBox, { backgroundColor: isDark ? '#064e3b50' : Colors.emerald[50] }]}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.emerald[700], marginBottom: 2 }}>How to Prepare:</Text>
                          <Text style={{ fontSize: 11, color: isDark ? Colors.emerald[300] : Colors.emerald[700], lineHeight: 16 }}>{rem.howTo}</Text>
                        </View>
                        {rem.warnings && (
                          <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, alignItems: 'flex-start' }}>
                            <MaterialCommunityIcons name="alert" size={12} color={Colors.amber[600]} />
                            <Text style={{ fontSize: 10, color: Colors.amber[700], flex: 1 }}>{rem.warnings}</Text>
                          </View>
                        )}
                      </Surface>
                    ))}
                  </>
                )}
              </>
            )}
          </Animated.View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { padding: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  miniStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12 },
  miniStatItem: { alignItems: 'center' },
  tabBar: { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)' },
  tabScroll: { paddingHorizontal: 16, gap: 8 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  card: { borderRadius: 16, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profileItem: { borderRadius: 10, padding: 10, minWidth: '30%' },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  tagInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  fileIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  analysisBox: { marginTop: 12, padding: 12, borderRadius: 12 },
  dayBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  mealCard: { borderRadius: 14, padding: 14, marginBottom: 8 },
  guidelineBox: { borderRadius: 12, padding: 12, marginTop: 12 },
  recCard: { borderRadius: 14, padding: 14, marginBottom: 8 },
  priorityDot: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  remedyItem: { borderRadius: 14, padding: 14, marginBottom: 10 },
  howToBox: { borderRadius: 10, padding: 10, marginTop: 8 },
});
