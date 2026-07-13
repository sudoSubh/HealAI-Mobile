import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useHealTheme, ESI_COLORS } from '../theme';
import { getSymptomCheckHistoryFromNeo4j, deleteSymptomCheck } from '../services/neo4jService';

// UI Primitives
import { AppText } from '../components/ui/AppText';
import { GlassCard } from '../components/ui/GlassCard';
import { StateView } from '../components/ui/StateView';
import { PressableScale } from '../components/ui/PressableScale';

export default function HistoryScreen() {
  const { isDark, colors, spacing, esi } = useHealTheme();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getSymptomCheckHistoryFromNeo4j();
      setHistory(data);
    } catch (err) {
      console.error('[History] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleOpenReport = async (item: any) => {
    await AsyncStorage.setItem('latest_analysis', JSON.stringify({
      data: item.data,
      result: item.result,
    }));
    router.push('/doc-report');
  };

  const handleDeleteItem = async (checkId: string) => {
    await deleteSymptomCheck(checkId);
    fetchHistory();
  };

  const groupByDate = (items: any[]) => {
    const groups: Record<string, any[]> = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    items.forEach(item => {
      const d = new Date(item.date);
      const key = d.toDateString() === today ? 'Today'
        : d.toDateString() === yesterday ? 'Yesterday'
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return Object.entries(groups);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <StateView state="loading" loadingLabel="Loading timeline history..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {history.length === 0 ? (
        <View style={styles.center}>
          <StateView 
            state="empty" 
            emptyTitle="No History Found" 
            emptyMessage="Your symptom checks and health timeline will appear here."
            emptyCtaLabel="Start health check"
            onEmptyCta={() => router.replace('/symptoms')}
          />
        </View>
      ) : (
        <FlatList
          data={groupByDate(history)}
          keyExtractor={([label]) => label}
          refreshing={loading}
          onRefresh={fetchHistory}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item: [dateLabel, items], index }) => (
            <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
              {/* Date Group Header */}
              <AppText variant="caption" color={colors.textMuted} style={styles.dateHeader}>
                {dateLabel}
              </AppText>

              {/* Cases in this group */}
              {items.map((caseItem: any, ci: number) => {
                const esiScore: number = caseItem.result?.esiScore || 4;
                const badgeColors = esi[esiScore as 1 | 2 | 3 | 4 | 5] || esi[4];
                const primaryCondition = caseItem.result?.conditions?.[0]?.condition || 'Health Check';
                const timeStr = new Date(caseItem.date).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View key={caseItem.id || ci} style={{ marginBottom: 10 }}>
                    <PressableScale onPress={() => handleOpenReport(caseItem)}>
                      <GlassCard padded={false} style={{ borderColor: colors.border }}>
                        <View style={styles.caseCard}>
                          {/* ESI Indicator Badge */}
                          <View style={[styles.esiPill, { backgroundColor: badgeColors.primary }]}>
                            <AppText variant="caption" color="#fff" style={{ fontWeight: '900' }}>{esiScore}</AppText>
                          </View>

                          {/* Content */}
                          <View style={styles.caseContent}>
                            <AppText variant="body" style={{ fontWeight: '800' }} numberOfLines={1}>
                              {primaryCondition}
                            </AppText>
                            <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                              {caseItem.data?.symptoms?.slice(0, 3).join(' · ') || 'Symptoms logged'} · {timeStr}
                            </AppText>
                          </View>

                          {/* Chevron & Delete Trash Icon */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <TouchableOpacity
                              onPress={() => handleDeleteItem(caseItem.id)}
                              style={{ padding: 4 }}
                            >
                              <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
                            </TouchableOpacity>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                          </View>
                        </View>
                      </GlassCard>
                    </PressableScale>
                  </View>
                );
              })}
            </Animated.View>
          )}
        />
      )}
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
  dateHeader: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 10,
    paddingLeft: 4,
  },
  caseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  esiPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caseContent: {
    flex: 1,
  },
});
