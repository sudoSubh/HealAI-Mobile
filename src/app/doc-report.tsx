import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useHealTheme, ESI_COLORS } from '../theme';
import { AnalysisData, AnalysisResponse } from '../services/symptomCheckerService';

// UI Primitives
import { AppText } from '../components/ui/AppText';
import { GradientButton } from '../components/ui/GradientButton';
import { GlassCard } from '../components/ui/GlassCard';
import { StateView } from '../components/ui/StateView';

type ESILevel = 1 | 2 | 3 | 4 | 5;

export default function DocReportScreen() {
  const { isDark, colors, spacing } = useHealTheme();

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
        console.error('[DocReport] Load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleExportPDF = async () => {
    if (!analysisData || !analysisResponse) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>HealAI Health Report</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; background-color: #ffffff; }
          .header { border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: 0.5px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .val { font-size: 14px; font-weight: 700; color: #0f172a; }
          .section { margin-bottom: 22px; }
          .section-title { font-size: 13px; font-weight: bold; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; letter-spacing: 0.5px; }
          .symptom-tag { display: inline-block; background: #eef2ff; color: #4338ca; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 600; margin-right: 6px; margin-bottom: 6px; }
          .esi-pill { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; color: #ffffff; }
          .esi-1 { background-color: #991b1b; }
          .esi-2 { background-color: #ea580c; }
          .esi-3 { background-color: #d97706; }
          .esi-4 { background-color: #65a30d; }
          .esi-5 { background-color: #16a34a; }
          .condition-row { border-left: 3px solid #6366f1; padding-left: 10px; margin-bottom: 12px; }
          .condition-name { font-size: 14px; font-weight: bold; color: #0f172a; }
          .condition-prob { font-size: 11px; font-weight: 700; color: #6366f1; margin-top: 1px; }
          .condition-desc { font-size: 12px; color: #475569; margin-top: 2px; }
          .red-flag { background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px; padding: 8px 12px; color: #991b1b; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
          .footer { font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">HealAI Health Report</div>
          <div class="subtitle">Clinical Intake Summary</div>
        </div>

        <div class="grid">
          <div class="meta-box">
            <div class="label">Patient Information</div>
            <div class="val">
              <strong>Name:</strong> ${analysisData.patientName || 'Anonymous Patient'}
              <br/>
              <strong>Location:</strong> ${analysisData.patientAddress || 'Not Provided'}
            </div>
          </div>
          <div class="meta-box">
            <div class="label">Demographics & Priority</div>
            <div class="val">
              Age: ${analysisData.age || 'N/A'} &middot; Gender: ${analysisData.gender || 'N/A'}
              <br/>
              <span class="esi-pill esi-${(analysisResponse as any).esiScore || 4}" style="margin-top: 4px; display: inline-block;">
                ESI ${(analysisResponse as any).esiScore || 4} &middot; ${analysisResponse.urgencyLevel?.level || 'Routine'}
              </span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Reported Symptoms</div>
          <div>
            ${(analysisData.symptoms || []).map(s => `<span class="symptom-tag">${s}</span>`).join('')}
          </div>
        </div>

        ${(analysisResponse as any).redFlags && (analysisResponse as any).redFlags.length > 0 ? `
          <div class="section">
            <div class="section-title" style="color: #dc2626;">Red Flags / Warning Signs</div>
            ${(analysisResponse as any).redFlags.map((rf: string) => `<div class="red-flag">${rf}</div>`).join('')}
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Clinical Risk Assessment</div>
          ${(analysisResponse.conditions || []).map(c => `
            <div class="condition-row">
              <div class="condition-name">${c.condition}</div>
              <div class="condition-prob">${c.probability} Probability</div>
              <div class="condition-desc">${c.description}</div>
            </div>
          `).join('')}
        </div>

        <div class="section">
          <div class="section-title">Recommended Action Plan</div>
          <div style="font-size: 13px; line-height: 1.6;">
            ${analysisResponse.urgencyLevel?.reasoning?.join(' ') || 'Monitor symptoms and follow standard care guidelines.'}
          </div>
        </div>

        <div class="footer">
          This report was generated using HealAI clinical protocols.
          Always consult a licensed doctor for professional care.
        </div>
      </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Download HealAI Health Report' });
      }
    } catch (e) {
      console.error('Failed to export PDF:', e);
      Alert.alert('Export Failed', 'Could not generate or download report PDF.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <StateView state="loading" loadingLabel="Compiling health report…" />
      </View>
    );
  }

  if (!analysisResponse || !analysisData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <StateView 
          state="empty" 
          emptyTitle="No Report Found" 
          emptyMessage="Complete a symptom check to generate a health report."
          emptyCtaLabel="Back to symptoms checker"
          onEmptyCta={() => router.replace('/symptoms')}
        />
      </View>
    );
  }

  const esiScore = (analysisResponse as any).esiScore ?? 4;
  const level: ESILevel = esiScore >= 1 && esiScore <= 5 ? (esiScore as ESILevel) : 4;
  const esi = ESI_COLORS[level];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Document Card */}
        <GlassCard padded={false} style={{ borderColor: colors.border }}>
          <View style={{ padding: 20 }}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <AppText variant="headline" style={{ fontWeight: '900' }}>Health Report</AppText>
                <AppText variant="micro" color={colors.textMuted} style={{ marginTop: 2 }}>CLINICAL INTAKE SUMMARY</AppText>
              </View>
              <View style={[styles.esiPill, { backgroundColor: isDark ? esi.bgDark : esi.bg }]}>
                <AppText variant="micro" color={esi.text} style={{ fontWeight: '800' }}>
                  ESI {level}
                </AppText>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Patient Meta Grid */}
            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <AppText variant="mono" color={colors.textMuted} style={{ marginBottom: 4 }}>PATIENT INFORMATION</AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {analysisData.patientName || 'Anonymous Patient'}
                </AppText>
                {analysisData.patientAddress && (
                  <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                    {analysisData.patientAddress}
                  </AppText>
                )}
              </View>
              <View style={styles.metaCol}>
                <AppText variant="mono" color={colors.textMuted} style={{ marginBottom: 4 }}>DEMOGRAPHICS</AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  Age: {analysisData.age || 'N/A'}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                  Gender: {analysisData.gender || 'N/A'}
                </AppText>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Symptoms detail */}
            <View style={styles.section}>
              <AppText variant="mono" color={colors.textMuted} style={{ marginBottom: 6 }}>SYMPTOMS</AppText>
              <AppText variant="body" style={{ fontWeight: '700' }}>
                Duration: {analysisData.duration} · Severity: {analysisData.severity}
              </AppText>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Red Flags */}
            {(analysisResponse as any).redFlags && (analysisResponse as any).redFlags.length > 0 && (
              <>
                <View style={styles.section}>
                  <AppText variant="mono" color={colors.danger} style={{ marginBottom: 8, fontWeight: '800' }}>CRITICAL WARNINGS</AppText>
                  {(analysisResponse as any).redFlags.map((rf: string, idx: number) => (
                    <View
                      key={idx}
                      style={[
                        styles.redFlagRow,
                        { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2' },
                      ]}
                    >
                      <View style={styles.redFlagAccent} />
                      <AppText variant="caption" color={colors.danger} style={styles.redFlagText}>
                        {rf}
                      </AppText>
                    </View>
                  ))}
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </>
            )}

            {/* Risk Assessment / Differentials */}
            <View style={styles.section}>
              <AppText variant="mono" color={colors.textMuted} style={{ marginBottom: 10 }}>RISK ASSESSMENT</AppText>
              {analysisResponse.conditions?.map((c, index) => (
                <View key={index} style={styles.conditionRow}>
                  <View style={[styles.conditionDot, { backgroundColor: colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" style={{ fontWeight: '700' }}>
                      {c.condition}
                      <AppText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                        {' '}· {c.probability}
                      </AppText>
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2, lineHeight: 18 }}>
                      {c.description}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Urgency */}
            <View style={styles.section}>
              <AppText variant="mono" color={colors.textMuted} style={{ marginBottom: 6 }}>URGENCY LEVEL</AppText>
              <View style={[styles.urgencyBadge, { backgroundColor: isDark ? esi.bgDark : esi.bg }]}>
                <AppText variant="caption" color={esi.text} style={{ fontWeight: '700' }}>
                  ESI {level} — {esi.label} · {analysisResponse.urgencyLevel?.level || 'Routine'}
                </AppText>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Recommended Action */}
            <View style={styles.section}>
              <AppText variant="mono" color={colors.textMuted} style={{ marginBottom: 6 }}>RECOMMENDED ACTION</AppText>
              <AppText variant="body" style={{ lineHeight: 22 }}>
                {analysisResponse.urgencyLevel?.reasoning?.join(' ') || 'Monitor symptoms and follow standard care guidelines.'}
              </AppText>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Footer / Disclaimer */}
            <AppText variant="micro" color={colors.textMuted} style={styles.disclaimer}>
              This report is AI-generated and does not constitute a medical diagnosis. Always consult a licensed healthcare provider for clinical decisions.
            </AppText>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.buttonRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Button
          mode="outlined"
          onPress={handleExportPDF}
          style={[styles.btn, { borderColor: colors.primary, borderRadius: 24 }]}
          textColor={colors.primary}
          icon="file-pdf-box"
          contentStyle={{ height: 52 }}
        >
          Export PDF
        </Button>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1.2 }}>
          <GradientButton
            label="Notify Caregiver"
            onPress={() => router.push('/notify-screen')}
            icon="bell-outline"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  esiPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaCol: {
    flex: 1,
  },
  section: {
    marginBottom: 4,
  },
  redFlagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    overflow: 'hidden',
  },
  redFlagAccent: {
    width: 3,
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 2,
    marginRight: 12,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  redFlagText: {
    fontWeight: '600',
    lineHeight: 20,
    paddingLeft: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  conditionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
  },
  urgencyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  disclaimer: {
    textAlign: 'center',
    lineHeight: 16,
  },
  buttonRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 0.5,
    alignItems: 'center',
  },
  btn: {
    flex: 1,
  },
});
