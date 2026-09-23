import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '../components/ProgressBar';
import { PlannedExpenseRow } from '../components/PlannedExpenseRow';
import { RecurringBillRow } from '../components/RecurringBillRow';
import { TransactionRow } from '../components/TransactionRow';
import { colors, radius, shadow, spacing } from '../theme';
import type { Category, PlannedExpense, RecurringBill, Transaction } from '../types';
import { plannedExpenseMonthlyAmount } from '../utils/date';
import { formatMoney } from '../utils/money';

type HomeScreenProps = {
  categories: Category[];
  transactions: Transaction[];
  income: number;
  plannedExpenses: PlannedExpense[];
  recurringBills: RecurringBill[];
  onAdd: () => void;
  onConnect: () => void;
  onViewTransactions: () => void;
  onViewPlan: () => void;
  onToggleBillPaid: (bill: RecurringBill) => void;
  onTogglePlannedExpenseCovered: (expense: PlannedExpense) => void;
  onOpenProfile?: () => void;
  userInitials?: string;
  previewMode?: boolean;
};

export function HomeScreen({
  categories,
  transactions,
  income,
  plannedExpenses,
  recurringBills,
  onAdd,
  onConnect,
  onViewTransactions,
  onViewPlan,
  onToggleBillPaid,
  onTogglePlannedExpenseCovered,
  onOpenProfile,
  userInitials = 'KC',
  previewMode = false,
}: HomeScreenProps) {
  const spent = categories.reduce((total, category) => total + category.spent, 0);
  const plannedSetAside = plannedExpenses
    .filter((expense) => !expense.covered)
    .reduce((sum, expense) => sum + plannedExpenseMonthlyAmount(expense.amount, expense.targetMonth), 0);
  const left = income - spent - plannedSetAside;
  const upcomingBills = recurringBills.filter((bill) => !bill.paid).slice(0, 3);
  const upcomingExpenses = plannedExpenses.filter((expense) => !expense.covered).slice(0, 2);
  const paidBills = recurringBills.filter((bill) => bill.paid).length;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good afternoon</Text>
          <Text style={styles.title}>Your September</Text>
        </View>
        <Pressable accessibilityLabel="Open account menu" onPress={onOpenProfile} style={styles.avatar}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </Pressable>
      </View>

      {previewMode ? (
        <View style={styles.previewCard}>
          <MaterialCommunityIcons color={colors.primaryDark} name="cloud-outline" size={21} />
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>Preview mode</Text>
            <Text style={styles.previewText}>Connect Supabase to turn on private accounts and cloud sync.</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <View>
            <Text style={styles.balanceLabel}>Available this month</Text>
            <Text style={styles.balanceValue}>{formatMoney(left)}</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>On track</Text>
          </View>
        </View>
        <ProgressBar color={colors.accent} height={10} value={(spent + plannedSetAside) / income} />
        <View style={styles.balanceMeta}>
          <Text style={styles.balanceMetaText}>
            {formatMoney(spent)} spent{plannedSetAside > 0 ? ` · ${formatMoney(plannedSetAside)} set aside` : ''}
          </Text>
          <Text style={styles.balanceMetaText}>{formatMoney(income)} income</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onAdd} style={styles.primaryAction}>
          <MaterialCommunityIcons color={colors.white} name="plus" size={24} />
          <Text style={styles.primaryActionText}>Add expense</Text>
        </Pressable>
        <Pressable onPress={onConnect} style={styles.secondaryAction}>
          <MaterialCommunityIcons color={colors.primaryDark} name="bank-plus" size={22} />
          <Text style={styles.secondaryActionText}>Connect</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Spending plan</Text>
          <Text style={styles.sectionDetail}>Tap a category to see what changed</Text>
        </View>
        <MaterialCommunityIcons color={colors.inkMuted} name="chevron-right" size={22} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroller}>
        {categories.map((category) => {
          const remaining = category.budget - category.spent;
          return (
            <View key={category.id} style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}1A` }]}>
                <MaterialCommunityIcons
                  color={category.color}
                  name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={22}
                />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryLeft}>{formatMoney(remaining)} left</Text>
              <ProgressBar color={category.color} value={category.spent / category.budget} />
              <Text style={styles.categoryMeta}>{formatMoney(category.spent)} of {formatMoney(category.budget)}</Text>
            </View>
          );
        })}
      </ScrollView>

      {recurringBills.length ? (
        <>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Upcoming bills</Text>
              <Text style={styles.sectionDetail}>{paidBills} of {recurringBills.length} paid this month</Text>
            </View>
            <Pressable onPress={onViewPlan}><Text style={styles.link}>Manage</Text></Pressable>
          </View>
          <View style={styles.billCard}>
            {upcomingBills.length ? upcomingBills.map((bill, index) => (
              <View key={bill.id}>
                <RecurringBillRow bill={bill} compact onTogglePaid={() => onToggleBillPaid(bill)} />
                {index < upcomingBills.length - 1 ? <View style={styles.billDivider} /> : null}
              </View>
            )) : (
              <View style={styles.allPaidRow}>
                <View style={styles.allPaidIcon}>
                  <MaterialCommunityIcons color={colors.primary} name="check-all" size={22} />
                </View>
                <View style={styles.allPaidCopy}>
                  <Text style={styles.allPaidTitle}>All bills are checked off</Text>
                  <Text style={styles.allPaidDetail}>Nice work—this month is covered.</Text>
                </View>
              </View>
            )}
          </View>
        </>
      ) : null}

      {plannedExpenses.length ? (
        <>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Planned expenses</Text>
              <Text style={styles.sectionDetail}>{formatMoney(plannedSetAside)} to set aside this month</Text>
            </View>
            <Pressable onPress={onViewPlan}><Text style={styles.link}>Manage</Text></Pressable>
          </View>
          <View style={styles.billCard}>
            {upcomingExpenses.length ? upcomingExpenses.map((expense, index) => (
              <View key={expense.id}>
                <PlannedExpenseRow
                  categories={categories}
                  compact
                  expense={expense}
                  onToggleCovered={() => onTogglePlannedExpenseCovered(expense)}
                />
                {index < upcomingExpenses.length - 1 ? <View style={styles.billDivider} /> : null}
              </View>
            )) : (
              <View style={styles.allPaidRow}>
                <View style={styles.allPaidIcon}>
                  <MaterialCommunityIcons color={colors.primary} name="check-all" size={22} />
                </View>
                <View style={styles.allPaidCopy}>
                  <Text style={styles.allPaidTitle}>Planned expenses are covered</Text>
                  <Text style={styles.allPaidDetail}>Nothing else needs to be set aside right now.</Text>
                </View>
              </View>
            )}
          </View>
        </>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Text style={styles.sectionDetail}>Your latest spending</Text>
        </View>
        <Pressable onPress={onViewTransactions}><Text style={styles.link}>See all</Text></Pressable>
      </View>

      <View style={styles.activityCard}>
        {transactions.slice(0, 4).map((transaction, index) => (
          <View key={transaction.id}>
            <TransactionRow
              category={categories.find((category) => category.id === transaction.categoryId)}
              transaction={transaction}
            />
            {index < Math.min(transactions.length, 4) - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  greeting: { color: colors.inkMuted, fontSize: 14, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.9, marginTop: 2 },
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  previewCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  previewCopy: { flex: 1, gap: 2 },
  previewTitle: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  previewText: { color: colors.primaryDark, fontSize: 11, lineHeight: 16 },
  balanceCard: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl, ...shadow },
  balanceTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { color: '#BFD8C9', fontSize: 13, fontWeight: '600' },
  balanceValue: { color: colors.white, fontSize: 38, fontWeight: '800', letterSpacing: -1.4, marginTop: spacing.xs },
  statusPill: { alignItems: 'center', backgroundColor: '#FFFFFF18', borderRadius: radius.pill, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
  statusDot: { backgroundColor: '#8DDBA7', borderRadius: 4, height: 7, width: 7 },
  statusText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  balanceMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceMetaText: { color: '#BFD8C9', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.md },
  primaryAction: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flex: 1.35, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', padding: spacing.lg },
  primaryActionText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  secondaryAction: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, flex: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', padding: spacing.lg },
  secondaryActionText: { color: colors.primaryDark, fontSize: 15, fontWeight: '800' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  sectionDetail: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  categoryScroller: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  categoryCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, marginRight: spacing.md, padding: spacing.lg, width: 166 },
  categoryIcon: { alignItems: 'center', borderRadius: radius.md, height: 40, justifyContent: 'center', width: 40 },
  categoryName: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: spacing.xs },
  categoryLeft: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  categoryMeta: { color: colors.inkMuted, fontSize: 11 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  activityCard: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 56 },
  billCard: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  billDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 38 },
  allPaidRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  allPaidIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  allPaidCopy: { flex: 1, gap: 2 },
  allPaidTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  allPaidDetail: { color: colors.inkMuted, fontSize: 11 },
});
