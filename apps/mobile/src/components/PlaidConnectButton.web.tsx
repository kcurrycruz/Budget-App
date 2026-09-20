import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { usePlaidLink, type PlaidLinkOnExit, type PlaidLinkOnSuccess } from 'react-plaid-link';

import { createPlaidLinkToken, exchangePlaidPublicToken } from '../data/budgetRepository';
import { colors, radius, spacing } from '../theme';
import type { PlaidConnectButtonProps } from './PlaidConnectButton.types';

type Phase = 'idle' | 'requesting' | 'opening' | 'saving';

export function PlaidConnectButton({ enabled, onConnected }: PlaidConnectButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [shouldOpen, setShouldOpen] = useState(false);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (publicToken, metadata) => {
    if (!publicToken) {
      Alert.alert('Could not connect account', 'Plaid did not return a connection token. Please try again.');
      setPhase('idle');
      return;
    }
    setPhase('saving');
    try {
      await exchangePlaidPublicToken(publicToken, metadata.institution?.name);
      await onConnected();
      Alert.alert('Account connected', 'Your accounts are connected and the first transaction sync has started.');
    } catch (caught) {
      Alert.alert('Could not finish connecting', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setLinkToken(null);
      setPhase('idle');
    }
  }, [onConnected]);

  const onExit = useCallback<PlaidLinkOnExit>((error) => {
    if (error) Alert.alert('Plaid closed', error.display_message ?? error.error_message ?? 'Please try again.');
    setLinkToken(null);
    setShouldOpen(false);
    setPhase('idle');
  }, []);

  const { error, open, ready } = usePlaidLink({ token: linkToken, onExit, onSuccess });

  useEffect(() => {
    if (!shouldOpen || !ready) return;
    setShouldOpen(false);
    open();
  }, [open, ready, shouldOpen]);

  useEffect(() => {
    if (!error) return;
    Alert.alert('Plaid could not load', error.message ?? 'Check your connection and try again.');
    setPhase('idle');
  }, [error]);

  const connect = async () => {
    if (!enabled) {
      Alert.alert('Sign in first', 'Create or sign in to your account before connecting a bank.');
      return;
    }
    setPhase('requesting');
    try {
      setLinkToken(await createPlaidLinkToken());
      setShouldOpen(true);
      setPhase('opening');
    } catch (caught) {
      setPhase('idle');
      Alert.alert('Plaid Sandbox setup needed', caught instanceof Error ? caught.message : 'Please try again.');
    }
  };

  const labels: Record<Phase, string> = {
    idle: 'Connect an account',
    requesting: 'Getting Plaid ready…',
    opening: 'Opening Plaid…',
    saving: 'Saving accounts…',
  };
  const busy = phase !== 'idle';

  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void connect(); }} style={[styles.button, busy && styles.buttonDisabled]}>
      <MaterialCommunityIcons color={colors.white} name={busy ? 'loading' : 'link-variant'} size={20} />
      <Text style={styles.label}>{labels[phase]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.xl, padding: spacing.lg, width: '100%' },
  buttonDisabled: { opacity: 0.65 },
  label: { color: colors.white, fontSize: 15, fontWeight: '800' },
});
