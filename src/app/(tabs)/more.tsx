import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, useColorScheme, Linking, TouchableOpacity } from 'react-native';
import { Text, Surface, List, Divider, useTheme, Portal, Dialog, RadioButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../theme';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../localization';

export default function MoreScreen() {
  const { t, locale, setLocale } = useTranslation();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [langModalVisible, setLangModalVisible] = useState(false);

  const SECTIONS = [
    {
      title: t('healthToolsTitle') || 'Health Tools',
      items: [
        { icon: 'book-open-variant', title: t('educationHub') || 'Education Hub', description: t('educationHubDesc') || 'Health articles & videos', route: '/education', color: Colors.amber[600] },
        { icon: 'hospital-building', title: t('nearbyHospitalsTitle') || 'Healthcare Resources', description: t('nearbyHospitalsDesc') || 'Find hospitals near you', route: '/resources', color: Colors.blue[600] },
      ],
    },
    {
      title: t('selectLanguage') || 'App Language',
      items: [
        { icon: 'translate', title: t('selectLanguage') || 'Language Settings', description: SUPPORTED_LANGUAGES.find(l => l.code === locale)?.name || 'English', route: 'language', color: Colors.teal[500] }
      ]
    },
    {
      title: t('emergencyCall') || 'Emergency Contact',
      items: [
        { icon: 'phone-alert', title: t('emergencyCall') || 'Emergency Call', description: 'Dial 112 for emergencies', route: 'tel:112', color: Colors.rose[600] },
        { icon: 'ambulance', title: 'Ambulance', description: 'Call ambulance service (108)', route: 'tel:108', color: Colors.rose[500] },
      ],
    },
    {
      title: t('aboutTitle') || 'Info & Legal',
      items: [
        { icon: 'information', title: 'About HealAI', description: 'Version 1.0.0 (Web-aligned)', route: 'about', color: Colors.teal[600] },
        { icon: 'shield-check', title: 'Privacy Policy', description: 'HIPAA & GDPR Compliant', route: 'privacy', color: Colors.violet[600] },
      ],
    },
  ];

  const handlePress = (route: string) => {
    if (route === 'language') {
      setLangModalVisible(true);
    } else if (route.startsWith('tel:')) {
      Linking.openURL(route);
    } else if (route === 'about' || route === 'privacy') {
      // Info views
    } else {
      router.push(route as any);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={styles.logoRow}>
            <View style={[styles.logoIcon, { backgroundColor: Colors.teal[600] }]}>
              <MaterialCommunityIcons name="heart-pulse" size={22} color="#fff" />
            </View>
            <View>
              <Text style={[styles.title, { color: isDark ? '#fff' : Colors.slate[800] }]}>
                Heal<Text style={{ color: Colors.teal[600] }}>AI</Text>
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? Colors.slate[500] : Colors.slate[400] }}>
                {t('subWelcome') || 'Your Health Intelligence Hub'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Sections */}
        {SECTIONS.map((section, si) => (
          <Animated.View key={si} entering={FadeInDown.delay(100 + si * 100).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>
              {section.title}
            </Text>
            <Surface style={[styles.sectionCard, { backgroundColor: isDark ? '#121214' : '#fff', borderColor: isDark ? '#27272a' : '#e4e4e7', borderWidth: isDark ? 1 : 0 }]} elevation={1}>
              {section.items.map((item, i) => (
                <React.Fragment key={i}>
                  <List.Item
                    title={item.title}
                    description={item.description}
                    titleStyle={{ fontWeight: '700', fontSize: 14, color: isDark ? '#fff' : Colors.slate[800] }}
                    descriptionStyle={{ fontSize: 12, color: isDark ? Colors.slate[400] : Colors.slate[500] }}
                    left={() => (
                      <View style={[styles.itemIcon, { backgroundColor: item.color + '15' }]}>
                        <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                      </View>
                    )}
                    right={() => <MaterialCommunityIcons name="chevron-right" size={20} color={isDark ? Colors.slate[600] : Colors.slate[400]} style={{ alignSelf: 'center' }} />}
                    onPress={() => handlePress(item.route)}
                    style={{ paddingVertical: 8 }}
                  />
                  {i < section.items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Surface>
          </Animated.View>
        ))}

        {/* Medical Disclaimer */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.disclaimerSection}>
          <Surface style={[styles.disclaimerCard, { backgroundColor: isDark ? '#18181b' : Colors.teal[50], borderColor: isDark ? '#27272a' : '#e4e4e7', borderWidth: isDark ? 1 : 0 }]} elevation={0}>
            <MaterialCommunityIcons name="shield-alert" size={20} color={Colors.teal[600]} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.teal[700], marginBottom: 4 }}>{t('disclaimerTitle') || 'Medical Disclaimer'}</Text>
              <Text style={{ fontSize: 11, color: isDark ? Colors.slate[400] : Colors.slate[500], lineHeight: 16 }}>
                {t('disclaimerWarning') || 'HealAI provides health information for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.'}
              </Text>
            </View>
          </Surface>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ fontSize: 11, color: isDark ? Colors.slate[600] : Colors.slate[400], textAlign: 'center' }}>
            Made with ❤️ for better health
          </Text>
          <Text style={{ fontSize: 10, color: isDark ? Colors.slate[700] : Colors.slate[300], textAlign: 'center', marginTop: 4 }}>
            © 2026 HealAI v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Language Selector Dialog */}
      <Portal>
        <Dialog visible={langModalVisible} onDismiss={() => setLangModalVisible(false)} style={{ backgroundColor: isDark ? '#121214' : '#fff', borderRadius: 24 }}>
          <Dialog.Title style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#fff' : Colors.slate[800] }}>
            {t('selectLanguage') || 'Select Language'}
          </Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 350, paddingHorizontal: 0 }}>
            <ScrollView>
              <RadioButton.Group onValueChange={(val) => { setLocale(val as any); setLangModalVisible(false); }} value={locale}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <View key={lang.code}>
                    <TouchableOpacity 
                      onPress={() => { setLocale(lang.code); setLangModalVisible(false); }}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 24 }}
                    >
                      <Text style={{ fontSize: 14, color: isDark ? '#fff' : Colors.slate[700], fontWeight: locale === lang.code ? '700' : '400' }}>
                        {lang.name}
                      </Text>
                      <RadioButton value={lang.code} color={Colors.teal[600]} uncheckedColor={isDark ? Colors.slate[700] : Colors.slate[300]} />
                    </TouchableOpacity>
                    <Divider />
                  </View>
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setLangModalVisible(false)} labelStyle={{ color: Colors.teal[600], fontWeight: '700' }}>
              {t('back') || 'Close'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 16, overflow: 'hidden' },
  itemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 8, alignSelf: 'center' },
  disclaimerSection: { paddingHorizontal: 16, marginBottom: 16 },
  disclaimerCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, alignItems: 'flex-start' },
  footer: { padding: 20 },
});
