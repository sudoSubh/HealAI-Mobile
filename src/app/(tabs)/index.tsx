import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Dimensions,
  Linking,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { Text, Card, Button, Surface, Chip, FAB, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { Colors } from '../../theme';
import { generateDailyInsight, DailyInsight } from '../../services/dailyInsightsService';
import { useTranslation } from '../../localization';

const { width } = Dimensions.get('window');

const TYPEWRITER_WORDS = [
  'Symptom Checker',
  '24/7 Medical Chatbot',
  'Nearby Clinics',
  'Health Education',
  'Health Hub',
];

const FEATURES = [
  { icon: 'stethoscope', title: 'Symptoms', description: 'AI-powered symptom analysis', route: '/symptoms', color: Colors.teal[600] },
  { icon: 'robot', title: 'AI Chatbot', description: '24/7 medical guidance', route: '/chat', color: Colors.emerald[600] },
  { icon: 'file-document', title: 'Reports', description: 'Upload & analyze reports', route: '/reports', color: Colors.blue[600] },
  { icon: 'map-marker', title: 'Find Clinics', description: 'Locate nearby hospitals', route: '/resources', color: Colors.violet[600] },
  { icon: 'book-open-variant', title: 'Education', description: 'Health articles & videos', route: '/education', color: Colors.amber[600] },
  { icon: 'shield-check', title: 'Emergency', description: 'One-tap emergency call', route: 'emergency', color: Colors.rose[600] },
];

const STATS = [
  { value: '10M+', label: 'Consultations', icon: 'chart-line' },
  { value: '150+', label: 'Conditions', icon: 'stethoscope' },
  { value: '24/7', label: 'Available', icon: 'clock' },
  { value: '98%', label: 'Satisfaction', icon: 'star' },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [typewriterText, setTypewriterText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pulseValue = useSharedValue(1);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  // Typewriter effect
  useEffect(() => {
    const word = TYPEWRITER_WORDS[wordIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < word.length) {
          setTypewriterText(word.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (charIndex > 0) {
          setTypewriterText(word.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % TYPEWRITER_WORDS.length);
        }
      }
    }, isDeleting ? 40 : 80);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, wordIndex]);

  // Load daily insight
  const loadInsight = useCallback(async (forceNew = false) => {
    setInsightLoading(true);
    try {
      const data = await generateDailyInsight(forceNew);
      setInsight(data);
    } catch (e) {
      console.error('Insight error:', e);
    } finally {
      setInsightLoading(false);
    }
  }, []);

  useEffect(() => { loadInsight(); }, [loadInsight]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInsight(true);
    setRefreshing(false);
  };

  const handleFeaturePress = (route: string) => {
    if (route === 'emergency') {
      Linking.openURL('tel:112');
    } else {
      router.push(route as any);
    }
  };

  const categoryColors: Record<string, { bg: string; text: string }> = {
    Nutrition: { bg: isDark ? '#064e3b' : '#d1fae5', text: isDark ? '#6ee7b7' : '#065f46' },
    Exercise: { bg: isDark ? '#1e3a8a' : '#dbeafe', text: isDark ? '#93c5fd' : '#1e40af' },
    'Mental Health': { bg: isDark ? '#4c1d95' : '#ede9fe', text: isDark ? '#c4b5fd' : '#5b21b6' },
    Sleep: { bg: isDark ? '#312e81' : '#e0e7ff', text: isDark ? '#a5b4fc' : '#3730a3' },
    Prevention: { bg: isDark ? '#78350f' : '#fef3c7', text: isDark ? '#fcd34d' : '#92400e' },
    'General Health': { bg: isDark ? '#134e4a' : '#ccfbf1', text: isDark ? '#5eead4' : '#115e59' },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal[500]} />}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="heart-pulse" size={20} color="#fff" />
            </View>
            <View>
              <Text style={[styles.logoText, { color: isDark ? '#fff' : Colors.slate[800] }]}>
                Heal<Text style={{ color: Colors.teal[600] }}>AI</Text>
              </Text>
              <Text style={[styles.logoSub, { color: isDark ? Colors.slate[500] : Colors.slate[400] }]}>
                Health Intelligence
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Hero Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(700)} style={styles.heroSection}>
          <View style={[styles.bannerContainer, { borderColor: isDark ? '#27272a' : '#e4e4e7' }]}>
            <Image
              source={require('../../../assets/images/healthcare_banner.png')}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>

          <Chip
            mode="flat"
            style={[styles.trustChip, { backgroundColor: isDark ? 'rgba(13,148,136,0.15)' : Colors.teal[50] }]}
            textStyle={{ color: Colors.teal[700], fontSize: 11, fontWeight: '600' }}
            icon={() => <View style={styles.chipDot} />}
          >
            Trusted by healthcare professionals
          </Chip>

          <Text style={[styles.heroTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>
            {t('welcome')}
          </Text>

          <View style={styles.typewriterContainer}>
            <Text style={[styles.typewriterText, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>
              {typewriterText}
              <Text style={{ color: Colors.teal[500] }}>|</Text>
            </Text>
          </View>

          <Text style={[styles.heroSubtitle, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>
            {t('subWelcome')}
          </Text>

          <View style={styles.heroCTAs}>
            <Button
              mode="contained"
              onPress={() => router.push('/symptoms')}
              style={styles.primaryBtn}
              labelStyle={styles.primaryBtnLabel}
              contentStyle={{ paddingVertical: 6 }}
              icon="arrow-right"
            >
              {t('checkSymptomsBtn')}
            </Button>
            <Button
              mode="outlined"
              onPress={() => router.push('/chat')}
              style={[styles.secondaryBtn, { borderColor: isDark ? Colors.slate[600] : Colors.slate[300] }]}
              labelStyle={[styles.secondaryBtnLabel, { color: isDark ? Colors.slate[300] : Colors.slate[700] }]}
              contentStyle={{ paddingVertical: 6 }}
            >
              {t('chatBotBtn')}
            </Button>
          </View>

          {/* Trust Badges */}
          <View style={styles.trustBadges}>
            {[
              { icon: 'shield-check', label: 'HIPAA Compliant' },
              { icon: 'clock', label: '24/7 Available' },
              { icon: 'account-group', label: '10M+ Users' },
            ].map((badge, i) => (
              <View key={i} style={styles.trustBadge}>
                <MaterialCommunityIcons name={badge.icon as any} size={13} color={isDark ? Colors.slate[500] : Colors.slate[400]} />
                <Text style={[styles.trustBadgeText, { color: isDark ? Colors.slate[500] : Colors.slate[400] }]}>
                  {badge.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Daily Insight */}
        {insight && !insightLoading && (
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.sectionPadding}>
            <Card style={[styles.insightCard, { backgroundColor: isDark ? '#18181b' : Colors.teal[50] }]} mode="contained">
              <View style={[styles.insightTopBar, { backgroundColor: Colors.teal[600] }]} />
              <Card.Content style={styles.insightContent}>
                <View style={styles.insightHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="lightbulb" size={18} color={Colors.teal[600]} />
                    <Text style={[styles.insightLabel, { color: isDark ? '#fff' : Colors.slate[800] }]}>Daily Health Insight</Text>
                  </View>
                  <Chip
                    mode="flat"
                    compact
                    style={{ backgroundColor: categoryColors[insight.category]?.bg || (isDark ? Colors.teal[900] : Colors.teal[100]) }}
                    textStyle={{ color: categoryColors[insight.category]?.text || Colors.teal[700], fontSize: 10, fontWeight: '600' }}
                  >
                    {insight.category}
                  </Chip>
                </View>
                <Text style={[styles.insightTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{insight.title}</Text>
                <Text style={[styles.insightBody, { color: isDark ? Colors.slate[300] : Colors.slate[600] }]}>{insight.content}</Text>
                {insight.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Text style={{ color: Colors.teal[500], fontWeight: '700' }}>•</Text>
                    <Text style={[styles.tipText, { color: isDark ? Colors.slate[300] : Colors.slate[600] }]}>{tip}</Text>
                  </View>
                ))}
                <Surface style={[styles.motivationBox, { backgroundColor: isDark ? '#27272a' : '#ecfdf5' }]} elevation={0}>
                  <MaterialCommunityIcons name="heart" size={14} color={Colors.teal[600]} />
                  <Text style={[styles.motivationText, { color: isDark ? Colors.teal[300] : Colors.teal[700] }]}>{insight.motivation}</Text>
                </Surface>
              </Card.Content>
            </Card>
          </Animated.View>
        )}

        {/* Stats Bar */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.statsSection}>
          <Surface style={[styles.statsBar, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={1}>
            {STATS.map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: isDark ? 'rgba(13,148,136,0.15)' : Colors.teal[50] }]}>
                  <MaterialCommunityIcons name={stat.icon as any} size={18} color={Colors.teal[600]} />
                </View>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : Colors.slate[800] }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: isDark ? Colors.slate[500] : Colors.slate[500] }]}>{stat.label}</Text>
              </View>
            ))}
          </Surface>
        </Animated.View>

        {/* Features Grid */}
        <View style={styles.sectionPadding}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>
            {t('everythingYouNeed')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>
            {t('comprehensiveTools')}
          </Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(400 + i * 80).duration(500)} style={styles.featureCardWrapper}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleFeaturePress(feature.route)}
                  style={[styles.featureCard, { backgroundColor: isDark ? '#121214' : '#fff', borderColor: isDark ? '#27272a' : Colors.slate[200] }]}
                >
                  <View style={[styles.featureIcon, { backgroundColor: feature.color + '15' }]}>
                    <MaterialCommunityIcons name={feature.icon as any} size={22} color={feature.color} />
                  </View>
                  <Text style={[styles.featureTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>
                    {t(feature.title === 'Symptoms' ? 'symptoms' : feature.title === 'AI Chatbot' ? 'chat' : feature.title === 'Reports' ? 'reports' : feature.title === 'Find Clinics' ? 'nearbyHospitalsTitle' : feature.title === 'Education' ? 'educationHub' : 'emergencyCall')}
                  </Text>
                  <Text style={[styles.featureDesc, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>
                    {t(feature.title === 'Symptoms' ? 'symptomCheckerDesc' : feature.title === 'AI Chatbot' ? 'healthChatbotDesc' : feature.title === 'Reports' ? 'healthReportsDesc' : feature.title === 'Find Clinics' ? 'nearbyHospitalsDesc' : feature.title === 'Education' ? 'educationHubDesc' : 'emergencyCallDesc')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* How It Works */}
        <View style={[styles.sectionPadding, { paddingBottom: 32 }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('howItWorks')}</Text>
          {[
            { step: '01', titleKey: 'step1Title', descKey: 'step1Desc', icon: 'clipboard-text' },
            { step: '02', titleKey: 'step2Title', descKey: 'step2Desc', icon: 'brain' },
            { step: '03', titleKey: 'step3Title', descKey: 'step3Desc', icon: 'lightning-bolt' },
          ].map((item, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(700 + i * 100).duration(500)}>
              <Surface style={[styles.stepCard, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={1}>
                <View style={[styles.stepBadge, { backgroundColor: isDark ? Colors.slate[800] : Colors.slate[900] }]}>
                  <Text style={styles.stepBadgeText}>{item.step}</Text>
                </View>
                <View style={[styles.stepIconBox, { backgroundColor: isDark ? 'rgba(13,148,136,0.15)' : Colors.teal[50] }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={24} color={Colors.teal[600]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t(item.titleKey)}</Text>
                  <Text style={[styles.stepDesc, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>{t(item.descKey)}</Text>
                </View>
              </Surface>
            </Animated.View>
          ))}
        </View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(900).duration(500)} style={styles.sectionPadding}>
          <Surface style={styles.ctaCard} elevation={2}>
            <Text style={styles.ctaTitle}>Ready to Take Control?</Text>
            <Text style={styles.ctaSubtitle}>Join millions who trust HealAI for their health journey.</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/symptoms')}
              style={styles.ctaBtn}
              labelStyle={{ fontWeight: '700', fontSize: 15 }}
              contentStyle={{ paddingVertical: 6 }}
              icon="arrow-right"
            >
              Get Started Free
            </Button>
          </Surface>
        </Animated.View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: isDark ? Colors.slate[800] : Colors.slate[200] }]}>
          <Text style={[styles.footerText, { color: isDark ? Colors.slate[500] : Colors.slate[400] }]}>
            © 2026 HealAI. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* Emergency FAB */}
      <Animated.View style={[styles.fabContainer, pulseStyle]}>
        <FAB
          icon="phone"
          color="#fff"
          style={styles.emergencyFab}
          onPress={() => Linking.openURL('tel:112')}
          label=""
          size="small"
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.teal[600], justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  logoSub: { fontSize: 9, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', marginTop: -1 },
  heroSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, alignItems: 'center' },
  bannerContainer: { width: '100%', height: 160, borderRadius: 24, overflow: 'hidden', borderWidth: 1, marginBottom: 24, backgroundColor: '#000' },
  bannerImage: { width: '100%', height: '100%' },
  trustChip: { borderRadius: 20, marginBottom: 20, borderWidth: 0.5, borderColor: Colors.teal[200] },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.teal[500] },
  heroTitle: { fontSize: 34, fontWeight: '800', textAlign: 'center', lineHeight: 42, letterSpacing: -1 },
  typewriterContainer: { height: 32, justifyContent: 'center', marginTop: 12, marginBottom: 8 },
  typewriterText: { fontSize: 17, fontWeight: '300' },
  heroSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 8 },
  heroCTAs: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  primaryBtn: { borderRadius: 28, backgroundColor: Colors.teal[600], elevation: 3 },
  primaryBtnLabel: { fontWeight: '700', fontSize: 14, color: '#fff' },
  secondaryBtn: { borderRadius: 28 },
  secondaryBtnLabel: { fontWeight: '600', fontSize: 14 },
  trustBadges: { flexDirection: 'row', gap: 16, marginTop: 4 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustBadgeText: { fontSize: 11 },
  sectionPadding: { paddingHorizontal: 20, marginBottom: 16 },
  insightCard: { borderRadius: 20, overflow: 'hidden' },
  insightTopBar: { height: 3, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  insightContent: { paddingVertical: 16 },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  insightLabel: { fontWeight: '700', fontSize: 15 },
  insightTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  insightBody: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  tipText: { fontSize: 13, flex: 1, lineHeight: 18 },
  motivationBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 12 },
  motivationText: { fontSize: 13, fontWeight: '600', flex: 1 },
  statsSection: { paddingHorizontal: 20, marginBottom: 24 },
  statsBar: { borderRadius: 20, padding: 16, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10 },
  sectionTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  sectionSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCardWrapper: { width: (width - 52) / 2 },
  featureCard: { padding: 16, borderRadius: 16, borderWidth: 0.5 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  featureDesc: { fontSize: 12, lineHeight: 16 },
  stepCard: { borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBadge: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  stepBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  stepIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  stepDesc: { fontSize: 12, lineHeight: 16 },
  ctaCard: { borderRadius: 24, padding: 32, alignItems: 'center', backgroundColor: Colors.teal[600] },
  ctaTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  ctaSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 24 },
  ctaBtn: { borderRadius: 28, backgroundColor: '#fff' },
  footer: { padding: 20, borderTopWidth: 0.5, alignItems: 'center', marginTop: 12, marginBottom: 8 },
  footerText: { fontSize: 12, fontWeight: '500' },
  footerDisclaimer: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  fabContainer: { position: 'absolute', bottom: 80, right: 20 },
  emergencyFab: { backgroundColor: Colors.rose[600], borderRadius: 28, elevation: 8 },
});
