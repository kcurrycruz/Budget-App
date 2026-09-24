import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import { confirmAction } from '../utils/dialogs';
import { supportsWebPasskeys, webPasskeyLabel } from '../utils/passkeys';

type Passkey = {
  created_at: string;
  friendly_name?: string;
  id: string;
  last_used_at?: string;
};

type PasskeySettingsModalProps = {
  onClose: () => void;
  visible: boolean;
};

const friendlyPasskeyError = (error: { code?: string; message: string }) => {
  if (error.code === 'passkey_disabled') return 'Face ID sign-in is not enabled for Zenify yet.';
  if (error.code === 'webauthn_credential_exists') return 'This Face ID passkey is already connected to your account.';
  if (error.code === 'ERROR_CEREMONY_ABORTED') return '';
  return error.message || 'The passkey request could not be completed.';
};

export function PasskeySettingsModal({ onClose, visible }: PasskeySettingsModalProps) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supported = supportsWebPasskeys();
  const passkeyLabel = webPasskeyLabel();

  const loadPasskeys = useCallback(async () => {
    if (!supabase || !supported) return;
    setLoading(true);
    setError(null);
    const { data, error: listError } = await supabase.auth.passkey.list();
    setLoading(false);
    if (listError) {
      setError(friendlyPasskeyError(listError));
      return;
    }
    setPasskeys(data ?? []);
  }, [supported]);

  useEffect(() => {
    if (visible) {
      setMessage(null);
      setError(null);
      void loadPasskeys();
    }
  }, [loadPasskeys, visible]);

  const registerPasskey = async () => {
    if (!supabase || !supported || busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const { error: registerError } = await supabase.auth.registerPasskey();
      if (registerError) {
        const nextError = friendlyPasskeyError(registerError);
        if (nextError) setError(nextError);
        return;
      }
      setMessage('Face ID sign-in is ready on this device.');
      await loadPasskeys();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Face ID setup did not finish.');
    } finally {
      setBusy(false);
    }
  };

  const removePasskey = async (passkey: Passkey) => {
    if (!supabase || busy) return;
    const confirmed = await confirmAction({
      title: 'Remove this passkey?',
      message: 'This device will no longer be able to use this passkey to sign in to Zenify. Your password will still work.',
      confirmLabel: 'Remove',
    });
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    setError(null);
    const { error: deleteError } = await supabase.auth.passkey.delete({ passkeyId: passkey.id });
    if (deleteError) {
      setError(friendlyPasskeyError(deleteError));
    } else {
      setPasskeys((current) => current.filter((item) => item.id !== passkey.id));
      setMessage('Passkey removed.');
    }
    setBusy(false);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close Face ID settings" disabled={busy} onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>{passkeyLabel === 'Face ID' ? 'Face ID sign-in' : 'Passkey sign-in'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroIcon}>
          <MaterialCommunityIcons color={colors.primaryDark} name="face-recognition" size={38} />
        </View>
        <View style={styles.intro}>
          <Text style={styles.title}>A faster, safer return</Text>
          <Text style={styles.detail}>{passkeyLabel === 'Face ID' ? 'Your iPhone verifies you with Face ID, then uses a passkey to sign in.' : 'Your device verifies you, then uses a passkey to sign in.'} Zenify never receives your biometric data.</Text>
        </View>

        {!supported ? (
          <View style={styles.noticeCard}>
            <MaterialCommunityIcons color={colors.primaryDark} name="apple-safari" size={23} />
            <Text style={styles.noticeText}>Open Zenify in Safari on an iPhone with iOS 16 or newer to set up Face ID sign-in.</Text>
          </View>
        ) : <>
          <View style={styles.passkeyCard}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Your passkeys</Text>
                <Text style={styles.sectionDetail}>{passkeys.length ? `${passkeys.length} connected` : 'None connected yet'}</Text>
              </View>
              {loading ? <ActivityIndicator color={colors.primary} /> : null}
            </View>
            {!loading && passkeys.length === 0 ? (
              <View style={styles.emptyRow}>
                <MaterialCommunityIcons color={colors.inkMuted} name="key-outline" size={22} />
                <Text style={styles.emptyText}>Create one below, then use Face ID from the Zenify login screen.</Text>
              </View>
            ) : null}
            {passkeys.map((passkey, index) => (
              <View key={passkey.id}>
                <View style={styles.passkeyRow}>
                  <View style={styles.passkeyIcon}>
                    <MaterialCommunityIcons color={colors.primary} name="key-variant" size={20} />
                  </View>
                  <View style={styles.passkeyCopy}>
                    <Text numberOfLines={1} style={styles.passkeyName}>{passkey.friendly_name || 'Apple passkey'}</Text>
                    <Text style={styles.passkeyDate}>Added {new Date(passkey.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Remove ${passkey.friendly_name || 'passkey'}`}
                    disabled={busy}
                    onPress={() => { void removePasskey(passkey); }}
                    style={styles.removeButton}
                  >
                    <MaterialCommunityIcons color={colors.danger} name="trash-can-outline" size={19} />
                  </Pressable>
                </View>
                {index < passkeys.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy || loading} onPress={() => { void registerPasskey(); }} style={[styles.primaryButton, (busy || loading) && styles.disabled]}>
            {busy
              ? <ActivityIndicator color={colors.white} />
              : <>
                <MaterialCommunityIcons color={colors.white} name="face-recognition" size={22} />
                <Text style={styles.primaryButtonText}>{passkeys.length ? 'Add another passkey' : 'Set up Face ID sign-in'}</Text>
              </>}
          </Pressable>
        </>}

        <View style={styles.fallbackCard}>
          <MaterialCommunityIcons color={colors.primary} name="lock-reset" size={21} />
          <Text style={styles.fallbackText}>Your password stays active as a backup. Passkeys are also available through iCloud Keychain on your approved Apple devices.</Text>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.background, flexGrow: 1, gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 40 },
  heroIcon: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 76, justifyContent: 'center', width: 76 },
  intro: { alignItems: 'center', gap: spacing.sm },
  title: { color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  detail: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, maxWidth: 380, textAlign: 'center' },
  noticeCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  noticeText: { color: colors.primaryDark, flex: 1, fontSize: 13, lineHeight: 19 },
  passkeyCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  sectionDetail: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
  emptyRow: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  emptyText: { color: colors.inkMuted, flex: 1, fontSize: 12, lineHeight: 18 },
  passkeyRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 64 },
  passkeyIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: 'center', width: 40 },
  passkeyCopy: { flex: 1, gap: 3 },
  passkeyName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  passkeyDate: { color: colors.inkMuted, fontSize: 10 },
  removeButton: { alignItems: 'center', borderColor: '#E8CACA', borderRadius: radius.pill, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 52 },
  success: { backgroundColor: colors.primarySoft, borderRadius: radius.sm, color: colors.primaryDark, fontSize: 12, lineHeight: 18, padding: spacing.md, textAlign: 'center' },
  error: { backgroundColor: '#FBEAEA', borderRadius: radius.sm, color: colors.danger, fontSize: 12, lineHeight: 18, padding: spacing.md, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, height: 56, justifyContent: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  fallbackCard: { alignItems: 'flex-start', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  fallbackText: { color: colors.inkMuted, flex: 1, fontSize: 11, lineHeight: 17 },
  disabled: { opacity: 0.45 },
});
