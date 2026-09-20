import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '../components/ScreenHeader';
import { TransactionRow } from '../components/TransactionRow';
import { colors, radius, spacing } from '../theme';
import type { Category, Transaction } from '../types';
import { formatMoney } from '../utils/money';

type TransactionsScreenProps = {
  categories: Category[];
  transactions: Transaction[];
  onAdd: () => void;
};

export function TransactionsScreen({ categories, transactions, onAdd }: TransactionsScreenProps) {
  const total = transactions.reduce((sum, transaction) => (
    transaction.direction === 'inflow' ? sum : sum + transaction.amount
  ), 0);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.topLine}>
        <ScreenHeader detail="Everything that came in or went out." title="Activity" />
        <Pressable accessibilityLabel="Add a transaction" onPress={onAdd} style={styles.addButton}>
          <MaterialCommunityIcons color={colors.white} name="plus" size={25} />
        </Pressable>
      </View>

      <View style={styles.search}>
        <MaterialCommunityIcons color={colors.inkMuted} name="magnify" size={21} />
        <TextInput placeholder="Search transactions" placeholderTextColor={colors.inkMuted} style={styles.searchInput} />
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterActive}><Text style={styles.filterActiveText}>September</Text></View>
        <View style={styles.filter}><Text style={styles.filterText}>All accounts</Text></View>
        <View style={styles.filter}><Text style={styles.filterText}>Categories</Text></View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Shown spending</Text>
        <Text style={styles.summaryValue}>{formatMoney(total, true)}</Text>
        <Text style={styles.summaryDetail}>{transactions.length} transactions</Text>
      </View>

      <View style={styles.list}>
        {transactions.map((transaction, index) => (
          <View key={transaction.id}>
            <TransactionRow
              category={categories.find((category) => category.id === transaction.categoryId)}
              transaction={transaction}
            />
            {index < transactions.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  topLine: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  addButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.pill, height: 46, justifyContent: 'center', width: 46 },
  search: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md },
  searchInput: { color: colors.ink, flex: 1, fontSize: 15, height: 48 },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filter: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8 },
  filterText: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  filterActiveText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  summary: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.lg },
  summaryLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 28, fontWeight: '800', marginTop: 3 },
  summaryDetail: { color: colors.inkMuted, fontSize: 12, marginTop: spacing.xs },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 56 },
});
