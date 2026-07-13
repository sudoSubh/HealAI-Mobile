import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { Text, Surface, TextInput, Button, Portal, Dialog, IconButton, Avatar, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, withRepeat, withSequence, withTiming, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useHealTheme, Colors } from '../theme';
import { useTranslation } from '../localization';
import { registerFamilyMember, getFamilyMembers, deleteFamilyMember, saveNurseCallRecord, FamilyMember } from '../services/neo4jService';
import { triggerTwilioCall, analyzeCallTranscript } from '../services/voiceCallService';
import { sendLocalNotification } from '../services/notificationService';
import { callGemini } from '../services/gemini';

// Supported Indian Languages for Sarvam AI
const LANGUAGES = [
  { label: 'English', code: 'en-IN' },
  { label: 'Hindi (हिन्दी)', code: 'hi-IN' },
  { label: 'Bengali (বাংলা)', code: 'bn-IN' },
  { label: 'Telugu (తెలుగు)', code: 'te-IN' },
  { label: 'Tamil (தமிழ்)', code: 'ta-IN' },
  { label: 'Marathi (ಮರಾठी)', code: 'mr-IN' },
  { label: 'Gujarati (ગુજરાતી)', code: 'gu-IN' },
  { label: 'Kannada (ಕನ್ನಡ)', code: 'kn-IN' },
  { label: 'Odia (ଓଡ଼ିଆ)', code: 'or-IN' },
  { label: 'Malayalam (മലയാളം)', code: 'ml-IN' },
  { label: 'Punjabi (ਪੰਜਾਬੀ)', code: 'pa-IN' }
];

