import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Surface, Dialog, Portal, Divider, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useHealTheme, Colors } from '../theme';
import { getCHWDashboardDataFromNeo4j, getOutbreakStatusFromNeo4j, getNurseCallAlerts } from '../services/neo4jService';
import { sendLocalNotification } from '../services/notificationService';

// UI Primitives
import { AppText } from '../components/ui/AppText';
import { GradientButton } from '../components/ui/GradientButton';
import { GlassCard } from '../components/ui/GlassCard';
import { EsiBadge } from '../components/ui/EsiBadge';
import { StateView } from '../components/ui/StateView';
import { PressableScale } from '../components/ui/PressableScale';

export default function CHWDashboardScreen() {
  const { isDark, colors, spacing } = useHealTheme();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'registry' | 'nurseAlerts' | 'broadcast'>('registry');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [nurseAlerts, setNurseAlerts] = useState<any[]>([]);
  const [outbreak, setOutbreak] = useState<{ active: boolean; matches: string[] }>({ active: false, matches: [] });
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await getCHWDashboardDataFromNeo4j();
      setCases(data);
      const outStatus = await getOutbreakStatusFromNeo4j();
      setOutbreak(outStatus);
      const alerts = await getNurseCallAlerts();
      setNurseAlerts(alerts);
    } catch (err) {
      console.error('[CHWDashboard] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      alert('Please fill out all fields.');
      return;
    }
    await sendLocalNotification(broadcastTitle.trim(), broadcastBody.trim());
    setBroadcastTitle('');
    setBroadcastBody('');
    alert('Broadcast sent. Local community notified.');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <StateView state="loading" loadingLabel="Loading caregiver registry..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      {/* Outbreak Banner */}
      {outbreak.active && (
        <Animated.View entering={FadeInDown.duration(500)}>
          <TouchableOpacity
            style={[styles.outbreakBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2', borderColor: colors.danger, borderWidth: 1 }]}
            activeOpacity={0.8}
            onPress={() => setOutbreak({ active: false, matches: [] })}
          >
            <View style={styles.outbreakIcon}>
              <MaterialCommunityIcons name="alert-octagon" size={22} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={{ fontWeight: '800', color: colors.danger }}>Outbreak Alert</AppText>
              <AppText variant="caption" color={colors.text} style={{ marginTop: 2, lineHeight: 18 }}>
                Cluster detected: {outbreak.matches.join(', ')} — multiple cases in 48 hours.
              </AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.danger} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Summary Bar */}
      <GlassCard padded={false} style={{ marginHorizontal: 16, marginTop: 12, borderColor: colors.border }}>
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <AppText variant="title" style={{ fontWeight: '900' }}>{cases.length}</AppText>
            <AppText variant="micro" color={colors.textMuted}>Total</AppText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <AppText variant="title" style={{ fontWeight: '900', color: colors.danger }}>{cases.filter(c => c.esi <= 2).length}</AppText>
            <AppText variant="micro" color={colors.textMuted}>Critical</AppText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <AppText variant="title" style={{ fontWeight: '900', color: colors.warn }}>{cases.filter(c => c.esi === 3).length}</AppText>
            <AppText variant="micro" color={colors.textMuted}>Urgent</AppText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <AppText variant="title" style={{ fontWeight: '900', color: colors.success }}>{cases.filter(c => c.esi >= 4).length}</AppText>
            <AppText variant="micro" color={colors.textMuted}>Routine</AppText>
          </View>
        </View>
      </GlassCard>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
        {(['registry', 'nurseAlerts', 'broadcast'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabButton, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <MaterialCommunityIcons
              name={tab === 'registry' ? 'clipboard-list' : tab === 'nurseAlerts' ? 'phone-alert' : 'broadcast'}
              size={16}
              color={activeTab === tab ? colors.primary : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <AppText variant="caption" style={[{ fontWeight: '700', color: activeTab === tab ? colors.primary : colors.textMuted }]}>
              {tab === 'registry' ? 'Registry' : tab === 'nurseAlerts' ? 'Nurse Alerts' : 'Broadcast'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'broadcast' ? (
        <ScrollView style={{ padding: 16 }} contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <GlassCard padded={false} style={{ borderColor: colors.border }}>
              <View style={{ padding: 20 }}>
                <View style={styles.formHeader}>
                  <View style={[styles.formIconWrap, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : Colors.rose[50] }]}>
                    <MaterialCommunityIcons name="broadcast" size={20} color={colors.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" style={{ fontWeight: '800' }}>Dispatch Community Alert</AppText>
                    <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2, lineHeight: 18 }}>
                      Push urgent health advisories to ASHA workers and community members.
                    </AppText>
                  </View>
                </View>
                <TextInput
                  label="Alert Title"
                  placeholder="e.g., Dengue Fever Advisory"
                  value={broadcastTitle}
                  onChangeText={setBroadcastTitle}
                  mode="outlined"
                  activeOutlineColor={colors.primary}
                  outlineColor={colors.border}
                  style={{ backgroundColor: colors.surface, marginBottom: 12 }}
                  textColor={colors.text}
                />
                <TextInput
                  label="Alert Message"
                  placeholder="Describe the situation and recommended action..."
                  value={broadcastBody}
                  onChangeText={setBroadcastBody}
                  mode="outlined"
                  activeOutlineColor={colors.primary}
                  outlineColor={colors.border}
                  multiline
                  numberOfLines={4}
                  style={{ backgroundColor: colors.surface, marginBottom: 16 }}
                  textColor={colors.text}
                />
                <GradientButton
                  label="Send Broadcast"
                  onPress={handleBroadcast}
                  icon="send"
                />
              </View>
            </GlassCard>
          </Animated.View>
        </ScrollView>
      ) : activeTab === 'nurseAlerts' ? (
        nurseAlerts.length === 0 ? (
          <View style={styles.emptyView}>
            <StateView 
              state="empty" 
              emptyTitle="No Nurse Alerts" 
              emptyMessage="Alerts from AI Nurse calls with ESI >= 3 will appear here."
              onEmptyCta={fetchDashboardData}
              emptyCtaLabel="Refresh Alerts"
            />
          </View>
        ) : (
          <FlatList
            data={nurseAlerts}
            keyExtractor={(item, index) => item.id || index.toString()}
            refreshing={loading}
            onRefresh={fetchDashboardData}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.duration(400).delay(index * 40)} style={{ marginBottom: 10 }}>
                <PressableScale onPress={() => setSelectedCase({
                  id: item.id,
                  name: `${item.memberName} (${item.memberPhone})`,
                  esi: item.esiScore,
                  conditions: item.conditions.map((c: string) => ({ condition: c })),
                  date: item.date,
                  data: { symptoms: item.conditions, medicalHistory: { conditions: [], medications: [], allergies: [] } },
                  result: {
                    conditions: item.conditions.map((c: string) => ({ condition: c, description: item.summary })),
                    urgencyLevel: { level: item.esiScore <= 3 ? 'Urgent' : 'Routine', reasoning: [item.summary] },
                    remedies: { precautions: ['Assess patient in person', 'Check vital signs'], dietaryGuidelines: [], followUpTiming: '24 hours' }
                  }
                })}>
                  <GlassCard padded={false} style={{ borderColor: colors.border }}>
                    <View style={styles.caseItemRow}>
                      <EsiBadge level={(item.esiScore >= 1 && item.esiScore <= 5) ? (item.esiScore as 1 | 2 | 3 | 4 | 5) : 5} size="pill" />
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" style={{ fontWeight: '800' }}>
                          {item.memberName}
                        </AppText>
                        <AppText variant="micro" color={colors.textMuted} numberOfLines={1}>
                          {item.memberPhone} • ESI {item.esiScore}
                        </AppText>
                        <AppText variant="caption" color={colors.textMuted} numberOfLines={2} style={{ marginTop: 4 }}>
                          {item.summary}
                        </AppText>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
                    </View>
                  </GlassCard>
                </PressableScale>
              </Animated.View>
            )}
          />
        )
      ) : cases.length === 0 ? (
        <View style={styles.emptyView}>
          <StateView 
            state="empty" 
            emptyTitle="No Cases Logged" 
            emptyMessage="Patient cases will appear here as they come in."
            onEmptyCta={fetchDashboardData}
            emptyCtaLabel="Refresh Dashboard"
          />
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item, index) => item.id || index.toString()}
          refreshing={loading}
          onRefresh={fetchDashboardData}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item, index }) => {
            const levelNum = (item.esi >= 1 && item.esi <= 5) ? (item.esi as 1 | 2 | 3 | 4 | 5) : 5;
            const formattedTime = item.date ? new Date(item.date).toLocaleDateString() : 'Recent';

            return (
              <Animated.View entering={FadeInDown.duration(400).delay(index * 40)} style={{ marginBottom: 10 }}>
                <PressableScale onPress={() => setSelectedCase(item)}>
                  <GlassCard padded={false} style={{ borderColor: colors.border }}>
                    <View style={styles.caseItemRow}>
                      <EsiBadge level={levelNum} size="pill" />
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" style={{ fontWeight: '800' }}>
                          {item.name || 'Anonymous'}
                        </AppText>
                        <AppText variant="caption" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>
                          {item.chiefComplaint || 'No chief complaint recorded'}
                        </AppText>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <AppText variant="micro" color={colors.textMuted}>{formattedTime}</AppText>
                        <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
                      </View>
                    </View>
                  </GlassCard>
                </PressableScale>
              </Animated.View>
            );
          }}
        />
      )}

      {/* Detail Dialog */}
      <Portal>
        <Dialog
          visible={!!selectedCase}
          onDismiss={() => setSelectedCase(null)}
          style={{ backgroundColor: colors.surface, borderRadius: 20 }}
        >
          {selectedCase && (
            <>
              <Dialog.Title style={{ color: colors.text }}>Case Intake Details</Dialog.Title>
              <Dialog.Content>
                <ScrollView contentContainerStyle={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="body" style={{ fontWeight: '900' }}>{selectedCase.name || 'Anonymous'}</AppText>
                    <EsiBadge level={(selectedCase.esi >= 1 && selectedCase.esi <= 5) ? (selectedCase.esi as 1 | 2 | 3 | 4 | 5) : 5} size="pill" />
                  </View>
                  
                  <Divider style={{ backgroundColor: colors.border }} />
                  
                  <View>
                    <AppText variant="mono" color={colors.textMuted}>CHIEF COMPLAINT</AppText>
                    <AppText variant="caption" style={{ marginTop: 2, fontWeight: '700' }}>{selectedCase.chiefComplaint || 'None'}</AppText>
                  </View>

                  <View>
                    <AppText variant="mono" color={colors.textMuted}>LOCATION / VILLAGE</AppText>
                    <AppText variant="caption" style={{ marginTop: 2, fontWeight: '700' }}>{selectedCase.location || 'Not Provided'}</AppText>
                  </View>

                  <View>
                    <AppText variant="mono" color={colors.textMuted}>CLINICAL ACTIONS & REASONING</AppText>
                    <AppText variant="caption" style={{ marginTop: 2, lineHeight: 18 }}>
                      {selectedCase.recommendations || 'Monitor symptoms and follow standard care protocols.'}
                    </AppText>
                  </View>
                </ScrollView>
              </Dialog.Content>
              <Dialog.Actions>
                <TouchableOpacity onPress={() => setSelectedCase(null)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                  <AppText variant="caption" color={colors.primary} style={{ fontWeight: '800' }}>Close</AppText>
                </TouchableOpacity>
              </Dialog.Actions>
            </>
          )}
        </Dialog>
      </Portal>

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
  outbreakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    gap: 12,
  },
  outbreakIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  outbreakTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#dc2626',
  },
  outbreakText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  summaryBar: {
    flexDirection: 'row',
    paddingVertical: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 14,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  formHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  formIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyView: {
    flex: 1,
  },
  caseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
});
