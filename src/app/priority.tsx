import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ESI_ACTION_TEXT, useHealTheme } from '../theme';
import { AnalysisData, AnalysisResponse } from '../services/symptomCheckerService';
import { motion } from '../theme/motion';

// UI Primitives
import { AppText } from '../components/ui/AppText';
import { GradientButton } from '../components/ui/GradientButton';
import { EsiBadge } from '../components/ui/EsiBadge';
import { StateView } from '../components/ui/StateView';

type ESILevel = 1 | 2 | 3 | 4 | 5;

export default function PriorityScreen() {
  const { isDark, colors, spacing, esi } = useHealTheme();

  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisResponse, setAnalysisResponse] = useState<AnalysisResponse | null>(null);

  // Badge scale animation
  const badgeScale = useSharedValue(0.3);
  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

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
        console.error('[Priority] Load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Run entrance animation + haptics after data loads
  useEffect(() => {
    if (!analysisResponse) return;

    const esiRaw = (analysisResponse as any).esiScore;
    const level: ESILevel = esiRaw >= 1 && esiRaw <= 5 ? (esiRaw as ESILevel) : 4;

    // Spring animation for badge
    badgeScale.value = withSpring(1, motion.esiSpring);

    // Haptic feedback based on severity
    if (level <= 2) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (level >= 4) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [analysisResponse]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <StateView state="loading" loadingLabel="Calibrating priority metrics…" />
      </View>
    );
  }

  if (!analysisResponse) {
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

  const esiRaw = (analysisResponse as any).esiScore;
  const level: ESILevel = esiRaw >= 1 && esiRaw <= 5 ? (esiRaw as ESILevel) : 4;
  const esiColor = esi[level];

  const redFlags: string[] = (analysisResponse as any).redFlags ?? [];
  const hasRedFlags = redFlags.length > 0;
  const showBanner = hasRedFlags && level <= 2;

  // Tinted background overlay
  const bgTint = isDark ? esiColor.bgDark : esiColor.bg;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Tinted background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bgTint, opacity: 0.15 }]} />

      <View style={styles.content}>
        {/* Safety Alert Banner */}
        {showBanner ? (
          <View style={[styles.safetyBanner, { borderColor: esiColor.primary }]}>
            <MaterialCommunityIcons name="shield-alert" size={22} color={esiColor.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={esiColor.primary} style={{ fontWeight: '800' }}>
                SAFETY ALERT
              </AppText>
              <AppText variant="micro" color={colors.textMuted} style={{ marginTop: 2, lineHeight: 15 }}>
                Critical signs detected: {redFlags.slice(0, 2).join(', ')}
                {redFlags.length > 2 ? ` (+${redFlags.length - 2} more)` : ''}.
                {'\n'}Urgency has been escalated for your safety.
              </AppText>
            </View>
          </View>
        ) : (
          <View style={{ height: 1 }} />
        )}

        {/* ESI Badge Container */}
        <View style={styles.badgeArea}>
          <Animated.View style={badgeAnimStyle}>
            <EsiBadge level={level} size="hero" />
          </Animated.View>
        </View>

        {/* Action Instruction Text */}
        <View style={styles.actionArea}>
          <AppText variant="headline" style={{ textAlign: 'center', fontWeight: '800', paddingHorizontal: 16 }}>
            {ESI_ACTION_TEXT[level]}
          </AppText>
        </View>

        {/* Footer actions */}
        <View style={styles.footer}>
          <GradientButton
            label="Generate Report"
            onPress={() => router.push('/doc-report')}
            fullWidth
          />
          <Button
            mode="text"
            onPress={() => router.dismissAll()}
            style={{ marginTop: 10 }}
            textColor={colors.primary}
            labelStyle={{ fontWeight: '700' }}
          >
            Go back to Home
          </Button>
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    width: '100%',
  },
  badgeArea: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionArea: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  footer: {
    width: '100%',
    paddingBottom: 16,
  },
});
