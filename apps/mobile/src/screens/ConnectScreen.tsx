import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlaidConnectButton } from '../components/PlaidConnectButton';
import { ManageConnectionModal } from '../components/ManageConnectionModal';
import { ScreenHeader } from '../components/ScreenHeader';
import { disconnectPlaidItem, loadPlaidConnectionHealth, syncPlaidAccounts, type PlaidConnectionIssue } from '../data/budgetRepository';
import { colors, radius, shadow, spacing } from '../theme';
import type { Account, NetWorthSnapshot } from '../types';
import { showMessage } from '../utils/dialogs';
import { formatMoney } from '../utils/money';
import { summarizeNetWorth } from '../utils/netWorth';

type ConnectScreenProps = {
  accounts: Account[];
  cloudMode: boolean;
  netWorthHistory: NetWorthSnapshot[];
  onAccountsChanged: () => Promise<void>;
};

const formatSnapshotMonth = (month: string) => new Date(`${month}T00:00:00`).toLocaleDateString('en-US', { month: 'short' });

export function ConnectScreen({ accounts, cloudMode, netWorthHistory, onAccountsChanged }: ConnectScreenProps) {
  const [syncing, setSyncing] = useState(false);
  const [managedAccount, setManagedAccount] = useState<Account | null>(null);
  const [connectionIssues, setConnectionIssues] = useState<Record<string, PlaidConnectionIssue>>({});
  const { assets, debts } = summarizeNetWorth(accounts);
  const netWorth = assets - debts;
  const visibleHistory = netWorthHistory.slice(-6);
  const maxHistoryValue = Math.max(1, ...visibleHistory.map((snapshot) => Math.abs(snapshot.netWorth)));
  const firstSnapshot = visibleHistory[0];
  const latestSnapshot = visibleHistory.at(-1);
  const historyChange = firstSnapshot && latestSnapshot ? latestSnapshot.netWorth - firstSnapshot.netWorth : 0;

  useEffect(() => {
    if (!cloudMode || accounts.length === 0) {
      setConnectionIssues({});
      return;
    }
    let active = true;
    void loadPlaidConnectionHealth()
      .then((connections) => {
        if (!active) return;
        setConnectionIssues(Object.fromEntries(connections.map((connection) => [connection.itemId, connection.issue])));
      })
      .catch(() => {
        if (active) setConnectionIssues({});
      });
    return () => { active = false; };
  }, [accounts, cloudMode]);

  const sync = async () => {
    setSyncing(true);
    try {
      const result = await syncPlaidAccounts();
      try {
        await onAccountsChanged();
      } catch {
        showMessage('Sync finished', 'Zenify could not refresh the account screen. Reopen Accounts to see the latest available data.');
        return;
      }
      const failed = result.results.filter((item): item is { itemId: string; error: string } => 'error' in item);
      if (failed.length) {
        const institutions = failed.map((item) => accounts.find((account) => account.connectionId === item.itemId)?.institution ?? 'A bank');
        const uniqueInstitutions = [...new Set(institutions)];
        showMessage(
          result.syncedItems === 0 ? 'No accounts updated' : 'Some accounts need attention',
          `${result.syncedItems} ${result.syncedItems === 1 ? 'connection' : 'connections'} updated. ${uniqueInstitutions.join(', ')} could not sync. Try syncing again, or open the bank connection if sign-in needs renewing.\n\n${failed[0]?.error ?? ''}`.trim(),
        );
      } else {
        showMessage('Accounts updated', 'Your latest available balances and transactions are now in the budget.');
      }
    } catch (caught) {
      await onAccountsChanged().catch(() => undefined);
      showMessage('Could not sync accounts', caught instanceof Error ? caught.message : 'Please try again.');
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
      showMessage(
        'Institution disconnected',
        `${disconnectedAccounts} ${disconnectedAccounts === 1 ? 'account was' : 'accounts were'} disconnected. Imported history is still available.`,
      );
    } catch (caught) {
      showMessage('Could not disconnect institution', caught instanceof Error ? caught.message : 'Please try again.');
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
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleGroup}>
              <Text style={styles.historyTitle}>Net worth history</Text>
              <Text style={styles.historyDetail}>Monthly connected-balance checkpoints</Text>
            </View>
            {visibleHistory.length > 1 ? (
              <Text style={[styles.historyChange, historyChange < 0 && styles.historyChangeNegative]}>
                {historyChange >= 0 ? 'Up ' : 'Down '}{formatMoney(Math.abs(historyChange), true)}
              </Text>
            ) : null}
          </View>

          {visibleHistory.length > 1 ? (
            <View accessibilityLabel="Net worth history chart" style={styles.historyChart}>
              {visibleHistory.map((snapshot) => {
                const barHeight = Math.max(8, Math.round((Math.abs(snapshot.netWorth) / maxHistoryValue) * 64));
                return (
                  <View
                    accessibilityLabel={`${formatSnapshotMonth(snapshot.snapshotMonth)} net worth ${formatMoney(snapshot.netWorth, true)}`}
                    accessible
                    key={snapshot.snapshotMonth}
                    style={styles.historyColumn}
                  >
                    <View style={styles.historyBarTrack}>
                      <View
                        style={[
                          styles.historyBar,
                          { height: barHeight },
                          snapshot.netWorth < 0 && styles.historyBarNegative,
                        ]}
                      />
                    </View>
                    <Text style={styles.historyMonth}>{formatSnapshotMonth(snapshot.snapshotMonth)}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.historyEmpty}>
              <View style={styles.historyEmptyIcon}>
                <MaterialCommunityIcons color={colors.primaryDark} name="chart-timeline-variant" size={21} />
              </View>
              <View style={styles.historyEmptyCopy}>
                <Text style={styles.historyEmptyTitle}>History starts this month</Text>
                <Text style={styles.historyEmptyText}>Zenify will keep one checkpoint when your connected balances refresh.</Text>
              </View>
            </View>
          )}
          <Text style={styles.historyNote}>Private to your account · Up to 12 months saved</Text>
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
          <Text style={styles.compactConnectionNote}>Review what Zenify accesses before Plaid opens.</Text>
        </View>
      ) : (
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons color={colors.primaryDark} name="bank-plus" size={30} />
          </View>
          <Text style={styles.heroTitle}>Connect once. Stay current.</Text>
          <Text style={styles.heroText}>Choose your bank or credit card through Plaid. New transactions can flow into your budget automatically.</Text>
          <PlaidConnectButton enabled={cloudMode} onConnected={onAccountsChanged} />
          <Text style={styles.connectionNote}>You’ll review exactly what Zenify accesses before Plaid opens.</Text>
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
            <Text style={styles.emptyText}>Connect a bank above to see balances and imported activity here.</Text>
          </View>
        ) : null}
        {accounts.map((account, index) => {
          const issue = account.connectionId ? connectionIssues[account.connectionId] : null;
          const needsAttention = account.connectionStatus === 'attention' || issue === 'repair' || issue === 'retry';
          return <View key={account.id}>
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
                <Text style={[styles.syncMeta, needsAttention && styles.syncMetaAttention]}>
                  {issue === 'repair'
                    ? 'Bank sign-in needs renewing'
                    : issue === 'retry'
                      ? 'Latest sync failed · Try again'
                      : account.connectionStatus === 'attention'
                        ? 'Connection needs attention'
                        : account.syncedAt === 'Not synced yet'
                          ? 'Transactions are preparing'
                          : `Last successful sync ${account.syncedAt}`}
                </Text>
              </View>
              <Text style={styles.accountBalance}>{formatMoney(account.balance, true)}</Text>
              {account.connectionId ? <MaterialCommunityIcons color={needsAttention ? colors.danger : colors.inkMuted} name="chevron-right" size={20} /> : null}
            </Pressable>
            {index < accounts.length - 1 ? <View style={styles.divider} /> : null}
          </View>;
        })}
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
          <Text style={styles.safetyText}>Your bank login stays with Plaid. Zenify stores only an encrypted connection token on its secure server, never inside the phone app.</Text>
        </View>
      </View>

      <ManageConnectionModal
        account={managedAccount}
        issue={managedAccount?.connectionId ? connectionIssues[managedAccount.connectionId] : null}
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
  connectionNote: { color: colors.inkMuted, fontSize: 11, lineHeight: 16, marginTop: spacing.sm, textAlign: 'center' },
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
  historyCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.lg, padding: spacing.lg },
  historyHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  historyTitleGroup: { flex: 1, gap: 3 },
  historyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  historyDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  historyChange: { color: '#2E7D4F', fontSize: 11, fontWeight: '800', paddingTop: 2 },
  historyChangeNegative: { color: colors.danger },
  historyChart: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm, height: 92 },
  historyColumn: { alignItems: 'center', flex: 1, gap: 6 },
  historyBarTrack: { alignItems: 'center', flex: 1, justifyContent: 'flex-end', width: '100%' },
  historyBar: { backgroundColor: '#7BCB98', borderRadius: radius.sm, minWidth: 18, width: '58%' },
  historyBarNegative: { backgroundColor: '#E69A9A' },
  historyMonth: { color: colors.inkMuted, fontSize: 10, fontWeight: '700' },
  historyEmpty: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  historyEmptyIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 40, justifyContent: 'center', width: 40 },
  historyEmptyCopy: { flex: 1, gap: 2 },
  historyEmptyTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  historyEmptyText: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  historyNote: { color: colors.inkMuted, fontSize: 10 },
  connectMoreCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  connectMoreCopy: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  connectMoreIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  connectMoreText: { flex: 1, gap: 3 },
  connectMoreTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  connectMoreDetail: { color: colors.inkMuted, fontSize: 11 },
  compactConnectionNote: { color: colors.inkMuted, fontSize: 10, marginTop: spacing.sm, textAlign: 'center' },
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
