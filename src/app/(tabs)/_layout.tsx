import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHealTheme } from '../../theme';
import { shadows } from '../../theme/styles';

// ─── Custom Tab Bar with Elevated Center CTA ────────────────────────────
function ElevatedTabBar({ state, descriptors, navigation }: any) {
  const { isDark, colors } = useHealTheme();
  const router = useRouter();

  // Define custom visible tab order: Home (index), Chat (chat), [Elevated CTA], Reports (reports), More (more)
  const orderedRouteNames = ['index', 'chat', 'reports', 'more'];

  return (
    <View style={[
      styles.tabBar,
      {
        backgroundColor: isDark ? colors.surface : '#ffffff',
        borderTopColor: colors.border,
      },
      isDark ? shadows.cardDark : shadows.tab,
    ]}>
      {orderedRouteNames.map((routeName, index) => {
        // Find matching route from navigation state
        const route = state.routes.find((r: any) => r.name === routeName);
        if (!route) return null;

        const { options } = descriptors[route.key];
        const isFocused = state.routes[state.index]?.name === routeName;
        const tintColor = isFocused ? colors.primary : (isDark ? '#52526a' : '#9ca3af');

        const iconMap: Record<string, string> = {
          index: isFocused ? 'home' : 'home-outline',
          chat: isFocused ? 'message-text' : 'message-text-outline',
          reports: isFocused ? 'file-document' : 'file-document-outline',
          more: isFocused ? 'menu' : 'dots-horizontal',
        };

        const labelMap: Record<string, string> = {
          index: 'Home',
          chat: 'Chat',
          reports: 'Reports',
          more: 'More',
        };

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const elements = [];

        // Insert elevated center CTA in the exact middle of the 4 tab items
        if (index === 2) {
          elements.push(
            <TouchableOpacity
              key="center-cta"
              style={styles.centerCtaWrapper}
              activeOpacity={0.85}
              onPress={() => router.push('/symptoms')}
            >
              <LinearGradient
                colors={[...colors.primaryGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.centerCta, shadows.cta]}
              >
                <MaterialCommunityIcons name="plus" size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          );
        }

        elements.push(
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={labelMap[route.name] || options.title}
            onPress={onPress}
            style={styles.tabItem}
          >
            <MaterialCommunityIcons
              name={(iconMap[route.name] || 'circle') as any}
              size={24}
              color={tintColor}
            />
          </TouchableOpacity>
        );

        return elements;
      })}
    </View>
  );
}

export default function TabLayout() {
  const { isDark, colors } = useHealTheme();

  return (
    <Tabs
      tabBar={(props) => <ElevatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      {/* Hide symptoms tab from the tab bar (opened via elevated center CTA) */}
      <Tabs.Screen name="symptoms" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderTopWidth: 0.5,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    height: Platform.OS === 'ios' ? 88 : 64,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  centerCtaWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 6,
  },
  centerCta: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24,
  },
});
