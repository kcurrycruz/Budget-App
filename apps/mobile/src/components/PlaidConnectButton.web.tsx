import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePlaidLink, type PlaidLinkOnExit, type PlaidLinkOnSuccess } from 'react-plaid-link';

import { completePlaidUpdate, createPlaidLinkToken, exchangePlaidPublicToken } from '../data/budgetRepository';
import { colors, radius, shadow, spacing } from '../theme';
import type { PlaidConnectButtonProps } from './PlaidConnectButton.types';

type Phase = 'idle' | 'requesting' | 'opening' | 'saving';
type PlaidEnvironment = 'sandbox' | 'development' | 'production';
type StoredLinkSession = {
  createdAt: number;
  environment: PlaidEnvironment;
  itemId?: string;
  linkToken: string;
};

const LINK_SESSION_KEY = 'zenify.plaid.link-session.v1';
const LINK_SESSION_MAX_AGE_MS = 3 * 60 * 60 * 1000;

const readStoredSession = (): StoredLinkSession | null => {
  try {
    const value = window.localStorage.getItem(LINK_SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as Partial<StoredLinkSession>;
    if (
      typeof session.linkToken !== 'string'
      || typeof session.createdAt !== 'number'
      || !['sandbox', 'development', 'production'].includes(session.environment ?? '')
      || Date.now() - session.createdAt > LINK_SESSION_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(LINK_SESSION_KEY);
      return null;
    }
    return session as StoredLinkSession;
  } catch {
    return null;
  }
};

const clearStoredSession = () => {
  try {
    window.localStorage.removeItem(LINK_SESSION_KEY);
  } catch {
    // Link still works when browser storage is unavailable; OAuth resume may not.
  }
};

const cleanOAuthUrl = () => {
  if (!window.location.search.includes('oauth_state_id=')) return;
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
};

export function PlaidConnectButton({ appearance = 'primary', enabled, itemId, label, onConnected }: PlaidConnectButtonProps) {
  const [consentVisible, setConsentVisible] = useState(false);
  const [environment, setEnvironment] = useState<PlaidEnvironment>('sandbox');
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [receivedRedirectUri, setReceivedRedirectUri] = useState<string>();
  const [resumeItemId, setResumeItemId] = useState<string>();
  const [shouldOpen, setShouldOpen] = useState(false);
  const activeItemId = itemId ?? resumeItemId;

  const resetLink = useCallback(() => {
    clearStoredSession();
    cleanOAuthUrl();
    setConsentVisible(false);
    setLinkToken(null);
    setReceivedRedirectUri(undefined);
    setResumeItemId(undefined);
    setShouldOpen(false);
    setPhase('idle');
  }, []);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (publicToken, metadata) => {
    if (!activeItemId && !publicToken) {
      Alert.alert('Could not connect account', 'Plaid did not return a connection token. Please try again.');
      resetLink();
      return;
    }
    setPhase('saving');
    try {
      if (activeItemId) {
        await completePlaidUpdate(activeItemId);
      } else {
        if (!publicToken) throw new Error('Plaid did not return a connection token.');
        await exchangePlaidPublicToken(publicToken, metadata.institution?.name);
      }
      await onConnected();
      Alert.alert(
        activeItemId ? 'Connection repaired' : 'Account connected',
        activeItemId ? 'Plaid access is current and your latest available data has been synced.' : 'Your accounts are connected and the first transaction sync has started.',
      );
    } catch (caught) {
      Alert.alert('Could not finish connecting', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      resetLink();
    }
  }, [activeItemId, onConnected, resetLink]);

  const onExit = useCallback<PlaidLinkOnExit>((error, metadata) => {
    if (error) {
      const reference = metadata.request_id ?? metadata.link_session_id;
      const detail = error.display_message ?? error.error_message ?? 'Please try again.';
      Alert.alert('Plaid closed', reference ? `${detail}\n\nSupport reference: ${reference}` : detail);
    }
    resetLink();
  }, [resetLink]);

  const plaidConfig = useMemo(() => ({
    onExit,
    onSuccess,
    receivedRedirectUri,
    token: linkToken,
  }), [linkToken, onExit, onSuccess, receivedRedirectUri]);
  const { error, open, ready } = usePlaidLink(plaidConfig);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has('oauth_state_id')) return;
    const stored = readStoredSession();
    if (!stored) {
      cleanOAuthUrl();
      Alert.alert('Connection expired', 'Return to Accounts and start the Plaid connection again.');
      return;
    }
    setEnvironment(stored.environment);
    setLinkToken(stored.linkToken);
    setResumeItemId(stored.itemId);
    setReceivedRedirectUri(window.location.href);
    setPhase('opening');
    setShouldOpen(true);
  }, []);

  useEffect(() => {
    if (!shouldOpen || !ready) return;
    setShouldOpen(false);
    open();
  }, [open, ready, shouldOpen]);

  useEffect(() => {
    if (!error) return;
    Alert.alert('Plaid could not load', error.message ?? 'Check your connection and try again.');
    resetLink();
  }, [error, resetLink]);

  const requestLinkToken = async () => {
    setPhase('requesting');
    try {
      const result = await createPlaidLinkToken(itemId);
      const session: StoredLinkSession = {
        createdAt: Date.now(),
        environment: result.environment,
        itemId,
        linkToken: result.linkToken,
      };
      try {
        window.localStorage.setItem(LINK_SESSION_KEY, JSON.stringify(session));
      } catch {
        // The current Link flow can continue even when OAuth resume storage is blocked.
      }
      setEnvironment(result.environment);
      setLinkToken(result.linkToken);
      if (itemId) {
        setShouldOpen(true);
        setPhase('opening');
      } else {
        setConsentVisible(true);
        setPhase('idle');
      }
    } catch (caught) {
      resetLink();
      Alert.alert('Plaid setup needed', caught instanceof Error ? caught.message : 'Please try again.');
    }
  };

  const connect = () => {
    if (!enabled) {
      Alert.alert('Sign in first', 'Create or sign in to your account before connecting a bank.');
      return;
    }
    void requestLinkToken();
  };

  const continueToPlaid = () => {
    setConsentVisible(false);
    setShouldOpen(true);
    setPhase('opening');
  };

  const cancelConsent = () => resetLink();

  const labels: Record<Phase, string> = {
    idle: label ?? (itemId ? 'Repair bank connection' : 'Connect an account'),
    requesting: 'Getting Plaid ready…',
    opening: 'Opening Plaid…',
    saving: itemId ? 'Finishing repair…' : 'Saving accounts…',
  };
  const busy = phase !== 'idle' || consentVisible;
  const sandbox = environment !== 'production';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={connect}
        style={[styles.button, appearance === 'secondary' && styles.buttonSecondary, busy && styles.buttonDisabled]}
      >
        <MaterialCommunityIcons color={appearance === 'secondary' ? colors.primaryDark : colors.white} name={busy ? 'loading' : itemId ? 'shield-refresh-outline' : 'link-variant'} size={20} />
        <Text style={[styles.label, appearance === 'secondary' && styles.labelSecondary]}>{labels[phase]}</Text>
      </Pressable>

      <Modal animationType="slide" onRequestClose={cancelConsent} presentationStyle="pageSheet" visible={consentVisible}>
        <View style={styles.modalPage}>
          <View style={styles.modalHeader}>
            <Pressable accessibilityLabel="Cancel bank connection" accessibilityRole="button" onPress={cancelConsent} style={styles.closeButton}>
              <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
            </Pressable>
            <View style={[styles.environmentBadge, sandbox ? styles.environmentBadgeSandbox : styles.environmentBadgeLive]}>
              <View style={[styles.environmentDot, sandbox ? styles.environmentDotSandbox : styles.environmentDotLive]} />
              <Text style={styles.environmentText}>{sandbox ? 'Test connection' : 'Live connection'}</Text>
            </View>
          </View>

          <View style={styles.consentIcon}>
            <MaterialCommunityIcons color={colors.primaryDark} name="shield-key-outline" size={32} />
          </View>
          <Text style={styles.consentTitle}>Connect safely with Plaid</Text>
          <Text style={styles.consentIntro}>
            {sandbox
              ? 'This test connection uses sample bank data only. No real bank credentials or money are involved.'
              : 'Plaid will ask you to choose a bank and approve the information shared with Zenify.'}
          </Text>

          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>Zenify will receive</Text>
            <View style={styles.accessRow}>
              <MaterialCommunityIcons color={colors.primaryDark} name="check-circle-outline" size={20} />
              <Text style={styles.accessText}>Account names, types, masks, and balances</Text>
            </View>
            <View style={styles.accessRow}>
              <MaterialCommunityIcons color={colors.primaryDark} name="check-circle-outline" size={20} />
              <Text style={styles.accessText}>Up to 180 days of transaction history</Text>
            </View>
            <View style={styles.accessRow}>
              <MaterialCommunityIcons color={colors.primaryDark} name="check-circle-outline" size={20} />
              <Text style={styles.accessText}>Ongoing updates while the account remains connected</Text>
            </View>
          </View>

          <View style={styles.privacyRow}>
            <MaterialCommunityIcons color={colors.primaryDark} name="lock-outline" size={20} />
            <Text style={styles.privacyText}>Zenify never receives your bank username or password. You can disconnect an institution at any time.</Text>
          </View>

          <Pressable accessibilityRole="button" onPress={continueToPlaid} style={styles.continueButton}>
            <Text style={styles.continueText}>Continue to Plaid</Text>
            <MaterialCommunityIcons color={colors.white} name="arrow-right" size={20} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={cancelConsent} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Not now</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.xl, padding: spacing.lg, width: '100%' },
  buttonDisabled: { opacity: 0.65 },
  buttonSecondary: { backgroundColor: colors.primarySoft, marginTop: spacing.sm },
  label: { color: colors.white, fontSize: 15, fontWeight: '800' },
  labelSecondary: { color: colors.primaryDark },
  modalPage: { backgroundColor: colors.background, flex: 1, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, height: 42, justifyContent: 'center', width: 42 },
  environmentBadge: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  environmentBadgeSandbox: { backgroundColor: '#FFF3DA' },
  environmentBadgeLive: { backgroundColor: '#DFF3E6' },
  environmentDot: { borderRadius: radius.pill, height: 8, width: 8 },
  environmentDotSandbox: { backgroundColor: '#C27D14' },
  environmentDotLive: { backgroundColor: '#2E7D4F' },
  environmentText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  consentIcon: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 68, justifyContent: 'center', marginTop: spacing.xxl, width: 68 },
  consentTitle: { color: colors.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: spacing.lg, textAlign: 'center' },
  consentIntro: { alignSelf: 'center', color: colors.inkMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, maxWidth: 420, textAlign: 'center' },
  accessCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, marginTop: spacing.xl, padding: spacing.lg, ...shadow },
  accessTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.xs },
  accessRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  accessText: { color: colors.ink, flex: 1, fontSize: 13, lineHeight: 19 },
  privacyRow: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, padding: spacing.lg },
  privacyText: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18 },
  continueButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: 'auto', padding: spacing.lg },
  continueText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  cancelButton: { alignItems: 'center', padding: spacing.lg },
  cancelText: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
});
