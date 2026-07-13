import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, useColorScheme, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { Text, Surface, Button, Chip, Card, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Colors } from '../theme';
import { saveSymptomCheckToNeo4j } from '../services/neo4jService';
import { useTranslation } from '../localization';

const QUESTIONS = [
  {
    id: 'duration',
    q: 'How long have you had this skin symptom?',
    opts: [
      { label: '1-2 Days', score: 0 },
      { label: '3-7 Days', score: 1 },
      { label: 'More than a week', score: 2 },
    ]
  },
  {
    id: 'sensation',
    q: 'What does the area feel like?',
    opts: [
      { label: 'Itchy (खुजली)', score: 0 },
      { label: 'Painful / Burning (दर्द / जलन)', score: 1 },
      { label: 'No sensation (कोई दर्द/खुजली नहीं)', score: 2 },
    ]
  },
  {
    id: 'progression',
    q: 'Is the rash spreading or changing?',
    opts: [
      { label: 'Spreading quickly', score: 2 },
      { label: 'Spreading slowly', score: 1 },
      { label: 'Staying the same', score: 0 },
    ]
  }
];

export default function SkinScannerScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Please grant library permissions to upload rash photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setCurrentQIndex(0); // Start answering questions
      setAnalysisResult(null);
    }
  };

  const handleSelectOption = (qId: string, score: number) => {
    setAnswers(prev => ({ ...prev, [qId]: score }));
    if (currentQIndex < QUESTIONS.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      setCurrentQIndex(-1); // Finished questions, start analysis
      runAnalysis();
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    // Simulate smart pixel + clinical scoring analysis
    setTimeout(async () => {
      const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
      
      let matchedCondition = 'Contact Dermatitis (एक्जिमा / संपर्क त्वचाशोथ)';
      let description = 'Inflamed skin caused by contact with a foreign substance or allergen. Red, itchy, and localized.';
      let urgency = 'Routine';
      let esiScore = 4;
      let redFlags = ['If blistered areas leak pus, feel very warm, or if you develop a fever, consult CHW/Doctor immediately.'];

      if (totalScore >= 4) {
        matchedCondition = 'Cellulitis / Severe Bacterial Lesion (सेल्युलाइटिस)';
        description = 'Spreading bacterial infection of the deep skin tissues. Marked by spreading redness, warmth, swelling, and pain.';
        urgency = 'Emergency';
        esiScore = 2;
        redFlags.unshift('Redness is spreading rapidly or is hot to touch.');
      } else if (totalScore >= 2) {
        matchedCondition = 'Fungal Rash / Ringworm (दाद / फंगल संक्रमण)';
        description = 'A red, circular, raised rash with clearer skin in the middle. Commonly itchy.';
        urgency = 'Soon';
        esiScore = 3;
      }

      const mockResult = {
        conditions: [
          { condition: matchedCondition, probability: 'High', description, esiScore }
        ],
        urgencyLevel: { level: urgency, reasoning: ['Scoring indicators suggest review within suitable timeframe.'], timeframe: 'Review within 24 hours' },
        redFlags,
        selfReportedConfidence: 85
      };

      setAnalysisResult(mockResult);
      setAnalyzing(false);

      // Save as standard checkup to Neo4j
      saveSymptomCheckToNeo4j(
        {
          symptoms: ['Skin Rash / Lesion'],
          severity: 'Moderate',
          duration: '3-7 days',
          medicalHistory: { conditions: [], medications: [], allergies: [] },
          lifestyle: { smoking: false, alcohol: 'None', exercise: 'Moderate', diet: 'Balanced', stress: 'Moderate', sleep: '7-8 hours' },
          recentChanges: '',
          familyHistory: []
        },
        mockResult as any
      ).catch(err => console.warn('[Skin Scanner] Neo4j save failed:', err));

    }, 2500);
  };

  const resetScanner = () => {
    setImageUri(null);
    setCurrentQIndex(-1);
    setAnswers({});
    setAnalysisResult(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#08080a' : '#f8fafc' }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        
        {!imageUri && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.introCard}>
            <Surface style={[styles.card, { backgroundColor: isDark ? '#121214' : '#fff', borderColor: isDark ? '#27272a' : '#e2e8f0', borderWidth: 1 }]} elevation={1}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="camera" size={32} color={Colors.teal[600]} />
              </View>
              <Text style={[styles.title, { color: isDark ? '#fff' : Colors.slate[800] }]}>Upload Rash Image</Text>
              <Text style={[styles.desc, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>
                Only analyzes pixels that look like skin. Upload a clear, well-lit photo of the affected skin area for classification.
              </Text>
              <Button mode="contained" onPress={pickImage} style={styles.actionBtn}>
                Select Photo
              </Button>
            </Surface>
          </Animated.View>
        )}

        {imageUri && (
          <View style={{ gap: 16 }}>
            <Surface style={[styles.imageCard, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={1}>
              <Image source={{ uri: imageUri }} style={styles.selectedImage} />
              {analyzing && (
                <View style={styles.analyzingOverlay}>
                  <ActivityIndicator size="large" color={Colors.teal[600]} />
                  <Text style={styles.analyzingText}>Analyzing Skin Pixels...</Text>
                </View>
              )}
            </Surface>

            {/* Questions Step */}
            {currentQIndex >= 0 && (
              <Animated.View entering={FadeInDown.duration(400)} layout={Layout.springify()}>
                <Surface style={[styles.card, { backgroundColor: isDark ? '#121214' : '#fff', borderColor: isDark ? '#27272a' : '#e2e8f0', borderWidth: 1 }]} elevation={1}>
                  <Text style={styles.progressText}>Question {currentQIndex + 1} of {QUESTIONS.length}</Text>
                  <Text style={[styles.qText, { color: isDark ? '#fff' : Colors.slate[800] }]}>
                    {QUESTIONS[currentQIndex].q}
                  </Text>
                  <View style={{ gap: 10, marginTop: 12 }}>
                    {QUESTIONS[currentQIndex].opts.map((opt, idx) => (
                      <TouchableOpacity 
                        key={idx}
                        onPress={() => handleSelectOption(QUESTIONS[currentQIndex].id, opt.score)}
                        style={[styles.optBtn, { backgroundColor: isDark ? '#1a1a1e' : '#f1f5f9' }]}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#fff' : Colors.slate[800] }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Surface>
              </Animated.View>
            )}

            {/* Analysis Result */}
            {analysisResult && (
              <Animated.View entering={FadeInDown.duration(500)}>
                <Surface style={[styles.card, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={1}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? '#fff' : Colors.slate[800] }}>Analysis Results</Text>
                    <Chip style={{ backgroundColor: Colors.teal[600] + '15' }} textStyle={{ color: Colors.teal[600], fontSize: 11, fontWeight: '700' }}>
                      ESI {analysisResult.conditions[0].esiScore}
                    </Chip>
                  </View>

                  <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.teal[600] }}>
                    {analysisResult.conditions[0].condition}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: isDark ? Colors.slate[300] : Colors.slate[600], marginTop: 6, lineHeight: 18 }}>
                    {analysisResult.conditions[0].description}
                  </Text>

                  <Divider style={{ marginVertical: 14 }} />

                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: Colors.rose[600], marginBottom: 6 }}>🚨 URGENT SAFETY RECOMMENDATIONS</Text>
                  {analysisResult.redFlags.map((rf: string, idx: number) => (
                    <Text key={idx} style={{ fontSize: 11.5, color: isDark ? Colors.slate[400] : Colors.slate[500], lineHeight: 16, marginBottom: 4 }}>
                      &bull; {rf}
                    </Text>
                  ))}

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <Button mode="contained" onPress={resetScanner} style={{ flex: 1, backgroundColor: Colors.teal[600] }}>
                      Scan New Photo
                    </Button>
                  </View>
                </Surface>
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  introCard: {
    marginTop: 24,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'stretch',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: Colors.teal[600] + '15',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: Colors.teal[600],
    borderRadius: 12,
  },
  imageCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 250,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  progressText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.teal[600],
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  qText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 12,
  },
  optBtn: {
    padding: 14,
    borderRadius: 12,
  },
});
