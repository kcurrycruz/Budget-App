import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Account } from '../types';
import { PlaidConnectButton } from './PlaidConnectButton';

type ManageConnectionModalProps = {
  account: Account | null;
  affectedAccountCount: number;
  onClose: () => void;
  onDisconnect: (connectionId: string) => Promise<void>;
  onReconnected: () => Promise<void>;
};

export function ManageConnectionModal({
  account,
  affectedAccountCount,
  onClose,
  onDisconnect,
  onReconnected,
}: ManageConnectionModalProps) {
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    setConfirmingDisconnect(false);
    setDisconnecting(false);
  }, [account]);

  if (!account?.connectionId) return null;

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnect(account.connectionId!);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close connection settings" disabled={disconnecting} onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
          </Pressable>
          <Text style={styles.title}>Bank connection</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.institutionCard}>
          <View style={styles.institutionIcon}>
            <MaterialCommunityIcons color={colors.primaryDark} name="bank-outline" size={29} />
          </View>
          <Text style={styles.institution}>{account.institution}</Text>
          <Text style={styles.accountName}>{account.name} · •••• {account.mask}</Text>
          <Text style={styles.connectionMeta}>
            {affectedAccountCount} {affectedAccountCount === 1 ? 'account' : 'accounts'} in this connection
          </Text>
        </View>

        {account.connectionStatus === 'attention' ? (
          <View style={styles.attentionCard}>
            <MaterialCommunityIcons color={colors.danger} name="alert-circle-outline" size={22} />
            <View style={styles.attentionCopy}>
              <Text style={styles.attentionTitle}>Connection needs attention</Text>
              <Text style={styles.attentionText}>Repair this connection to keep balances and transactions updating automatically.</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actionBlock}>
          <Text style={styles.actionTitle}>Having trouble syncing?</Text>
          <Text style={styles.actionText}>Open Plaid again to renew permission or update your bank login. Your existing history stays in the budget.</Text>
          <PlaidConnectButton
            appearance="secondary"
            enabled
            itemId={account.connectionId}
            label="Repair bank connection"
            onConnected={onReconnected}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.actionBlock}>
          <Text style={styles.dangerTitle}>Disconnect {account.institution}</Text>
          <Text style={styles.actionText}>
            Plaid access will be revoked for {affectedAccountCount === 1 ? 'this account' : `all ${affectedAccountCount} accounts in this connection`}.
            Imported transaction history will remain in your budget.
          </Text>
          {confirmingDisconnect ? (
            <View style={styles.confirmCard}>
              <MaterialCommunityIcons color={colors.danger} name="alert-circle-outline" size={22} />
              <Text style={styles.confirmText}>Are you sure? Future balances and transactions will stop syncing.</Text>
              <Pressable
                accessibilityRole="button"
                disabled={disconnecting}
                onPress={() => { void disconnect(); }}
                style={[styles.disconnectButton, disconnecting && styles.disabled]}
              >
                <Text style={styles.disconnectButtonText}>{disconnecting ? 'Disconnecting…' : `Yes, disconnect ${account.institution}`}</Text>
              </Pressable>
              <Pressable disabled={disconnecting} onPress={() => setConfirmingDisconnect(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Keep connected</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmingDisconnect(true)} style={styles.dangerOutlineButton}>
              <MaterialCommunityIcons color={colors.danger} name="link-variant-off" size={19} />
              <Text style={styles.dangerOutlineText}>Disconnect institution</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.privacyCard}>
          <MaterialCommunityIcons color={colors.primaryDark} name="shield-check-outline" size={22} />
          <Text style={styles.privacyText}>Plaid credentials remain server-side and are never shown to this app.</Text>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.background, flexGrow: 1, gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 40 },
  institutionCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl },
  institutionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 58, justifyContent: 'center', width: 58 },
  institution: { color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: spacing.md },
  accountName: { color: colors.inkMuted, fontSize: 13, marginTop: spacing.xs },
  connectionMeta: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: spacing.sm },
  actionBlock: { gap: spacing.sm },
  attentionCard: { alignItems: 'flex-start', backgroundColor: '#FFF1F1', borderColor: '#E8BBBB', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  attentionCopy: { flex: 1, gap: spacing.xs },
  attentionTitle: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  attentionText: { color: '#7F3333', fontSize: 12, lineHeight: 18 },
  actionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  dangerTitle: { color: colors.danger, fontSize: 16, fontWeight: '800' },
  actionText: { color: colors.inkMuted, fontSize: 13, lineHeight: 20 },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  dangerOutlineButton: { alignItems: 'center', borderColor: '#E8BBBB', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.sm, padding: spacing.lg },
  dangerOutlineText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  confirmCard: { backgroundColor: '#FFF1F1', borderColor: '#E8BBBB', borderRadius: radius.md, borderWidth: 1, gap: spacing.md, marginTop: spacing.sm, padding: spacing.lg },
  confirmText: { color: '#7F3333', fontSize: 13, lineHeight: 19 },
  disconnectButton: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: radius.md, padding: spacing.md },
  disconnectButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  cancelButton: { alignItems: 'center', padding: spacing.sm },
  cancelText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  privacyCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, marginTop: 'auto', padding: spacing.lg },
  privacyText: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18 },
});
