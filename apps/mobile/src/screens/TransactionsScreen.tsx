import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
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
  onReview: (transaction: Transaction) => void;
};

export function TransactionsScreen({ categories, transactions, onAdd, onReview }: TransactionsScreenProps) {
  const [query, setQuery] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const reviewCount = transactions.filter((transaction) => transaction.needsReview).length;
  const visibleTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return transactions.filter((transaction) => {
      if (reviewOnly && !transaction.needsReview) return false;
      if (!normalizedQuery) return true;
      const category = categories.find((item) => item.id === transaction.categoryId)?.name ?? 'Uncategorized';
      return [transaction.merchant, transaction.account, category]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [categories, query, reviewOnly, transactions]);
  const total = visibleTransactions.reduce((sum, transaction) => (
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
        <TextInput
          onChangeText={setQuery}
          placeholder="Search merchant, account, or category"
          placeholderTextColor={colors.inkMuted}
          style={styles.searchInput}
          value={query}
        />
        {query ? (
          <Pressable accessibilityLabel="Clear transaction search" onPress={() => setQuery('')}>
            <MaterialCommunityIcons color={colors.inkMuted} name="close-circle" size={20} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterActive}><Text style={styles.filterActiveText}>September</Text></View>
        <View style={styles.filter}><Text style={styles.filterText}>All accounts</Text></View>
        {reviewCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: reviewOnly }}
            onPress={() => setReviewOnly((current) => !current)}
            style={[styles.filter, reviewOnly && styles.reviewFilterActive]}
          >
            <Text style={[styles.filterText, reviewOnly && styles.reviewFilterText]}>Review {reviewCount}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Shown spending</Text>
        <Text style={styles.summaryValue}>{formatMoney(total, true)}</Text>
        <Text style={styles.summaryDetail}>{visibleTransactions.length} transactions</Text>
      </View>

      <View style={styles.list}>
        {visibleTransactions.map((transaction, index) => (
          <View key={transaction.id}>
            <TransactionRow
              category={categories.find((category) => category.id === transaction.categoryId)}
              onPress={() => onReview(transaction)}
              transaction={transaction}
            />
            {index < visibleTransactions.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
        {visibleTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons color={colors.primary} name={reviewOnly ? 'check-circle-outline' : 'magnify'} size={26} />
            <Text style={styles.emptyTitle}>{reviewOnly ? 'Review queue cleared' : 'No matching transactions'}</Text>
            <Text style={styles.emptyDetail}>{reviewOnly ? 'Every imported transaction has a category.' : 'Try a different search.'}</Text>
          </View>
        ) : null}
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
  reviewFilterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  reviewFilterText: { color: colors.white },
  summary: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.lg },
  summaryLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 28, fontWeight: '800', marginTop: 3 },
  summaryDetail: { color: colors.inkMuted, fontSize: 12, marginTop: spacing.xs },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 56 },
  emptyState: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: spacing.xs },
  emptyDetail: { color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
});
