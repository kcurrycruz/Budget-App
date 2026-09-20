import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Category, Transaction } from '../types';
import { formatMoney } from '../utils/money';

type TransactionRowProps = {
  transaction: Transaction;
  category?: Category;
  onPress?: () => void;
};

export function TransactionRow({ transaction, category, onPress }: TransactionRowProps) {
  const isInflow = transaction.direction === 'inflow';
  return (
    <Pressable
      accessibilityHint={onPress ? 'Opens category selection' : undefined}
      accessibilityLabel={onPress ? `Review ${transaction.merchant} transaction` : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.icon, { backgroundColor: `${category?.color ?? colors.primary}1A` }]}>
        <MaterialCommunityIcons
          color={category?.color ?? colors.primary}
          name={(category?.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'cash'}
          size={21}
        />
      </View>
      <View style={styles.copy}>
        <View style={styles.merchantLine}>
          <Text numberOfLines={1} style={styles.merchant}>{transaction.merchant}</Text>
          {transaction.pending ? <Text style={styles.pending}>Pending</Text> : null}
          {transaction.needsReview ? <Text style={styles.review}>Review</Text> : null}
        </View>
        <Text style={styles.meta}>{category?.name ?? 'Uncategorized'} · {transaction.date}</Text>
      </View>
      <Text style={[styles.amount, isInflow && styles.inflow]}>{isInflow ? '+' : '−'}{formatMoney(transaction.amount, true)}</Text>
      {onPress ? <MaterialCommunityIcons color={colors.inkMuted} name="chevron-right" size={19} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  rowPressed: { opacity: 0.65 },
  icon: { alignItems: 'center', borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  copy: { flex: 1, gap: 3 },
  merchantLine: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  merchant: { color: colors.ink, flexShrink: 1, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.inkMuted, fontSize: 12 },
  pending: {
    backgroundColor: '#FFF2D7',
    borderRadius: radius.pill,
    color: '#8A5B00',
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  amount: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  inflow: { color: colors.primary },
  review: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primaryDark, fontSize: 10, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
});
