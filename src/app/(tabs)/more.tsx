import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Linking, TouchableOpacity, Share, Clipboard, Alert } from 'react-native';
import { Surface, List, Divider, Portal, Dialog, RadioButton, Button, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHealTheme, Colors } from '../../theme';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../localization';
import QRCode from 'react-native-qrcode-svg';

// UI Primitives
import { AppText } from '../../components/ui/AppText';
import { GlassCard } from '../../components/ui/GlassCard';
import { PressableScale } from '../../components/ui/PressableScale';

export default function MoreScreen() {
  const { t, locale, setLocale } = useTranslation();
  const { isDark, colors, spacing } = useHealTheme();
  const router = useRouter();

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isAshaWorker, setIsAshaWorker] = useState(false);

  const [reportsData, setReportsData] = useState<string>('');
  const [hasReports, setHasReports] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem('asha_worker').then(val => {
      if (val === 'true') setIsAshaWorker(true);
    });
  }, []);

  useEffect(() => {
    const fetchOfflineData = async () => {
      try {
        const savedReports = await AsyncStorage.getItem('medicalReports');
        const savedProfile = await AsyncStorage.getItem('userProfile');
        
        if (savedReports) {
          const reportsList = JSON.parse(savedReports);
          if (reportsList && reportsList.length > 0) {
            // Get the latest analyzed report
            const latest = reportsList.find((r: any) => r.status === 'analyzed') || reportsList[0];
            const profileData = savedProfile ? JSON.parse(savedProfile) : {};
            
            const sharedObject = {
              type: 'healai_report',
              p: {
                n: profileData.name || 'Anonymous',
                a: profileData.age || 'Not specified',
                g: profileData.gender || 'Not specified',
              },
              r: {
                n: latest.name || 'Report',
                d: latest.uploadedAt || '',
                s: latest.analysisResult ? latest.analysisResult.slice(0, 800) : 'No summary available.'
              }
            };
            
            setReportsData(JSON.stringify(sharedObject));
            setHasReports(true);
          } else {
            setHasReports(false);
          }
        } else {
          setHasReports(false);
        }
      } catch (e) {
        console.warn('Failed to load offline P2P data:', e);
        setHasReports(false);
      }
    };
    
    if (shareModalVisible) {
      fetchOfflineData();
    }
  }, [shareModalVisible]);

  const toggleAshaMode = async (val: boolean) => {
    setIsAshaWorker(val);
    await AsyncStorage.setItem('asha_worker', val ? 'true' : 'false');
  };

  const SECTIONS = [
    {
      title: 'Clinical Records',
      items: [
        { icon: 'clipboard-text-clock', title: 'Case History', description: 'View past symptom checks & reports', route: '/history', color: colors.primary },
        ...(isAshaWorker ? [{ icon: 'view-dashboard', title: 'CHW/ASHA Dashboard', description: 'Urgency-sorted patient registry', route: '/chw-dashboard', color: colors.danger }] : []),
      ],
    },
    {
      title: t('healthToolsTitle') || 'Health Tools',
      items: [
        { icon: 'book-open-variant', title: t('educationHub') || 'Education Hub', description: t('educationHubDesc') || 'Health articles & videos', route: '/education', color: Colors.amber[600] },
        { icon: 'hospital-building', title: t('nearbyHospitalsTitle') || 'Healthcare Resources', description: t('nearbyHospitalsDesc') || 'Find hospitals near you', route: '/resources', color: colors.secondary },
      ],
    },
    {
      title: t('selectLanguage') || 'App Language',
      items: [
        { icon: 'translate', title: t('selectLanguage') || 'Language Settings', description: SUPPORTED_LANGUAGES.find(l => l.code === locale)?.name || 'English', route: 'language', color: colors.primary }
      ]
    },
    {
      title: t('emergencyCall') || 'Emergency Contact',
      items: [
        { icon: 'phone-alert', title: t('emergencyCall') || 'Emergency Call', description: 'Dial 112 for emergencies', route: 'tel:112', color: colors.danger },
        { icon: 'ambulance', title: 'Ambulance', description: 'Call ambulance service (108)', route: 'tel:108', color: colors.danger },
      ],
    },
    {
      title: 'App Distribution',
      items: [
        { icon: 'share-variant', title: 'Smart P2P Share', description: 'Show QR code to distribute offline PWA', route: 'p2p-share', color: colors.success }
      ]
    },
    {
      title: t('aboutTitle') || 'Info & Legal',
      items: [
        { icon: 'information', title: 'About HealAI', description: 'Version 1.0.0 (Web-aligned)', route: 'about', color: colors.primary },
        { icon: 'shield-check', title: 'Privacy Policy', description: 'HIPAA & GDPR Compliant', route: 'privacy', color: colors.primary },
      ],
    },
  ];

  const handlePress = (route: string) => {
    if (route === 'language') {
      setLangModalVisible(true);
    } else if (route === 'p2p-share') {
      setShareModalVisible(true);
    } else if (route.startsWith('tel:')) {
      Linking.openURL(route);
    } else {
      router.push(route as any);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={styles.logoRow}>
            <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="heart-pulse" size={22} color="#fff" />
            </View>
            <View>
              <AppText variant="title" style={{ fontWeight: '900' }}>
                Heal<AppText variant="title" style={{ color: colors.primary, fontWeight: '900' }}>AI</AppText>
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {t('subWelcome') || 'Your Health Intelligence Hub'}
              </AppText>
            </View>
          </View>
        </Animated.View>

        {/* Sections */}
        {SECTIONS.map((section, si) => (
          <Animated.View key={si} entering={FadeInDown.delay(100 + si * 50).duration(400)} style={styles.section}>
            <AppText variant="caption" color={colors.textMuted} style={styles.sectionTitle}>
              {section.title}
            </AppText>
            <GlassCard padded={false} style={{ borderColor: colors.border }}>
              {section.items.map((item, i) => (
                <View key={i}>
                  <List.Item
                    title={item.title}
                    description={item.description}
                    titleStyle={{ fontWeight: '700', fontSize: 14, color: colors.text }}
                    descriptionStyle={{ fontSize: 12, color: colors.textMuted }}
                    left={() => (
                      <View style={[styles.itemIcon, { backgroundColor: item.color + '15' }]}>
                        <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                      </View>
                    )}
                    right={() => <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} style={{ alignSelf: 'center' }} />}
                    onPress={() => handlePress(item.route)}
                    style={{ paddingVertical: 8 }}
                  />
                  {i < section.items.length - 1 && <Divider style={{ backgroundColor: colors.border }} />}
                </View>
              ))}
            </GlassCard>
          </Animated.View>
        ))}


        {/* Logout Button */}
        <Animated.View entering={FadeInDown.delay(380).duration(400)} style={[styles.section, { marginTop: 12, paddingHorizontal: 16 }]}>
          <Button
            mode="outlined"
            onPress={async () => {
              await AsyncStorage.removeItem('user_session');
              router.replace('/login');
            }}
            textColor={colors.danger}
            style={{ borderColor: colors.danger, borderRadius: 24 }}
            icon="logout"
          >
            Sign Out Account
          </Button>
        </Animated.View>

        {/* Medical Disclaimer */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.disclaimerSection}>
          <GlassCard padded={false} style={{ borderColor: colors.border }}>
            <View style={{ padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <MaterialCommunityIcons name="shield-alert" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700', marginBottom: 4 }}>{t('disclaimerTitle') || 'Medical Disclaimer'}</AppText>
                <AppText variant="micro" color={colors.textMuted} style={{ lineHeight: 16 }}>
                  {t('disclaimerWarning') || 'HealAI provides health information for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.'}
                </AppText>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <AppText variant="micro" color={colors.textMuted} style={{ textAlign: 'center' }}>
            Made with ❤️ for better health
          </AppText>
          <AppText variant="micro" color={colors.textMuted} style={{ textAlign: 'center', marginTop: 4 }}>
            © 2026 HealAI v1.0.0
          </AppText>
        </View>
      </ScrollView>

      {/* Language Selection Dialog */}
      <Portal>
        <Dialog visible={langModalVisible} onDismiss={() => setLangModalVisible(false)} style={{ backgroundColor: colors.surface, borderRadius: 20 }}>
          <Dialog.Title style={{ color: colors.text }}>{t('selectLanguage')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={(val) => { setLocale(val as any); setLangModalVisible(false); }} value={locale}>
              {SUPPORTED_LANGUAGES.map(lang => (
                <View key={lang.code} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                  <RadioButton value={lang.code} color={colors.primary} />
                  <AppText variant="body" style={{ marginLeft: 8 }}>{lang.name}</AppText>
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLangModalVisible(false)} textColor={colors.primary}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* P2P Share / QR Modal */}
      <Portal>
        <Dialog visible={shareModalVisible} onDismiss={() => setShareModalVisible(false)} style={{ backgroundColor: colors.surface, borderRadius: 24, marginHorizontal: 20 }}>
          <Dialog.Title style={{ color: colors.text, textAlign: 'center', fontWeight: '800' }}>📄 Offline Report Share</Dialog.Title>
          <Dialog.Content style={{ alignItems: 'center', paddingVertical: 8 }}>
            {hasReports ? (
              <>
                <AppText variant="caption" color={colors.textMuted} style={{ textAlign: 'center', marginBottom: 20 }}>
                  Scan this QR code from another health worker's device to instantly sync this patient's latest clinical report and profile offline.
                </AppText>

                {/* QR Code */}
                <View style={{
                  padding: 16,
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  marginBottom: 20,
                  shadowColor: '#000',
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}>
                  <QRCode
                    value={reportsData}
                    size={220}
                    color="#1e1b4b"
                    backgroundColor="#ffffff"
                  />
                </View>

                <AppText variant="caption" color={colors.textMuted} style={{ textAlign: 'center', fontWeight: '700', marginBottom: 4 }}>
                  P2P Offline Sync Code Generated
                </AppText>
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 20, gap: 12 }}>
                <MaterialCommunityIcons name="file-alert-outline" size={48} color={colors.danger} />
                <AppText variant="body" style={{ fontWeight: '700', color: colors.text, textAlign: 'center' }}>
                  No Offline Reports Found
                </AppText>
                <AppText variant="caption" color={colors.textMuted} style={{ textAlign: 'center', paddingHorizontal: 12 }}>
                  Please scan or upload a clinical health report in the **Reports** tab first to generate your offline shareable QR code.
                </AppText>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ flexDirection: 'column', gap: 8, paddingBottom: 16, paddingHorizontal: 16 }}>
            {hasReports && (
              <>
                <Button
                  mode="contained"
                  icon="share-variant"
                  onPress={async () => {
                    try {
                      const parsed = JSON.parse(reportsData);
                      await Share.share({
                        title: 'HealAI Clinical Report',
                        message: `Patient: ${parsed.p.n} (${parsed.p.a}/${parsed.p.g})\nReport: ${parsed.r.n}\nSummary: ${parsed.r.s}`,
                      });
                    } catch (e) {
                      Alert.alert('Share Error', 'Could not open the share dialog.');
                    }
                  }}
                  style={{ width: '100%' }}
                  buttonColor={colors.primary}
                >
                  Share Summary
                </Button>
                <Button
                  mode="outlined"
                  icon="content-copy"
                  onPress={() => {
                    try {
                      const parsed = JSON.parse(reportsData);
                      Clipboard.setString(`Patient: ${parsed.p.n}\nReport: ${parsed.r.n}\nSummary: ${parsed.r.s}`);
                      Alert.alert('Copied!', 'Clinical report summary copied to clipboard.');
                    } catch {
                      Clipboard.setString(reportsData);
                      Alert.alert('Copied!', 'Raw offline sync code copied to clipboard.');
                    }
                  }}
                  style={{ width: '100%' }}
                  textColor={colors.primary}
                >
                  Copy Summary Text
                </Button>
              </>
            )}
            <Button onPress={() => setShareModalVisible(false)} textColor={colors.textMuted}>Close</Button>
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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  disclaimerSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
});
