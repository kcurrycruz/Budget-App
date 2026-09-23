import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlaidConnectButton } from '../components/PlaidConnectButton';
import { ManageConnectionModal } from '../components/ManageConnectionModal';
import { ScreenHeader } from '../components/ScreenHeader';
import { disconnectPlaidItem, syncPlaidAccounts } from '../data/budgetRepository';
import { colors, radius, shadow, spacing } from '../theme';
import type { Account } from '../types';
import { formatMoney } from '../utils/money';

type ConnectScreenProps = {
  accounts: Account[];
  cloudMode: boolean;
  onAccountsChanged: () => Promise<void>;
};

export function ConnectScreen({ accounts, cloudMode, onAccountsChanged }: ConnectScreenProps) {
  const [syncing, setSyncing] = useState(false);
  const [managedAccount, setManagedAccount] = useState<Account | null>(null);
  const { assets, debts } = accounts.reduce((summary, account) => {
    if (account.type === 'credit' || account.type === 'loan') {
      summary.debts += Math.abs(account.balance);
    } else if (account.balance >= 0) {
      summary.assets += account.balance;
    } else {
      summary.debts += Math.abs(account.balance);
    }
    return summary;
  }, { assets: 0, debts: 0 });
  const netWorth = assets - debts;
  const sync = async () => {
    setSyncing(true);
    try {
      await syncPlaidAccounts();
      await onAccountsChanged();
      Alert.alert('Accounts updated', 'Your latest available balances and transactions are now in the budget.');
    } catch (caught) {
      Alert.alert('Could not sync accounts', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async (connectionId: string) => {
    try {
      const result = await disconnectPlaidItem(connectionId);
      const disconnectedAccounts = result?.disconnectedAccounts ?? 0;
      await onAccountsChanged();
      setManagedAccount(null);
      Alert.alert(
        'Institution disconnected',
        `${disconnectedAccounts} ${disconnectedAccounts === 1 ? 'account was' : 'accounts were'} disconnected. Imported history is still available.`,
      );
    } catch (caught) {
      Alert.alert('Could not disconnect institution', caught instanceof Error ? caught.message : 'Please try again.');
      throw caught;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader detail="Bring your balances and spending together." title="Accounts" />

      {accounts.length ? (
        <View style={styles.netWorthCard}>
          <View style={styles.netWorthTop}>
            <View>
              <Text style={styles.netWorthLabel}>Estimated net worth</Text>
              <Text style={[styles.netWorthValue, netWorth < 0 && styles.netWorthValueNegative]}>
                {formatMoney(netWorth, true)}
              </Text>
            </View>
            <View style={styles.netWorthIcon}>
              <MaterialCommunityIcons color={colors.white} name="chart-areaspline" size={24} />
            </View>
          </View>
          <View style={styles.netWorthBreakdown}>
            <View style={styles.netWorthMetric}>
              <View style={styles.metricLabelRow}>
                <MaterialCommunityIcons color="#8FDBA8" name="arrow-up" size={15} />
                <Text style={styles.metricLabel}>Assets</Text>
              </View>
              <Text style={styles.metricValue}>{formatMoney(assets, true)}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.netWorthMetric}>
              <View style={styles.metricLabelRow}>
                <MaterialCommunityIcons color="#F4A6A6" name="arrow-down" size={15} />
                <Text style={styles.metricLabel}>Debt</Text>
              </View>
              <Text style={styles.metricValue}>{formatMoney(debts, true)}</Text>
            </View>
          </View>
          <Text style={styles.netWorthNote}>Connected balances only · Updated when accounts sync</Text>
        </View>
      ) : null}

      {accounts.length ? (
        <View style={styles.connectMoreCard}>
          <View style={styles.connectMoreCopy}>
            <View style={styles.connectMoreIcon}>
              <MaterialCommunityIcons color={colors.primaryDark} name="bank-plus" size={22} />
            </View>
            <View style={styles.connectMoreText}>
              <Text style={styles.connectMoreTitle}>Add another account</Text>
              <Text style={styles.connectMoreDetail}>Include more of your financial picture.</Text>
            </View>
          </View>
          <PlaidConnectButton appearance="secondary" enabled={cloudMode} label="Connect account" onConnected={onAccountsChanged} />
          <Text style={styles.compactSandboxNote}>Sandbox uses test data only.</Text>
        </View>
      ) : (
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons color={colors.primaryDark} name="bank-plus" size={30} />
          </View>
          <Text style={styles.heroTitle}>Connect once. Stay current.</Text>
          <Text style={styles.heroText}>Choose your bank or credit card through Plaid. New transactions can flow into your budget automatically.</Text>
          <PlaidConnectButton enabled={cloudMode} onConnected={onAccountsChanged} />
          <Text style={styles.sandboxNote}>Sandbox mode uses test bank data only—no real credentials or money.</Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Connected</Text>
        <Text style={styles.sectionMeta}>{accounts.length} accounts</Text>
      </View>
      <View style={styles.accountList}>
        {accounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No connected accounts yet</Text>
            <Text style={styles.emptyText}>Connect a Sandbox bank above to see balances and imported activity here.</Text>
          </View>
        ) : null}
        {accounts.map((account, index) => (
          <View key={account.id}>
            <Pressable
              accessibilityHint={account.connectionId ? 'Opens connection settings' : undefined}
              accessibilityLabel={account.connectionId ? `Manage ${account.name}` : undefined}
              disabled={!account.connectionId}
              onPress={() => setManagedAccount(account)}
              style={({ pressed }) => [styles.accountRow, pressed && styles.accountRowPressed]}
            >
              <View style={styles.accountIcon}>
                <MaterialCommunityIcons
                  color={colors.primary}
                  name={account.type === 'credit' ? 'credit-card-outline' : 'bank-outline'}
                  size={23}
                />
              </View>
              <View style={styles.accountCopy}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountMeta}>{account.institution} · •••• {account.mask}</Text>
                <Text style={[styles.syncMeta, account.connectionStatus === 'attention' && styles.syncMetaAttention]}>
                  {account.connectionStatus === 'attention' ? 'Connection needs attention' : `Updated ${account.syncedAt}`}
                </Text>
              </View>
              <Text style={styles.accountBalance}>{formatMoney(account.balance, true)}</Text>
              {account.connectionId ? <MaterialCommunityIcons color={account.connectionStatus === 'attention' ? colors.danger : colors.inkMuted} name="chevron-right" size={20} /> : null}
            </Pressable>
            {index < accounts.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>

      {accounts.length > 0 && cloudMode ? (
        <Pressable disabled={syncing} onPress={() => { void sync(); }} style={[styles.syncButton, syncing && styles.syncButtonDisabled]}>
          <MaterialCommunityIcons color={colors.primaryDark} name="sync" size={19} />
          <Text style={styles.syncButtonText}>{syncing ? 'Syncing…' : 'Sync latest transactions'}</Text>
        </Pressable>
      ) : null}

      <View style={styles.safetyCard}>
        <MaterialCommunityIcons color={colors.primaryDark} name="shield-lock-outline" size={25} />
        <View style={styles.safetyCopy}>
          <Text style={styles.safetyTitle}>Designed around privacy</Text>
          <Text style={styles.safetyText}>Your bank login is handled by Plaid. The app should store access tokens only on the server, never inside the phone app.</Text>
        </View>
      </View>

      <ManageConnectionModal
        account={managedAccount}
        affectedAccountCount={managedAccount?.connectionId
          ? accounts.filter((account) => account.connectionId === managedAccount.connectionId).length
          : 0}
        onClose={() => setManagedAccount(null)}
        onDisconnect={disconnect}
        onReconnected={async () => {
          await onAccountsChanged();
          setManagedAccount(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.xl },
  hero: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, ...shadow },
  heroIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 62, justifyContent: 'center', marginBottom: spacing.lg, width: 62 },
  heroTitle: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  heroText: { color: colors.inkMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, textAlign: 'center' },
  sandboxNote: { color: colors.inkMuted, fontSize: 11, lineHeight: 16, marginTop: spacing.sm, textAlign: 'center' },
  netWorthCard: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl, ...shadow },
  netWorthTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  netWorthLabel: { color: '#BFD0C5', fontSize: 12, fontWeight: '700' },
  netWorthValue: { color: colors.white, fontSize: 34, fontWeight: '800', letterSpacing: -0.7, marginTop: spacing.xs },
  netWorthValueNegative: { color: '#F4B8B8' },
  netWorthIcon: { alignItems: 'center', backgroundColor: '#FFFFFF1A', borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  netWorthBreakdown: { backgroundColor: '#FFFFFF0F', borderRadius: radius.md, flexDirection: 'row', padding: spacing.md },
  netWorthMetric: { flex: 1, gap: spacing.xs },
  metricLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  metricLabel: { color: '#BFD0C5', fontSize: 11, fontWeight: '700' },
  metricValue: { color: colors.white, fontSize: 15, fontWeight: '800' },
  metricDivider: { backgroundColor: '#FFFFFF1F', marginHorizontal: spacing.md, width: StyleSheet.hairlineWidth },
  netWorthNote: { color: '#93A49A', fontSize: 10 },
  connectMoreCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  connectMoreCopy: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  connectMoreIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  connectMoreText: { flex: 1, gap: 3 },
  connectMoreTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  connectMoreDetail: { color: colors.inkMuted, fontSize: 11 },
  compactSandboxNote: { color: colors.inkMuted, fontSize: 10, marginTop: spacing.sm, textAlign: 'center' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  sectionMeta: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  accountList: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  emptyState: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  emptyText: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs, textAlign: 'center' },
  accountRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  accountRowPressed: { opacity: 0.65 },
  accountIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 },
  accountCopy: { flex: 1, gap: 2 },
  accountName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  accountMeta: { color: colors.inkMuted, fontSize: 11 },
  syncMeta: { color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 2 },
  syncMetaAttention: { color: colors.danger },
  accountBalance: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 58 },
  syncButton: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  syncButtonDisabled: { opacity: 0.55 },
  syncButtonText: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  safetyCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  safetyCopy: { flex: 1, gap: 4 },
  safetyTitle: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  safetyText: { color: colors.primaryDark, fontSize: 12, lineHeight: 18 },
});
