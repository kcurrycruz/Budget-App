import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { RecurringBill } from '../types';
import { currentMonthStart, formatRecurringDueDate, recurringBillDueDate } from '../utils/date';
import { formatMoney } from '../utils/money';

type RecurringBillRowProps = {
  bill: RecurringBill;
  compact?: boolean;
  month: string;
  onEdit?: () => void;
  onTogglePaid: () => void;
};

const dueLabel = (bill: RecurringBill, month: string) => {
  if (bill.paid) return 'Paid this month';
  const due = recurringBillDueDate(bill.dueDay, month);
  if (month !== currentMonthStart()) return `Due ${formatRecurringDueDate(bill.dueDay, month)}`;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (due.getTime() === todayStart.getTime()) return 'Due today';
  if (due < todayStart) return `Overdue · ${formatRecurringDueDate(bill.dueDay, month)}`;
  return `Due ${formatRecurringDueDate(bill.dueDay, month)}`;
};

export function RecurringBillRow({ bill, compact = false, month, onEdit, onTogglePaid }: RecurringBillRowProps) {
  return (
    <View style={[styles.row, compact && styles.compactRow]}>
      <Pressable
        accessibilityLabel={`Mark ${bill.name} ${bill.paid ? 'unpaid' : 'paid'}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: bill.paid }}
        hitSlop={8}
        onPress={onTogglePaid}
        style={[styles.check, bill.paid && styles.checkPaid]}
      >
        {bill.paid ? <MaterialCommunityIcons color={colors.white} name="check" size={17} /> : null}
      </Pressable>
      <Pressable disabled={!onEdit} onPress={onEdit} style={styles.copy}>
        <Text numberOfLines={1} style={[styles.name, bill.paid && styles.namePaid]}>{bill.name}</Text>
        <Text style={[styles.due, !bill.paid && dueLabel(bill, month).startsWith('Overdue') && styles.overdue]}>{dueLabel(bill, month)}</Text>
      </Pressable>
      <Pressable disabled={!onEdit} onPress={onEdit} style={styles.amountBlock}>
        <Text style={[styles.amount, bill.paid && styles.amountPaid]}>{formatMoney(bill.amount, bill.amount % 1 !== 0)}</Text>
        {onEdit ? <MaterialCommunityIcons color={colors.inkMuted} name="chevron-right" size={18} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 70, paddingVertical: spacing.md },
  compactRow: { minHeight: 62, paddingVertical: spacing.sm },
  check: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.pill, borderWidth: 2, height: 26, justifyContent: 'center', width: 26 },
  checkPaid: { backgroundColor: colors.primary, borderColor: colors.primary },
  copy: { flex: 1, gap: 3 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  namePaid: { color: colors.inkMuted, textDecorationLine: 'line-through' },
  due: { color: colors.inkMuted, fontSize: 11, fontWeight: '600' },
  overdue: { color: colors.danger },
  amountBlock: { alignItems: 'center', flexDirection: 'row' },
  amount: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  amountPaid: { color: colors.inkMuted },
});
