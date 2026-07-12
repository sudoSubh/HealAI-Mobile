import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme, StatusBar } from 'react-native';
import { LightTheme, DarkTheme } from '../theme';
import { LanguageProvider } from '../localization';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : LightTheme;

  return (
    <PaperProvider theme={theme as any}>
      <LanguageProvider>
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="education"
            options={{
              headerShown: true,
              title: 'Education Hub',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.primary,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="resources"
            options={{
              headerShown: true,
              title: 'Healthcare Resources',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.primary,
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </LanguageProvider>
    </PaperProvider>
  );
}
