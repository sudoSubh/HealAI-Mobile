import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHealTheme } from '../theme';
import { AnalysisData, AnalysisResponse } from '../services/symptomCheckerService';

// UI Primitives
import { AppText } from '../components/ui/AppText';
import { GradientButton } from '../components/ui/GradientButton';
import { GlassCard } from '../components/ui/GlassCard';
import { StateView } from '../components/ui/StateView';

const PROB_TO_PCT: Record<string, number> = { High: 78, Moderate: 45, Low: 20 };

export default function DiagnosisResultScreen() {
  const router = useRouter();
  const { isDark, colors, spacing, radii } = useHealTheme();

  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisResponse, setAnalysisResponse] = useState<AnalysisResponse | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const stored = await AsyncStorage.getItem('latest_analysis');
        if (stored) {
          const parsed = JSON.parse(stored);
          setAnalysisData(parsed.data);
          setAnalysisResponse(parsed.result);
        }
      } catch (err) {
        console.error('[DiagnosisResult] Load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <StateView state="loading" loadingLabel="Formatting assessment results…" />
      </View>
    );
  }

  if (!analysisResponse || !analysisData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <StateView 
          state="empty" 
          emptyTitle="No Session Found" 
          emptyMessage="You don't have an active symptoms analysis check."
          emptyCtaLabel="Back to symptoms checker"
          onEmptyCta={() => router.replace('/symptoms')}
        />
      </View>
    );
  }

  const conditions = analysisResponse.conditions ?? [];
  const topCondition = conditions[0];
  const rest = conditions.slice(1);
  const symptomCount = analysisData.symptoms?.length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ marginBottom: 20 }}>
          <AppText variant="headline" style={{ fontWeight: '900' }}>
            Your Analysis
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
            Based on {symptomCount} symptom{symptomCount !== 1 ? 's' : ''}
          </AppText>
        </Animated.View>

        {/* Info Disclaimer Banner */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(500)}
          style={[
            styles.infoBanner,
            {
              backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : '#eef2ff',
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={colors.primary}
          />
          <AppText variant="caption" color={colors.textMuted} style={{ flex: 1, marginLeft: 8, lineHeight: 18 }}>
            This analysis is based on your self-reported symptoms and is not a medical diagnosis.
          </AppText>
        </Animated.View>

        {/* Top Condition - Featured GlassCard */}
        {topCondition && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ marginBottom: 24 }}>
            <GlassCard padded={false} style={{ borderColor: colors.border }}>
              <View style={{ padding: 20 }}>
                <View style={styles.featuredHeader}>
                  <View style={[styles.featuredBadge, { backgroundColor: colors.primary }]}>
                    <AppText variant="micro" color="#fff" style={{ fontWeight: '800' }}>MOST LIKELY</AppText>
                  </View>
                </View>

                <AppText variant="title" style={{ fontWeight: '800', marginTop: 4 }}>
                  {topCondition.condition}
                </AppText>
                <AppText variant="body" color={colors.textMuted} style={{ marginTop: 6, lineHeight: 22 }}>
                  {topCondition.description}
                </AppText>

                {/* Confidence meter */}
                <View style={styles.progressSection}>
                  <View style={styles.progressLabelRow}>
                    <AppText variant="caption" color={colors.textMuted} style={{ fontWeight: '600' }}>
                      Clinical confidence
                    </AppText>
                    <AppText variant="body" color={colors.primary} style={{ fontWeight: '800' }}>
                      {PROB_TO_PCT[topCondition.probability] ?? 45}%
                    </AppText>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff' }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { 
                          width: `${PROB_TO_PCT[topCondition.probability] ?? 45}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                {topCondition.reasoning && topCondition.reasoning.length > 0 && (
                  <View style={[styles.reasoningBox, { borderTopColor: colors.border }]}>
                    <AppText variant="caption" color={colors.textMuted} style={{ fontWeight: '800', marginBottom: 10 }}>
                      Why this matches
                    </AppText>
                    {topCondition.reasoning.map((r, ri) => (
                      <View key={ri} style={styles.bulletRow}>
                        <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                        <AppText variant="caption" color={colors.textMuted} style={{ flex: 1, marginLeft: 8 }}>
                          {r}
                        </AppText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Remaining Possibilities */}
        {rest.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <AppText variant="caption" color={colors.textMuted} style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
              Other possibilities
            </AppText>
            {rest.map((c, index) => {
              const pct = PROB_TO_PCT[c.probability] ?? 20;
              return (
                <View key={index} style={{ marginBottom: 12 }}>
                  <GlassCard padded={false} style={{ borderColor: colors.border }}>
                    <View style={{ padding: 14 }}>
                      <View style={styles.compactTop}>
                        <AppText variant="body" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>
                          {c.condition}
                        </AppText>
                        <AppText variant="caption" color={colors.textMuted} style={{ fontWeight: '800' }}>
                          {pct}%
                        </AppText>
                      </View>
                      <View style={[styles.compactTrack, { backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff', marginTop: 10 }]}>
                        <View style={[styles.compactFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                      </View>
                    </View>
                  </GlassCard>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* AI Confidence disclaimer note */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.aiNote}>
          <MaterialCommunityIcons
            name="robot-outline"
            size={14}
            color={colors.textMuted}
          />
          <AppText variant="micro" color={colors.textMuted} style={{ marginLeft: 6 }}>
            Confidence levels are AI-estimated and may vary.
          </AppText>
        </Animated.View>
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <GradientButton
          label="Check Urgency Level"
          onPress={() => router.push('/priority')}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  featuredHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  featuredBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressSection: {
    marginTop: 18,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  reasoningBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
    paddingTop: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactFill: {
    height: 4,
    borderRadius: 2,
  },
  aiNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 0.5,
  },
});
