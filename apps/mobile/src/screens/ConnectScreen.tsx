import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, shadow, spacing } from '../theme';
import type { Account } from '../types';
import { formatMoney } from '../utils/money';

type ConnectScreenProps = { accounts: Account[] };

export function ConnectScreen({ accounts }: ConnectScreenProps) {
  const connect = () => Alert.alert(
    'Plaid sandbox is next',
    'The interface is ready. We will connect Plaid after the secure server and sandbox credentials are configured.',
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader detail="Bring your balances and spending together." title="Accounts" />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons color={colors.primaryDark} name="bank-plus" size={30} />
        </View>
        <Text style={styles.heroTitle}>Connect once. Stay current.</Text>
        <Text style={styles.heroText}>Choose your bank or credit card through Plaid. New transactions can flow into your budget automatically.</Text>
        <Pressable onPress={connect} style={styles.connectButton}>
          <MaterialCommunityIcons color={colors.white} name="link-variant" size={20} />
          <Text style={styles.connectButtonText}>Connect an account</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Connected</Text>
        <Text style={styles.sectionMeta}>{accounts.length} accounts</Text>
      </View>
      <View style={styles.accountList}>
        {accounts.map((account, index) => (
          <View key={account.id}>
            <View style={styles.accountRow}>
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
                <Text style={styles.syncMeta}>Updated {account.syncedAt}</Text>
              </View>
              <Text style={styles.accountBalance}>{formatMoney(account.balance, true)}</Text>
            </View>
            {index < accounts.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>

      <View style={styles.safetyCard}>
        <MaterialCommunityIcons color={colors.primaryDark} name="shield-lock-outline" size={25} />
        <View style={styles.safetyCopy}>
          <Text style={styles.safetyTitle}>Designed around privacy</Text>
          <Text style={styles.safetyText}>Your bank login is handled by Plaid. The app should store access tokens only on the server, never inside the phone app.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.xl },
  hero: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, ...shadow },
  heroIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 62, justifyContent: 'center', marginBottom: spacing.lg, width: 62 },
  heroTitle: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  heroText: { color: colors.inkMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, textAlign: 'center' },
  connectButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.xl, padding: spacing.lg, width: '100%' },
  connectButtonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  sectionMeta: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  accountList: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  accountRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  accountIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 },
  accountCopy: { flex: 1, gap: 2 },
  accountName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  accountMeta: { color: colors.inkMuted, fontSize: 11 },
  syncMeta: { color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 2 },
  accountBalance: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 58 },
  safetyCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  safetyCopy: { flex: 1, gap: 4 },
  safetyTitle: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  safetyText: { color: colors.primaryDark, fontSize: 12, lineHeight: 18 },
});
