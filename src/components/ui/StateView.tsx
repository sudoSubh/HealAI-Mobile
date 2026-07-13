/**
 * StateView — Wrapper for loading / empty / error / populated states.
 *
 * Props:
 *   state: 'loading' | 'empty' | 'error' | 'populated'
 *   onRetry?: handler for error retry
 *   emptyTitle?: headline for empty state
 *   emptyMessage?: body for empty state
 *   onEmptyCta?: handler for empty CTA
 *   emptyCtaLabel?: label for empty CTA
 *   children: content for populated state
 */
import React, { ReactNode, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHealTheme, spacing } from '../../theme';
import { AppText } from './AppText';
import { GradientButton } from './GradientButton';

type StateType = 'loading' | 'empty' | 'error' | 'populated';

interface StateViewProps {
  state: StateType;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  onEmptyCta?: () => void;
  emptyCtaLabel?: string;
  loadingLabel?: string;
  children?: ReactNode;
}

export function StateView({
  state,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyMessage = 'Get started by completing your first health check.',
  onEmptyCta,
  emptyCtaLabel = 'Start check',
  loadingLabel = 'Loading…',
  children,
}: StateViewProps) {
  const { colors } = useHealTheme();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (state === 'loading') {
      setShowTimeout(false);
      const timer = setTimeout(() => setShowTimeout(true), 15000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.lg }}>
          {loadingLabel}
        </AppText>
        {showTimeout && (
          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            This is taking longer than expected.{'\n'}Please check your connection.
          </AppText>
        )}
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.danger} />
        <AppText variant="title" color={colors.text} style={{ marginTop: spacing.lg, textAlign: 'center' }}>
          Something went wrong
        </AppText>
        <AppText variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          We couldn't load the data. Please try again.
        </AppText>
        {onRetry && (
          <View style={{ marginTop: spacing.xl }}>
            <GradientButton label="Try again" onPress={onRetry} />
          </View>
        )}
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={colors.textMuted} />
        <AppText variant="title" color={colors.text} style={{ marginTop: spacing.lg, textAlign: 'center' }}>
          {emptyTitle}
        </AppText>
        <AppText variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          {emptyMessage}
        </AppText>
        {onEmptyCta && (
          <View style={{ marginTop: spacing.xl }}>
            <GradientButton label={emptyCtaLabel} onPress={onEmptyCta} />
          </View>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    minHeight: 200,
  },
});

export default StateView;
