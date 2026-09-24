import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Category, PlannedExpense } from '../types';
import { formatTargetMonth, plannedExpenseMonthlySetAside } from '../utils/date';
import { formatMoney } from '../utils/money';

type PlannedExpenseRowProps = {
  categories: Category[];
  compact?: boolean;
  expense: PlannedExpense;
  referenceMonth?: string;
  onEdit?: () => void;
  onToggleCovered: () => void;
};

export function PlannedExpenseRow({ categories, compact = false, expense, referenceMonth, onEdit, onToggleCovered }: PlannedExpenseRowProps) {
  const category = categories.find((item) => item.id === expense.categoryId);
  const monthlyAmount = plannedExpenseMonthlySetAside(expense, referenceMonth);
  const savedAmount = Math.min(expense.savedAmount, expense.amount);
  const progress = expense.amount > 0 ? (savedAmount / expense.amount) * 100 : 0;

  return (
    <View style={[styles.row, compact && styles.compactRow]}>
      <Pressable
        accessibilityLabel={`Mark ${expense.name} ${expense.covered ? 'not covered' : 'covered'}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: expense.covered }}
        hitSlop={8}
        onPress={onToggleCovered}
        style={[styles.check, expense.covered && styles.checkCovered]}
      >
        {expense.covered ? <MaterialCommunityIcons color={colors.white} name="check" size={17} /> : null}
      </Pressable>
      <Pressable disabled={!onEdit} onPress={onEdit} style={styles.copy}>
        <Text numberOfLines={1} style={[styles.name, expense.covered && styles.nameCovered]}>{expense.name}</Text>
        <Text numberOfLines={1} style={styles.detail}>
          {expense.covered
            ? `Covered for ${formatTargetMonth(expense.targetMonth)}`
            : savedAmount >= expense.amount
              ? `Ready to use · ${formatMoney(savedAmount)} set aside`
              : `${expense.autoFund ? 'Auto · ' : ''}${formatMoney(savedAmount)} of ${formatMoney(expense.amount)} · ${formatMoney(monthlyAmount)}/mo · ${formatTargetMonth(expense.targetMonth)}${category ? ` · ${category.name}` : ''}`}
        </Text>
        {!expense.covered ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
        ) : null}
      </Pressable>
      <Pressable disabled={!onEdit} onPress={onEdit} style={styles.amountBlock}>
        <Text style={[styles.amount, expense.covered && styles.amountCovered]}>{formatMoney(expense.amount, expense.amount % 1 !== 0)}</Text>
        {onEdit ? <MaterialCommunityIcons color={colors.inkMuted} name="chevron-right" size={18} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 70, paddingVertical: spacing.md },
  compactRow: { minHeight: 62, paddingVertical: spacing.sm },
  check: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.pill, borderWidth: 2, height: 26, justifyContent: 'center', width: 26 },
  checkCovered: { backgroundColor: colors.primary, borderColor: colors.primary },
  copy: { flex: 1, gap: 3 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  nameCovered: { color: colors.inkMuted, textDecorationLine: 'line-through' },
  detail: { color: colors.inkMuted, fontSize: 11, fontWeight: '600' },
  progressTrack: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 5, marginTop: 3, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.primary, borderRadius: radius.pill, height: '100%' },
  amountBlock: { alignItems: 'center', flexDirection: 'row' },
  amount: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  amountCovered: { color: colors.inkMuted },
});