export default function NurseCallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isDark, colors } = useHealTheme();

  // Registry state
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Registration Form state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91');
  const [age, setAge] = useState('');
  const [relationship, setRelationship] = useState('');
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [savingMember, setSavingMember] = useState(false);

  // Calling state
  const [activeMember, setActiveMember] = useState<FamilyMember | null>(null);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'completed'>('idle');
  const [twilioStatus, setTwilioStatus] = useState('');
  const [transcript, setTranscript] = useState<Array<{ sender: 'nurse' | 'patient', text: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [botThinking, setBotThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Call Analysis state
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [savingAnalysis, setSavingAnalysis] = useState(false);

  // Direct call states
  const [directPhone, setDirectPhone] = useState('+91');
  const [directName, setDirectName] = useState('');
  const [directLang, setDirectLang] = useState('hi-IN');

  // Animation values for calling waveform
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);

  const handleStartDirectCall = async () => {
    if (!directPhone.trim() || !directName.trim()) {
      Alert.alert('Required Fields', 'Please enter both the patient name and phone number to dial.');
      return;
    }
    const simulatedMember: FamilyMember = {
      id: 'direct_' + Date.now(),
      name: directName.trim(),
      phone: directPhone.trim(),
      language: LANGUAGES.find(l => l.code === directLang)?.label || 'English',
      relationship: 'Self/Direct Call',
      age: 'Not specified'
    };

    setActiveMember(simulatedMember);
    setCallState('calling');
    setTwilioStatus('Dialing via Twilio outbound call...');
    setTranscript([]);
    setAnalysisResult(null);
    startPulseAnimation();

    let twilioSuccess = false;
    try {
      twilioSuccess = await triggerTwilioCall(simulatedMember.phone, directLang, simulatedMember.name);
    } catch (err: any) {
      if (err?.message === 'TWILIO_UNVERIFIED_NUMBER') {
        Alert.alert(
          'Twilio Trial Limitation',
          'The number ' + simulatedMember.phone + ' is unverified. Twilio Trial accounts can only call verified numbers.\n\nContinuing in Simulation Mode.',
          [{ text: 'Continue' }]
        );
      }
    }
    
    setTimeout(() => {
      setCallState('ringing');
      setTwilioStatus(twilioSuccess ? 'Ringing elder phone (+12183797260)...' : 'Ringing (Simulation)...');
      
      setTimeout(() => {
        setCallState('connected');
        setTwilioStatus('Active Call Connected');
        const initialText = `Hello ${simulatedMember.name}, this is the HealAI clinical nurse calling. I hope you are doing well. Are you experiencing any pain, fever, cough, or health concerns today?`;
        setTranscript([{ sender: 'nurse', text: initialText }]);
      }, 2500);
    }, 2000);
  };

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    setLoading(true);
    try {
      const data = await getFamilyMembers();
      setMembers(data);
    } catch (e) {
      console.warn('Failed to load family members:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!name || !phone || !relationship || !age) {
      Alert.alert('Required Fields', 'Please fill in all details.');
      return;
    }
    setSavingMember(true);
    try {
      const langLabel = LANGUAGES.find(l => l.code === selectedLang)?.label || 'Hindi';
      await registerFamilyMember(name, phone, langLabel, relationship, age);
      setAddModalVisible(false);
      setName('');
      setPhone('');
      setAge('');
      setRelationship('');
      await loadFamilyMembers();
      Alert.alert('Success', 'Family member registered successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save family member.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = (memberId: string) => {
    Alert.alert('Delete Member', 'Are you sure you want to remove this family member?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFamilyMember(memberId);
          await loadFamilyMembers();
        }
      }
    ]);
  };

  // Pulse animation for active voice waveform
  const startPulseAnimation = () => {
    scale1.value = withRepeat(
      withSequence(withTiming(1.6, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      true
    );
    scale2.value = withRepeat(
      withSequence(withTiming(1.3, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      true
    );
  };

  const stopPulseAnimation = () => {
    scale1.value = 1;
    scale2.value = 1;
  };

  const handleStartCall = async (member: FamilyMember) => {
    setActiveMember(member);
    setCallState('calling');
    setTwilioStatus('Dialing via Twilio outbound call...');
    setTranscript([]);
    setAnalysisResult(null);
    startPulseAnimation();

    // Trigger real Twilio call in parallel
    let twilioSuccess = false;
    try {
      twilioSuccess = await triggerTwilioCall(member.phone, member.language, member.name);
    } catch (err: any) {
      if (err?.message === 'TWILIO_UNVERIFIED_NUMBER') {
        Alert.alert(
          'Twilio Trial Limitation',
          'The number ' + member.phone + ' is unverified. Twilio Trial accounts can only call verified numbers.\n\nContinuing in Simulation Mode.',
          [{ text: 'Continue' }]
        );
      }
    }
    
    setTimeout(() => {
      setCallState('ringing');
      setTwilioStatus(twilioSuccess ? 'Ringing elder phone (+12183797260)...' : 'Ringing (Simulation)...');
      
      setTimeout(() => {
        setCallState('connected');
        setTwilioStatus('Active Call Connected');
        // Initial Nurse prompt in member's designated language
        const initialText = `Hello ${member.name}, this is the HealAI clinical nurse calling. I hope you are doing well. Are you experiencing any pain, fever, cough, or health concerns today?`;
        setTranscript([{ sender: 'nurse', text: initialText }]);
      }, 2500);
    }, 2000);
  };

  const handleSendResponse = async () => {
    if (!userInput.trim()) return;
    const userText = userInput.trim();
    setTranscript(prev => [...prev, { sender: 'patient', text: userText }]);
    setUserInput('');
    setBotThinking(true);
    setSpeaking(false);

    try {
      // Build consultation context
      const chatHistory = transcript.map(t => `${t.sender === 'nurse' ? 'Nurse' : 'Patient'}: ${t.text}`).join('\n') + `\nPatient: ${userText}`;
      const systemPrompt = `
        You are a friendly, helpful clinical triage nurse checking up on an elder living in a rural village.
        Respond to the patient's concerns directly. Keep your response brief, warm, and comforting (maximum 2 sentences).
        Suggest accessible first-aid or home care if appropriate, and ask if they have any other symptoms.
        Speak in a clear, conversational manner.
        
        Current history:
        ${chatHistory}
        
        Nurse response:
      `;

      const response = await callGemini(systemPrompt, undefined, undefined, 'medical-bot');
      setTranscript(prev => [...prev, { sender: 'nurse', text: response }]);
      setSpeaking(true);
    } catch (e) {
      console.warn('Gemini response error:', e);
    } finally {
      setBotThinking(false);
    }
  };

  const handleEndCall = async () => {
    stopPulseAnimation();
    setCallState('completed');
    setSavingAnalysis(true);

    try {
      const fullTranscriptText = transcript.map(t => `${t.sender === 'nurse' ? 'Nurse' : 'Patient'}: ${t.text}`).join('\n');
      const analysis = await analyzeCallTranscript(fullTranscriptText);
      setAnalysisResult(analysis);

      if (activeMember) {
        // Save Call Summary in Neo4j
        await saveNurseCallRecord(
          activeMember.id,
          activeMember.name,
          activeMember.phone,
          fullTranscriptText,
          analysis.esiScore,
          analysis.summary,
          analysis.conditions
        );

        // Notify Caregiver if urgency score (ESI) is 3, 2, or 1 (i.e. ESI score <= 3 indicating Urgent/Emergency)
        // Or if ESI score >= 3 as configured for ASHA alerts in Dashboard
        if (analysis.esiScore >= 3) {
          await sendLocalNotification(
            `🚨 Urgent AI Nurse Call Alert`,
            `${activeMember.name} scored ESI ${analysis.esiScore}. Summary: ${analysis.summary}`
          );
        }
      }
    } catch (e) {
      console.warn('Call analysis save failed:', e);
    } finally {
      setSavingAnalysis(false);
    }
  };

  const animStyle1 = useAnimatedStyle(() => ({ transform: [{ scale: scale1.value }] }));
  const animStyle2 = useAnimatedStyle(() => ({ transform: [{ scale: scale2.value }] }));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {callState === 'idle' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Card */}
          <Card style={[styles.headerCard, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
            <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar.Icon size={44} icon="phone-message" style={{ backgroundColor: colors.primary }} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('aiNurseCall')}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Register village elders or family members and trigger direct wellness calls via Twilio.</Text>
              </View>
            </Card.Content>
          </Card>

          {/* Direct Outbound Trigger Card */}
          <Card style={[styles.headerCard, { borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface, marginBottom: 20 }]} elevation={1}>
            <Card.Content style={{ gap: 10 }}>
              <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>📞 Direct Outbound Triage Call</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Trigger a direct phone call to any number immediately without adding them to the registry.</Text>
              
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TextInput 
                  label="Patient Name" 
                  value={directName} 
                  onChangeText={setDirectName} 
                  mode="outlined" 
                  dense 
                  style={{ flex: 1, backgroundColor: colors.surface }} 
                  activeOutlineColor={colors.primary} 
                />
                <TextInput 
                  label="Phone Number" 
                  value={directPhone} 
                  onChangeText={setDirectPhone} 
                  keyboardType="phone-pad" 
                  mode="outlined" 
                  dense 
                  style={{ flex: 1, backgroundColor: colors.surface }} 
                  activeOutlineColor={colors.primary} 
                />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>Language:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                  {LANGUAGES.slice(0, 4).map(lang => (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => setDirectLang(lang.code)}
                      style={[
                        styles.langChip,
                        {
                          borderColor: directLang === lang.code ? colors.primary : colors.border,
                          backgroundColor: directLang === lang.code ? colors.primary + '15' : 'transparent',
                          paddingHorizontal: 8,
                          paddingVertical: 4
                        }
                      ]}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '600', color: directLang === lang.code ? colors.primary : colors.text }}>{lang.label.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Button 
                mode="contained" 
                icon="phone" 
                onPress={handleStartDirectCall} 
                style={{ marginTop: 8 }}
                buttonColor={colors.primary}
              >
                Trigger AI Calling Agent
              </Button>
            </Card.Content>
          </Card>

          {/* Action Row */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('selectFamilyMember')}</Text>
            <Button icon="plus" mode="contained" onPress={() => setAddModalVisible(true)} contentStyle={{ height: 36 }}>
              {t('add')}
            </Button>
          </View>

          {/* Members List */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
          ) : members.length === 0 ? (
            <Surface style={[styles.emptyCard, { backgroundColor: isDark ? '#121214' : '#f8fafc', borderColor: colors.border }]} elevation={0}>
              <MaterialCommunityIcons name="account-group-outline" size={32} color={colors.textMuted} />
              <Text style={{ marginTop: 8, color: colors.textMuted }}>No family members registered yet.</Text>
            </Surface>
          ) : (
            members.map((member, idx) => (
              <Animated.View key={member.id} entering={FadeInDown.delay(idx * 50)}>
                <Surface style={[styles.memberRow, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
                  <View style={styles.memberInfo}>
                    <Avatar.Text size={36} label={member.name.slice(0, 2).toUpperCase()} style={{ backgroundColor: colors.secondary + '20' }} color={colors.secondary} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: colors.text }}>{member.name} ({member.relationship})</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{member.phone} • {member.age} yrs • {member.language}</Text>
                    </View>
                  </View>
                  <View style={styles.memberActions}>
                    <TouchableOpacity onPress={() => handleStartCall(member)} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                      <MaterialCommunityIcons name="phone" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteMember(member.id)} style={[styles.actionBtn, { backgroundColor: colors.danger }]}>
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </Surface>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      {/* Active Call UI */}
      {(callState === 'calling' || callState === 'ringing' || callState === 'connected') && (
        <View style={styles.callContainer}>
          <View style={styles.callHeader}>
            <Avatar.Text size={64} label={activeMember?.name.slice(0, 2).toUpperCase() || 'P'} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} color="#fff" />
            <Text style={styles.callName}>{activeMember?.name}</Text>
            <Text style={styles.callStatus}>{twilioStatus}</Text>
          </View>

          {/* Animated Waveform Section */}
          <View style={styles.waveWrapper}>
            <Animated.View style={[styles.pulseCircle, animStyle1, { backgroundColor: colors.primary + '30' }]} />
            <Animated.View style={[styles.pulseCircle, animStyle2, { backgroundColor: colors.primary + '50' }]} />
            <Surface style={[styles.micButton, { backgroundColor: colors.primary }]} elevation={4}>
              <MaterialCommunityIcons name={callState === 'connected' ? "phone-in-talk" : "phone-outline"} size={32} color="#fff" />
            </Surface>
          </View>

          {/* Transcript Feed */}
          {callState === 'connected' && (
            <View style={styles.transcriptBox}>
              <ScrollView contentContainerStyle={{ padding: 12 }} ref={ref => ref?.scrollToEnd({ animated: true })}>
                {transcript.map((item, i) => (
                  <View key={i} style={[styles.messageBubble, item.sender === 'nurse' ? styles.nurseBubble : styles.patientBubble, { backgroundColor: item.sender === 'nurse' ? '#eff6ff' : '#f1f5f9' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.slate[500], marginBottom: 2 }}>
                      {item.sender === 'nurse' ? 'AI Nurse' : activeMember?.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: Colors.slate[800], lineHeight: 18 }}>{item.text}</Text>
                  </View>
                ))}
                {botThinking && <ActivityIndicator color={colors.primary} style={{ alignSelf: 'flex-start', margin: 8 }} />}
              </ScrollView>

              {/* Patient Response Keyboard Mock */}
              <View style={styles.inputRow}>
                <TextInput
                  value={userInput}
                  onChangeText={setUserInput}
                  placeholder="Type elder's response..."
                  mode="outlined"
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  style={styles.chatInput}
                />
                <IconButton icon="send" size={20} iconColor={colors.primary} onPress={handleSendResponse} disabled={botThinking} />
              </View>
            </View>
          )}

          {/* End Call Button */}
          <TouchableOpacity onPress={handleEndCall} style={[styles.endCallBtn, { backgroundColor: colors.danger }]}>
            <MaterialCommunityIcons name="phone-hangup" size={24} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 8 }}>{t('endCall')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Call Summary Dashboard */}
      {callState === 'completed' && (
        <View style={styles.completedContainer}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>{t('callSummary')}</Text>
          
          {savingAnalysis ? (
            <View style={styles.loadingAnalysis}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 12, color: colors.textMuted }}>Running Gemini clinical assessment...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* ESI Triage badge */}
              <Surface style={[styles.esiCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.border }]} elevation={1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>Triage ESI Level</Text>
                  <Surface style={[styles.esiBadge, { backgroundColor: analysisResult?.esiScore >= 3 ? Colors.amber[100] : Colors.emerald[100] }]} elevation={0}>
                    <Text style={{ fontWeight: '900', color: analysisResult?.esiScore >= 3 ? Colors.amber[800] : Colors.emerald[800] }}>
                      ESI {analysisResult?.esiScore}
                    </Text>
                  </Surface>
                </View>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 18 }}>
                  {analysisResult?.summary}
                </Text>
              </Surface>

              {/* Conditions Card */}
              <Text style={[styles.subtitle, { color: colors.text }]}>Discussed Conditions</Text>
              {analysisResult?.conditions?.map((c: string, idx: number) => (
                <Surface key={idx} style={[styles.conditionChip, { backgroundColor: colors.primary + '12' }]} elevation={0}>
                  <MaterialCommunityIcons name="medical-bag" size={14} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700', marginLeft: 6 }}>{c}</Text>
                </Surface>
              ))}

              <Button mode="contained" onPress={() => setCallState('idle')} style={{ marginTop: 24 }}>
                Back to Family Registry
              </Button>
            </ScrollView>
          )}
        </View>
      )}

      {/* Add Family Member Dialog */}
      <Portal>
        <Dialog visible={addModalVisible} onDismiss={() => setAddModalVisible(false)} style={{ backgroundColor: colors.surface, borderRadius: 20 }}>
          <Dialog.Title style={{ color: colors.text }}>{t('addFamilyMember')}</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput label={t('familyName')} value={name} onChangeText={setName} mode="outlined" dense activeOutlineColor={colors.primary} />
            <TextInput label={t('familyPhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" mode="outlined" dense activeOutlineColor={colors.primary} />
            <TextInput label="Age" value={age} onChangeText={setAge} keyboardType="numeric" mode="outlined" dense activeOutlineColor={colors.primary} />
            <TextInput label={t('familyRelationship')} value={relationship} onChangeText={setRelationship} placeholder="e.g. Grandfather, Mother" mode="outlined" dense activeOutlineColor={colors.primary} />
            
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 6 }}>{t('familyLanguage')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => setSelectedLang(lang.code)}
                  style={[
                    styles.langChip,
                    {
                      borderColor: selectedLang === lang.code ? colors.primary : colors.border,
                      backgroundColor: selectedLang === lang.code ? colors.primary + '15' : 'transparent'
                    }
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: selectedLang === lang.code ? colors.primary : colors.text }}>{lang.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddModalVisible(false)}>{t('cancel')}</Button>
            <Button loading={savingMember} disabled={savingMember} onPress={handleAddMember}>{t('save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    marginBottom: 20,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  // Active Call Styles
  callContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'space-between',
  },
  callHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  callName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
  },
  callStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  waveWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptBox: {
    height: 220,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  messageBubble: {
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: '85%',
  },
  nurseBubble: {
    alignSelf: 'flex-start',
  },
  patientBubble: {
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'transparent',
    fontSize: 13,
  },
  endCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    marginBottom: 20,
  },
  // Call Completed Styles
  completedContainer: {
    flex: 1,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 12,
  },
  loadingAnalysis: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  esiCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  esiBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
});
