import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '../components/ScreenHeader';
import { TransactionRow } from '../components/TransactionRow';
import { colors, radius, spacing } from '../theme';
import type { Category, Transaction } from '../types';
import { formatMonth } from '../utils/date';
import { formatMoney } from '../utils/money';

type TransactionsScreenProps = {
  categories: Category[];
  transactions: Transaction[];
  month: string;
  onAdd: () => void;
  onReview: (transaction: Transaction) => void;
  onSelectMonth: () => void;
};

export function TransactionsScreen({ categories, transactions, month, onAdd, onReview, onSelectMonth }: TransactionsScreenProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'outflow' | 'inflow' | 'review'>('all');
  const reviewCount = transactions.filter((transaction) => transaction.needsReview).length;
  const visibleTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return transactions.filter((transaction) => {
      const direction = transaction.direction ?? 'outflow';
      if (filter === 'review' && !transaction.needsReview) return false;
      if ((filter === 'outflow' || filter === 'inflow') && direction !== filter) return false;
      if (!normalizedQuery) return true;
      const parentCategory = categories.find((item) => item.id === transaction.categoryId);
      const category = direction === 'inflow' ? 'Income' : parentCategory?.name ?? 'Uncategorized';
      const subcategory = parentCategory?.subcategories.find((item) => item.id === transaction.subcategoryId)?.name ?? '';
      return [transaction.merchant, transaction.account, category, subcategory]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [categories, filter, query, transactions]);
  const spending = visibleTransactions.reduce((sum, transaction) => (
    transaction.direction === 'inflow' ? sum : sum + transaction.amount
  ), 0);
  const inflow = visibleTransactions.reduce((sum, transaction) => (
    transaction.direction === 'inflow' ? sum + transaction.amount : sum
  ), 0);
  const net = inflow - spending;
  const summaryLabel = filter === 'inflow' ? 'Shown income' : filter === 'all' ? 'Shown cash flow' : 'Shown spending';
  const summaryValue = filter === 'inflow'
    ? formatMoney(inflow, true)
    : filter === 'all'
      ? `${net < 0 ? '−' : '+'}${formatMoney(Math.abs(net), true)}`
      : formatMoney(spending, true);
  const monthIsEmpty = transactions.length === 0 && !query && filter === 'all';

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

      <View>
        <Pressable accessibilityLabel="Choose activity month" onPress={onSelectMonth} style={styles.monthPicker}>
          <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
          <MaterialCommunityIcons color={colors.inkMuted} name="chevron-down" size={17} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
          {([
            { value: 'all' as const, label: 'All' },
            { value: 'outflow' as const, label: 'Expenses' },
            { value: 'inflow' as const, label: 'Income' },
            ...(reviewCount > 0 ? [{ value: 'review' as const, label: `Review ${reviewCount}` }] : []),
          ]).map((option) => {
            const selected = filter === option.value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.value}
                onPress={() => setFilter(option.value)}
                style={[styles.filter, selected && styles.filterActive]}
              >
                <Text style={[styles.filterText, selected && styles.filterActiveText]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>{summaryLabel}</Text>
        <Text style={[styles.summaryValue, filter === 'all' && net >= 0 && styles.summaryPositive]}>{summaryValue}</Text>
        <Text style={styles.summaryDetail}>
          {filter === 'all'
            ? `${formatMoney(inflow, true)} in · ${formatMoney(spending, true)} out`
            : `${visibleTransactions.length} transaction${visibleTransactions.length === 1 ? '' : 's'}`}
        </Text>
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
            <MaterialCommunityIcons color={colors.primary} name={filter === 'review' ? 'check-circle-outline' : 'magnify'} size={26} />
            <Text style={styles.emptyTitle}>{filter === 'review' ? 'Review queue cleared' : monthIsEmpty ? `No activity in ${formatMonth(month, false)}` : 'No matching transactions'}</Text>
            <Text style={styles.emptyDetail}>{filter === 'review' ? 'Every imported transaction has a category.' : monthIsEmpty ? 'Add a transaction or choose another month.' : 'Try a different search or filter.'}</Text>
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
  monthPicker: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 3, marginBottom: spacing.sm },
  monthLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  filter: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  filterActiveText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  summary: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.lg },
  summaryLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 28, fontWeight: '800', marginTop: 3 },
  summaryPositive: { color: colors.primary },
  summaryDetail: { color: colors.inkMuted, fontSize: 12, marginTop: spacing.xs },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 56 },
  emptyState: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: spacing.xs },
  emptyDetail: { color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
});
