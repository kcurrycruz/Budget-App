import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { SavingsGoal } from '../types';
import { formatTargetMonth, savingsGoalMonthlyAmount } from '../utils/date';
import { formatMoney } from '../utils/money';
import { ProgressBar } from './ProgressBar';

type SavingsGoalRowProps = {
  goal: SavingsGoal;
  referenceMonth?: string;
  onEdit: () => void;
};

export function SavingsGoalRow({ goal, referenceMonth, onEdit }: SavingsGoalRowProps) {
  const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const monthlyAmount = savingsGoalMonthlyAmount(goal.targetAmount, goal.currentAmount, goal.targetMonth, referenceMonth);
  const complete = remaining === 0;

  return (
    <Pressable accessibilityLabel={`Edit ${goal.name} savings goal`} onPress={onEdit} style={styles.row}>
      <View style={[styles.icon, complete && styles.iconComplete]}>
        <MaterialCommunityIcons color={complete ? colors.white : colors.primary} name={complete ? 'check' : 'piggy-bank-outline'} size={22} />
      </View>
      <View style={styles.copy}>
        <View style={styles.topLine}>
          <Text numberOfLines={1} style={styles.name}>{goal.name}</Text>
          <Text style={styles.percent}>{Math.min(Math.round(progress * 100), 100)}%</Text>
        </View>
        <ProgressBar color={complete ? '#5A9E91' : '#5C7CFA'} height={7} value={progress} />
        <Text numberOfLines={1} style={styles.detail}>
          {complete
            ? `${formatMoney(goal.currentAmount)} saved · Goal reached`
            : `${formatMoney(goal.currentAmount)} of ${formatMoney(goal.targetAmount)} · ${formatMoney(monthlyAmount)}/mo through ${formatTargetMonth(goal.targetMonth)}`}
        </Text>
      </View>
      <MaterialCommunityIcons color={colors.inkMuted} name="chevron-right" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 86, paddingVertical: spacing.md },
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  iconComplete: { backgroundColor: '#5A9E91' },
  copy: { flex: 1, gap: spacing.sm },
  topLine: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '800', marginRight: spacing.sm },
  percent: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  detail: { color: colors.inkMuted, fontSize: 10, fontWeight: '600' },
});
