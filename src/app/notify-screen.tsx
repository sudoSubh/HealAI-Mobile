import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Animated as RNAnimated } from 'react-native';
import { Button } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHealTheme, ESI_COLORS, ESI_NOTIFY_TARGET } from '../theme';
import { AnalysisResponse } from '../services/symptomCheckerService';
import { saveAuditLogToNeo4j } from '../services/neo4jService';

// UI Primitives
import { AppText } from '../components/ui/AppText';
import { GradientButton } from '../components/ui/GradientButton';
import { GlassCard } from '../components/ui/GlassCard';
import { PressableScale } from '../components/ui/PressableScale';
import { StateView } from '../components/ui/StateView';

type RecipientKey = 'hospital' | 'asha' | 'family';

const TARGET_TO_KEY: Record<string, RecipientKey> = {
  'hospital-building': 'hospital',
  'account-heart': 'asha',
  'account-group': 'family',
};

const RECIPIENTS: { id: RecipientKey; name: string; icon: string; description: string }[] = [
  { id: 'hospital', name: 'Hospital / Emergency', icon: 'hospital-building', description: 'Emergency dispatch & hospital care' },
  { id: 'asha', name: 'ASHA Worker / Clinic', icon: 'account-heart', description: 'Community health worker or local clinic' },
  { id: 'family', name: 'Caregiver / Family', icon: 'account-group', description: 'Family member or personal caregiver' },
];

