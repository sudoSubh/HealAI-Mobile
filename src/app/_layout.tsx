import { Stack, router } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme, StatusBar, LogBox } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme } from '../theme';
import { LanguageProvider } from '../localization';

LogBox.ignoreAllLogs();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : LightTheme;
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const sessionStr = await AsyncStorage.getItem('user_session');
        if (!sessionStr) {
          // If no active session, direct to login
          // Small timeout to let Expo router mount the initial layout segments
          setTimeout(() => {
            router.replace('/login');
          }, 100);
        } else {
          const session = JSON.parse(sessionStr);
          if (!session.loggedIn) {
            setTimeout(() => {
              router.replace('/login');
            }, 100);
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

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
            name="login"
            options={{
              headerShown: false,
              animation: 'fade_from_bottom',
            }}
          />
          <Stack.Screen
            name="skin-scanner"
            options={{
              headerShown: true,
              title: 'Skin AI Scanner',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.primary,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="reminders"
            options={{
              headerShown: true,
              title: 'Medication Reminders',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.primary,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="diagnosis-result"
            options={{
              headerShown: true,
              title: 'Diagnosis Result',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.primary,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="priority"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="doc-report"
            options={{
              headerShown: true,
              title: 'Clinical Summary',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.primary,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="notify-screen"
            options={{
              headerShown: false,
              animation: 'fade_from_bottom',
            }}
          />
          <Stack.Screen
            name="history"
            options={{
              headerShown: true,
              title: 'Case History',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.primary,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="chw-dashboard"
            options={{
              headerShown: true,
              title: 'CHW/ASHA Dashboard',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.primary,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="nurse-call"
            options={{
              headerShown: true,
              title: 'AI Nurse Consultation',
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.primary,
              animation: 'slide_from_right',
            }}
          />
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
