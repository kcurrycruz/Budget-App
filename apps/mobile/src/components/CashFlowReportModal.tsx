import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Category, PlannedExpense, Transaction } from '../types';
import { plannedExpenseMonthlyAmount } from '../utils/date';
import { formatMoney } from '../utils/money';

type CashFlowReportModalProps = {
  bills: number;
  categories: Category[];
  income: number;
  onClose: () => void;
  plannedExpenses: PlannedExpense[];
  previousMonthToDateSpent: number;
  transactions: Transaction[];
  visible: boolean;
};

type MoneyRowProps = {
  color?: string;
  detail?: string;
  label: string;
  value: number;
};

function MoneyRow({ color, detail, label, value }: MoneyRowProps) {
  return (
    <View style={styles.moneyRow}>
      <View style={styles.moneyLabelBlock}>
        <View style={styles.moneyLabelLine}>
          {color ? <View style={[styles.legendDot, { backgroundColor: color }]} /> : null}
          <Text style={styles.moneyLabel}>{label}</Text>
        </View>
        {detail ? <Text style={styles.moneyDetail}>{detail}</Text> : null}
      </View>
      <Text style={styles.moneyValue}>{formatMoney(value, value % 1 !== 0)}</Text>
    </View>
  );
}

export function CashFlowReportModal({
  bills,
  categories,
  income,
  onClose,
  plannedExpenses,
  previousMonthToDateSpent,
  transactions,
  visible,
}: CashFlowReportModalProps) {
  const now = new Date();
  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now);
  const previousMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  );
  const previousComparisonDay = Math.min(
    now.getDate(),
    new Date(now.getFullYear(), now.getMonth(), 0).getDate(),
  );
  const received = transactions
    .filter((transaction) => transaction.direction === 'inflow')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const transactionOutflows = transactions
    .filter((transaction) => (transaction.direction ?? 'outflow') === 'outflow')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const categorizedSpending = categories.reduce((sum, category) => sum + category.spent, 0);
  const spent = Math.max(transactionOutflows, categorizedSpending);
  const setAside = plannedExpenses
    .filter((expense) => !expense.covered)
    .reduce((sum, expense) => sum + plannedExpenseMonthlyAmount(expense.amount, expense.targetMonth), 0);
  const available = income - spent - setAside;
  const flexiblePlan = categories.reduce((sum, category) => sum + category.budget, 0);
  const totalPlan = bills + flexiblePlan + setAside;
  const buffer = income - totalPlan;
  const reference = Math.max(income, spent + setAside, 1);
  const spentWidth = `${(spent / reference) * 100}%` as `${number}%`;
  const setAsideWidth = `${(setAside / reference) * 100}%` as `${number}%`;
  const availableWidth = `${(Math.max(available, 0) / reference) * 100}%` as `${number}%`;
  const isOver = available < 0;
  const comparisonMax = Math.max(spent, previousMonthToDateSpent, 1);
  const currentComparisonWidth = `${(spent / comparisonMax) * 100}%` as `${number}%`;
  const previousComparisonWidth = `${(previousMonthToDateSpent / comparisonMax) * 100}%` as `${number}%`;
  const spendingChange = spent - previousMonthToDateSpent;
  const spendingChangePercent = previousMonthToDateSpent > 0
    ? Math.round((Math.abs(spendingChange) / previousMonthToDateSpent) * 100)
    : null;
  const spendingTrend = spendingChange === 0 ? 'same' : spendingChange < 0 ? 'down' : 'up';
  const trendColor = spendingTrend === 'down' ? '#2F7A4D' : spendingTrend === 'up' ? colors.danger : colors.inkMuted;
  const trendCopy = spendingChangePercent === null
    ? `No ${previousMonth} spending is available yet.`
    : spendingTrend === 'same'
      ? `The same as ${previousMonth} by this date.`
      : `${spendingChangePercent}% ${spendingTrend === 'down' ? 'less' : 'more'} than ${previousMonth} by this date.`;
  const groupedSpending = categories.reduce((totals, category) => ({
    ...totals,
    [category.spendingGroup]: totals[category.spendingGroup] + category.spent,
  }), { needs: 0, wants: 0, savings: 0 });
  const categorizedSpendingTotal = groupedSpending.needs + groupedSpending.wants + groupedSpending.savings;
  const spendingGroups = [
    { id: 'needs' as const, label: 'Needs', color: '#5C7CFA', detail: 'Essentials' },
    { id: 'wants' as const, label: 'Wants', color: colors.accent, detail: 'Lifestyle' },
    { id: 'savings' as const, label: 'Savings', color: '#5A9E91', detail: 'Goals and reserves' },
  ];

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="cash-flow-report">
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close cash flow report" onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>{currentMonth} cash flow</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.heroCard, isOver && styles.heroCardOver]}>
          <View style={[styles.heroIcon, isOver && styles.heroIconOver]}>
            <MaterialCommunityIcons
              color={isOver ? colors.danger : colors.primaryDark}
              name={isOver ? 'alert-circle-outline' : 'wallet-outline'}
              size={27}
            />
          </View>
          <Text style={styles.heroEyebrow}>{isOver ? 'Needs attention' : 'Available this month'}</Text>
          <Text style={[styles.heroValue, isOver && styles.heroValueOver]}>{formatMoney(Math.abs(available))}</Text>
          <Text style={styles.heroDetail}>
            {isOver
              ? 'Your spending and planned set-asides are above expected income.'
              : 'After spending and planned set-asides, this is still unassigned.'}
          </Text>
        </View>

        <View style={styles.flowCard}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Where this month stands</Text>
              <Text style={styles.sectionDetail}>{formatMoney(income)} expected income</Text>
            </View>
            <MaterialCommunityIcons color={colors.inkMuted} name="chart-timeline-variant" size={23} />
          </View>
          <View accessibilityLabel={`${formatMoney(spent)} spent, ${formatMoney(setAside)} set aside, ${formatMoney(Math.max(available, 0))} available`} style={styles.flowTrack}>
            {spent > 0 ? <View style={[styles.flowSegment, styles.spentSegment, { width: spentWidth }]} /> : null}
            {setAside > 0 ? <View style={[styles.flowSegment, styles.setAsideSegment, { width: setAsideWidth }]} /> : null}
            {available > 0 ? <View style={[styles.flowSegment, styles.availableSegment, { width: availableWidth }]} /> : null}
          </View>
          <MoneyRow color={colors.accent} label="Spent" value={spent} />
          <View style={styles.divider} />
          <MoneyRow color="#80A9F8" detail="For planned one-time expenses" label="Set aside" value={setAside} />
          <View style={styles.divider} />
          <MoneyRow color="#A9C8B4" label={isOver ? 'Over expected income' : 'Available'} value={Math.abs(available)} />
        </View>

        <View style={styles.twoColumnRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <MaterialCommunityIcons color={colors.primary} name="arrow-down-left" size={20} />
            </View>
            <Text style={styles.summaryLabel}>Cash in</Text>
            <Text style={styles.summaryValue}>{formatMoney(received)}</Text>
            <Text style={styles.summaryDetail}>{formatMoney(income)} expected</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.cashOutIcon]}>
              <MaterialCommunityIcons color="#C86B33" name="arrow-up-right" size={20} />
            </View>
            <Text style={styles.summaryLabel}>Cash out</Text>
            <Text style={styles.summaryValue}>{formatMoney(spent)}</Text>
            <Text style={styles.summaryDetail}>Recorded spending</Text>
          </View>
        </View>

        <View style={styles.comparisonCard}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Month-to-month</Text>
              <Text style={styles.sectionDetail}>{currentMonth} 1–{now.getDate()} vs {previousMonth} 1–{previousComparisonDay}</Text>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: `${trendColor}18` }]}>
              <MaterialCommunityIcons
                color={trendColor}
                name={spendingTrend === 'down' ? 'trending-down' : spendingTrend === 'up' ? 'trending-up' : 'minus'}
                size={19}
              />
            </View>
          </View>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonLabelRow}>
              <Text style={styles.comparisonLabel}>{currentMonth}</Text>
              <Text style={styles.comparisonValue}>{formatMoney(spent)}</Text>
            </View>
            <View style={styles.comparisonTrack}>
              <View style={[styles.comparisonBar, styles.currentComparisonBar, { width: currentComparisonWidth }]} />
            </View>
          </View>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonLabelRow}>
              <Text style={styles.comparisonLabel}>{previousMonth}</Text>
              <Text style={styles.comparisonValue}>{formatMoney(previousMonthToDateSpent)}</Text>
            </View>
            <View style={styles.comparisonTrack}>
              <View style={[styles.comparisonBar, styles.previousComparisonBar, { width: previousComparisonWidth }]} />
            </View>
          </View>
          <View style={[styles.trendMessage, { backgroundColor: `${trendColor}12` }]}>
            <Text style={[styles.trendMessageText, { color: trendColor }]}>{trendCopy}</Text>
          </View>
        </View>

        <View style={styles.groupCard}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Needs, Wants & Savings</Text>
              <Text style={styles.sectionDetail}>Share of categorized spending</Text>
            </View>
            <MaterialCommunityIcons color={colors.inkMuted} name="chart-donut" size={23} />
          </View>
          {spendingGroups.map((group, index) => {
            const amount = groupedSpending[group.id];
            const percent = categorizedSpendingTotal > 0 ? Math.round((amount / categorizedSpendingTotal) * 100) : 0;
            const width = `${percent}%` as `${number}%`;
            return <View key={group.id} style={[styles.groupRow, index < spendingGroups.length - 1 && styles.groupRowSpacing]}>
              <View style={styles.groupLabelRow}>
                <View style={styles.groupNameBlock}>
                  <View style={[styles.legendDot, { backgroundColor: group.color }]} />
                  <View>
                    <Text style={styles.groupName}>{group.label}</Text>
                    <Text style={styles.groupDetail}>{group.detail}</Text>
                  </View>
                </View>
                <View style={styles.groupAmountBlock}>
                  <Text style={styles.groupPercent}>{percent}%</Text>
                  <Text style={styles.groupAmount}>{formatMoney(amount)}</Text>
                </View>
              </View>
              <View style={styles.groupTrack}>
                <View style={[styles.groupBar, { backgroundColor: group.color, width }]} />
              </View>
            </View>;
          })}
          <Text style={styles.groupFootnote}>Change a category’s group anytime in Manage categories.</Text>
        </View>

        <View style={styles.planCard}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Plan check</Text>
              <Text style={styles.sectionDetail}>Budgets guide your month; they are not extra spending.</Text>
            </View>
          </View>
          <MoneyRow label="Fixed costs" value={bills} />
          <View style={styles.divider} />
          <MoneyRow label="Flexible budgets" value={flexiblePlan} />
          <View style={styles.divider} />
          <MoneyRow label="One-time set-asides" value={setAside} />
          <View style={styles.planDivider} />
          <MoneyRow detail={`${formatMoney(totalPlan)} total planned`} label="Plan buffer" value={buffer} />
        </View>

        <View style={styles.noteCard}>
          <MaterialCommunityIcons color={colors.primaryDark} name="information-outline" size={21} />
          <Text style={styles.noteText}>Expected income comes from your monthly plan. Cash in and cash out come from this month’s transactions. Set-asides do not create transactions.</Text>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.background, flexGrow: 1, gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 40 },
  heroCard: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.xl },
  heroCardOver: { backgroundColor: '#FBEFEF' },
  heroIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, height: 52, justifyContent: 'center', marginBottom: spacing.md, width: 52 },
  heroIconOver: { backgroundColor: '#FFF8F8' },
  heroEyebrow: { color: colors.inkMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  heroValue: { color: colors.primaryDark, fontSize: 38, fontWeight: '800', letterSpacing: -1.2, marginTop: spacing.xs },
  heroValueOver: { color: colors.danger },
  heroDetail: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm, maxWidth: 300, textAlign: 'center' },
  flowCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  sectionHeading: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  sectionDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  flowTrack: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, flexDirection: 'row', height: 13, marginBottom: spacing.lg, overflow: 'hidden' },
  flowSegment: { height: '100%' },
  spentSegment: { backgroundColor: colors.accent },
  setAsideSegment: { backgroundColor: '#80A9F8' },
  availableSegment: { backgroundColor: '#A9C8B4' },
  moneyRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 47 },
  moneyLabelBlock: { flex: 1 },
  moneyLabelLine: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  legendDot: { borderRadius: radius.pill, height: 9, width: 9 },
  moneyLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  moneyDetail: { color: colors.inkMuted, fontSize: 10, lineHeight: 14, marginLeft: 17, marginTop: 2 },
  moneyValue: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  twoColumnRow: { flexDirection: 'row', gap: spacing.md },
  summaryCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, padding: spacing.lg },
  summaryIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 38, justifyContent: 'center', marginBottom: spacing.md, width: 38 },
  cashOutIcon: { backgroundColor: '#FCEFE7' },
  summaryLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 4 },
  summaryDetail: { color: colors.inkMuted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  comparisonCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  trendBadge: { alignItems: 'center', borderRadius: radius.pill, height: 36, justifyContent: 'center', width: 36 },
  comparisonRow: { gap: spacing.sm, marginBottom: spacing.lg },
  comparisonLabelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  comparisonLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  comparisonValue: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  comparisonTrack: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 10, overflow: 'hidden' },
  comparisonBar: { borderRadius: radius.pill, height: '100%' },
  currentComparisonBar: { backgroundColor: colors.primary },
  previousComparisonBar: { backgroundColor: '#A9C8B4' },
  trendMessage: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  trendMessageText: { fontSize: 11, fontWeight: '700', lineHeight: 16 },
  groupCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  groupRow: { gap: spacing.sm },
  groupRowSpacing: { marginBottom: spacing.lg },
  groupLabelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  groupNameBlock: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  groupName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  groupDetail: { color: colors.inkMuted, fontSize: 10, marginTop: 2 },
  groupAmountBlock: { alignItems: 'flex-end' },
  groupPercent: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  groupAmount: { color: colors.inkMuted, fontSize: 10, marginTop: 2 },
  groupTrack: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 8, overflow: 'hidden' },
  groupBar: { borderRadius: radius.pill, height: '100%' },
  groupFootnote: { color: colors.inkMuted, fontSize: 10, lineHeight: 15, marginTop: spacing.lg },
  planCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg },
  planDivider: { backgroundColor: colors.ink, height: 1, marginVertical: spacing.xs, opacity: 0.14 },
  noteCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  noteText: { color: colors.primaryDark, flex: 1, fontSize: 11, lineHeight: 17 },
});