export default function NotifyScreen() {
  const { isDark, colors, spacing } = useHealTheme();

  const [loading, setLoading] = useState(true);
  const [analysisResponse, setAnalysisResponse] = useState<AnalysisResponse | null>(null);
  const [esiScore, setEsiScore] = useState<number>(4);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientKey>('family');
  const [notified, setNotified] = useState(false);
  const [notifyTime, setNotifyTime] = useState<string>('');
  const [calling, setCalling] = useState(false);

  const [pulseAnim] = useState(new RNAnimated.Value(1));

  useEffect(() => {
    async function loadData() {
      try {
        const stored = await AsyncStorage.getItem('latest_analysis');
        if (stored) {
          const parsed = JSON.parse(stored);
          const result = parsed.result as AnalysisResponse;
          setAnalysisResponse(result);

          const esi: number = (result as any).esiScore || 4;
          setEsiScore(esi);

          const esiKey = esi as keyof typeof ESI_NOTIFY_TARGET;
          const target = ESI_NOTIFY_TARGET[esiKey] || ESI_NOTIFY_TARGET[4];
          const key = TARGET_TO_KEY[target.icon] || 'family';
          setSelectedRecipient(key);
        }
      } catch (err) {
        console.error('[NotifyScreen] Load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (calling) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, { toValue: 1.6, duration: 1000, useNativeDriver: true }),
          RNAnimated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [calling]);

  const handleSendNotification = async () => {
    const time = new Date().toLocaleTimeString();
    setNotifyTime(time);

    let checkId = 'local';
    try {
      const stored = await AsyncStorage.getItem('latest_analysis');
      if (stored) {
        const parsed = JSON.parse(stored);
        checkId = parsed.result.id || 'check_' + Date.now();
      }
    } catch {}

    await saveAuditLogToNeo4j(checkId, selectedRecipient.toUpperCase());

    const esiKey = esiScore as keyof typeof ESI_NOTIFY_TARGET;
    const target = ESI_NOTIFY_TARGET[esiKey] || ESI_NOTIFY_TARGET[4];

    if (target.autoCall && selectedRecipient === 'hospital') {
      setCalling(true);
    } else {
      setNotified(true);
    }
  };

  const finishCall = () => {
    setCalling(false);
    setNotified(true);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <StateView state="loading" loadingLabel="Preparing communications..." />
      </View>
    );
  }

  // ── Calling Screen ─────────────────────────────────────────────────────
  if (calling) {
    return (
      <View style={[styles.callingContainer, { backgroundColor: '#7f1d1d' }]}>
        <View style={styles.callingHeader}>
          <MaterialCommunityIcons name="phone-outgoing" size={28} color="#fca5a5" />
          <AppText variant="headline" color="#fff" style={{ fontWeight: '900', marginTop: 12 }}>Calling Hospital</AppText>
          <AppText variant="caption" color="#fca5a5" style={{ marginTop: 2 }}>Emergency escalation for ESI {esiScore}</AppText>
        </View>

        <View style={styles.pulseContainer}>
          <RNAnimated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="hospital-building" size={56} color="#7f1d1d" />
          </View>
        </View>

        <View style={styles.callingInfo}>
          <AppText variant="caption" color="#fca5a5" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Emergency Response Line</AppText>
          <AppText variant="display" color="#fff" style={{ fontWeight: '900', marginTop: 4 }}>+91-112</AppText>
          <AppText variant="body" color="#fca5a5" style={{ marginTop: 10, fontWeight: '600' }}>Ringing…</AppText>
        </View>

        <Button
          mode="contained"
          onPress={finishCall}
          style={styles.endCallBtn}
          labelStyle={styles.endCallLabel}
          contentStyle={{ height: 52 }}
        >
          End Call
        </Button>
      </View>
    );
  }

  // ── Receipt Screen ─────────────────────────────────────────────────────
  if (notified) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <GlassCard padded={false} style={{ width: '100%', borderColor: colors.border }}>
          <View style={{ padding: 24, alignItems: 'center' }}>
            <View style={[styles.successCircle, { backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : '#eef2ff' }]}>
              <MaterialCommunityIcons name="check-circle" size={64} color={colors.primary} />
            </View>

            <AppText variant="headline" style={{ fontWeight: '900', marginTop: 16 }}>Notification Sent</AppText>
            <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
              The intake summary has been successfully transmitted.
            </AppText>

            {/* Receipt details */}
            <View style={[styles.receiptDetails, { backgroundColor: isDark ? 'rgba(99,102,241,0.05)' : '#f8f9ff', width: '100%', marginTop: 20 }]}>
              <View style={styles.receiptRow}>
                <AppText variant="caption" color={colors.textMuted}>Recipient</AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {RECIPIENTS.find(r => r.id === selectedRecipient)?.name || selectedRecipient}
                </AppText>
              </View>
              <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />
              <View style={styles.receiptRow}>
                <AppText variant="caption" color={colors.textMuted}>Timestamp</AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>{notifyTime}</AppText>
              </View>
              <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />
              <View style={styles.receiptRow}>
                <AppText variant="caption" color={colors.textMuted}>Status</AppText>
                <AppText variant="body" color={colors.primary} style={{ fontWeight: '700' }}>Delivered & Logged</AppText>
              </View>
            </View>

            <View style={{ width: '100%', marginTop: 24 }}>
              <GradientButton
                label="Back to Home"
                onPress={() => router.dismissAll()}
                fullWidth
              />
            </View>
          </View>
        </GlassCard>
      </View>
    );
  }

  // ── Main Selection Screen ──────────────────────────────────────────────
  const esiKey = esiScore as keyof typeof ESI_COLORS;
  const recommendedRecipient = RECIPIENTS.find(r => {
    const target = ESI_NOTIFY_TARGET[esiKey];
    return target && r.icon === target.icon;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <AppText variant="headline" style={{ fontWeight: '900' }}>Notify About This Case</AppText>
        <AppText variant="body" color={colors.textMuted} style={{ marginTop: 2, marginBottom: 20 }}>
          Based on ESI {esiScore}, we recommend:
        </AppText>

        {/* Recommended recipient card */}
        {recommendedRecipient && (
          <View style={{ marginBottom: 20 }}>
            <PressableScale onPress={() => setSelectedRecipient(recommendedRecipient.id)}>
              <GlassCard padded={false} style={{ borderColor: selectedRecipient === recommendedRecipient.id ? colors.primary : colors.border }}>
                <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={[styles.recommendedIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : '#eef2ff' }]}>
                    <MaterialCommunityIcons
                      name={recommendedRecipient.icon as any}
                      size={28}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="micro" color={colors.primary} style={{ fontWeight: '800' }}>RECOMMENDED</AppText>
                    <AppText variant="body" style={{ fontWeight: '800', marginTop: 2 }}>
                      {recommendedRecipient.name}
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                      {recommendedRecipient.description}
                    </AppText>
                  </View>
                  {selectedRecipient === recommendedRecipient.id && (
                    <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
                  )}
                </View>
              </GlassCard>
            </PressableScale>
          </View>
        )}

        {/* Override options */}
        <AppText variant="caption" color={colors.textMuted} style={{ fontWeight: '800', marginBottom: 12 }}>Or choose another recipient:</AppText>
        <View style={{ gap: 10 }}>
          {RECIPIENTS.filter(r => r.id !== (recommendedRecipient?.id || 'family')).map(r => {
            const isSelected = selectedRecipient === r.id;
            return (
              <PressableScale key={r.id} onPress={() => setSelectedRecipient(r.id)}>
                <GlassCard padded={false} style={{ borderColor: isSelected ? colors.primary : colors.border }}>
                  <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <MaterialCommunityIcons
                      name={r.icon as any}
                      size={22}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" style={{ fontWeight: '700' }}>{r.name}</AppText>
                      <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 1 }}>{r.description}</AppText>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                    )}
                  </View>
                </GlassCard>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={{ paddingBottom: 16 }}>
        <GradientButton
          label="Confirm & Notify"
          onPress={handleSendNotification}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  content: {
    marginTop: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Calling Screen ─────────────────────────────────────────────────────
  callingContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callingHeader: {
    alignItems: 'center',
    marginTop: 40,
  },
  pulseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 200,
    height: 200,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(252, 165, 165, 0.2)',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  callingInfo: {
    alignItems: 'center',
  },
  endCallBtn: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#ef4444',
    marginBottom: 20,
  },
  endCallLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },

  // ── Receipt Screen ─────────────────────────────────────────────────────
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptDetails: {
    borderRadius: 16,
    padding: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptDivider: {
    height: 1,
    marginVertical: 12,
  },

  // ── Main Selection Screen ──────────────────────────────────────────────
  recommendedIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
