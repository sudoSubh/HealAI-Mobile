import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Surface, Dialog, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { useHealTheme, Colors } from '../../theme';
import { getSymptomCheckHistoryFromNeo4j } from '../../services/neo4jService';
import { runAgenticOutbreakScan, OutbreakRadarAlert } from '../../services/outbreakRadarService';
import { useTranslation } from '../../localization';

// UI Primitives
import { AppText } from '../../components/ui/AppText';
import { GradientButton } from '../../components/ui/GradientButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { EsiBadge } from '../../components/ui/EsiBadge';
import { PressableScale } from '../../components/ui/PressableScale';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isDark, colors, spacing, radii, typeScale, esi } = useHealTheme();

  const [userName, setUserName] = useState('Meena Patel');
  const [userPhone, setUserPhone] = useState('+91 98765 43210');
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isAshaWorker, setIsAshaWorker] = useState(false);
  const [outbreaks, setOutbreaks] = useState<OutbreakRadarAlert[]>([]);
  const [currentLocation, setCurrentLocation] = useState('Select Location');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [newLocationText, setNewLocationText] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);

  const saveLocation = async (address: string) => {
    setCurrentLocation(address);
    try {
      const sessionStr = await AsyncStorage.getItem('user_session');
      const session = sessionStr ? JSON.parse(sessionStr) : {};
      session.address = address;
      await AsyncStorage.setItem('user_session', JSON.stringify(session));
    } catch {}
    setLocationModalVisible(false);
  };

  const detectGPSLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        const formatted = [addr.name, addr.street, addr.city].filter(Boolean).join(', ');
        setNewLocationText(formatted || `${loc.coords.latitude}, ${loc.coords.longitude}`);
      } else {
        setNewLocationText(`${loc.coords.latitude}, ${loc.coords.longitude}`);
      }
    } catch (err) {
      console.warn(err);
      alert('Failed to detect GPS location');
    } finally {
      setDetectingLocation(false);
    }
  };

  // Dynamic greeting based on hours
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadSessionAndData = useCallback(async () => {
    try {
      // 1. Fetch user session details
      const sessionStr = await AsyncStorage.getItem('user_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.name) setUserName(session.name);
        if (session.identifier) {
          const cleanPhone = session.identifier;
          setUserPhone(cleanPhone.length === 10 ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : cleanPhone);
        }
        if (session.role === 'caregiver') setIsAshaWorker(true);
        if (session.address) {
          setCurrentLocation(session.address);
          setNewLocationText(session.address);
        }
      } else {
        setIsAshaWorker(false);
      }

      // 2. Fetch past analysis checks timeline
      const history = await getSymptomCheckHistoryFromNeo4j();
      setTimelineData(history);

      // 3. Scan for active outbreak clusters
      const alerts = await runAgenticOutbreakScan();
      setOutbreaks(alerts);
    } catch (e) {
      console.warn('Failed to load home screen session/history data:', e);
    }
  }, []);

  // Refresh data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadSessionAndData();
    }, [loadSessionAndData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessionAndData();
    setRefreshing(false);
  };

  const handleQuickAccess = (route: string) => {
    if (route === 'sos') {
      Linking.openURL('tel:112');
    } else {
      router.push(route as any);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      const diff = new Date().getTime() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch (e) {
      return '1d ago';
    }
  };

  const QUICK_ACCESS_ITEMS = [
    { label: 'Symptom Checker', icon: 'stethoscope', route: '/symptoms', color: colors.primary },
    { label: 'Report Scanner', icon: 'camera-outline', route: '/reports', color: colors.secondary },
    { label: 'Health Chat', icon: 'message-processing', route: '/chat', color: colors.tertiary },
    { label: 'AI Nurse Call', icon: 'phone-in-talk', route: '/nurse-call', color: Colors.indigo[500] },
    { label: 'Pill Reminders', icon: 'pill', route: '/reminders', color: Colors.amber[600] },
    { label: 'Case History', icon: 'history', route: '/history', color: Colors.rose[500] },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Navigation Header */}
      <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.navRow}>
          <View style={styles.logoRow}>
            <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="heart-pulse" size={18} color="#fff" />
            </View>
            <AppText variant="title" style={{ fontWeight: '900' }}>
              Heal<AppText variant="title" style={{ color: colors.primary, fontWeight: '900' }}>AI</AppText>
            </AppText>
            <TouchableOpacity 
              onPress={() => setLocationModalVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 8 }}
            >
              <MaterialCommunityIcons name="map-marker" size={14} color={colors.primary} />
              <AppText variant="micro" color={colors.text} numberOfLines={1} style={{ maxWidth: 80, fontWeight: '800' }}>
                {currentLocation}
              </AppText>
              <MaterialCommunityIcons name="chevron-down" size={10} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/more')} style={[styles.navLanguage, { borderColor: colors.border }]}>
              <AppText variant="mono" color={colors.text}>ENGLISH</AppText>
              <MaterialCommunityIcons name="chevron-down" size={12} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/more')} 
              style={[
                styles.navProfile, 
                { 
                  backgroundColor: colors.primary + '15', 
                  width: 30, 
                  height: 30, 
                  borderRadius: 15, 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }
              ]}
            >
              <AppText variant="micro" color={colors.primary} style={{ fontWeight: '900' }}>MP</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12 }}
      >
        {/* Welcoming Greeting Card */}
        <Animated.View entering={FadeIn.duration(600)} style={{ marginBottom: 16 }}>
          <GlassCard padded={false} style={styles.welcomeCard}>
            <View style={[styles.welcomeGradient, { backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : '#eef2ff' }]}>
              <View style={styles.welcomeInfo}>
                <AppText variant="caption" color={colors.textMuted}>{getGreeting()},</AppText>
                <AppText variant="headline" style={{ marginTop: 2, fontWeight: '900' }}>{userName}</AppText>
                <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>{userPhone}</AppText>
              </View>
              <View style={[styles.welcomePattern, { backgroundColor: colors.primary + '12' }]} />
            </View>
          </GlassCard>
        </Animated.View>

        {/* ONE Primary CTA: Start health check & Latest Report */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ marginBottom: 20, flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1.4 }}>
            <GradientButton
              label={t('startCheck')}
              onPress={() => router.push('/symptoms')}
              icon="stethoscope"
              fullWidth
            />
          </View>
          <TouchableOpacity
            onPress={async () => {
              const latest = await AsyncStorage.getItem('latest_analysis');
              if (latest) {
                router.push('/doc-report');
              } else {
                alert('No recent report found. Run a check first!');
              }
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.primary,
              borderRadius: 24,
              paddingHorizontal: 12,
              height: 48,
              gap: 6
            }}
          >
            <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.primary} />
            <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>{t('latestReport')}</AppText>
          </TouchableOpacity>
        </Animated.View>

        {/* Outbreak Radar alerts warning banner */}
        {isAshaWorker && outbreaks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.push('/chw-dashboard')}>
              <Surface style={[styles.ashaBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2', borderColor: colors.danger, borderWidth: 1 }]} elevation={2}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MaterialCommunityIcons name="alert-decagram" size={24} color={colors.danger} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color={colors.danger} style={{ fontWeight: '900' }}>🚨 AI OUTBREAK RADAR ALERT</AppText>
                    <AppText variant="micro" color={isDark ? colors.text : Colors.slate[700]} style={{ marginTop: 2, fontWeight: '700' }}>
                      {outbreaks.map(o => `${o.count}+ cases of ${o.symptom}`).join(', ')} detected in Delhi Village A!
                    </AppText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.danger} />
                </View>
              </Surface>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Caregiver ASHA Worker Dashboard Banner */}
        {isAshaWorker && outbreaks.length === 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ marginBottom: 16 }}>
            <Surface style={[styles.ashaBanner, { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : '#eef2ff', borderColor: colors.border, borderWidth: 1 }]} elevation={0}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" style={{ fontWeight: '800' }}>ASHA Dashboard Active</AppText>
                  <AppText variant="micro" color={colors.textMuted}>View triage registries & outbreak radar</AppText>
                </View>
                <TouchableOpacity onPress={() => router.push('/chw-dashboard')} style={[styles.ashaActionBtn, { backgroundColor: colors.primary }]}>
                  <AppText variant="micro" color="#fff" style={{ fontWeight: '800' }}>Open</AppText>
                </TouchableOpacity>
              </View>
            </Surface>
          </Animated.View>
        )}

        {/* Daily Insight Banner */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ marginBottom: 20 }}>
          <GlassCard style={{ borderColor: colors.border }}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightBadge, { backgroundColor: colors.tertiary + '20' }]}>
                <MaterialCommunityIcons name="creation" size={14} color={colors.tertiary} />
              </View>
              <AppText variant="mono" color={colors.tertiary}>DAILY INSIGHT</AppText>
            </View>
            <AppText variant="body" style={{ marginTop: 6, lineHeight: 22 }}>
              Staying hydrated in hot weather helps prevent fatigue and dizziness. Aim for 8 glasses of water today.
            </AppText>
          </GlassCard>
        </Animated.View>

        {/* Quick Access Grid */}
        <AppText variant="title" style={styles.sectionHeading}>{t('quickAccess')}</AppText>
        <View style={styles.gridContainer}>
          {QUICK_ACCESS_ITEMS.map((item, idx) => (
            <Animated.View key={idx} entering={FadeInDown.delay(250 + idx * 50).duration(400)} style={{ width: (width - 44) / 2 }}>
              <PressableScale onPress={() => handleQuickAccess(item.route)} style={{ width: '100%' }}>
                <GlassCard style={styles.gridCard}>
                  <View style={[styles.gridIconBox, { backgroundColor: item.color + '18' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <AppText variant="body" style={{ fontWeight: '700' }}>{item.label === 'Symptom Checker' ? t('symptomCheckerTitle') : item.label === 'Report Scanner' ? t('reportScanner') : item.label === 'Health Chat' ? t('chat') : item.label === 'AI Nurse Call' ? t('aiNurseCall') : item.label === 'Case History' ? 'Case History' : item.label}</AppText>
                </GlassCard>
              </PressableScale>
            </Animated.View>
          ))}
        </View>

        {/* Skin & Self-Care Guidance Carousel */}
        <AppText variant="title" style={styles.sectionHeading}>{t('skinSelfCareTips')}</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
          style={{ marginBottom: 12 }}
        >
          <GlassCard padded={false} style={{ width: 260, borderColor: colors.border }}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ backgroundColor: colors.secondary + '18', padding: 6, borderRadius: 8 }}>
                  <MaterialCommunityIcons name="water-percent" size={20} color={colors.secondary} />
                </View>
                <AppText variant="body" style={{ fontWeight: '800' }}>{t('stayHydrated')}</AppText>
              </View>
              <AppText variant="caption" color={colors.textMuted} style={{ lineHeight: 18 }}>
                Dehydration often causes dry, itchy skin or flaky patches. Drinking 2-3 liters of water daily helps maintain a healthy skin barrier.
              </AppText>
            </View>
          </GlassCard>

          <GlassCard padded={false} style={{ width: 260, borderColor: colors.border }}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ backgroundColor: colors.primary + '18', padding: 6, borderRadius: 8 }}>
                  <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.primary} />
                </View>
                <AppText variant="body" style={{ fontWeight: '800' }}>{t('sunProtection')}</AppText>
              </View>
              <AppText variant="caption" color={colors.textMuted} style={{ lineHeight: 18 }}>
                Prevent premature aging and UV damage by wearing protective clothing or sunscreen when out in the sun.
              </AppText>
            </View>
          </GlassCard>

          <GlassCard padded={false} style={{ width: 260, borderColor: colors.border }}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ backgroundColor: Colors.amber[500] + '18', padding: 6, borderRadius: 8 }}>
                  <MaterialCommunityIcons name="face-man-profile" size={20} color={Colors.amber[600]} />
                </View>
                <AppText variant="body" style={{ fontWeight: '800' }}>{t('barrierCare')}</AppText>
              </View>
              <AppText variant="caption" color={colors.textMuted} style={{ lineHeight: 18 }}>
                Avoid using harsh soaps or scrubs. Gentle cleansers keep the pH level of the skin balanced and prevent sudden breakouts or redness.
              </AppText>
            </View>
          </GlassCard>
        </ScrollView>

        {/* Timeline list header */}
        <View style={styles.timelineHeaderRow}>
          <AppText variant="title" style={{ fontWeight: '800' }}>{t('yourTimeline')}</AppText>
          <TouchableOpacity onPress={() => router.push('/chat')}>
            <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>Nurse call &rsaquo;</AppText>
          </TouchableOpacity>
        </View>

        {timelineData.length === 0 ? (
          <GlassCard style={styles.emptyTimeline}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={28} color={colors.textMuted} />
            <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 8 }}>No clinical checks recorded yet.</AppText>
          </GlassCard>
        ) : (
          <View style={styles.timelineList}>
            {timelineData.slice(0, 5).map((item, index) => {
              const primarySymptom = item.data?.symptoms?.[0] || 'Health Intake';
              const extraCount = (item.data?.symptoms?.length || 0) > 1 ? `, +${item.data.symptoms.length - 1}` : '';
              const timeAgoStr = getTimeAgo(item.date);
              const urgencyLevel = item.result?.urgencyLevel?.level || 'Routine';
              
              // Map urgency level string to level number for EsiBadge
              let levelNum: 1 | 2 | 3 | 4 | 5 = 5;
              if (urgencyLevel === 'Emergency') levelNum = 1;
              else if (urgencyLevel === 'Urgent') levelNum = 2;
              else if (urgencyLevel === 'Soon') levelNum = 3;
              else if (urgencyLevel === 'Low') levelNum = 4;
              
              const badgeColors = esi[levelNum];

              return (
                <Animated.View key={item.id || index} entering={FadeInDown.delay(300 + index * 60).duration(400)}>
                  <View style={styles.timelineRow}>
                    {/* Timeline connector node */}
                    <View style={styles.timelineConnector}>
                      <View style={[styles.timelineDot, { backgroundColor: badgeColors.primary }]}>
                        <MaterialCommunityIcons name="stethoscope" size={12} color="#fff" />
                      </View>
                      {index < timelineData.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                      )}
                    </View>

                    {/* Timeline content card */}
                    <GlassCard padded={false} style={styles.timelineCard}>
                      <View style={{ padding: 14 }}>
                        <View style={styles.timelineCardHeader}>
                          <AppText variant="body" style={{ fontWeight: '800', flex: 1 }}>
                            {primarySymptom}{extraCount}
                          </AppText>
                          <EsiBadge level={levelNum} size="pill" />
                        </View>

                        <AppText variant="caption" color={colors.textMuted} numberOfLines={2} style={{ marginTop: 4, lineHeight: 18 }}>
                          {item.result?.conditions?.[0]?.description || 'Intake summary recorded matching clinical rules.'}
                        </AppText>
                        <AppText variant="micro" color={colors.textMuted} style={{ marginTop: 8, fontWeight: '600' }}>{timeAgoStr}</AppText>
                      </View>
                    </GlassCard>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Emergency FAB */}
      <TouchableOpacity
        style={[styles.emergencyFab, { backgroundColor: colors.danger }]}
        activeOpacity={0.85}
        onPress={() => Linking.openURL('tel:112')}
      >
        <MaterialCommunityIcons name="phone-alert" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Location Selector Dialog */}
      <Portal>
        <Dialog visible={locationModalVisible} onDismiss={() => setLocationModalVisible(false)} style={{ backgroundColor: colors.surface, borderRadius: 20 }}>
          <Dialog.Title style={{ color: colors.text }}>{t('changeLocation')}</Dialog.Title>
          <Dialog.Content style={{ gap: 14 }}>
            <AppText variant="caption" color={colors.textMuted}>
              Setting your village or location allows the Outbreak Radar to accurately detect localized clusters.
            </AppText>
            <TextInput
              label="Village or Address"
              value={newLocationText}
              onChangeText={setNewLocationText}
              mode="outlined"
              activeOutlineColor={colors.primary}
              outlineColor={colors.border}
              style={{ backgroundColor: colors.surface }}
              textColor={colors.text}
              right={
                <TextInput.Icon 
                  icon={detectingLocation ? "loading" : "map-marker-radius"} 
                  color={colors.primary}
                  onPress={detectGPSLocation}
                  disabled={detectingLocation}
                />
              }
            />
          </Dialog.Content>
          <Dialog.Actions>
            <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <AppText variant="caption" color={colors.textMuted} style={{ fontWeight: '700' }}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => saveLocation(newLocationText)} style={{ paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8 }}>
              <AppText variant="caption" color={colors.primary} style={{ fontWeight: '800' }}>Save</AppText>
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  navProfile: {
    padding: 2,
  },
  welcomeCard: {
    borderWidth: 0,
    borderRadius: 20,
    elevation: 0,
  },
  welcomeGradient: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  welcomeInfo: {
    flex: 1,
    zIndex: 2,
  },
  welcomePattern: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    zIndex: 1,
  },
  ashaBanner: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  ashaActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeading: {
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    padding: 14,
    borderRadius: 16,
    alignItems: 'flex-start',
    width: '100%',
  },
  gridIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  emptyTimeline: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineList: {
    marginTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  timelineConnector: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 16,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  emergencyFab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
});
